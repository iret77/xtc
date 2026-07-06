---
name: climbx-setup
description: First-run setup for the ClimbX companion. Use for "set up ClimbX", "connect my ClimbX account", "configure ClimbX", "add my ClimbX API key", or the first time any ClimbX skill has no working key. Checks the runtime and API key, validates the account live, and writes local config, getting the user from zero to a first scan.
---

# ClimbX setup

Get the user from zero to a first scan without reading source code. Be brief and concrete; each step
has a clear next action.

First read `${CLAUDE_PLUGIN_ROOT}/shared/contracts.md` (storage, config) and
`${CLAUDE_PLUGIN_ROOT}/shared/api-notes.md` (error playbook).

## 1. Are the ClimbX tools connected?

Check whether the ClimbX MCP tools are available (for example `get_voice_profile`, under any
namespace). If they are, skip to validation.

If not: the plugin launches its MCP server itself with `npx -y github:iret77/climbx-mcp` (no separate
install), so the tools appear on their own once the plugin is enabled and Claude is restarted. It
needs the API key, which it reads from, in order: the plugin's `CLIMBX_API_KEY` config option (entered
once when the plugin is installed, stored in the OS keychain) or `~/.climbx/api_key` on the host.
Guide the user to create a key in the ClimbX app under Settings > API (shipping and reply drafting
need a **read & write** key; the full key is shown only once) and enter it in the plugin's
configuration, or place it in `~/.climbx/api_key` without pasting it into this chat. Then restart
Claude so the server picks it up. The `npx` launch needs Node and network on first run (it fetches
and caches the server).

## 2. Validate live

- Call `get_voice_profile`. Success proves the key is valid and the subscription is active. Map any
  error with the playbook: `invalid_key` (recreate the key), `subscription_required` (plan lapsed,
  check climbx.so), `missing_bearer` (no key found, back to step 1).
- Call `get_inspiration_options` and check `tracked_handles`. If it is empty, the opportunity radar
  has nothing to scan: guide the user to follow and track 3 to 5 creators in their niche in the
  ClimbX app, then re-run this check.

## 3. Key scope note

Say it now rather than surprising the user later: a read-only key works for analytics, the dashboard,
and scanning, but publishing, scheduling, and reply drafting will fail with `read_only_key`. If they
plan to ship from here, they need a read & write key.

## 4. Config and first success

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
| missing key | Create a key in ClimbX Settings > API and connect it per step 1 (extension keychain in Cowork, `~/.climbx/api_key` in Claude Code). |
| invalid_key | The key is unknown or revoked; create a new one and replace the file. |
| subscription_required | The ClimbX plan lapsed; check the account at climbx.so. |
| read_only_key | Analytics work; for shipping and engage, mint a read & write key. |
| x_not_connected / x_token_expired | Reconnect X inside the ClimbX web app, then retry. |
| empty tracked_handles | The radar is blind; track 3 to 5 creators in the ClimbX app. |
| locked (engage) | Reply drafting unlocks after enough hand-written replies in the app. |
| insufficient_credits | The daily AI credit pool is empty; it refills daily. |
| daily_post_cap_reached | 5 posts per day used; show the 00:00 UTC reset and offer to schedule after it. |
| rate_limited | Wait for the stated Retry-After; the MCP already retried once. |
