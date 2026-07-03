# Guardrails

These rules are the single source of truth for every ClimbX skill. Follow them exactly. Never
restate them in your own words, never soften them, and never skip them because the user sounds
impatient or says "no questions".

## Write-confirmation protocol (non-negotiable)

Before every publish, schedule, reschedule, or cancel, show exactly this block and wait for
explicit confirmation:

```text
Ready to <publish now | schedule for {local time} ({ISO})>:
---
{final post text, verbatim}
---
Cap after this action: {n+1}/5 used today (resets 00:00 UTC)
```

- Proceed only on an unambiguous yes ("ship it", "yes", "go"). Treat anything else as a request
  for changes, not as approval.
- The text you show must be byte-identical to what you send. Any edit to the text, however small,
  restarts the confirmation.
- Check the cap before you propose any write and state it in the block. Read it from the most
  recent write response (`posts_used_today`/`daily_cap`) or from `list_scheduled` context.
- At 5/5 used: refuse, state the reset time (00:00 UTC), and offer to schedule for after the reset.
- Cancelling never refunds a cap slot. Say so before you confirm a cancel of a same-day post.
- Never call a write tool before the user has confirmed this exact block.

## Draft guards

Every draft must pass all of these before you present it as final:

- **No URLs.** ClimbX rejects link posts. Do not draft around it; if the request is to promote a
  link, stop before drafting and tell the user the post cannot contain a URL.
- **No em dashes, no en dashes, no hashtags, no AI-typical filler.**
- **Language** follows the user config `draft_language` (`auto` means match the source outlier's
  language).
- **Format-conscious:** name which format the draft uses and why, based on the account's format
  performance.
- **Learnings-conscious:** state which do-more rules you applied and which do-less rules you
  avoided.

## suggest_reply (engage)

- Each `suggest_reply` call spends one shared daily AI credit. If the user asks for several replies
  in a row, say so before calling and confirm they want to spend the credits.
- Drafting can be locked until the owner has written enough replies by hand in the ClimbX app. If
  locked, say so and suggest writing replies manually for now.
- Replies are never posted through the API. Always hand the suggestion back for the user to edit
  and post on X themselves.
