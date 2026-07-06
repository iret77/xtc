---
name: climbx-dashboard
description: Open the ClimbX dashboard, a live analytics cockpit inside Cowork. Use for "show my X dashboard", "open the ClimbX dashboard", "how are my posts doing", "show my analytics", or "dashboard". Publishes a single-file artifact with overview KPIs, recent posts, format and niche performance, your voice and cadence, and the weekly posting schedule, cached for instant load and refreshed in the background.
---

# ClimbX dashboard

Publish the dashboard artifact so the user can watch their ClimbX analytics without opening the web
app. It loads instantly from cache and refreshes in the background.

First read `${CLAUDE_PLUGIN_ROOT}/shared/contracts.md` (storage, snapshots, localStorage keys) and
`${CLAUDE_PLUGIN_ROOT}/shared/api-notes.md` (read rate budget, error playbook).

## Publish

1. Preflight: make sure the API key resolves. If not, route to the `climbx-setup` skill first.
2. Opportunistic snapshot: if the newest file in `~/.climbx/snapshots/` is older than
   `snapshot_throttle_hours` (config, default 20) or none exists, capture one before opening the
   dashboard (delegate to `climbx-snapshot` if installed).
3. Read the template file at
   `${CLAUDE_PLUGIN_ROOT}/skills/climbx-dashboard/references/dashboard.html` and publish it as a
   Cowork artifact. The file is fully self-contained (Chart.js is vendored inline; there are no
   external network requests). Do not edit or inject data into it; it fetches its own data at runtime
   through `window.cowork.callMcpTool(...)`, resolving the tool-name prefix at runtime (the plugin
   launches its own climbx-mcp server, so the tools resolve the same way in Cowork and Claude Code).

## Refresh

Republishing the same template file refreshes the dashboard while keeping a stable artifact identity.
The artifact also refreshes its own data in the background on open and via its Refresh button, so a
republish is only needed to pick up a new template version.

## What the artifact does itself

- Reads `get_analytics`, `list_posts`, `get_format_performance`, `get_niche_performance`, and
  `get_voice_profile` (voice, cadence, and the weekly posting schedule) within the read rate budget
  (calls spaced by about 260 ms; at most a handful per load).
- Caches each section in `localStorage` under the `climbx_default_` keys with a 6 hour TTL, renders
  the cached state instantly, then refreshes in the background and shows "updated Xs ago".
- Renders designed loading skeletons, empty states, and, for `401` / `402` / `429` and connection
  errors, the guidance from the shared error playbook, all inside the artifact.
- Dark theme by default with a light toggle, on the shared design tokens.

All five tabs are implemented and load live data through the MCP tools: Overview (KPIs and charts),
Posts, Opportunities (with feed and filter controls), Queue (scheduled posts), and Learnings over time.
