# Orianna

A Tauri v2 desktop app for League of Legends match-history analysis. The Rust backend acts as an HTTP proxy and LCU process inspector; all business logic lives in TypeScript.

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop framework | Tauri v2 |
| Frontend | Vue 3 + TypeScript + Vite |
| UI | Tailwind CSS v4 |
| Charts | ECharts (via vue-echarts) |
| State management | Pinia |
| Routing | Vue Router |
| Backend | Rust (reqwest, sysinfo, serde) |
| Database | SQLite (via tauri-plugin-sql) |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Rust](https://www.rust-lang.org/tools/install) (latest stable)
- [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) for your platform

### Development

```bash
# Install dependencies
npm install

# Run in dev mode (frontend + Tauri backend, hot reload)
npm run tauri dev

# Frontend only (Vite dev server, limited functionality)
npm run dev
```

### Build

```bash
# Type-check + production build
npm run build

# Build distributable .exe / .app
npm run tauri build
```

## Architecture

### Rust Layer (`src-tauri/src/`)

Three Tauri commands exposed to the frontend:

- **`get_lcu_auth`** — scans running processes for `LeagueClientUx`, extracts auth port/token/region from its CLI args
- **`lcu_request` / `rc_request`** — local HTTPS proxies to LCU and Riot Client (Basic Auth with `riot` as user), necessary because the LCU uses self-signed certs
- **`proxy_request`** — general HTTP proxy for Riot's SGP endpoints, bypasses CORS

### API Layer (`src/core/api/`)

- **`lcu/`** — talk to the local League Client (summoner info, friends list, entitlements/session tokens)
- **`rc/`** — Riot Client endpoints (cross-server account alias resolution)
- **`sgp/`** — Riot's SGP match-history and common endpoints, routed through `proxy_request`

### Data Layer

**Database** (`src/core/db/schema.ts`): Single SQLite DB with a `match_games` table (~215 columns). Schema migration is additive-only via `ALTER TABLE ... ADD COLUMN`.

**Sync** (`src/core/services/sync.ts`): Fetches paginated match history from SGP, handles 401 auto-retry with token refresh.

### Plugin Engine (`src/core/plugins/`)

Plugins are JSON configs with declarative data queries and visualization specs. The engine compiles them into parameterized SQL and builds ECharts option objects.

Supported chart types: `line`, `bar`, `radar`, `scatter`, `pie`, `stat-card`, `list`.

### Views & Routing

| Route | View | Purpose |
|---|---|---|
| `/` | Dashboard | Plugin charts for current player |
| `/history` | MatchHistory | Paginated match list |
| `/compare` | Compare | Plugin charts for multiple players |
| `/plugins` | Plugins | Workshop: enable/disable, import/export |
| `/plugins/editor/:id?` | PluginEditor | Visual JSON editor for custom plugins |
| `/settings` | Settings | DB management (size, vacuum, clear, import/export) |

## Project Structure

```
Orianna/
├── src/
│   ├── assets/            # Static assets (champion data, server list, built-in plugins)
│   ├── components/        # Reusable Vue components
│   ├── constants/         # Game dictionaries, metric definitions
│   ├── core/
│   │   ├── api/           # LCU, Riot Client, SGP API wrappers
│   │   ├── db/            # SQLite schema & migrations
│   │   ├── plugins/       # Plugin engine & types
│   │   └── services/      # Sync, analytics, game-data, gameflow
│   ├── layout/            # App layout components
│   ├── router/            # Vue Router config
│   ├── store/             # Pinia stores (user, plugins)
│   └── views/             # Page-level components
├── src-tauri/
│   ├── icons/             # App icons
│   ├── src/               # Rust backend (lib.rs, lcu.rs, main.rs)
│   ├── Cargo.toml
│   └── tauri.conf.json
├── package.json
└── vite.config.ts
```

## License

MIT
