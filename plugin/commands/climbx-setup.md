---
description: Set up the ClimbX companion, connect your API key and validate your account
disable-model-invocation: true
---

Run the ClimbX first-run setup for the user.

Invoke the `climbx-setup` skill from the climbx-cowork plugin and follow its steps exactly. In short:
check whether the ClimbX MCP tools are connected; call `get_key_status`; if no key is configured, run
the guided key setup (`begin_key_setup`) that hands the user a private page served locally on their own
machine to paste their ClimbX API key into (never ask for the key in the chat); then validate the
account live (`get_voice_profile`), write local config if missing, and end by offering a first scan or
the dashboard.

Do not treat "ClimbX" as a project, folder, or app to scaffold; this is the ClimbX X-growth companion's
account setup only.
