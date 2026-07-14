# API notes

Cheat sheet for the ClimbX MCP tools. The plugin bundles and launches its own climbx-mcp server,
so the same tools are available in both Claude Cowork and Claude
Code under the plugin namespace (`mcp__plugin_climbx-cowork_climbx__<tool>`). In conversation, refer
to a tool by its bare name (`get_voice_profile`); Claude resolves it to whichever server is
connected. Only the dashboard artifact, which calls tools programmatically, probes for the right
prefix at runtime. All data access goes through these tools; never call the ClimbX HTTP API directly.

## Tools (18)

### Setup and key status
| Tool | When to use |
|---|---|
| `get_key_status` | Whether a key is configured and from which source; local and instant, never reveals the key. First call in setup and when diagnosing auth errors. |
| `begin_key_setup` | Starts the guided key setup: returns a one-time `127.0.0.1` URL where the user pastes their key into a masked field. The server validates it live, stores it locally, applies it without restart, and shuts the page down (it also expires after 10 minutes and never outlives the server). Never ask for the key in the chat. |

### Read: analytics, voice, learnings
| Tool | When to use |
|---|---|
| `get_analytics` | Headline KPIs and format breakdown for a lookback window (`days`, default 30). |
| `get_format_performance` | Per-format table with medians and trends (`start`/`end` window). |
| `get_niche_performance` | Per-niche table with medians and trends (`start`/`end` window). |
| `get_voice_profile` | The account's voice persona, cadence, and posting schedule. Read before drafting. |
| `get_learnings` | Current do-more / do-less rules with evidence. Read before drafting. |
| `get_learnings_history` | Snapshots of the learnings set over time (`start`/`end` window). |

### Read: inspiration (scan)
| Tool | When to use |
|---|---|
| `get_inspiration_options` | Accepted filter values plus the creators you track. Fetch once before filtering; never hardcode values. |
| `get_following_outliers` | Outlier posts from creators you track (`handles?`, `limit?` default 30). |
| `get_surprise_outliers` | Discovery feed of network outliers (`min_multiplier`, `min_impressions`, `format`, `recency`, `image`, `limit`). Filters snap to the app's buckets. |

### Read: posts
| Tool | When to use |
|---|---|
| `list_posts` | Recent published posts with metrics (`limit?` 1-100, default 30). |
| `list_scheduled` | Upcoming posts that are still pending or mid-publish. |

### Write (each needs the confirmation block in guardrails.md and a read & write key)
| Tool | When to use |
|---|---|
| `publish_post` | Publish to X now (`text`, `image_urls?` up to 4 https). Counts toward the daily cap. |
| `schedule_post` | Queue for a future ISO time (`text`, `scheduled_for`, `image_urls?`). Counts toward the cap at creation time. |
| `reschedule_post` | Move a pending post to a new ISO time (`id`, `scheduled_for`). Does not consume a new cap slot. |
| `cancel_scheduled` | Cancel a pending post (`id`). Does not refund the cap slot it used. |

### Engage
| Tool | When to use |
|---|---|
| `suggest_reply` | One reply suggestion in the owner's voice (`text`, `author_handle?`). Spends one daily AI credit, needs a read & write key, can be locked. The reply is for the user to post by hand; it is never published through the API. |

## Limits

- **Daily post cap:** 5 posts per day across `publish_post` and `schedule_post` combined, resets
  00:00 UTC. `reschedule_post` and `cancel_scheduled` do not add to the cap; `cancel_scheduled`
  does not refund it. Write responses carry `posts_used_today`/`daily_cap`; surface them.
- **No URLs** in post text: ClimbX rejects link posts. The MCP rejects them locally before spending
  a cap slot.
- **Reads:** about 60 GET per minute per key. On `rate_limited` the MCP already retried the GET once.
- **suggest_reply:** one shared daily AI credit per call; locked until the owner has written enough
  replies by hand in the app; requires a read & write key.
- **Key scopes:** read-only vs read & write. Any write returns `403 read_only_key` on a read-only
  key.
- **Rate budget:** scan uses at most 5 GET (options, following, surprise, plus voice/learnings only
  if the local snapshot is stale). Dashboard initial load at most 8 GET, background refresh at most
  6, space calls by at least 250 ms. Never poll in a loop; the API refreshes its own data on access.

## Error playbook (user-facing)

| Code | Say and do |
|---|---|
| missing key / invalid_key | Run the guided setup (`begin_key_setup`, key created in ClimbX under Settings > API); never ask for the key in the chat. |
| subscription_required | The ClimbX plan lapsed; check the account at climbx.so. |
| read_only_key | The key is read-only; mint a read & write key for shipping and engage. |
| x_not_connected / x_token_expired | Reconnect X inside the ClimbX web app, then retry. |
| daily_post_cap_reached | Cap reached; show the reset time (00:00 UTC); offer to schedule after reset. |
| rate_limited | Wait for the stated Retry-After; the MCP already retried once. |
| locked (engage) | Reply drafting unlocks after enough hand-written replies in the app; suggest writing replies manually for now. |
| insufficient_credits (engage) | The daily AI credit pool is empty; it refills daily. |
| invalid_query | Re-fetch `get_inspiration_options` and correct the filter value. |
| timeout / network_error | One retry already happened for reads; report and suggest trying again. |
