# climbx-mcp

> **This server now lives in its own repository: [iret77/climbx-mcp](https://github.com/iret77/climbx-mcp).**
>
> This folder is kept as a stable link target: the [ClimbX developer docs](https://climbx.so/developers/docs) link here as the community "climbx-cowork MCP". The source, tests, and packaging moved to [iret77/climbx-mcp](https://github.com/iret77/climbx-mcp) so there is a single, non-duplicated home. Please use that repo.

An [MCP](https://modelcontextprotocol.io) server for the [ClimbX](https://climbx.so) API: publish and schedule X posts, read your analytics, voice profile, and learnings, pull outlier posts from the inspiration feeds, and draft replies in your voice, all from any MCP client (Claude Desktop, Claude Code, Claude Cowork, and others).

> **Community project.** Not affiliated with or endorsed by ClimbX. It wraps the official public API documented at [climbx.so/developers/docs](https://climbx.so/developers/docs).

## Run it

No install and no npm account needed: `npx` fetches and runs the committed bundle straight from the repo.

```bash
CLIMBX_API_KEY=climbx_sk_... npx -y github:iret77/climbx-mcp
```

Point any MCP client at that command. The full setup, the 16-tool list, the API limits, and every configuration option live in the [climbx-mcp README](https://github.com/iret77/climbx-mcp#readme).

Requirements: a ClimbX account on an active plan or trial, an API key (create one in the app under **Settings > API**, the full key is shown only once), and Node.js >= 20. The key can also be placed in `~/.climbx/api_key` (mode 0600) instead of the environment.

> **Zero-install alternative:** ClimbX also hosts an official remote MCP server at `https://climbx.so/mcp` (HTTP transport, same Bearer key). This community project is the local stdio option wrapping the same API.

## Prefer the finished workflow?

The [climbx-cowork Cowork plugin](../plugin/README.md) is built on this server and turns the raw tools into scanning, drafting in your voice, guarded publishing, a reply workflow, and a live dashboard. It launches this same server for you via `npx github:iret77/climbx-mcp`, so you install only the one plugin.

## License

[MIT](LICENSE)
