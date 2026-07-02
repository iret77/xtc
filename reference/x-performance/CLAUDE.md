# X Performance Plugin — Projektkontext für Claude Code

## Was ist das?

Ein X (Twitter) Analytics-Dashboard, das als **Cowork Artifact** in der Claude Desktop App entwickelt wurde und zu einem vollwertigen **Open-Source Claude Desktop Plugin** weiterentwickelt werden soll.

Der aktuelle Stand ist eine single-file HTML-Anwendung (`artifact/index.html`), die über die Cowork-API (`window.cowork.callMcpTool`) auf den X MCP Server zugreift.

---

## Aktueller Stand (Cowork Artifact)

### Features
- **Account-Switcher**: @iret77 und @byte5ai, beliebig erweiterbar über `ACCOUNTS`-Objekt
- **Timeline-Daten**: Lädt Posts über `x-twitter` MCP Server, cached in `localStorage` mit 6h TTL
- **Filter**: Posts / Replies / Alle, Mindest-Impressions (gilt für alle Sortierungen)
- **Sortierung**: Datum, Impressions, Likes, Retweets, Replies, Engagement Rate
- **Diagramme**: Top-N-Balkendiagramm (Imp./Likes/Replies/ER%), Follower-Verlauf
- **Diagramm spiegelt Liste**: `renderChart()` nutzt `displayedPosts` als Basis — kein eigenes Filtering mehr nötig
- **Post-Labels**: Kurznamen pro Post, per KI generiert und in localStorage gecached; stale @-Labels werden automatisch neu generiert
- **Wide-View-Modes**: Split (2-Spalten mit Metriken rechts), Table (mit CSV-Export), Cards
- **Auto-Reload**: Beim Öffnen wird gecachter Stand sofort angezeigt, dann im Hintergrund refresht
- **Follower-History**: Wird täglich in localStorage geschrieben und als Linienchart angezeigt
- **Boost-Erkennung**: Posts mit `organic_metrics.impression_count / public_metrics.impression_count < 5%` werden als geboosted markiert; zeigt organische Reichweite als `⚡ N org.` unter Impressions an
- **Poll Votes als Engagement**: `attachments.poll_ids` expansion + `poll.fields=options` → Votes werden zu `_poll_votes` am Tweet attached und in `engagementRate()` eingerechnet
- **CSV-Export**: Im Table-View verfügbar

### Architektur-Entscheidungen (bereits getroffen, nicht nochmal hinterfragen)

**Single MCP Server für beide Accounts:**  
Claude Desktop überschreibt `claude_desktop_config.json` beim Start und streicht unbekannte Einträge. Ein zweiter MCP-Server-Eintrag überlebt keinen Neustart. Lösung: Beide Accounts nutzen den gleichen `x-twitter`-Server. Die OAuth1-Credentials des einen Accounts können die Public Metrics des anderen lesen.

**Kein Bearer Token nötig:**  
`x-api.js` wurde so modifiziert, dass `X_BEARER_TOKEN` optional ist. `getUser` und `getTimeline` nutzen `oauthFetch` (OAuth1) statt `bearerFetch`.

**Per-Account localStorage-Namespacing:**  
Alle Keys sind mit der User-ID suffixed: `x_cache_{userId}`, `x_user_{userId}`, `x_avatar_{userId}`, `x_labels_{userId}`, `x_followers_{userId}`.

**Datenmengen konservativ halten:**  
`MAX_PER_PAGE_DATE = 20` (Datums-Sort), `MAX_PER_PAGE_OTHER = 100` (alle anderen Sorts). Bewusste Entscheidung gegen aggressive Pagination wegen X API Rate Limits.

**`promoted_metrics` ist kaputt:**  
Das Feld liefert via API systematisch Nullwerte, auch für 100% gebooste Tweets. Wird nicht verwendet. Boost-Erkennung läuft über `organic_metrics.impression_count`-Ratio.

---

## Abhängigkeiten

### x-mcp MCP Server
Liegt (beim Entwickler) unter `~/Library/MCP/x-mcp/`. Wird im Plugin als eigene Komponente mitgeliefert werden müssen.

Relevante Dateien:
- `dist/index.js` — MCP Server Entry Point
- `dist/x-api.js` — X API Client (OAuth1 + OAuth2)
- `dist/oauth2.js` — OAuth2 Manager

Wichtige Änderungen gegenüber Upstream:
- `getTimeline`: nutzt `oauthFetch` statt `bearerFetch`; `tweet.fields` enthält `organic_metrics,promoted_metrics,attachments`; `expansions` enthält `attachments.poll_ids`; `poll.fields=options,voting_status`
- `getUser`: nutzt `oauthFetch`
- `X_BEARER_TOKEN` ist optional (kein `requireEnv`)

### Externe CDN-Abhängigkeit im Artifact
```html
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.5.0/dist/chart.umd.js" ...>
```
Für ein echtes Plugin sollte das entweder gebundelt oder durch eine lokale Kopie ersetzt werden.

---

