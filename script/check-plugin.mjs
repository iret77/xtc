#!/usr/bin/env node
// Structural validation for the climbx-cowork plugin. Run in CI and locally.
// Goes beyond "is it valid JSON" to check the things that actually break installs:
// manifest completeness, the .mcp.json wiring, the userConfig coupling, and that
// the dashboard artifact parses and stays self-contained.
import { readFileSync, existsSync, statSync } from "node:fs";
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
// Field finding (2026-07): hosts do NOT reliably prompt for userConfig on
// install (anthropics/claude-code#39455); the primary key path is the server's
// guided setup (begin_key_setup, needs the server to start keyless). The field
// therefore must NOT be required: a host that enforces required-but-never-
// prompted config would refuse to start the server at all. It stays declared
// and sensitive so hosts that do implement the prompt store it in the keychain.
const keyCfg = userConfig.CLIMBX_API_KEY || {};
check(keyCfg.required === false, "plugin.json: userConfig.CLIMBX_API_KEY.required must be false; the server starts keyless and begin_key_setup collects the key");
check(keyCfg.type === "string", "plugin.json: userConfig.CLIMBX_API_KEY.type must be \"string\"");
check(keyCfg.sensitive === true, "plugin.json: userConfig.CLIMBX_API_KEY.sensitive must be true (the key is a secret)");

// --- .mcp.json ---
const mcp = readJson("plugin/.mcp.json");
const srv = mcp.mcpServers && mcp.mcpServers.climbx;
check(srv, ".mcp.json: mcpServers.climbx missing");
if (srv) {
  // The server is launched through a plugin-local launcher, NOT a bare runtime
  // and NOT a network fetch. macOS Claude Desktop / Cowork spawns MCP servers
  // without the login shell PATH: a bare "node"/"npx" resolves to nothing
  // (ENOENT, silent no-connect) and "npx github:..." cannot run its git clone.
  // The launcher (referenced by an absolute ${CLAUDE_PLUGIN_ROOT} path) IS
  // spawnable and resolves Node itself. See D2.
  const LAUNCHER = "${CLAUDE_PLUGIN_ROOT}/scripts/launch.sh";
  check(
    srv.command === LAUNCHER,
    `.mcp.json: command must be the plugin-local launcher ${JSON.stringify(LAUNCHER)} (a bare node/npx or "npx github:" does not spawn on a PATH-less macOS host), got ${JSON.stringify(srv.command)}`,
  );
  const args = Array.isArray(srv.args) ? srv.args : [];
  const badRef = [srv.command, ...args].find((a) => typeof a === "string" && a.includes("github:"));
  check(!badRef, `.mcp.json: the server must be bundled and launched locally, not fetched at launch (found ${JSON.stringify(badRef)})`);
  // The launcher must exist and be executable, or the host cannot spawn it.
  const launcherPath = "plugin/scripts/launch.sh";
  const launcherAbs = join(root, launcherPath);
  check(existsSync(launcherAbs), `${launcherPath}: launcher script missing (referenced by .mcp.json command)`);
  if (existsSync(launcherAbs)) {
    check((statSync(launcherAbs).mode & 0o111) !== 0, `${launcherPath}: launcher must be executable (chmod +x)`);
  }
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
