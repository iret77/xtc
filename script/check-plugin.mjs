#!/usr/bin/env node
// Structural validation for the climbx-cowork plugin. Run in CI and locally.
// Goes beyond "is it valid JSON" to check the things that actually break installs:
// manifest completeness, the .mcp.json wiring, the userConfig coupling, and that
// the dashboard artifact parses and stays self-contained.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const check = (cond, msg) => { if (!cond) errors.push(msg); };
const readJson = (p) => JSON.parse(readFileSync(join(root, p), "utf8"));

// --- plugin.json ---
const manifest = readJson("plugin/.claude-plugin/plugin.json");
check(typeof manifest.name === "string" && manifest.name.length > 0, "plugin.json: name missing");
check(/^\d+\.\d+\.\d+$/.test(manifest.version || ""), `plugin.json: version not semver: ${manifest.version}`);
check(typeof manifest.description === "string" && manifest.description.length > 0, "plugin.json: description missing");
check(manifest.license, "plugin.json: license missing");
const userConfig = manifest.userConfig || {};
check(userConfig.CLIMBX_API_KEY, "plugin.json: userConfig.CLIMBX_API_KEY missing");
// The plugin is non-functional without a key, so it must be a required, secret
// string: otherwise Cowork installs without prompting and every tool call fails.
const keyCfg = userConfig.CLIMBX_API_KEY || {};
check(keyCfg.required === true, "plugin.json: userConfig.CLIMBX_API_KEY.required must be true so Cowork prompts for the key on install");
check(keyCfg.type === "string", "plugin.json: userConfig.CLIMBX_API_KEY.type must be \"string\"");
check(keyCfg.sensitive === true, "plugin.json: userConfig.CLIMBX_API_KEY.sensitive must be true (the key is a secret)");

// --- .mcp.json ---
const mcp = readJson("plugin/.mcp.json");
const srv = mcp.mcpServers && mcp.mcpServers.climbx;
check(srv, ".mcp.json: mcpServers.climbx missing");
if (srv) {
  check(srv.command === "npx", `.mcp.json: expected command "npx", got ${JSON.stringify(srv.command)}`);
  const args = Array.isArray(srv.args) ? srv.args : [];
  check(args.includes("-y"), ".mcp.json: args must include -y (non-interactive npx)");
  const ref = args.find((a) => typeof a === "string" && a.startsWith("github:iret77/climbx-mcp"));
  check(ref, ".mcp.json: args must reference github:iret77/climbx-mcp");
  // Must be pinned to a version tag (#vX.Y.Z) or a commit sha, not a branch or an
  // arbitrary ref, so installed plugins cannot be moved by a later push to climbx-mcp.
  check(
    ref && /#(v\d+\.\d+\.\d+|[0-9a-f]{7,40})$/.test(ref),
    `.mcp.json: the climbx-mcp ref must be pinned to a version tag (#vX.Y.Z) or a commit sha (got ${ref}); a branch or bare ref is not allowed`,
  );
  // userConfig coupling: every ${user_config.KEY} referenced must be declared.
  const env = srv.env || {};
  for (const val of Object.values(env)) {
    const m = typeof val === "string" && val.match(/\$\{user_config\.([A-Za-z0-9_]+)\}/);
    if (m) check(userConfig[m[1]], `.mcp.json references \${user_config.${m[1]}} but plugin.json userConfig has no ${m[1]}`);
  }
  check(env.CLIMBX_API_KEY === "${user_config.CLIMBX_API_KEY}", ".mcp.json: env.CLIMBX_API_KEY must be ${user_config.CLIMBX_API_KEY}");
}

// --- dashboard artifact ---
const html = readFileSync(join(root, "plugin/skills/climbx-dashboard/references/dashboard.html"), "utf8");
check(!/<script[^>]+\bsrc=/i.test(html), "dashboard.html: external <script src=...> found; the artifact must be self-contained");
const block = html.match(/<script>([\s\S]*?)<\/script>/);
check(block, "dashboard.html: no inline <script> block found");
if (block) {
  const app = block[1];
  try { new Function(app); } catch (e) { errors.push(`dashboard.html: app script does not parse: ${e.message}`); }
  // Regression guards for fixes that are easy to silently undo.
  check(!/\bDONE_TABS\b/.test(app), "dashboard.html: DONE_TABS reintroduced (dead code)");
  check(/function resolveSendPrompt\b/.test(app), "dashboard.html: resolveSendPrompt missing (chat-handoff robustness regressed)");
}

if (errors.length) {
  console.error("Plugin validation FAILED:");
  for (const e of errors) console.error("  - " + e);
  process.exit(1);
}
console.log("Plugin validation OK: manifests, mcp wiring, userConfig coupling, dashboard artifact.");
