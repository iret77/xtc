import { describe, expect, it, vi } from "vitest";
import { ClimbxClient, ClimbxError, validateBaseUrl } from "../src/client.js";
import { findUrlInText, validateImageUrls, validateIsoDate } from "../src/tools.js";

function jsonResponse(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

function makeClient(fetchFn: typeof fetch) {
  const sleeps: number[] = [];
  const client = new ClimbxClient({
    apiKey: "climbx_sk_test",
    fetchFn,
    sleepFn: async (ms) => {
      sleeps.push(ms);
    },
  });
  return { client, sleeps };
}

describe("ClimbxClient", () => {
  it("sends auth header and query params, returns parsed JSON", async () => {
    const fetchFn = vi.fn(async (url: any, init: any) => {
      expect(String(url)).toBe("https://climbx.so/api/v1/posts?limit=10");
      expect(init.headers.Authorization).toBe("Bearer climbx_sk_test");
      return jsonResponse(200, { posts: [] });
    });
    const { client } = makeClient(fetchFn as unknown as typeof fetch);
    await expect(client.get("/posts", { limit: 10 })).resolves.toEqual({ posts: [] });
  });

  it("maps API errors to ClimbxError with code and hint", async () => {
    const fetchFn = vi.fn(async () =>
      jsonResponse(402, { error: "subscription_required", message: "No active plan." }),
    );
    const { client } = makeClient(fetchFn as unknown as typeof fetch);
    const err = await client.get("/voice").catch((e) => e);
    expect(err).toBeInstanceOf(ClimbxError);
    expect(err.status).toBe(402);
    expect(err.code).toBe("subscription_required");
    expect(err.hint).toContain("subscription");
  });

  it("retries a rate-limited GET once, honoring Retry-After", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(429, { error: "rate_limited", message: "Slow down." }, { "Retry-After": "2" }),
      )
      .mockResolvedValueOnce(jsonResponse(200, { ok: true }));
    const { client, sleeps } = makeClient(fetchFn as unknown as typeof fetch);
    await expect(client.get("/analytics")).resolves.toEqual({ ok: true });
    expect(sleeps).toEqual([2000]);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it("gives up after the second rate-limit response", async () => {
    const fetchFn = vi.fn(async () =>
      jsonResponse(429, { error: "rate_limited", message: "Slow down." }, { "Retry-After": "1" }),
    );
    const { client } = makeClient(fetchFn as unknown as typeof fetch);
    const err = await client.get("/analytics").catch((e) => e);
    expect(err.code).toBe("rate_limited");
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it("never retries a write, even on daily cap", async () => {
    const fetchFn = vi.fn(async () =>
      jsonResponse(429, { error: "daily_post_cap_reached", message: "Cap reached." }),
    );
    const { client } = makeClient(fetchFn as unknown as typeof fetch);
    const err = await client.post("/posts", { text: "hi" }).catch((e) => e);
    expect(err.code).toBe("daily_post_cap_reached");
    expect(err.hint).toContain("00:00 UTC");
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("retries a GET once on network error, but not writes", async () => {
    const failing = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
    const { client: writeClient } = makeClient(failing as unknown as typeof fetch);
    const writeErr = await writeClient.post("/posts", { text: "hi" }).catch((e) => e);
    expect(writeErr.code).toBe("network_error");
    expect(failing).toHaveBeenCalledTimes(1);

    const flaky = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValueOnce(jsonResponse(200, { ok: true }));
    const { client: readClient } = makeClient(flaky as unknown as typeof fetch);
    await expect(readClient.get("/voice")).resolves.toEqual({ ok: true });
    expect(flaky).toHaveBeenCalledTimes(2);
  });
});

describe("local validation", () => {
  it("finds URLs in post text", () => {
    expect(findUrlInText("check https://example.com now")).toBe("https://example.com");
    expect(findUrlInText("see www.example.com")).toBe("www.example.com");
    expect(findUrlInText("no links here, just words. v2.0 shipped!")).toBeNull();
  });

  it("requires https image urls", () => {
    expect(validateImageUrls(["https://img.example/a.png"])).toBeNull();
    expect(validateImageUrls(["http://img.example/a.png"])).toContain("https");
    expect(validateImageUrls(undefined)).toBeNull();
  });

  it("validates ISO datetimes strictly (timezone required)", () => {
    expect(validateIsoDate("2026-06-01T14:00:00Z", "scheduled_for")).toBeNull();
    expect(validateIsoDate("2026-06-01T14:00+02:00", "scheduled_for")).toBeNull();
    expect(validateIsoDate("not-a-date", "scheduled_for")).toContain("ISO 8601");
    expect(validateIsoDate("2026-06-01", "scheduled_for")).toContain("ISO 8601");
    expect(validateIsoDate("06/01/2026", "scheduled_for")).toContain("ISO 8601");
    expect(validateIsoDate("2026-06-01T14:00:00", "scheduled_for")).toContain("ISO 8601");
    expect(validateIsoDate(undefined, "start")).toBeNull();
  });

  it("guards the base URL against key exfiltration", () => {
    expect(validateBaseUrl("https://climbx.so/api/v1")).toBeNull();
    expect(validateBaseUrl("https://staging.climbx.so/api/v1")).toBeNull();
    expect(validateBaseUrl("http://climbx.so/api/v1")).toContain("https");
    expect(validateBaseUrl("https://evil.example/api/v1")).toContain("refusing");
    expect(validateBaseUrl("https://evil.example/api/v1", true)).toBeNull();
    expect(validateBaseUrl("not a url")).toContain("not a valid URL");
  });
});

describe("inspiration endpoints", () => {
  it("passes surprise filters as query params and omits undefined ones", async () => {
    const fetchFn = vi.fn(async (url: any) => {
      const u = new URL(String(url));
      expect(u.pathname).toBe("/api/v1/inspiration/surprise");
      expect(u.searchParams.get("min_multiplier")).toBe("3");
      expect(u.searchParams.get("recency")).toBe("30d");
      expect(u.searchParams.has("format")).toBe(false);
      return jsonResponse(200, { feed: "surprise", outliers: [] });
    });
    const { client } = makeClient(fetchFn as unknown as typeof fetch);
    await expect(
      client.get("/inspiration/surprise", { min_multiplier: 3, recency: "30d", format: undefined }),
    ).resolves.toEqual({ feed: "surprise", outliers: [] });
  });

  it("maps invalid_query with a pointer to the options tool", async () => {
    const fetchFn = vi.fn(async () =>
      jsonResponse(400, { error: "invalid_query", message: "recency must be 7d, 30d or all" }),
    );
    const { client } = makeClient(fetchFn as unknown as typeof fetch);
    const err = await client.get("/inspiration/surprise", { recency: "yesterday" }).catch((e) => e);
    expect(err.code).toBe("invalid_query");
    expect(err.hint).toContain("get_inspiration_options");
  });
});

describe("tool wiring", () => {
  it("registers all 15 tools and routes them to the right endpoints", async () => {
    const { registerTools } = await import("../src/tools.js");
    const calls: string[] = [];
    const fetchFn = vi.fn(async (url: any) => {
      calls.push(String(url));
      return jsonResponse(200, { ok: true });
    });
    const handlers = new Map<string, (args: any) => Promise<any>>();
    const fakeServer = {
      registerTool: (name: string, _meta: unknown, handler: (args: any) => Promise<any>) => {
        handlers.set(name, handler);
      },
    };
    registerTools(
      fakeServer as any,
      () => new ClimbxClient({ apiKey: "climbx_sk_test", fetchFn: fetchFn as unknown as typeof fetch }),
    );

    expect([...handlers.keys()].sort()).toEqual([
      "cancel_scheduled", "get_analytics", "get_following_outliers", "get_format_performance",
      "get_inspiration_options", "get_learnings", "get_learnings_history", "get_niche_performance",
      "get_surprise_outliers", "get_voice_profile", "list_posts", "list_scheduled",
      "publish_post", "reschedule_post", "schedule_post",
    ]);

    const res = await handlers.get("get_following_outliers")!({ handles: "@levelsio", limit: 5 });
    expect(res.isError).toBeUndefined();
    expect(calls[0]).toContain("/api/v1/inspiration/following");
    expect(calls[0]).toContain("handles=%40levelsio");
    expect(calls[0]).toContain("limit=5");

    await handlers.get("get_surprise_outliers")!({ min_multiplier: 3, recency: "30d" });
    expect(calls[1]).toContain("/api/v1/inspiration/surprise");
    expect(calls[1]).toContain("min_multiplier=3");
    expect(calls[1]).toContain("recency=30d");
  });

  it("rejects URL-bearing posts locally without any request", async () => {
    const { registerTools } = await import("../src/tools.js");
    const fetchFn = vi.fn();
    const handlers = new Map<string, (args: any) => Promise<any>>();
    registerTools(
      { registerTool: (n: string, _m: unknown, h: any) => handlers.set(n, h) } as any,
      () => new ClimbxClient({ apiKey: "climbx_sk_test", fetchFn: fetchFn as unknown as typeof fetch }),
    );
    const res = await handlers.get("publish_post")!({ text: "check https://example.com" });
    expect(res.isError).toBe(true);
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

describe("base-url guard in constructor", () => {
  it("throws when constructed with a foreign host and no override", () => {
    expect(
      () => new ClimbxClient({ apiKey: "k", baseUrl: "https://evil.example/api/v1" }),
    ).toThrowError(/refusing/);
    expect(
      () => new ClimbxClient({ apiKey: "k", baseUrl: "https://evil.example/api/v1", allowCustomHost: true }),
    ).not.toThrow();
  });
});

describe("error diagnostics", () => {
  it("keeps a bounded snippet of non-JSON error bodies", async () => {
    const fetchFn = vi.fn(async () =>
      new Response("<html>Bad Gateway from proxy</html>", { status: 502 }),
    );
    const { client } = makeClient(fetchFn as unknown as typeof fetch);
    const err = await client.post("/posts", { text: "hi" }).catch((e) => e);
    expect(err).toBeInstanceOf(ClimbxError);
    expect(err.code).toBe("http_502");
    expect(err.message).toContain("Bad Gateway from proxy");
  });

  it("classifies timeouts distinctly from network errors on writes", async () => {
    const timeoutErr = new Error("The operation was aborted due to timeout");
    timeoutErr.name = "TimeoutError";
    const fetchFn = vi.fn().mockRejectedValue(timeoutErr);
    const { client } = makeClient(fetchFn as unknown as typeof fetch);
    const err = await client.post("/posts", { text: "hi" }).catch((e) => e);
    expect(err.code).toBe("timeout");
    expect(err.message).toContain("timed out");
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });
});
