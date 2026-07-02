# climbx-mcp

An [MCP](https://modelcontextprotocol.io) server for the [ClimbX](https://climbx.so) API: publish and schedule X posts, and read your analytics, voice profile, and learnings from any MCP client (Claude Desktop, Claude Code, Claude Cowork, and others).

> **Community project.** Not affiliated with or endorsed by ClimbX. It wraps the official public API documented at [climbx.so/developers/docs](https://climbx.so/developers/docs).

## Requirements

- A ClimbX account on an active plan or trial
- A ClimbX API key: create one in the app under **Settings → API** (the full key is shown only once)
- Node.js ≥ 20

## Setup

```bash
npm install
npm run build
```

The server reads its configuration from environment variables:

| Variable | Required | Description |
|---|---|---|
| `CLIMBX_API_KEY` | yes | Your ClimbX API key (`climbx_sk_...`). Never commit it anywhere. |
| `CLIMBX_BASE_URL` | no | API base URL. Defaults to `https://climbx.so/api/v1`. Must be an https `climbx.so` URL unless `CLIMBX_ALLOW_CUSTOM_BASE_URL=1` is set. |
| `CLIMBX_ALLOW_CUSTOM_BASE_URL` | no | Set to `1` to allow a non-climbx.so base URL (dev/staging). Off by default so the key can't be sent to an unexpected host. |

### Claude Code

Avoid typing the key inline (it would land in your shell history). Reference an environment variable instead, e.g. one loaded from your shell profile or a secret manager:

```bash
claude mcp add climbx --env CLIMBX_API_KEY="$CLIMBX_API_KEY" -- node /path/to/climbx-mcp/dist/index.js
```

### Claude Desktop

```json
{
  "mcpServers": {
    "climbx": {
      "command": "node",
      "args": ["/path/to/climbx-mcp/dist/index.js"],
      "env": { "CLIMBX_API_KEY": "climbx_sk_..." }
    }
  }
}
```

## Tools

| Tool | What it does |
|---|---|
| `publish_post` | Publish a post to X immediately (text + up to 4 image URLs) |
| `list_posts` | Recent published posts with metrics (impressions, likes, replies, …) |
| `schedule_post` | Queue a post for a future time |
| `list_scheduled` | Upcoming pending posts |
| `reschedule_post` | Move a pending scheduled post to a new time |
| `cancel_scheduled` | Cancel a pending scheduled post |
| `get_analytics` | Headline KPIs + per-format breakdown over a lookback window |
| `get_format_performance` | Format table with medians and trends |
| `get_niche_performance` | Same, bucketed by niche |
| `get_voice_profile` | Voice persona, learnings, cadence targets, posting schedule |
| `get_learnings` | Current do-more/do-less rules with evidence |
| `get_learnings_history` | Snapshots of the learnings set over time |
| `get_inspiration_options` | Filter values the inspiration feeds accept, plus your tracked creators |
| `get_following_outliers` | Outlier posts from the creators you track (multiplier vs author baseline) |
| `get_surprise_outliers` | Discovery feed: outliers from across the network with filters |

## Good to know (ClimbX API limits)

- **5 posts per day** per account across publish and schedule, resets 00:00 UTC. Cancelling a scheduled post does **not** refund the slot.
- **No URLs in post text.** ClimbX rejects link posts. This server also rejects them locally before spending a request.
- Read endpoints allow ~60 requests/minute; the server honors `Retry-After` and retries once.
- Using the API refreshes your ClimbX data in the background, so there is no need to open the web app.

## Development

```bash
npm test         # unit tests (mocked, no network)
npm run smoke    # live read-only test against the real API (needs CLIMBX_API_KEY)
npm run smoke -- --write   # + schedule/cancel roundtrip (consumes a daily-cap slot!)
```

## License

[MIT](LICENSE)
