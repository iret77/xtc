# climbx-cowork plugin: architecture

Binding decisions for the Cowork Plugin v1.0 milestone (issues #12 to #23). Implementation sessions execute these decisions; they do not reopen them. If reality contradicts a decision (e.g. a platform capability is missing), stop and flag it in the issue instead of improvising.

Companion document: [contracts.md](contracts.md) holds the data shapes, storage paths, protocols, and design tokens that every issue shares.

## D1: Plugin structure

The plugin follows the Claude plugin schema (shared by Claude Code and Cowork). Root lives in this repo at `plugin/`:

```
plugin/
├── .claude-plugin/
│   └── plugin.json          # name: climbx-cowork, semver, description, author, license, repository
├── .mcp.json                # MCP wiring: plugin-local launcher -> bundled server (see D2/D3)
├── scripts/
│   └── launch.sh            # resolves Node without the GUI PATH, execs the bundled server (D2)
├── mcp-server/              # bundled climbx-mcp (build output; fetched + sha-pinned by script/build-plugin)
│   └── index.mjs
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
└── README.md
```

**No legacy `commands/` directory.** The current plugin spec treats single-file commands as legacy; every user-facing action is a skill with clear trigger phrases. **No hooks, no agents** in v1.0.

Skills keep their SKILL.md lean and reference `${CLAUDE_PLUGIN_ROOT}/shared/*.md` for shared rules. Never hardcode absolute paths; always use the plugin root variable.

## D2: MCP wiring: bundled server, launched by a plugin-local launcher

The plugin ships the [climbx-mcp](https://github.com/iret77/climbx-mcp) server as a self-contained esbuild bundle at `mcp-server/index.mjs` and launches it through a plugin-local launcher script. The bundle is fetched from the **pinned** climbx-mcp tag (`v0.5.0`) at build time and verified against a pinned sha256 (`script/build-plugin`), so a moved tag or corrupted download fails the build and installed plugins cannot be changed by a later push to climbx-mcp; bump the pin deliberately when adopting a new server release.

```json
{
  "mcpServers": {
    "climbx": {
      "command": "${CLAUDE_PLUGIN_ROOT}/scripts/launch.sh",
      "args": [],
      "env": {
        "CLIMBX_API_KEY": "${user_config.CLIMBX_API_KEY}"
      }
    }
  }
}
```

Field finding (2026-07, corrected twice): the earlier `npx -y github:iret77/climbx-mcp#v0.5.0` wiring **never connected** on the owner's macOS Claude Desktop / Cowork (no tools, guided setup unreachable). Two independent causes: (1) macOS spawns MCP servers **without the login shell PATH**, so a bare `node`/`npx` resolves to nothing (ENOENT, silent no-connect); (2) `npx github:` additionally needs a runtime `git clone`, which the spawn sandbox cannot do. The previous note here claimed a plugin-local `${CLAUDE_PLUGIN_ROOT}/...` path "does not spawn" -- that was **wrong**: the owner's own working plugins (`musicvideo` via `${CLAUDE_PLUGIN_ROOT}/scripts/mv-mcp-launch.sh`, `li-cache` via an absolute node path) launch from a plugin-local path fine. The real requirement is a launcher **script** (spawnable by its absolute path) that resolves the runtime itself; never a bare runtime name, and never a launch-time network fetch.

`plugin/scripts/launch.sh` resolves Node without the GUI PATH (an explicit `CLIMBX_NODE` override, then common absolute locations such as `/opt/homebrew/bin/node`, then nvm, then PATH) and `exec`s the bundled server. It writes only to stderr; stdout is the JSON-RPC channel. Verified with the server connecting and listing all 18 tools under an empty environment with no PATH.

The API key reaches the server through the guided key setup built into the server (see D3.1; persisted to `~/.climbx/api_key`), through the plugin's `CLIMBX_API_KEY` user config as `${user_config.CLIMBX_API_KEY}` where a host implements the prompt, or through the env var directly. The dashboard artifact resolves the tool-name prefix at runtime by probing, so it works whichever host the plugin's server runs in (Cowork or Claude Code). The server keeps the guardrail layer the skills rely on (URL rejection before a cap slot is spent, strict ISO datetimes, https-only images, error hints, request timeout, base-url guard). Running the server standalone in a shell with `npx -y github:iret77/climbx-mcp` and the official remote MCP (`https://climbx.so/mcp`) stay documented as alternatives; the git-clone limitation is specific to the PATH-less GUI plugin spawn, not to a normal shell.

## D3: API key handling

Order of precedence, implemented in climbx-mcp (small feature, part of issue #12):

1. `CLIMBX_API_KEY` env var (existing behavior)
2. New: `CLIMBX_API_KEY_FILE` env var pointing at a key file
3. New: default key file `~/.climbx/api_key` if it exists

The key file is created by the setup skill (mode 0600, no trailing newline). This keeps the key out of every config file, works identically across Cowork sessions, and matches the existing convention. `.mcp.json` contains no secrets and no env expansion tricks.

Version bump for this MCP change: 0.4.0 (tools unchanged, config surface extended; update README config table and tests).

### D3.1: Guided key setup lives in the server (2026-07, plugin v1.4.0 / climbx-mcp v0.5.0)

Field finding: Cowork/Claude Desktop installs the plugin **without prompting** for the declared `userConfig` key (upstream: anthropics/claude-code#39455). Worse, the unresolved `${user_config.CLIMBX_API_KEY}` template reached the server literally via env, which both failed every request with `invalid_key` and shadowed the key-file fallback. Laypeople had no acceptable entry path (a shell or hidden folders is not one).

Decision: key onboarding moves into climbx-mcp itself, independent of any host install UI (the URL-mode pattern the MCP spec prescribes for secrets):

- Key resolution ignores empty values and unresolved `${...}` placeholders (v0.5.0), so precedence falls through correctly.
- New tools: `get_key_status` (configured/source/masked tail; no network, never reveals the key) and `begin_key_setup` (one-time, token-guarded key entry page on `127.0.0.1`; live validation; persisted to `~/.climbx/api_key` 0700/0600; hot-swapped into the running server, no restart).
- The setup skill leads with this flow; the key is never requested in the chat.
- `userConfig.CLIMBX_API_KEY` stays declared (keychain storage if a host ever implements the prompt) but is now `required: false`: a host that enforces required-but-never-prompted config would refuse to start the server, and the server must start keyless for the guided setup to exist.

Hard lifecycle constraint (owner requirement): nothing may linger on the host. No extra process is spawned; the listener lives inside the MCP server process, is `unref()`ed, closes on success, expiry, attempt cap, and shutdown, and the server process exits by itself when the host hangs up stdio (orphan guard). Enforced by tests in climbx-mcp (`test/setup.test.ts`, `test/lifecycle.test.ts`).

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
