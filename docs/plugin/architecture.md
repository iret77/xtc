# climbx-cowork plugin: architecture

Binding decisions for the Cowork Plugin v1.0 milestone (issues #12 to #23). Implementation sessions execute these decisions; they do not reopen them. If reality contradicts a decision (e.g. a platform capability is missing), stop and flag it in the issue instead of improvising.

Companion document: [contracts.md](contracts.md) holds the data shapes, storage paths, protocols, and design tokens that every issue shares.

## D1: Plugin structure

The plugin follows the Claude plugin schema (shared by Claude Code and Cowork). Root lives in this repo at `plugin/`:

```
plugin/
├── .claude-plugin/
│   └── plugin.json          # name: climbx-cowork, semver, description, author, license, repository
├── .mcp.json                # bundled MCP server wiring (see D2/D3)
├── skills/
│   ├── climbx/              # core orchestrator skill (issue #13)
│   ├── climbx-setup/        # first-run setup (issue #21)
│   ├── climbx-scan/         # opportunity radar (issue #14)
│   ├── climbx-draft/        # drafting pipeline (issue #15)
│   ├── climbx-ship/         # publish/schedule + queue (issue #16)
│   ├── climbx-engage/       # reply workflow (issue #17)
│   ├── climbx-dashboard/    # dashboard artifact (issues #18/#19)
│   │   └── references/dashboard.html
│   └── climbx-snapshot/     # local backups (issue #20)
├── shared/
│   ├── guardrails.md        # write-confirmation protocol, cap rules, draft guards
│   ├── api-notes.md         # tool cheat sheet, limits, error playbook
│   └── contracts.md         # copy of the shared contracts relevant at runtime
├── mcp-server/              # built copy of climbx-mcp (dist + prod deps), created by the build script
└── README.md
```

**No legacy `commands/` directory.** The current plugin spec treats single-file commands as legacy; every user-facing action is a skill with clear trigger phrases. **No hooks, no agents** in v1.0.

Skills keep their SKILL.md lean and reference `${CLAUDE_PLUGIN_ROOT}/shared/*.md` for shared rules. Never hardcode absolute paths; always use the plugin root variable.

## D2: MCP wiring: bundled stdio server

The plugin bundles the local stdio `climbx-mcp`, esbuild-bundled into a single self-contained file at `plugin/mcp-server/dist/index.mjs` (no `node_modules` is shipped, so the committed `plugin/` directory stays small and a marketplace/git install of it is complete). `.mcp.json` starts it through a `/bin/sh` wrapper, not a bare `node`. Proven root cause on macOS: Claude Desktop spawns plugin MCP servers natively on the host with the launchd GUI PATH (/usr/bin:/bin:/usr/sbin:/sbin), which contains /usr/bin/python3 but no node, npx, or uvx; a bare `command: "node"` therefore fails with a silent ENOENT before any log exists (verified by spawning under `env -i PATH=/usr/bin:/bin:/usr/sbin:/sbin`: bare node fails with command not found, an absolute node starts the server cleanly). `/bin/sh` is always on the GUI PATH; the wrapper appends the standard node locations (Homebrew ARM and Intel, then nvm as a fallback) and execs node. The env block passes CLAUDE_PLUGIN_ROOT into the process, which the wrapper uses to locate the bundle. `.mcp.json`:

```json
{
  "mcpServers": {
    "climbx": {
      "command": "/bin/sh",
      "args": ["-c", "PATH=\"$PATH:/opt/homebrew/bin:/usr/local/bin\"; command -v node >/dev/null 2>&1 || for d in \"$HOME/.nvm/versions/node\"/*/bin; do [ -x \"$d/node\" ] && PATH=\"$d:$PATH\" && break; done; exec node \"$CLAUDE_PLUGIN_ROOT/mcp-server/dist/index.mjs\""],
      "env": {
        "CLAUDE_PLUGIN_ROOT": "${CLAUDE_PLUGIN_ROOT}",
        "CLAUDE_PLUGIN_DATA": "${CLAUDE_PLUGIN_DATA}"
      }
    }
  }
}
```

Rationale (decided, not up for re-evaluation):
- Our server carries the guardrail layer the skills rely on: local pre-validation (URL rejection before a cap slot is spent, strict ISO datetimes, https-only images), actionable error hints per API code, cap summaries on write responses, request timeout, base-url exfiltration guard.
- Version pinning: plugin and MCP ship as one tested unit.
- The official remote MCP (`https://climbx.so/mcp`, HTTP transport, same Bearer key) stays documented in the README as the alternative for users who only want raw tools; the plugin itself does not depend on it.

Assumption to verify once in issue #12: the Cowork environment provides Node >= 20 (`node --version`). If not, stop and flag; do not build workarounds.

## D3: API key handling

Order of precedence, implemented in climbx-mcp (small feature, part of issue #12):

1. `CLIMBX_API_KEY` env var (existing behavior)
2. New: `CLIMBX_API_KEY_FILE` env var pointing at a key file
3. New: default key file `~/.climbx/api_key` if it exists

The key file is created by the setup skill (mode 0600, no trailing newline). This keeps the key out of every config file, works identically across Cowork sessions, and matches the existing convention. `.mcp.json` contains no secrets and no env expansion tricks.

Version bump for this MCP change: 0.4.0 (tools unchanged, config surface extended; update README config table and tests).

## D4: Skills, not conversation-only and not commands

Eight skills as listed in D1. The core skill `climbx` is the router and brain: it triggers on natural conversation about ClimbX, X growth, outliers, posting, and delegates into the same shared workflow references the action skills use. Action skills exist so Cowork users see explicit, discoverable entry points. All skills share one source of truth for rules (`shared/guardrails.md`); no rule is duplicated with different wording.

## D5: Dashboard is a template-published artifact

The dashboard is a single-file HTML template shipped at `skills/climbx-dashboard/references/dashboard.html`. The dashboard skill reads the template and publishes it as a Cowork artifact; refreshing means republishing the same file (stable identity). Inside the artifact:

- Data access exclusively via `window.cowork.callMcpTool("mcp__climbx__<tool>", args)`
- Conversation handoffs via `sendPrompt(...)` using the exact contract strings in contracts.md
- Chart library (Chart.js) inlined into the file; zero external network dependencies
- localStorage caching per contracts.md; cached state renders instantly, refresh in background

The proven reference implementation for this pattern (caching, chart setup, MCP unwrapping) is the maintainers' prior x-performance artifact; port patterns, do not import code wholesale.

## D6: Local state lives in ~/.climbx/

All plugin state is filesystem-local under `~/.climbx/` (exact files in contracts.md): API key, config, seen-opportunities store, snapshots. Never inside a git repo, never only in artifact localStorage (localStorage is a cache, `~/.climbx/` is the durable store).

## D7: Single account in v1.0

The API key model for multiple accounts is unclear upstream. v1.0 is single-account by design; all namespacing uses the literal scope `default` so multi-account can be added later without migrations. Do not build account switchers.

## D8: Language policy

Everything in the repo and plugin (docs, skills, UI text) is English; the repo is public and linked from ClimbX's official docs. Draft content follows `draft_language` in the user config (default `auto`: match the source outlier's language).

## D9: Audience: every ClimbX API user

The plugin ships in this public repo, which ClimbX links from its official docs. It is a product for any ClimbX customer with an API key, not a personal setup:

- Fully functional standalone. Complementary user-installed skills (post optimizer, brand voice) are detected generically and applied when present, never required and never referenced by product name.
- Nothing assumes the maintainers' environment: no host-specific tools in docs or skills, secure key entry is described generically, all user-facing text is English.
- All per-user variance (voice, learnings, formats, timezone, posting schedule, tracked creators, plan/scope, credits/lock state) comes from the user's own API responses at runtime. Never bake in values observed on a maintainer account.
- Portability: resolve the home directory at runtime (os.homedir() in Node; never rely on shell tilde expansion in paths). Target Cowork first, but do not break plain Claude Code usage of the same plugin.

## Work order

| Session | Issues | Notes |
|---|---|---|
| A | #12 then #13 | Foundation. #12 includes the MCP key-file feature and plugin scaffold; #13 the core skill + shared/guardrails.md |
| B | #14 then #15 | Radar and drafting; both depend on shared/ from session A |
| C | #16 then #17 | Ship/queue and engage |
| D | #18 | Dashboard foundation (biggest single issue, keep it alone) |
| E | #19 then #20 | Dashboard tabs, then snapshots |
| F | #21 | Onboarding + docs polish |
| G | #22 then #23 | Hardening/review, then packaging/release (release only on explicit owner go) |

Each issue carries a prepared implementation spec as its first comment. Read this file, contracts.md, and the issue spec before writing any code. Engineering standards apply to every change: worktree, PR, green CI, conventional commits, no Co-Authored-By trailers, no em/en dashes in any authored text.
