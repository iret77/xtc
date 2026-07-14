#!/bin/sh
# Launcher for the climbx MCP server, referenced from .mcp.json as
#   "command": "${CLAUDE_PLUGIN_ROOT}/scripts/launch.sh"
#
# Why a launcher script instead of "command": "node ..." or "npx github:...":
# macOS Claude Desktop / Cowork spawns MCP servers WITHOUT the user's login
# shell PATH. A bare "node"/"npx" then resolves to nothing (ENOENT) and the
# server silently never connects; "npx -y github:..." additionally needs a
# runtime "git clone" that the spawn sandbox cannot do. A script referenced by
# an absolute ${CLAUDE_PLUGIN_ROOT} path IS spawnable, and it resolves Node
# itself. This mirrors the working musicvideo/li-cache plugins.
#
# CRITICAL: the server speaks JSON-RPC over stdout. Nothing here may write to
# stdout; every diagnostic goes to stderr, or the protocol stream corrupts.
set -eu

ROOT="${CLAUDE_PLUGIN_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
SERVER="$ROOT/mcp-server/index.mjs"

if [ ! -f "$SERVER" ]; then
  echo "climbx-mcp launcher: bundled server not found at $SERVER" >&2
  exit 66
fi

# Resolve a Node runtime without relying on the GUI PATH. Order:
#   1. explicit override (CLIMBX_NODE)
#   2. common absolute install locations (Homebrew arm64/Intel, system)
#   3. the nvm-managed Node (newest match wins)
#   4. PATH, as a last resort
NODE=""
for c in "${CLIMBX_NODE:-}" /opt/homebrew/bin/node /usr/local/bin/node /usr/bin/node; do
  if [ -n "$c" ] && [ -x "$c" ]; then
    NODE="$c"
    break
  fi
done
if [ -z "$NODE" ]; then
  for n in "$HOME"/.nvm/versions/node/*/bin/node; do
    if [ -x "$n" ]; then
      NODE="$n"
    fi
  done
fi
if [ -z "$NODE" ]; then
  NODE="$(command -v node 2>/dev/null || true)"
fi
if [ -z "$NODE" ]; then
  echo "climbx-mcp launcher: no Node runtime found. Install Node 20+ or set CLIMBX_NODE to its path." >&2
  exit 127
fi

# exec so the server owns stdio directly (stdout is the MCP protocol channel).
exec "$NODE" "$SERVER"
