---
name: climbx-setup
description: First-run setup for the ClimbX companion. Use for "set up ClimbX", "connect my ClimbX account", "configure ClimbX", "add my ClimbX API key", or the first time any ClimbX skill has no working key. Runs the guided key setup (a secure local page, no key in the chat), validates the account live, and writes local config, getting the user from zero to a first scan.
---

# ClimbX setup

Get the user from zero to a first scan without reading source code or touching a terminal. Be brief
and concrete; each step has a clear next action.

First read `${CLAUDE_PLUGIN_ROOT}/shared/contracts.md` (storage, config) and
`${CLAUDE_PLUGIN_ROOT}/shared/api-notes.md` (error playbook).

## 1. Are the ClimbX tools connected?

Check whether the ClimbX MCP tools are available (for example `get_key_status`, under any
namespace). If they are, go to step 2.

If not: the plugin bundles its MCP server and starts it through a local launcher
(`scripts/launch.sh`), so the tools appear on their own once the plugin is enabled (a Claude
restart may be needed). The launcher needs Node 20+ on the machine and finds it in the usual
places (Homebrew, nvm, PATH); it fetches nothing at launch. If the tools are still missing after a
restart, that is an environment problem, not a key problem: make sure Node 20+ is installed, or set
`CLIMBX_NODE` to its path (for example `/opt/homebrew/bin/node`); solve that first.

## 2. Is a key configured?

Call `get_key_status` (local, instant, never reveals the key).

- `configured: true`: skip to step 4 (validate live).
- `configured: false`: run the guided key setup (step 3). If the status shows
  `ignored_env_placeholder: true`, do not mention internals; it simply means the plugin
  configuration did not supply a key, which the guided setup fixes.

## 3. Guided key setup (the default path)

Never ask the user to paste the API key into the chat, and never send them to a terminal or hidden
folders. Instead:

1. Tell the user they need a ClimbX API key, created in the ClimbX app under **Settings > API**
   (the full key is shown only once). Add one line on scope so they pick right while they are in
   the ClimbX app: shipping and reply drafting need a **read & write** key; analytics and scanning
   work with read-only (details in step 5).
2. Call `begin_key_setup` and show the returned URL as a clickable link: "Open this link and paste
   your key there. The page runs only on your computer and shuts itself down after saving." The
   link expires after 10 minutes; if it expires, call `begin_key_setup` again for a fresh one.
3. The page validates the key live against ClimbX, stores it on this machine, and the server picks
   it up immediately; no restart is needed. Ask the user to say "done" when the page shows
   Connected, then confirm with `get_key_status` (now `configured: true`).

If `begin_key_setup` itself fails (very rare, for example no free local port), fall back to the
GUI path: Settings > Plugins > Climbx cowork > Connectors > climbx, paste the key as the value of
`CLIMBX_API_KEY`, then restart Claude. On a headless or remote machine (plain Claude Code over
SSH), the environment variable or the `~/.climbx/api_key` file is the right path instead; assume
users there know their way around.

## 4. Validate live

- Call `get_voice_profile`. Success proves the key is valid and the subscription is active. Map any
  error with the playbook: `invalid_key` (recreate the key, rerun step 3), `subscription_required`
  (plan lapsed, check climbx.so), missing key (back to step 3).
- Call `get_inspiration_options` and check `tracked_handles`. If it is empty, the opportunity radar
  has nothing to scan: guide the user to follow and track 3 to 5 creators in their niche in the
  ClimbX app, then re-run this check.

## 5. Key scope note

Say it now rather than surprising the user later: a read-only key works for analytics, the
dashboard, and scanning, but publishing, scheduling, and reply drafting will fail with
`read_only_key`. If they plan to ship from here, they need a read & write key; switching means
creating a new key in ClimbX and running step 3 again (the new key simply replaces the old one).

## 6. Config and first success

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
| missing key | Run the guided setup: `begin_key_setup`, user pastes the key on the local page. |
| invalid_key | The key is unknown or revoked; create a new one in ClimbX and run `begin_key_setup` again. |
| subscription_required | The ClimbX plan lapsed; check the account at climbx.so. |
| read_only_key | Analytics work; for shipping and engage, mint a read & write key and rerun the guided setup. |
| x_not_connected / x_token_expired | Reconnect X inside the ClimbX web app, then retry. |
| empty tracked_handles | The radar is blind; track 3 to 5 creators in the ClimbX app. |
| locked (engage) | Reply drafting unlocks after enough hand-written replies in the app. |
| insufficient_credits | The daily AI credit pool is empty; it refills daily. |
| daily_post_cap_reached | 5 posts per day used; show the 00:00 UTC reset and offer to schedule after it. |
| rate_limited | Wait for the stated Retry-After; the MCP already retried once. |
