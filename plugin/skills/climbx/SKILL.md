---
name: climbx
description: Core orchestrator for the ClimbX X-growth workflow (scan outliers, draft in your voice, ship, engage). Triggers on ClimbX, X growth, outliers, posting, and analytics. Scaffold placeholder; the full workflow is added in a later issue.
---

# ClimbX (core skill)

This is the router and brain for the ClimbX companion: it recognizes natural conversation
about ClimbX, X growth, outliers, drafting, posting, and analytics, then delegates into the
shared workflow the action skills use.

This file is a scaffold placeholder. The full orchestration logic, together with the write
guardrails, lands in a later issue and reads its rules from:

- `${CLAUDE_PLUGIN_ROOT}/shared/guardrails.md` (write-confirmation protocol, cap rules, draft guards)
- `${CLAUDE_PLUGIN_ROOT}/shared/api-notes.md` (tool cheat sheet, limits, error playbook)
- `${CLAUDE_PLUGIN_ROOT}/shared/contracts.md` (runtime data shapes and storage paths)

Data access goes exclusively through the bundled `climbx` MCP server; never call the ClimbX
HTTP API directly.
