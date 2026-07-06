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

## D2: MCP wiring: server fetched by npx from its own repo

The plugin declares its MCP server in `.mcp.json` and launches it with `npx github:iret77/climbx-mcp`, which fetches and caches the self-contained [climbx-mcp](https://github.com/iret77/climbx-mcp) package (a committed esbuild bundle, no install step) on first run.

Field finding (2026-07), corrected: Claude Desktop does **not** start a plugin MCP server that points at a plugin-local file (`${CLAUDE_PLUGIN_ROOT}/...`) in Cowork; on the verification system such a server never spawned (no log at all). The earlier "GUI PATH lacks node" diagnosis was wrong: the sibling mcp-marketdata plugin launches its server via `uvx --from git+ssh://...` from the same `/opt/homebrew/bin`, so `node` resolves fine; the real difference is that a plugin-local path is not reachable by the host-side spawn, while a remote-fetched server (uvx/npx from git or npm) is. This wiring mirrors the working mcp-marketdata pattern, verified with a live `npx github:iret77/climbx-mcp` connect (16 tools).

```json
{
  "mcpServers": {
    "climbx": {
      "command": "npx",
      "args": ["-y", "github:iret77/climbx-mcp"],
      "env": {
        "CLIMBX_API_KEY": "${user_config.CLIMBX_API_KEY}"
      }
    }
  }
}
```

The API key reaches the server through the plugin's `CLIMBX_API_KEY` user config (OS keychain) as `${user_config.CLIMBX_API_KEY}`, or the server's own `~/.climbx/api_key` fallback. The dashboard artifact resolves the tool-name prefix at runtime by probing, so it works whichever way the server is connected (plugin, or the `climbx-mcp` Desktop extension). The server keeps the guardrail layer the skills rely on (URL rejection before a cap slot is spent, strict ISO datetimes, https-only images, error hints, request timeout, base-url guard). The official remote MCP (`https://climbx.so/mcp`) stays documented as an alternative.

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
