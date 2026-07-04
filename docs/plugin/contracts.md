# climbx-cowork plugin: shared contracts

Binding data shapes, storage paths, protocols, and design tokens. Every issue implements against these; changing a contract requires updating this file in the same PR and checking all consumers.

## 1. Storage layout (~/.climbx/)

| Path | Content | Written by |
|---|---|---|
| `~/.climbx/api_key` | The ClimbX API key, mode 0600, no trailing newline | setup skill (or the user via a secure local entry) |
| `~/.climbx/config.json` | User preferences, see §2 | setup skill, edited on request |
| `~/.climbx/seen.json` | Opportunities already shown, see §4 | scan skill |
| `~/.climbx/snapshots/<UTC ISO, colons replaced by dashes>.json` | Voice + learnings snapshots, see §7 | snapshot skill |

Create the directory with mode 0700 if missing. All JSON files carry a top-level `"version": 1` for future migrations. Corrupt or unreadable files are renamed to `<name>.broken-<timestamp>` and recreated, never silently overwritten.

## 2. config.json

```json
{
  "version": 1,
  "draft_language": "auto",
  "ranking_half_life_days": 14,
  "default_min_multiplier": 1.5,
  "snapshot_throttle_hours": 20
}
```

`draft_language`: `"auto"` (match source outlier language) or a fixed ISO 639-1 code. Unknown fields are preserved on rewrite.

## 3. Opportunity object

The shape passed between scan, draft, dashboard, and stored in seen.json items:

```json
{
  "id": "a1b2...",
  "feed": "following",
  "handle": "@levelsio",
  "name": "Pieter Levels",
  "text": "shipped it in a weekend...",
  "format": "build_in_public",
  "niche": "saas",
  "posted_at": "2026-05-28T09:12:00Z",
  "metrics": { "impressions": 180000, "likes": 3400, "replies": 120, "retweets": 210 },
  "multiplier": 4.2,
  "post_url": "https://x.com/levelsio/status/...",
  "image_urls": [],
  "why_it_hit": "Concrete weekend-ship claim plus an open question; classic build-in-public reply bait.",
  "score": 3.1
}
```

`id` is the API's outlier id and the dedupe key. `why_it_hit` and `score` are computed locally (§5, §6).

## 4. seen.json

```json
{ "version": 1, "items": { "<outlier-id>": { "first_seen": "2026-07-03T21:00:00Z" } } }
```

Cap at 1000 entries; when exceeded, drop the oldest by `first_seen`. Scan marks previously seen items instead of hiding them by default ("seen 2 days ago"), and offers a fresh-only view.

## 5. Ranking formula

`score = multiplier * 0.5 ^ (age_days / ranking_half_life_days)`

`age_days` from `posted_at` to now. Sort descending; tie-break by impressions descending. Rationale: a 6x outlier from three weeks ago is usually worth less than a 3x from yesterday; the half-life makes that explicit and configurable.

## 6. why_it_hit generation

Generated locally by the session (the API does not provide it). One to two sentences, concrete, teaching the mechanism. Analyze these dimensions and name the ones that apply: hook type (question, contradiction, bold claim, number), structure (line breaks, length, list), specificity (concrete artifact/number vs. platitude), reply-bait mechanics (open question, fill-in-the-blank, hot take), media use, timing. Never output generic praise ("great engagement!") and never merely restate the metrics.

## 7. Snapshots and diff

Snapshot file:

```json
{ "version": 1, "captured_at": "<UTC ISO>", "voice": { ... }, "learnings": { ... } }
```

`voice` is the raw get_voice_profile response, `learnings` the raw get_learnings response. Automatic snapshots are taken opportunistically at the start of scan/dashboard sessions if the newest snapshot is older than `snapshot_throttle_hours`. Diff between two snapshots matches learnings rules by exact `text`: report added rules, removed rules, and rules whose `evidence` changed; for voice report changed `persona` (yes/no), `cadence`, and `schedule` fields.

