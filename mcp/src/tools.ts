import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ClimbxClient, ClimbxError, DEFAULT_BASE_URL, validateBaseUrl } from "./client.js";

const SETUP_HINT =
  "CLIMBX_API_KEY is not set. Create an API key in ClimbX under Settings → API " +
  "(https://climbx.so/account/settings/api) and expose it to this server as the " +
  "CLIMBX_API_KEY environment variable. The key is shown only once at creation.";

/** Mirrors the server-side rejection of URLs so a doomed request never spends quota. */
export function findUrlInText(text: string): string | null {
  const match = text.match(/\bhttps?:\/\/\S+|\bwww\.\S+/i);
  return match ? match[0] : null;
}

export function validateImageUrls(imageUrls: string[] | undefined): string | null {
  if (!imageUrls) return null;
  for (const url of imageUrls) {
    if (!/^https:\/\//i.test(url)) {
      return `image_urls must be public https URLs, got: ${url}`;
    }
  }
  return null;
}

// Full ISO 8601 datetime with explicit timezone — mirrors what the API examples use.
const ISO_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;

export function validateIsoDate(value: string | undefined, field: string): string | null {
  if (value === undefined) return null;
  if (!ISO_DATETIME.test(value) || Number.isNaN(Date.parse(value))) {
    return `${field} must be an ISO 8601 datetime with timezone (e.g. 2026-06-01T14:00:00Z), got: ${value}`;
  }
  return null;
}

type ToolResult = {
  content: { type: "text"; text: string }[];
  isError?: boolean;
};

function ok(data: unknown, summary?: string): ToolResult {
  const json = JSON.stringify(data, null, 2);
  return { content: [{ type: "text", text: summary ? `${summary}\n\n${json}` : json }] };
}

function fail(message: string): ToolResult {
  return { content: [{ type: "text", text: message }], isError: true };
}

function formatError(err: unknown): ToolResult {
  if (err instanceof ClimbxError) {
    const parts = [`ClimbX API error ${err.status} (${err.code}): ${err.message}`];
    if (err.hint) parts.push(`Hint: ${err.hint}`);
    return fail(parts.join("\n"));
  }
  return fail(`Unexpected error: ${err instanceof Error ? err.message : String(err)}`);
}

/** Pulls the daily-cap usage out of write responses so the agent always sees it. */
function capSummary(data: unknown): string | undefined {
  const d = data as { posts_used_today?: number; daily_cap?: number };
  if (typeof d?.posts_used_today === "number" && typeof d?.daily_cap === "number") {
    return `Daily post cap: ${d.posts_used_today}/${d.daily_cap} used.`;
  }
  return undefined;
}

const textField = z
  .string()
  .min(1)
  .max(10_000)
  .describe("The post body, 1–10,000 characters. Must not contain URLs — ClimbX rejects link posts.");

const imageUrlsField = z
  .array(z.string())
  .max(4)
  .optional()
  .describe("Up to 4 public https image URLs to attach. Video is not supported.");

const windowFields = {
  start: z
    .string()
    .optional()
    .describe("ISO 8601 window start. Defaults to 30 days before end. Max span 366 days."),
  end: z.string().optional().describe("ISO 8601 window end. Defaults to now."),
};

