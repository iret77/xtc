# climbx-cowork

> ClimbX spots what's blowing up in your niche; this project has Claude turn it into posts in your voice and schedule them, so you never open a web app for it again.

A community-built companion for [ClimbX](https://climbx.so), the AI tool for growing an audience on X. ClimbX provides the engine: outlier detection across your niche, a voice profile learned from your own posts, evidence-backed do-more/do-less learnings, and posting through your connected account. This project brings that engine into Claude, where your own AI does the writing.

> **Community project.** Not affiliated with or endorsed by ClimbX. Everything here uses the official public API documented at [climbx.so/developers/docs](https://climbx.so/developers/docs), which links this repo as the community MCP option.

## What's in this repo

| Component | Status | What it is |
|---|---|---|
| [`mcp/`](mcp/) | **Released** ([latest](https://github.com/iret77/climbx-cowork/releases/latest)) | `climbx-mcp`: a local stdio MCP server wrapping the full ClimbX API. 16 tools: publish and schedule posts, analytics by format and niche, voice profile, learnings with history, both inspiration feeds, and reply drafting. Ships as a one-click Claude Desktop bundle (`.mcpb`). |
| `plugin/` | **In development** ([milestone](https://github.com/iret77/climbx-cowork/milestone/1)) | A Claude Cowork plugin built on that server: an opportunity radar with explanations of why posts hit, a drafting pipeline that writes in your voice using your ClimbX learnings, guarded publishing and queue management, a reply workflow, and a live dashboard artifact. |

## Use it today

Install the MCP server and every ClimbX capability becomes available in Claude Desktop, Claude Code, or any MCP client:

- **One click:** download [`climbx-mcp.mcpb`](https://github.com/iret77/climbx-cowork/releases/latest/download/climbx-mcp.mcpb) and open it with Claude Desktop. Full instructions in the [mcp/ README](mcp/README.md).
- **Zero install:** ClimbX also hosts an official remote MCP at `https://climbx.so/mcp` (HTTP transport, same API key).

You need a ClimbX account on an active plan or trial and an API key (ClimbX app: Settings > API).

## What's coming

The Cowork plugin turns the raw tools into a finished workflow: scan your niche for outliers, understand why they worked, draft posts in your own voice with your learnings applied, confirm and schedule them, manage the queue, draft replies for posts worth engaging with, and watch it all on a live dashboard. Progress is public in the [v1.0 milestone](https://github.com/iret77/climbx-cowork/milestone/1); design decisions live in [docs/plugin/](docs/plugin/).

## Principles

- Every write action is user-confirmed; nothing posts on its own.
- Your API key stays local (environment variable, key file, or OS keychain; never in configs or repos).
- The ClimbX guardrails (daily post cap, no link posts, reply credits) are enforced client-side before they cost you anything.

## License

[MIT](LICENSE)
