# climbx-cowork plugin

Turn the ClimbX API into a finished X-growth workflow inside Claude. Scan your niche for outlier
posts and learn why they worked, draft posts and replies in your own voice using your ClimbX
learnings, publish or schedule them behind an explicit confirmation, and watch it all on a live
dashboard. It targets Claude Cowork and also runs in plain Claude Code.

> **Community project.** Not affiliated with or endorsed by ClimbX. It wraps the official public API
> documented at [climbx.so/developers/docs](https://climbx.so/developers/docs), which links this repo
> as the community option.

## Requirements

- A ClimbX account on an active plan or trial, and an API key (ClimbX app: Settings > API). A
  read & write key is needed for publishing, scheduling, and reply drafting; a read-only key works
  for analytics and scanning.
- For the opportunity radar: a few creators tracked in your ClimbX Following feed.
- Node.js 20 or newer: the plugin fetches and runs its MCP server with `npx` (same in Cowork and Claude Code).

## Install

Install the plugin (skills, dashboard, and the MCP server wiring) in Claude Cowork by uploading
[`climbx-cowork.plugin`](https://github.com/iret77/climbx-cowork/releases/latest/download/climbx-cowork.plugin)
from the [latest release](https://github.com/iret77/climbx-cowork/releases/latest), or build it with
`script/build-plugin`.

The plugin does not bundle the server: `.mcp.json` launches it with
`npx -y github:iret77/climbx-mcp`, which fetches and caches the self-contained
[climbx-mcp](https://github.com/iret77/climbx-mcp) server on first run (needs Node and network once).
You do not need to configure anything by hand; the first conversation sets up the API key for you.
ClimbX also hosts an official remote MCP at `https://climbx.so/mcp` for raw tool access.

## Setup (first run)

The plugin provides the skills, the dashboard, and the MCP server wiring. You install only the one
plugin; there is no separate extension to add, no terminal, and no hidden folders.

1. Say "set up ClimbX". Claude gives you a private link that opens a small page served locally on
   your own machine; paste your ClimbX API key there (create it in the ClimbX app under
   **Settings > API**; the full key is shown only once). The page checks the key with ClimbX,
   stores it on your computer, and closes itself; the key never appears in the chat.
2. The setup then validates your account live and writes your preferences; it ends by offering a
   first scan or the dashboard.

Power users can skip the guided page and instead set the `CLIMBX_API_KEY` environment variable or
place the key in `~/.climbx/api_key` (mode 0600); the server picks either up automatically.

## The workflows

Everything is driven by natural conversation. Talk to it; you do not need to remember commands.

### 1. Scan: what is working in my niche
> "What's breaking out in my niche?"

Pulls both inspiration feeds, ranks the outliers by multiplier and recency, and explains why each one
worked (the hook, structure, or reply-bait mechanic), so you learn the pattern instead of copying.
Say "draft #3" to turn one into a post.

### 2. Draft: a post in your voice
> "Draft a post from that outlier."   or   "Write me a post about shipping in public."

Grounds the draft in your voice profile, your do-more/do-less learnings, and the formats that work
for your account. Produces two or three distinct variants, each annotated with the format and the
learnings it applies. Works from an outlier or a free topic.

### 3. Ship: publish or schedule
> "Schedule this for tomorrow morning."   or   "Publish it."

Suggests posting slots from your schedule, shows the exact final text and your remaining daily cap,
and writes only after you confirm. Lists, reschedules, and cancels your queue.

### 4. Engage: a reply in your voice
> "Draft a reply to this post."

Returns one suggestion in your voice, ready to copy. You post the reply on X yourself (the API does
not publish replies).

### 5. Dashboard: your cockpit
> "Show my ClimbX dashboard."

A live artifact with overview KPIs, your posts, an opportunities feed with filters, your queue, and
your learnings over time. Loads instantly from cache and refreshes in the background.

There is also a **snapshot** utility ("backup my ClimbX data", "what changed in my learnings") that
keeps local, diffable copies of your voice profile and learnings.

## Limits

| Limit | Detail |
|---|---|
| Daily post cap | 5 posts per day across publish and schedule, resets 00:00 UTC. Cancelling does not refund a slot. |
| No links in posts | ClimbX rejects link posts; drafts never contain a URL. |
| Reply drafting | Each `suggest_reply` spends one shared daily AI credit and can be locked until you have written enough replies by hand in the app. Replies are posted by you, not the API. |
| Read rate | About 60 reads per minute per key. |
| Key scope | Writes need a read & write key; a read-only key returns `read_only_key`. |

## Troubleshooting

| You see | What it means and what to do |
|---|---|
| No API key configured | Say "set up ClimbX": Claude hands you a private local link where you paste the key (created in ClimbX under Settings > API). No restart needed. |
| invalid_key | The key is unknown or revoked; create a new one in ClimbX and run "set up ClimbX" again. |
| subscription_required | The ClimbX plan lapsed; check the account at climbx.so. |
| read_only_key | Analytics work; mint a read & write key for shipping and engage. |
| x_not_connected / x_token_expired | Reconnect X inside the ClimbX web app, then retry. |
| daily_post_cap_reached | Cap reached; the reset is 00:00 UTC. Schedule for after it. |
| locked (engage) | Reply drafting unlocks after enough hand-written replies in the app. |
| insufficient_credits | The daily AI credit pool is empty; it refills daily. |
| empty opportunity radar | Track 3 to 5 creators in your niche in the ClimbX app. |

## Privacy

Your API key stays on your machine: you enter it on a page served locally by the MCP server (never
in the chat), and it lives in `~/.climbx/api_key` (mode 0600) or an environment variable, never in a
config file or this repo. The setup page runs inside the MCP server process on `127.0.0.1` with a
one-time link, shuts down as soon as the key is saved (or after 10 minutes), and cannot outlive the
server, so nothing keeps running in the background. All plugin state (config, seen opportunities,
snapshots) is local under `~/.climbx/`. Data goes only to the ClimbX API you already use.