## 8. Write-confirmation protocol (guardrail, non-negotiable)

Before every publish/schedule/reschedule/cancel, present exactly this structure and wait for explicit confirmation:

```
Ready to <publish now | schedule for {local time} ({ISO})>:
---
{final post text, verbatim}
---
Cap after this action: {n+1}/5 used today (resets 00:00 UTC)
```

Rules:
- Proceed only on an unambiguous yes ("ship it", "yes", "go"). Anything else is a request for changes.
- The text shown must be byte-identical to what is sent. Any edit restarts the confirmation.
- At 5/5 cap: refuse, state the reset time, offer to schedule for after reset.
- Cancelling never refunds a cap slot; say so before confirming a cancel of a same-day post.
- Replies are never published through the API (unsupported); engage output is always copy-and-post-yourself.

## 9. Draft guards

Every produced draft must pass before it is shown as final:
- No URLs (ClimbX rejects link posts; do not draft around it, tell the user)
- No em dashes, no en dashes, no hashtags, no AI-typical filler
- Language per config §2
- Format-conscious: name which format the draft uses and why (based on the account's format performance)
- Learnings-conscious: state which do-more rules were applied and which do-less rules were avoided

## 10. Error playbook (user-facing)

| Code | Say and do |
|---|---|
| missing key / invalid_key | Point to setup skill; key is created in ClimbX under Settings > API |
| subscription_required | ClimbX plan lapsed; check climbx.so account |
| read_only_key | Key has read-only scope; mint a read & write key for shipping/engage |
| x_not_connected / x_token_expired | Reconnect X inside the ClimbX web app, then retry |
| daily_post_cap_reached | Cap reached; show reset time; offer scheduling after reset |
| rate_limited | Wait for the stated Retry-After; the MCP already retried once |
| locked (engage) | Drafting unlocks after enough hand-written replies in the app; suggest writing replies manually for now |
| insufficient_credits (engage) | Daily AI credit pool empty; refills daily |
| invalid_query | Re-fetch get_inspiration_options and correct the filter value |
| timeout / network_error | One retry already happened for reads; report and suggest trying again |

## 11. Rate budget

- Scan: at most 5 GET calls (options, following, surprise, plus voice/learnings only if the local snapshot is stale)
- Dashboard initial load: at most 8 GET calls; background refresh at most 6; space calls by at least 250 ms
- Never poll in a loop; the API refreshes its own data server-side on access

## 12. Dashboard artifact

- Tabs: Overview, Posts, Opportunities, Queue, Learnings
- localStorage keys, all prefixed `climbx_default_` (account scope `default`, see architecture D7): `cache` (data + fetched_at per section, TTL 6h), `tab`, `filters`, `chart_prefs`
- Design tokens: dark theme default, background `#0d0f13`, surface `#171a21`, border `#262a33`, text `#e8eaed`, muted `#9aa0a6`, accent `#4f8ef7`, positive `#34a853`, negative `#ea4335`; light theme background `#fafafa`, surface `#ffffff`, text `#1a1c20`; system font stack; 8px spacing grid; charts via inlined Chart.js
- Filter controls on the Opportunities tab are populated from get_inspiration_options at runtime, never hardcoded
- Handoff strings (exact prefixes, the core skill recognizes them):
  - `sendPrompt("Draft a post from this ClimbX outlier: <opportunity JSON>")`
  - `sendPrompt("Draft a reply to this post (ClimbX engage): <opportunity JSON>")`
- Every view has designed loading, empty, and error states; 401/402/429 render the §10 guidance inside the artifact

## 13. Definition of done (every issue)

- Change developed in a worktree, merged via PR with green CI (engineering standards)
- No em/en dashes or typographic ellipses in any authored text (grep before commit)
- README(s) checked against the change; plugin README updated when user-visible behavior changed
- Acceptance criteria of the issue checked off in a closing comment, with one-line evidence each
- Project status log appended (see repo CLAUDE.md)
