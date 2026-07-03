# climbx-cowork plugin

A Claude Cowork plugin that turns the ClimbX API into a full X-growth workflow: scan the
outlier feeds for what is working in your niche, draft posts in your own voice, schedule or
publish them, and draft replies, without opening a web app. It also runs in plain Claude Code.

> **Community project.** Not affiliated with or endorsed by ClimbX. It wraps the official public
> API documented at [climbx.so/developers/docs](https://climbx.so/developers/docs).

This is the plugin foundation (issue #12). The user-facing skills and dashboard are added by the
remaining Cowork Plugin v1.0 issues.

## How it talks to ClimbX

The plugin bundles the local stdio `climbx-mcp` server (built into `mcp-server/` by the packaging
script) and wires it through `.mcp.json`. Bundling keeps the guardrail layer, version pinning, and
one tested unit. The official remote MCP at `https://climbx.so/mcp` (HTTP transport, same Bearer
key) is the documented alternative for users who only want the raw tools; the plugin does not
depend on it.

## API key

The key is never stored in plain text in a config file. The bundled server resolves it in this
order:

1. `CLIMBX_API_KEY` environment variable
2. `CLIMBX_API_KEY_FILE` pointing at a key file
3. the default key file `~/.climbx/api_key` (mode 0600)

The setup skill (issue #21) writes the default key file during first-run setup, so the key is
entered once and reused across every Cowork session.

## Build

From the repository root:

```bash
script/build-plugin
```

This builds the MCP server, copies its production output into `mcp-server/`, and zips the plugin
to `climbx-cowork.plugin`. Install that file in Claude Cowork.

## Verification

Foundation checks recorded on the build host (Linux, Node via nvm):

- **Node runtime:** `node --version` reports `v24.17.0`, meeting the Node >= 20 requirement.
- **Tool call through the bundled server:** `get_voice_profile` called over the MCP stdio protocol
  against the bundled `mcp-server/dist/index.js`, with no `CLIMBX_API_KEY` in the environment so the
  key is resolved from `~/.climbx/api_key`. The server listed all 16 tools and returned the live
  voice profile (no error), confirming the key-file path and the MCP wiring work end to end.
