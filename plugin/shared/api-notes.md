# API notes

Cheat sheet for the bundled ClimbX MCP server. The server is registered as `climbx`, so the
fully qualified tool names are `mcp__climbx__<tool>` (for example `mcp__climbx__get_voice_profile`).
All data access goes through these tools; never call the ClimbX HTTP API directly.

## Tools (16)

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
| missing key / invalid_key | Point to the setup skill; the key is created in ClimbX under Settings > API. |
| subscription_required | The ClimbX plan lapsed; check the account at climbx.so. |
| read_only_key | The key is read-only; mint a read & write key for shipping and engage. |
| x_not_connected / x_token_expired | Reconnect X inside the ClimbX web app, then retry. |
| daily_post_cap_reached | Cap reached; show the reset time (00:00 UTC); offer to schedule after reset. |
| rate_limited | Wait for the stated Retry-After; the MCP already retried once. |
| locked (engage) | Reply drafting unlocks after enough hand-written replies in the app; suggest writing replies manually for now. |
| insufficient_credits (engage) | The daily AI credit pool is empty; it refills daily. |
| invalid_query | Re-fetch `get_inspiration_options` and correct the filter value. |
| timeout / network_error | One retry already happened for reads; report and suggest trying again. |
