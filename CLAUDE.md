# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Full desktop app (frontend + Tauri)
npm run tauri dev          # dev mode with hot reload
npm run tauri build        # build distributable .exe

# Frontend only
npm run dev                # Vite dev server (no Tauri, limited functionality)
npm run build              # type-check + Vite production build

# Rust
cd src-tauri && cargo check   # lint Rust without full build
cd src-tauri && cargo build   # build Rust backend
```

## Architecture

Orianna is a Tauri v2 desktop app for League of Legends match-history analysis. The Rust backend acts as an HTTP proxy and LCU process inspector; all business logic lives in TypeScript.

### Rust layer (`src-tauri/src/`)

Three Tauri commands exposed to the frontend:
- **`get_lcu_auth`** — scans running processes for `LeagueClientUx`, extracts auth port/token/region from its CLI args
- **`lcu_request` / `rc_request`** — local HTTPS proxies to LCU and Riot Client respectively (both use Basic Auth with `riot` as user); necessary because the LCU uses self-signed certs
- **`proxy_request`** — general HTTP proxy that accepts arbitrary headers; used to call Riot's SGP (Server-side Gateway Protocol) endpoints from the frontend, bypassing CORS

### API layer (`src/core/api/`)

- **`lcu/`**: Calls `lcu_request` (via `invoke`) to talk to the local League Client. Entry point for summoner info, friends list, entitlements/session tokens
- **`rc/`**: Calls `rc_request` for Riot Client endpoints (cross-server account alias resolution)
- **`sgp/`**: `LeagueSgpApi` class that routes requests through `proxy_request` to Riot's SGP match-history and common endpoints. Routing is driven by `src/assets/league-servers.json` which maps server IDs to base URLs. Requires `entitlementsToken` and `leagueSessionToken` obtained through the LCU

### Data layer

**Database** (`src/core/db/schema.ts`): Single SQLite DB (`orianna.db`) via `tauri-plugin-sql`. One table `match_games` with a `UNIQUE(game_id, puuid)` constraint and ~215 columns (206 raw stats + 9 pre-computed `calc_*` metrics). Schema migration is additive-only via `ALTER TABLE ... ADD COLUMN` in a catch block (safe for existing DBs).

**Sync** (`src/core/services/sync.ts`): `SyncService` fetches paginated match history from SGP and inserts rows. On 401, it automatically re-initializes tokens and retries once.

### State management (`src/store/`)

- **`user.ts`**: Central Pinia store. Manages LCU connection state, `localPlayer`, `currentViewPlayer`, and `comparePool` (persisted to `localStorage`). `smartSync()` drives data collection: it first catches up recent games, then deep-dives until all active plugin data requirements are satisfied
- **`plugins.ts`**: Manages built-in plugins (from `src/assets/plugins/*.json` loaded via `import.meta.glob`) and user-created custom plugins (persisted to `localStorage`)

### Plugin engine (`src/core/plugins/`)

Plugins are JSON configs (`PluginConfig`) with four sections:
- `manifest`: id, name, version, tags
- `layout`: CSS grid slot and which views it mounts on (`dashboard` | `compare`)
- `dataQuery`: declares the SQL entity (`match_games`, `match_items`, or `match_augments`), filters, metrics (fields or sanitized SQL expressions), groupBy, sortBy, outputLimit
- `visualization`: chart type (`line`, `bar`, `radar`, `scatter`, `pie`, `stat-card`, `list`) and series definitions

`PluginEngine.renderPlugin()` compiles the declarative config into parameterized SQL (with a whitelist of allowed field names from `METRICS_MAP` and safe SQL functions), queries SQLite, and builds ECharts option objects or plain data structures.

The `match_items` and `match_augments` entities are virtual — the engine unpivots `item0`–`item6` and `player_augment_1`–`player_augment_6` columns via CTEs.

### Views & routing

| Route | View | Purpose |
|---|---|---|
| `/` | `Dashboard` | Plugin charts for `currentViewPlayer` |
| `/history` | `MatchHistory` | Paginated match list |
| `/compare` | `Compare` | Plugin charts for all players in `comparePool` |
| `/plugins` | `Plugins` | Workshop: enable/disable, import/export plugins |
| `/plugins/editor/:id?` | `PluginEditor` | Visual JSON editor for creating custom plugins |
| `/settings` | `Settings` | DB management (size, vacuum, clear, import/export) |

### Key conventions

- All Tauri `invoke` calls go through the typed wrappers in `src/core/api/`; never call `invoke` directly from views or stores
- `gameDataService` (`src/core/services/game-data.ts`) is a lazy singleton that must be `await`ed once before use; it provides champion/item/spell/augment name lookups from bundled JSON assets
- The plugin SQL compiler enforces a whitelist: metric fields must exist in `METRICS_MAP` (`src/constants/metrics.ts`), expressions may only reference those same keys plus a `SAFE_SQL_FUNCTIONS` set
- `dataVersion` (a counter in `useUserStore`) is incremented whenever new rows are inserted; views watch it to trigger re-renders without manual cache invalidation
