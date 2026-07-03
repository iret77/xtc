---
name: climbx-draft
description: Draft an X (Twitter) post in the account owner's own voice, from a ClimbX outlier or a free-form topic. Use for "draft a post from that outlier", "draft #3", "write me a post about X", "turn this into a post in my voice", or the handoff "Draft a post from this ClimbX outlier: ...". Grounds every draft in the account's voice profile, learnings, and format performance, and produces 2 or 3 annotated variants to choose from.
---

# ClimbX draft

Take an opportunity or a topic and produce a post that reads like the owner wrote it, grounded in
their voice profile, their current learnings, and the formats that actually work for their account.

First read `${CLAUDE_PLUGIN_ROOT}/shared/guardrails.md` (draft guards, non-negotiable),
`${CLAUDE_PLUGIN_ROOT}/shared/contracts.md` (opportunity object, config, snapshots), and
`${CLAUDE_PLUGIN_ROOT}/shared/api-notes.md` (tools).

## Inputs

- An **Opportunity JSON** from the scan stage (`draft #N`) or from the dashboard handoff prefix
  `Draft a post from this ClimbX outlier: <opportunity JSON>`.
- Or a **free-form topic** in plain words. No scan is required; the pipeline is identical from step 1.

If the user pastes a link as the topic, extract the idea from it and remind them that the post
itself cannot contain the URL (the API rejects link posts). Do not put the link in the draft.

## Pipeline

1. **Gather context, cheaply.** Get the voice profile and learnings from the newest file in
   `~/.climbx/snapshots/` if it is fresher than `snapshot_throttle_hours` (config, default 20);
   otherwise call `get_voice_profile` and `get_learnings`, then write a snapshot. Call
   `get_format_performance` for the account's strong formats. Do not re-fetch what a fresh snapshot
   already has.

2. **Decide the target format.** If the source outlier's format is strong for THIS account, reuse
   it; otherwise adapt the idea into one of the account's top-performing formats. State which format
   and why in one line (based on the account's format performance, not generic advice).

3. **Produce 2 or 3 distinct variants.** Genuinely different hooks or formats, not paraphrases of
   one another. `get_learnings` returns `{ learnings: { positive: [...], negative: [...] } }`, where
   `positive` are the do-more rules and `negative` the do-less rules, each an object with a `text`
   (and usually `evidence`). Annotate each variant with:
   - the format it uses (a `format` value from the `get_format_performance` rows),
   - the do-more rules it applies (quote the `text` of the `positive` learnings used),
   - the do-less rules it consciously avoids (from the `negative` learnings).
   Every variant must already pass the draft guards below before you show it.

4. **Refine with the user's own skills when present.** If complementary skills are installed (a post
   optimizer or a brand-voice skill, detected generically by the core skill), run the chosen variant
   through them as a refinement pass on top of the ClimbX voice, never as a replacement for it.

5. **Refinement loop.** The user picks and edits. Re-apply the draft guards after every edit; a
   changed draft is a new draft. Keep the annotations current so the user always sees which learnings
   are in play.

6. **Final gate and handoff.** Before presenting a draft as final, it must pass all draft guards
   (guardrails.md): no URLs, no em or en dashes, no hashtags, no AI-typical filler, length sanity,
   language per config, format named, learnings named. Then hand the approved text to the ship stage
   (the `climbx-ship` skill when installed, otherwise the core skill's ship stage). Never publish or
   schedule from here; shipping owns the write-confirmation protocol.

## Language

Follow `draft_language` from config. The default `auto` means match the language of the source
outlier or topic. When the opportunity text is in a different language than the user's usual one,
match the outlier's language, say so, and offer the alternative. A fixed ISO 639-1 code in the
config overrides all of this.
