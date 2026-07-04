---
name: climbx-ship
description: Publish or schedule an approved X (Twitter) post through ClimbX, and manage the scheduled queue. Use for "publish this", "ship it", "schedule this for tomorrow morning", "post this at 9am", "show my queue", "reschedule that post", or "cancel the scheduled post". Always shows the exact final text and the daily cap before writing, and requires an explicit confirmation.
---

# ClimbX ship

Publish and schedule with zero surprises: full preview, explicit confirmation, and the daily cap in
view before and after every write.

First read `${CLAUDE_PLUGIN_ROOT}/shared/guardrails.md` (the write-confirmation protocol and draft
guards, non-negotiable) and `${CLAUDE_PLUGIN_ROOT}/shared/api-notes.md` (tools, limits, error
playbook). The write-confirmation protocol here is not optional and is never skipped, even if the
user says "just post it" or "no questions".

## Input

An approved final draft from the `climbx-draft` skill, or text the user provides directly. If the
text did not come through drafting, run the draft guards on it first (no URLs, no em or en dashes,
no hashtags, no filler, length sanity); a URL means the post cannot be sent, so stop and say so.

## Publish now vs schedule

If the user did not say which, ask. Then follow the matching path below.

### Schedule: suggest sensible slots
1. Read the account's posting schedule from `get_voice_profile`. It lives under
   `voice.schedule`: `timezone` (an IANA name like `America/New_York`), `active_start_hour` and
   `active_end_hour`, and `weekly_slots`, a map of weekday (`mon`..`sun`) to `HH:MM` times in that
   timezone.
2. Read `list_scheduled` (the pending posts are in its `scheduled` array) to see what is already
   queued and avoid clashing with an existing slot.
3. Propose the next 2 or 3 upcoming `weekly_slots` times that are still free, shown in the account's
   local time (its `timezone`) with the UTC offset. Accept any explicit time the user gives instead.
4. Validate the chosen time as a full ISO 8601 datetime with an explicit timezone before calling
   (for example `2026-07-04T09:00:00-04:00`). A past time would publish on the next tick; flag that
   and confirm the user means it.

## Confirmation (non-negotiable)

Before calling `publish_post`, `schedule_post`, `reschedule_post`, or `cancel_scheduled`, show the
confirmation block from guardrails.md exactly, character for character, with the verbatim final text
and the cap line:

```text
Ready to <publish now | schedule for {local time} ({ISO})>:
---
{final post text, verbatim}
---
Cap after this action: {n+1}/5 used today (resets 00:00 UTC)
```

Read the current cap from the most recent write response (`posts_used_today`/`daily_cap`) or infer
it from context, and state it. Proceed only on an unambiguous yes. Any edit to the text restarts the
confirmation. At 5/5 used, refuse before asking, state the 00:00 UTC reset, and offer to schedule
for after the reset.

## After the write

Report the result clearly: for a publish, the post URL; for a schedule, the scheduled id and the
local time; always the updated cap line from the response summary.

## Queue management

- **List:** `list_scheduled`, rendered with human-readable local times and the id for each pending
  post.
- **Move:** `reschedule_post` with a validated new ISO time. Confirm with the §8 block showing the
  new time first. Rescheduling does not consume a new cap slot.
- **Cancel:** `cancel_scheduled`. Warn first that cancelling does not refund the cap slot it used,
  then confirm before calling.

## Error states (use the api-notes playbook)

- `daily_post_cap_reached`: cap is full; show the reset time and offer post-reset scheduling.
- `not_pending` (the post is already publishing or published): explain it can no longer be changed.
- `read_only_key`: the key cannot write; route to the setup skill to mint a read & write key.
- `x_not_connected` / `x_token_expired`: reconnect X in the ClimbX web app, then retry.
- `rate_limited`: honor the stated wait; the MCP already retried a read once.
