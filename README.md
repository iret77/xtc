# climbx-cowork

> ClimbX spots what's blowing up in your niche; this project has Claude turn it into posts in your voice and schedule them, so you never open a web app for it again.

A community-built companion for [ClimbX](https://climbx.so), the AI tool for growing an audience on X. ClimbX provides the engine: outlier detection across your niche, a voice profile learned from your own posts, evidence-backed do-more/do-less learnings, and posting through your connected account. This project brings that engine into Claude, where your own AI does the writing.

> **Community project.** Not affiliated with or endorsed by ClimbX. Everything here uses the official public API documented at [climbx.so/developers/docs](https://climbx.so/developers/docs), which links this repo as the community MCP option.

## What's in this repo

| Component | Status | What it is |
|---|---|---|
| [`mcp/`](mcp/) | Moved to [iret77/climbx-mcp](https://github.com/iret77/climbx-mcp) | `climbx-mcp`: a local stdio MCP server wrapping the full ClimbX API. 16 tools: publish and schedule posts, analytics by format and niche, voice profile, learnings with history, both inspiration feeds, and reply drafting. The `mcp/` folder here is a pointer kept because the ClimbX docs link to it. |
| [`plugin/`](plugin/) | **Released** ([v1.4.0](https://github.com/iret77/climbx-cowork/releases/latest)) | A Claude Cowork plugin built on that server: an opportunity radar with explanations of why posts hit, a drafting pipeline that writes in your voice using your ClimbX learnings, guarded publishing and queue management, a reply workflow, and a live dashboard artifact (KPIs, format and niche performance, voice and cadence, and the weekly posting schedule). |

## Use it today

- **The full workflow (Cowork):** upload [`climbx-cowork.plugin`](https://github.com/iret77/climbx-cowork/releases/latest/download/climbx-cowork.plugin) from the [latest release](https://github.com/iret77/climbx-cowork/releases/latest) in Cowork and say "set up ClimbX": the guided setup hands you a private local page to paste your API key into, so no configuration and no terminal are needed. The plugin launches its MCP server itself via `npx -y github:iret77/climbx-mcp`, so there is nothing else to install. Full instructions in the [plugin README](plugin/README.md).
- **Just the tools (any MCP client):** run the server with `npx -y github:iret77/climbx-mcp` (no install, no npm account), or point at ClimbX's official remote MCP at `https://climbx.so/mcp`. Full instructions in the [climbx-mcp README](https://github.com/iret77/climbx-mcp#readme).

You need a ClimbX account on an active plan or trial and an API key (ClimbX app: Settings > API).

## The Cowork plugin

The plugin turns the raw tools into a finished workflow: scan your niche for outliers, understand why they worked, draft posts in your own voice with your learnings applied, confirm and schedule them, manage the queue, draft replies for posts worth engaging with, and watch it all on a live dashboard. It is released as v1.4.0. See the [plugin README](plugin/README.md) to get started, the [latest release](https://github.com/iret77/climbx-cowork/releases/latest) for the download, and [docs/plugin/](docs/plugin/) for the design decisions.

## Principles

- Every write action is user-confirmed; nothing posts on its own.
- Your API key stays local (entered on a locally served one-time page or via env var/key file; never in the chat, configs, or repos).
- The ClimbX guardrails (daily post cap, no link posts, reply credits) are enforced client-side before they cost you anything.

## License

[MIT](LICENSE)