## Datenfluss im Artifact

```
window.cowork.callMcpTool('mcp__x-twitter__get_user', { username })
  → x-mcp Server
  → X API v2 /users/by/username/{username}
  → { data: { id, name, username, public_metrics, profile_image_url, ... } }

window.cowork.callMcpTool('mcp__x-twitter__get_timeline', { user_id, max_results, next_token? })
  → X API v2 /users/{id}/tweets
  → { data: [...tweets], includes: { polls: [...] }, meta: { next_token, result_count } }
```

Tweets enthalten: `id`, `text`, `created_at`, `public_metrics` (impression_count, like_count, retweet_count, reply_count, bookmark_count, quote_count), `organic_metrics` (impression_count — nur bei eigenen Tweets mit OAuth1), `referenced_tweets` (für Reply/RT-Erkennung), `attachments` (poll_ids), `entities`, `author_id`, `lang`.

Poll-Votes werden in `unwrapTimeline()` aus `includes.polls` extrahiert und als `_poll_votes` direkt an den Tweet gehängt.

---

## localStorage-Schema

| Key | Inhalt |
|-----|--------|
| `x_active_account` | `'iret77'` oder `'byte5ai'` |
| `x_cache_{userId}` | `{ posts: {[id]: tweet}, last_refresh_at: ts, last_full_refresh_at: ts, last_next_token: string\|null }` |
| `x_user_{userId}` | `{ data: userObject, ts: ts }` |
| `x_avatar_{userId}` | Base64 Data-URL des Profilbilds |
| `x_followers_{userId}` | Array von `{ ts: timestamp, count: number }` |
| `x_labels_{userId}` | `{ [tweetId]: string }` — KI-generierte Kurznamen |
| `x_filter` | `'all'` \| `'posts'` \| `'replies'` |
| `x_sort` | `'date'` \| `'impressions'` \| `'likes'` \| `'retweets'` \| `'replies'` \| `'er'` |
| `x_chart_metric` | `'impressions'` \| `'likes'` \| `'replies'` \| `'er'` |
| `x_min_imp_er` | Zahl (Mindest-Impressions-Filter, default 100) |
| `x_wide_view` | `'split'` \| `'table'` \| `'cards'` |

---

## Accounts-Konfiguration im Code

```javascript
const ACCOUNTS = {
  iret77:  { username: 'iret77',  userId: '39618008',            mcpServer: 'x-twitter', displayName: '@iret77'  },
  byte5ai: { username: 'byte5ai', userId: '2054533683168579585', mcpServer: 'x-twitter', displayName: '@byte5ai' },
};
```

`mcpServer` verweist auf den Claude Desktop MCP-Config-Key. Für ein Plugin wäre das der interne Servername des gebündelten x-mcp-Servers.

---

## Nächste Schritte: Von Artifact zu Plugin

### Was ein echtes Claude Desktop Plugin braucht

Ein Plugin ist ein `.plugin`-Bundle (ZIP-Archiv) mit folgender Struktur:
```
my-plugin.plugin/
├── PLUGIN.md         — Manifest: Name, Beschreibung, MCP-Server-Config
├── skills/           — Skill-Definitionen (SKILL.md pro Skill)
└── mcps/             — Optional: mitgelieferter MCP Server
    └── x-twitter/
        ├── package.json
        └── dist/
            ├── index.js
            ├── x-api.js
            └── oauth2.js
```

Für die genaue Plugin-Spezifikation: `skill-creator`-Skill oder `cowork-plugin-management:create-cowork-plugin`-Skill in der Cowork-Session befragen.

### Offene Fragen / Design-Entscheidungen für das Plugin

1. **Credentials-Handling**: Aktuell kommen die OAuth1-Keys aus `claude_desktop_config.json` als Env-Vars. Für ein Open-Source-Plugin braucht es einen Setup-Flow (OAuth-Callback oder manuelle Key-Eingabe).

2. **Multi-Account generisch machen**: Die `ACCOUNTS`-Konfiguration ist aktuell hardcoded. Im Plugin sollte sie konfigurierbar sein (z.B. über einen Skill, der Accounts hinzufügt/entfernt).

3. **Chart.js bundlen**: CDN-Abhängigkeit entfernen, Bibliothek lokal einbetten.

4. **x-mcp als Plugin-Dependency**: Prüfen ob x-mcp als NPM-Paket existiert oder ob die modifizierten Dateien direkt ins Plugin-Bundle müssen.

5. **Cowork-spezifische API abstrahieren**: `window.cowork.callMcpTool` ist Cowork-intern. Für maximale Portabilität (z.B. auch als standalone Web-App) könnte man einen Adapter-Layer einziehen.

---

## Dateien in diesem Verzeichnis

```
reference/x-performance/
├── artifact/index.html   — Aktueller Stand des Cowork Artifact (single-file HTML)
└── CLAUDE.md             — Diese Datei
```

Der x-mcp Server liegt separat unter `~/Library/MCP/x-mcp/` und muss für das Plugin hier mit reinkopiert werden.
