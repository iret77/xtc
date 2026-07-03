---
name: climbx-setup
description: First-run setup for the ClimbX companion. Use for "set up ClimbX", "connect my ClimbX account", "configure ClimbX", "add my ClimbX API key", or the first time any ClimbX skill has no working key. Checks the runtime and API key, validates the account live, and writes local config, getting the user from zero to a first scan.
---

# ClimbX setup

Get the user from zero to a first scan without reading source code. Be brief and concrete; each step
has a clear next action.

First read `${CLAUDE_PLUGIN_ROOT}/shared/contracts.md` (storage, config) and
`${CLAUDE_PLUGIN_ROOT}/shared/api-notes.md` (error playbook).

## 1. Runtime check

Confirm Node is available and recent enough for the bundled server: `node --version` should report
`v20` or higher. If it is missing or older, tell the user the bundled MCP server needs Node 20+ and
stop here.

## 2. API key

Check whether a key already resolves: the `CLIMBX_API_KEY` environment variable, then
`~/.climbx/api_key`. If one is present, skip to validation.

If no key is found:
1. Tell the user to create one in the ClimbX app under Settings > API. For shipping and reply
   drafting they need a **read & write** key; a read-only key is fine for analytics only. The full
   key is shown only once at creation.
2. Have them place the key in `~/.climbx/api_key` **without pasting it into this chat**. Describe a
   secure, local entry: create the `~/.climbx/` directory (mode 0700) and write the key to
   `~/.climbx/api_key` with mode 0600 using a local terminal or editor, so it never appears in the
   conversation or in shell history. Never ask the user to type or paste the key here, and never echo
   it back.

## 3. Validate live

- Call `get_voice_profile`. Success proves the key is valid and the subscription is active. Map any
  error with the playbook: `invalid_key` (recreate the key), `subscription_required` (plan lapsed,
  check climbx.so), `missing_bearer` (no key found, back to step 2).
- Call `get_inspiration_options` and check `tracked_handles`. If it is empty, the opportunity radar
  has nothing to scan: guide the user to follow and track 3 to 5 creators in their niche in the
  ClimbX app, then re-run this check.

## 4. Key scope note

Say it now rather than surprising the user later: a read-only key works for analytics, the dashboard,
and scanning, but publishing, scheduling, and reply drafting will fail with `read_only_key`. If they
plan to ship from here, they need a read & write key.

## 5. Config and first success

- If `~/.climbx/config.json` is missing, write the defaults (`draft_language: "auto"`,
  `ranking_half_life_days: 14`, `default_min_multiplier: 1.5`, `snapshot_throttle_hours: 20`) with
  `"version": 1`. Preserve any existing file and unknown fields.
- Detect complementary skills generically (a post optimizer or brand-voice skill). If present, note
  that drafting will layer them on top of the ClimbX voice. Never require them.
- End on a win: offer to open the dashboard or run a first scan.

## Error states and next steps

Every state has one action (see api-notes.md for the full playbook):

| State | Next step |
|---|---|
| missing key | Create a key in ClimbX Settings > API, place it in `~/.climbx/api_key` (step 2). |
| invalid_key | The key is unknown or revoked; create a new one and replace the file. |
| subscription_required | The ClimbX plan lapsed; check the account at climbx.so. |
| read_only_key | Analytics work; for shipping and engage, mint a read & write key. |
| x_not_connected / x_token_expired | Reconnect X inside the ClimbX web app, then retry. |
| empty tracked_handles | The radar is blind; track 3 to 5 creators in the ClimbX app. |
| locked (engage) | Reply drafting unlocks after enough hand-written replies in the app. |
| insufficient_credits | The daily AI credit pool is empty; it refills daily. |
| daily_post_cap_reached | 5 posts per day used; show the 00:00 UTC reset and offer to schedule after it. |
| rate_limited | Wait for the stated Retry-After; the MCP already retried once. |