export function registerTools(server: McpServer): void {
  let client: ClimbxClient | null = null;

  function getClient(): ClimbxClient | null {
    if (client) return client;
    const apiKey = process.env.CLIMBX_API_KEY;
    if (!apiKey) return null;
    const baseUrl = process.env.CLIMBX_BASE_URL ?? DEFAULT_BASE_URL;
    const baseUrlError = validateBaseUrl(baseUrl, process.env.CLIMBX_ALLOW_CUSTOM_BASE_URL === "1");
    if (baseUrlError) {
      throw new ClimbxError(0, "invalid_base_url", baseUrlError);
    }
    client = new ClimbxClient({ apiKey, baseUrl });
    return client;
  }

  /** Wraps a handler with the shared no-key check and error formatting. */
  function run<A>(handler: (c: ClimbxClient, args: A) => Promise<ToolResult>) {
    return async (args: A): Promise<ToolResult> => {
      try {
        const c = getClient();
        if (!c) return fail(SETUP_HINT);
        return await handler(c, args);
      } catch (err) {
        return formatError(err);
      }
    };
  }

  server.registerTool(
    "publish_post",
    {
      title: "Publish a post now",
      description:
        "Publish a post to X immediately through the connected ClimbX account. " +
        "Counts toward the daily cap of 5 posts per account per day (publish and schedule combined, resets 00:00 UTC). " +
        "Posts containing URLs are rejected. Attach up to 4 images via image_urls.",
      inputSchema: { text: textField, image_urls: imageUrlsField },
    },
    run(async (c, args: { text: string; image_urls?: string[] }) => {
      const url = findUrlInText(args.text);
      if (url) {
        return fail(
          `Rejected locally: the text contains a URL (${url}). ClimbX does not allow link posts. Remove the link and try again.`,
        );
      }
      const imgErr = validateImageUrls(args.image_urls);
      if (imgErr) return fail(imgErr);
      const data = await c.post("/posts", {
        text: args.text,
        ...(args.image_urls ? { image_urls: args.image_urls } : {}),
      });
      return ok(data, capSummary(data));
    }),
  );

  server.registerTool(
    "list_posts",
    {
      title: "List recent posts with metrics",
      description:
        "List the account's recent published posts with their latest metrics snapshot " +
        "(impressions, likes, replies, retweets, quote tweets) plus format label and reply flag.",
      inputSchema: {
        limit: z.number().int().min(1).max(100).optional().describe("How many posts to return, 1–100. Default 30."),
      },
    },
    run(async (c, args: { limit?: number }) => ok(await c.get("/posts", { limit: args.limit }))),
  );

  server.registerTool(
    "schedule_post",
    {
      title: "Schedule a post",
      description:
        "Queue a post for a future time; ClimbX publishes it at the scheduled minute and retries on transient failures. " +
        "A past time publishes on the next tick. Counts toward the daily cap of 5 posts per day at creation time. " +
        "Posts containing URLs are rejected.",
      inputSchema: {
        text: textField,
        scheduled_for: z.string().describe("ISO 8601 datetime, e.g. 2026-06-01T14:00:00Z."),
        image_urls: imageUrlsField,
      },
    },
    run(async (c, args: { text: string; scheduled_for: string; image_urls?: string[] }) => {
      const url = findUrlInText(args.text);
      if (url) {
        return fail(
          `Rejected locally: the text contains a URL (${url}). ClimbX does not allow link posts. Remove the link and try again.`,
        );
      }
      const imgErr = validateImageUrls(args.image_urls);
      if (imgErr) return fail(imgErr);
      const dateErr = validateIsoDate(args.scheduled_for, "scheduled_for");
      if (dateErr) return fail(dateErr);
      const data = await c.post("/schedule", {
        text: args.text,
        scheduled_for: args.scheduled_for,
        ...(args.image_urls ? { image_urls: args.image_urls } : {}),
      });
      return ok(data, capSummary(data));
    }),
  );

  server.registerTool(
    "list_scheduled",
    {
      title: "List scheduled posts",
      description: "List upcoming posts that are still pending or mid-publish.",
      inputSchema: {},
    },
    run(async (c) => ok(await c.get("/schedule"))),
  );

  server.registerTool(
    "reschedule_post",
    {
      title: "Reschedule a pending post",
      description:
        "Move a still-pending scheduled post to a new time. Only works while the post is pending; " +
        "once publishing has started it can no longer be changed.",
      inputSchema: {
        id: z.string().describe("The scheduled post id."),
        scheduled_for: z.string().describe("New ISO 8601 datetime."),
      },
    },
    run(async (c, args: { id: string; scheduled_for: string }) => {
      const dateErr = validateIsoDate(args.scheduled_for, "scheduled_for");
      if (dateErr) return fail(dateErr);
      return ok(await c.patch(`/schedule/${encodeURIComponent(args.id)}`, { scheduled_for: args.scheduled_for }));
    }),
  );

  server.registerTool(
    "cancel_scheduled",
    {
      title: "Cancel a scheduled post",
      description:
        "Cancel a still-pending scheduled post so it won't publish. " +
        "Note: cancelling does NOT refund the daily-cap slot — the post counted when it was created.",
      inputSchema: { id: z.string().describe("The scheduled post id.") },
    },
    run(async (c, args: { id: string }) => ok(await c.delete(`/schedule/${encodeURIComponent(args.id)}`))),
  );

  server.registerTool(
    "get_analytics",
    {
      title: "Performance summary",
      description:
        "Headline KPIs (posts published, impressions, average likes/replies, engagement rate) " +
        "plus a per-format breakdown over a lookback window. Replies are excluded.",
      inputSchema: {
        days: z.number().int().min(1).max(90).optional().describe("Lookback window in days, 1–90. Default 30."),
      },
    },
    run(async (c, args: { days?: number }) => ok(await c.get("/analytics", { days: args.days }))),
  );

  server.registerTool(
    "get_format_performance",
    {
      title: "Format performance",
      description:
        "Per-format breakdown over a window: post counts, share, median replies and impressions, " +
        "with an up/down/neutral trend vs. the account's typical post. Mirrors the Format performance table in the app.",
      inputSchema: windowFields,
    },
    run(async (c, args: { start?: string; end?: string }) => {
      const err = validateIsoDate(args.start, "start") ?? validateIsoDate(args.end, "end");
      if (err) return fail(err);
      return ok(await c.get("/analytics/formats", { start: args.start, end: args.end }));
    }),
  );

  server.registerTool(
    "get_niche_performance",
    {
      title: "Niche performance",
      description:
        "Same shape as format performance, bucketed by niche instead of format. " +
        'Posts without a niche label come back under "__unlabeled__".',
      inputSchema: windowFields,
    },
    run(async (c, args: { start?: string; end?: string }) => {
      const err = validateIsoDate(args.start, "start") ?? validateIsoDate(args.end, "end");
      if (err) return fail(err);
      return ok(await c.get("/analytics/niches", { start: args.start, end: args.end }));
    }),
  );

  server.registerTool(
    "get_voice_profile",
    {
      title: "Voice profile",
      description:
        "The account's voice persona, evidence-backed learnings, cadence targets (posts/replies per day), " +
        "and posting schedule (timezone, active hours, weekly slots). Use it to draft in the owner's voice and time posts well.",
      inputSchema: {},
    },
    run(async (c) => ok(await c.get("/voice"))),
  );

  server.registerTool(
    "get_learnings",
    {
      title: "Ongoing learnings",
      description:
        "The account's current do-more (positive) and do-less (negative) rules that ClimbX derived " +
        "from the owner's own posts, each with its evidence.",
      inputSchema: {},
    },
    run(async (c) => ok(await c.get("/learnings"))),
  );

  server.registerTool(
    "get_learnings_history",
    {
      title: "Learnings history",
      description:
        "The recorded timeline of the learnings set — one snapshot each time it was re-derived within the window. " +
        "History accrues from when the feature shipped; there is no retroactive backfill.",
      inputSchema: windowFields,
    },
    run(async (c, args: { start?: string; end?: string }) => {
      const err = validateIsoDate(args.start, "start") ?? validateIsoDate(args.end, "end");
      if (err) return fail(err);
      return ok(await c.get("/learnings/history", { start: args.start, end: args.end }));
    }),
  );
}
