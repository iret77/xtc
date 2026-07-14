# Contributing

## Dev setup

```bash
./script/setup
```

Activates the repo's git hooks (`core.hooksPath = .hooks`). This repo has no build step or dependencies of its own. Requires Node.js >= 20 (for `script/build-plugin` and the CI checks). Build the plugin bundle with `./script/build-plugin`.

## Repository layout

| Path | What it is |
|---|---|
| `plugin/` | The climbx-cowork Cowork plugin: skills, shared rules, the dashboard artifact, and the manifests. This is what this repo ships. |
| `mcp/` | Pointer only. The MCP server moved to [iret77/climbx-mcp](https://github.com/iret77/climbx-mcp); this folder is kept because the ClimbX docs link to it. |
| `reference/` | Read-only reference material. Not part of any build. |

## Working on the MCP server

The server is no longer in this repo. It lives in [iret77/climbx-mcp](https://github.com/iret77/climbx-mcp) with its own source, tests, and CI. The plugin bundles a pinned build of it (`plugin/mcp-server/index.mjs`, fetched and sha-verified by `script/build-plugin`) and launches it through `plugin/scripts/launch.sh`; see the `.mcp.json` in `plugin/` and D2 in `docs/plugin/architecture.md`.

`CLIMBX_API_KEY` is provided via environment variable or the `~/.climbx/api_key` file only. Never commit keys, tokens, or `.env` files.

## Git workflow

See [AGENTS.md](AGENTS.md), the rules apply to humans as well:

- No direct pushes to `main`; every change goes through a feature branch and PR.
- Commits land in worktrees, not in the main clone (enforced by `.hooks/pre-commit`).
- Conventional commits (`feat:`, `fix:`, `docs:`, `chore:`, ...), PR titles < 70 chars.
- CI (`tests` job) must be green before merge.

## Releases

Stable tags (`vX.Y`, `vX.Y.Z`) are cut from `main` only, after the PR has merged; `.github/workflows/release-tag-guard.yml` enforces this. Pre-release tags may come from dev branches. The plugin version lives in `plugin/.claude-plugin/plugin.json`; the MCP server is versioned in its own repo, [iret77/climbx-mcp](https://github.com/iret77/climbx-mcp).
