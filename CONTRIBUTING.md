# Contributing

## Dev setup

```bash
./script/setup
```

Installs the `mcp/` dependencies and activates the repo's git hooks (`core.hooksPath = .hooks`). Requires Node.js ≥ 20.

## Repository layout

| Path | What it is |
|---|---|
| `mcp/` | `climbx-mcp` — MCP server for the ClimbX API. Self-contained npm package. |
| `reference/` | Read-only reference material. Not part of any build. |

## Working on the MCP server

```bash
cd mcp
npm run build    # TypeScript → dist/
npm test         # unit tests (mocked, no network)
npm run smoke    # live read-only test against the real API — needs CLIMBX_API_KEY
```

`CLIMBX_API_KEY` is provided via environment variable only. Never commit keys, tokens, or `.env` files.

## Git workflow

See [AGENTS.md](AGENTS.md) — the rules apply to humans as well:

- No direct pushes to `main`; every change goes through a feature branch and PR.
- Commits land in worktrees, not in the main clone (enforced by `.hooks/pre-commit`).
- Conventional commits (`feat:`, `fix:`, `docs:`, `chore:`, …), PR titles < 70 chars.
- CI (`tests` job) must be green before merge.

## Releases

Stable tags (`vX.Y`, `vX.Y.Z`) are cut from `main` only, after the PR has merged; `.github/workflows/release-tag-guard.yml` enforces this. Pre-release tags may come from dev branches. Version lives in `mcp/package.json`.
