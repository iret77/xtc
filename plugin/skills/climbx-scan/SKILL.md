---
name: climbx-scan
description: Scan the ClimbX inspiration feeds for outlier posts breaking out in the user's niche and explain why each one worked. Use for "what's breaking out in my niche", "show me outliers", "scan for ideas", "what's working on X right now", "any hot takes from this week", or "what are the creators I track posting". Produces a ranked digest with a local why-it-hit per item and a handoff into drafting.
---

# ClimbX scan

Answer one question: what is working in the user's niche right now, and why. Produce a ranked,
scannable digest of outlier posts, each with a concrete "why it hit" the user can learn from, and a
one-step handoff into drafting.

First read `${CLAUDE_PLUGIN_ROOT}/shared/api-notes.md` (tools, limits, error playbook) and
`${CLAUDE_PLUGIN_ROOT}/shared/contracts.md` (opportunity object, seen.json, ranking, why-it-hit,
config, storage). Stay inside the scan rate budget: at most 5 GET calls total.

## Flow

1. **Preflight.** Make sure the API key resolves. On `missing key`/`invalid_key`, route to the
   `climbx-setup` skill (or, if it is not installed, point the user to create a key in ClimbX under
   Settings > API and place it in `~/.climbx/api_key`). Then take an opportunistic snapshot: if the
   newest file in `~/.climbx/snapshots/` is older than `snapshot_throttle_hours` (config, default 20)
   or none exists, capture one (delegate to `climbx-snapshot` if installed, otherwise read
   `get_voice_profile` and `get_learnings` and write a snapshot file per contracts). Skip the
   snapshot when it is fresh, so those two GETs do not count against the budget.

2. **Load the seen store.** Read `~/.climbx/config.json` and `~/.climbx/seen.json` (create the
   directory at mode 0700 and the files with `"version": 1` if missing; a corrupt file is renamed to
   `<name>.broken-<timestamp>` and recreated, never silently overwritten).

3. **Get options once.** Call `get_inspiration_options`. If the tracked-handles list is empty, stop
   and tell the user to track creators in the ClimbX app first; there is nothing to scan otherwise.
   Use the returned valid filter values to map what the user asked for in natural language:
   "only hot takes from the last week" maps to `format` and `recency`; "at least 3x" maps to
   `min_multiplier`; a named creator maps to the `handles` filter (never filter by creator
   client-side). Default `min_multiplier` to `default_min_multiplier` from config (1.5) when the
   user gave no floor.

4. **Fetch both feeds.** Call `get_following_outliers` (with `handles` when the user named creators)
   and `get_surprise_outliers` (with the mapped `min_multiplier`, `min_impressions`, `format`,
   `recency`, `image`). Honor the rate budget and any Retry-After (the MCP already retried a
   rate-limited GET once). On `invalid_query`, re-read `get_inspiration_options`, correct the
   offending value, and retry once.

5. **Rank and explain.** Build an Opportunity object per item (contracts). The feed returns the
   metrics as flat fields (`impressions`, `likes`, `replies`, `retweets`); nest them under
   `metrics` in the Opportunity object, and set `feed` to `following` or `surprise` from the
   endpoint the item came from. Compute `score` with the ranking formula
   (`multiplier * 0.5 ^ (age_days / ranking_half_life_days)`), sort descending, tie-break by
   impressions. Generate `why_it_hit` (contracts section on why-it-hit) for the top
   items only, at most 10, to save tokens: one to two concrete sentences naming the mechanism (hook,
   structure, specificity, reply-bait, media, timing). Never generic praise, never a restatement of
   the metrics.

6. **Render the digest.** A numbered list, strongest first. Per item:
   - Header line: `#N  @handle  {multiplier}x  {format}  {niche}  {relative age}`, plus
     `seen {relative time}` when the id is already in seen.json.
   - The why line.
   - The deep link (`post_url`).
   Keep it scannable, not a wall of text.

7. **Update the seen store and offer the handoff.** Add any new ids to seen.json with `first_seen`
   set to now; enforce the 1000-entry cap by dropping the oldest by `first_seen`. Close with:
   "Say 'draft #3' to turn one into a post." `draft #N` hands that item's full Opportunity JSON to
   the draft stage (the `climbx-draft` skill when installed, otherwise the core skill's draft stage);
   it is the conversational form of the handoff string
   `Draft a post from this ClimbX outlier: <opportunity JSON>`.

## Options and edge cases

- **Fresh-only view.** By default mark seen items rather than hiding them. If the user asks for
  "only new ones", filter out ids already in seen.json.
- **Both feeds empty.** Do not error. Say so plainly and suggest lowering `min_multiplier` or
  tracking more creators in the ClimbX app.
- **Named creator.** Pass the `handles` filter to `get_following_outliers`; do not fetch everything
  and filter locally.
- **Errors.** Map any API error with the playbook in api-notes.md and tell the user what to do; never
  retry a write here (scan is read-only).
