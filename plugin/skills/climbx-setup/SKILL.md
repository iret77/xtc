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

If not, guide the user by host:

- **Claude Cowork / Claude Desktop (the usual case):** install the climbx-mcp Desktop extension.
  Download `climbx-mcp.mcpb` from the
  [latest release](https://github.com/iret77/climbx-cowork/releases/latest), open it with Claude
  Desktop (Settings > Extensions), and enter the ClimbX API key when prompted; it is stored in the
  OS keychain, never in a file or this chat. Then restart Claude Desktop. Keys are created in the
  ClimbX app under Settings > API; shipping and reply drafting need a **read & write** key, and the
  full key is shown only once.
- **Plain Claude Code:** the plugin-bundled server starts automatically and needs Node 20+
  (`node --version`). It reads the key from the `CLIMBX_API_KEY` environment variable or
  `~/.climbx/api_key`. If no key is present, have the user place it in `~/.climbx/api_key`
  (directory mode 0700, file mode 0600) using a local terminal or editor, **without pasting it into
  this chat**. Never ask for the key in the conversation and never echo it back.

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
