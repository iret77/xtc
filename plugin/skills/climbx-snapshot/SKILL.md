---
name: climbx-snapshot
description: Back up and diff the ClimbX voice profile and learnings the account owns. Use for "backup my ClimbX data", "snapshot my learnings", "save my voice profile", "what changed in my learnings", or "diff my learnings". Keeps timestamped local JSON copies under ~/.climbx/snapshots/ and explains what changed in plain language.
---

# ClimbX snapshot

The voice profile and learnings ClimbX derives are the account owner's data. Keep local, diffable
copies so they survive plugin updates and reinstalls and so the owner can see how the rule set
evolves.

First read `${CLAUDE_PLUGIN_ROOT}/shared/contracts.md` (storage layout, config, snapshot shape and
diff rules).

## Snapshot file

Written to `~/.climbx/snapshots/<UTC ISO with colons replaced by dashes>.json` (for example
`2026-07-03T22-15-30.000Z.json`), resolving the home directory at runtime, never a literal tilde:

```json
{ "version": 1, "captured_at": "<UTC ISO>", "voice": <raw get_voice_profile>, "learnings": <raw get_learnings> }
```

`voice` is the raw `get_voice_profile` response (`{ voice: { persona, cadence, schedule, ... } }`)
and `learnings` the raw `get_learnings` response (`{ learnings: { positive: [...], negative: [...] }, ... }`).

## Take a snapshot (manual)

On "backup my ClimbX data" or "snapshot my learnings":
1. Fetch `get_voice_profile` and `get_learnings` fresh.
2. Ensure `~/.climbx/snapshots/` exists (create the `~/.climbx/` directory at mode 0700 if missing).
3. Write the snapshot file with `"version": 1` and the current `captured_at`.
4. Report the path and a one-line summary: the number of do-more rules (`learnings.positive`) and
   do-less rules (`learnings.negative`) captured.

## Automatic snapshots

The scan and dashboard skills take a snapshot opportunistically at the start of a session when the
newest file in `~/.climbx/snapshots/` is older than `snapshot_throttle_hours` (config, default 20)
or none exists. That shared throttle rule lives in contracts.md; those skills delegate here when this
skill is installed, so the write logic stays in one place. Do not snapshot more often than the
throttle allows.

## Diff (what changed)

On "what changed in my learnings" or a request to diff:
1. Pick the two newest snapshots, or a user-named pair. If fewer than two exist, explain that a diff
   needs history and take one now.
2. Match learnings rules by exact `text` (across `positive` and `negative`) and report, in plain
   language with the rule text quoted:
   - rules added,
   - rules removed,
   - rules whose `evidence` changed.
3. For voice, report whether `voice.persona` changed (yes/no) and any change to `voice.cadence` and
   `voice.schedule`.
Keep it scannable: lead with the counts, then the details.

## File hygiene

- Directory mode 0700; every file carries `"version": 1`.
- A corrupt or unreadable snapshot is renamed to `<name>.broken-<timestamp>` and left in place, never
  silently overwritten.
- Keep the most recent 60 snapshots. Only prune older ones after telling the user which will be
  removed.

## Edge cases

- **Fewer than two snapshots:** a diff needs history; take one now and say so.
- **API unreachable:** do not fail. Report the age of the newest local snapshot instead, and offer to
  retry.
