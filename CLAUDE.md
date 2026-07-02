# climbx-cowork — Projektkontext

Companion-Projekt zu **climbx.so**: ein Open-Source-**MCP-Server** (`climbx-mcp`, Phase 1) auf der offiziellen ClimbX-REST-API plus ein **Claude-Cowork-Plugin** mit Live-Artifact-Dashboard (Phase 2) — als alternativer Client zur ClimbX-Web-App.

## Pflichtlektüre vor jeder Arbeit

Konzept, Plan, API-Referenz, Entscheidungshistorie und **Statuslog** liegen bewusst **außerhalb dieses Repos** auf Projekt-Ebene:

1. **`../docs/konzept.md`** — das maßgebliche Dokument. Zuerst lesen; bei Widerspruch gewinnt es.
2. `../docs/x-growth-tooling-research.md` — historische Recherche, nicht mehr aktualisieren.
3. `reference/x-performance/` — funktionierender Artifact-Prototyp (Read-only-Referenz für das Phase-2-Dashboard, samt eigenem CLAUDE.md).

## Harte Regeln

- **Nichts veröffentlichen ohne doppeltes Gate:** OK des ClimbX-Gründers **und** expliziter User-Confirm im Moment der Aktion (Public-Repo-Anlage, Uploads, Ankündigungen). Details: konzept.md §4.6.
- **Entschiedenes nicht neu aufrollen** (siehe konzept.md §2). Es gilt: nur offizielle APIs, keine automatisierten Engagement-Aktionen, jede Schreibaktion nutzerinitiiert.
- **`CLIMBX_API_KEY` nur als Env-Var** — nie in Dateien, Logs, Configs oder Chat persistieren.
- **`mcp/` ist der spätere Public-Repo-Inhalt:** keine internen Verweise (auch nicht auf `../docs/`), keine Strategie-Inhalte, alles dort englisch.
- **Interne Doku bleibt draußen:** Strategie-/Planungsdokumente gehören nach `../docs/` (Projekt-Ebene), niemals in dieses Repo.
- **Statuslog pflegen:** Wesentliche Ereignisse mit Datum in konzept.md §8 nachtragen.
