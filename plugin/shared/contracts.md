# Runtime contracts

The data shapes, storage paths, and algorithms the skills depend on at runtime. This is the runtime
source of truth; do not duplicate these shapes inside individual skills. Write rules live in
`guardrails.md`; tool limits and the error playbook live in `api-notes.md`.

All `~/.climbx/` paths resolve the home directory at runtime (`os.homedir()` in Node), never a
literal tilde.

## Storage layout (~/.climbx/)

| Path | Content | Written by |
|---|---|---|
| `~/.climbx/api_key` | The ClimbX API key, mode 0600, no trailing newline | setup skill (or the user) |
| `~/.climbx/config.json` | User preferences (see Config) | setup skill, edited on request |
| `~/.climbx/seen.json` | Opportunities already shown (see seen.json) | scan skill |
| `~/.climbx/snapshots/<UTC ISO, colons replaced by dashes>.json` | Voice and learnings snapshots | snapshot skill |

Create the directory with mode 0700 if missing. Every JSON file carries a top-level `"version": 1`
for future migrations. A corrupt or unreadable file is renamed to `<name>.broken-<timestamp>` and
recreated, never silently overwritten.

## Config (config.json)

```json
{
  "version": 1,
  "draft_language": "auto",
  "ranking_half_life_days": 14,
  "default_min_multiplier": 1.5,
  "snapshot_throttle_hours": 20
}
```

`draft_language`: `"auto"` (match the source outlier language) or a fixed ISO 639-1 code. Preserve
unknown fields on rewrite. Treat the values above as defaults when the file or a field is missing.

## Opportunity object

The shape passed between scan, draft, and dashboard, and stored in seen.json items:

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

`id` is the API's outlier id and the dedupe key. `feed` is `following` or `surprise`, set from the
endpoint the item came from (the API items do not carry it). The outlier feeds return the metrics as
flat fields (`impressions`, `likes`, `replies`, `retweets`); the scan skill nests them under
`metrics`. `why_it_hit` and `score` are computed locally (see below).

## seen.json

```json
{ "version": 1, "items": { "<outlier-id>": { "first_seen": "2026-07-03T21:00:00Z" } } }
```

Cap at 1000 entries; when exceeded, drop the oldest by `first_seen`. Mark previously seen items
instead of hiding them by default ("seen 2 days ago"), and offer a fresh-only view.

## Ranking formula

```
score = multiplier * 0.5 ^ (age_days / ranking_half_life_days)
```

`age_days` runs from `posted_at` to now. Sort descending; tie-break by impressions descending. A
6x outlier from three weeks ago is usually worth less than a 3x from yesterday; the half-life makes
that explicit and configurable via `ranking_half_life_days`.

## why_it_hit generation

Generated locally (the API does not provide it). One to two sentences, concrete, teaching the
mechanism. Analyze these dimensions and name the ones that apply: hook type (question, contradiction,
bold claim, number), structure (line breaks, length, list), specificity (concrete artifact or number
vs platitude), reply-bait mechanics (open question, fill-in-the-blank, hot take), media use, timing.
Never output generic praise ("great engagement!") and never merely restate the metrics.

## Snapshots

Snapshot file shape:

```json
{ "version": 1, "captured_at": "<UTC ISO>", "voice": { ... }, "learnings": { ... } }
```

`voice` is the raw `get_voice_profile` response, `learnings` the raw `get_learnings` response. Take
an automatic snapshot opportunistically at the start of a scan or dashboard session if the newest
snapshot is older than `snapshot_throttle_hours`. Diff by matching learnings rules on exact `text`:
report added rules, removed rules, and rules whose `evidence` changed; for voice report changed
`persona` (yes/no), `cadence`, and `schedule`.

## Dashboard handoff strings

The dashboard artifact hands work back to the core skill via `sendPrompt` with these exact prefixes:

- `Draft a post from this ClimbX outlier: <opportunity JSON>`
- `Draft a reply to this post (ClimbX engage): <opportunity JSON>`
