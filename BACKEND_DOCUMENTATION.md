# Backend Documentation — OLX Room Finder

This document describes the backend system: its architecture, the most important
files, the database structure, and all available API endpoints. It is meant to
serve as context for future development and for building additional features on
top of this system.

## 1. Architecture overview

A single FastAPI process (`backend/main.py`) combines two responsibilities:

1. **REST API** — reading/filtering/analyzing offers stored in SQLite (`data.db`).
2. **Sync service** (`backend/services/sync_service.py`, formerly a standalone
   `daily_sync.py` script) — scrapes OLX, analyzes listing descriptions with a
   local AI model (Ollama), downloads photos, and writes everything to the
   database. It starts automatically in the background (a daemon thread) when
   the API boots, and can also be triggered manually via an endpoint.

Layers (top to bottom):

```
routers/        → HTTP layer (FastAPI endpoints), query-param validation via Depends
schemas/        → Pydantic request/response models
services/       → business/analytics logic (no SQL)
repositories/    → the only place that builds SQLAlchemy queries
db/              → Engine, sessions, table declarations (Core, not ORM)
services/sync_service.py → scraping + AI + writing to SQLite (raw sqlite3, outside SQLAlchemy)
```

Principle: routers don't know SQL, services don't know SQL (except
`sync_service.py`, which talks to sqlite3 directly because it owns the schema
and performs write/migration operations). Everything else goes through
`OfferRepository` and SQLAlchemy Core, so migrating to PostgreSQL only requires
changing `DATABASE_URL`.

## 2. Key files

| File | Role |
|---|---|
| `backend/main.py` | Entry point. Creates the `FastAPI app`, configures CORS, registers routers. `lifespan()` calls `sync_service.init_db()` on startup and (if `ENABLE_SYNC_SCHEDULER=true`) `sync_service.start_background_scheduler()`. |
| `backend/config.py` | Single place for configuration: `DATABASE_URL`, pagination (`DEFAULT_PAGE_SIZE`, `MAX_PAGE_SIZE`), `VALUE_SCORE_WEIGHTS`, `MIN_DISTRICT_SAMPLE_SIZE`, `ENABLE_SYNC_SCHEDULER`, `BASE_DIR` (repo root — also used by `sync_service.py` to locate `data.db`/`data.csv`/the log file). |
| `backend/db/session.py` | Creates the SQLAlchemy `Engine`/`SessionLocal` from `DATABASE_URL`. `get_db()` is the FastAPI dependency (one session per request). |
| `backend/db/models.py` | `Table` declarations (SQLAlchemy Core) for `offers`, `offer_history`, `sync_runs` — **query-building only**, does not create/migrate the schema. |
| `backend/dependencies.py` | `offer_filters_params()` — shared FastAPI dependency that parses offer filters from query params (used by `/offers`, `/statistics`, `/analysis` so filtering behaves identically everywhere). |
| `backend/repositories/offer_repository.py` | `OfferRepository` — the only place with SQL queries against the `offers` table (`search`, `get_by_id`, `values_for_filters`, `rows_for_filters`, `distinct_districts`, `count_for_filters`). `OfferFilters` — filters dataclass. |
| `backend/services/statistics_service.py` | Descriptive statistics (overview, per-district, price histogram, deposits, additional costs, negotiability). |
| `backend/services/analysis_service.py` | Dynamically computed analyses: price vs. district median, initial cost (deposit + total cost), district comparison, outliers (IQR), cost distribution, **value_score** (robust z-score on district median/MAD — see the `value_score()` docstring). |
| `backend/services/stats_math.py` | Pure statistical functions with no DB/framework dependency: `safe_median/mean/min/max`, `percentile`, `iqr_bounds`, `median_absolute_deviation`, `robust_z_score`, `make_histogram`. Easy to unit test. |
| `backend/services/sync_service.py` | **All scraping + AI + persistence logic.** Sections: listing/description scraping (formerly `main.py`), AI analysis via Ollama (formerly `room_analysis.py`, including `create_prompt` with the full model instructions), photo scraping (formerly `fetch_photos.py`), the DB layer (raw `sqlite3`, `SCHEMA`, `init_db`, `insert_offer`, `delete_offers`, event history), `sync_once(city)` (one full run **for a given city**), per-city configuration (`CITIES`, `get_city_configs`, `update_city_sync_hour`), the scheduler (`start_background_scheduler`, `_run_forever_loop` — polls `city_configs` every 30s and triggers each city at its configured hour:minute) and manual triggering (`trigger_manual_sync(city)`, guarded by a per-city `threading.Lock` so the scheduler and a manual trigger never overlap **for the same city**; different cities may sync concurrently). |
| `backend/services/auth_service.py` | Admin panel authentication: PBKDF2-HMAC-SHA256 password hashing (stdlib `hashlib`, no extra dependency), opaque session tokens stored in `admin_sessions` (server-side sessions, no JWT). `ensure_default_admin()` seeds `admin`/`admin` on first startup. |
| `backend/routers/offers.py` | `GET /api/offers`, `GET /api/offers/{id}`. |
| `backend/routers/statistics.py` | `GET /api/statistics/*`. |
| `backend/routers/analysis.py` | `GET /api/analysis/*`. |
| `backend/routers/sync.py` | `GET /api/sync/status`, `POST /api/sync/run` (backward-compatible, city-agnostic/default-city endpoints). |
| `backend/routers/auth.py` | `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`. |
| `backend/routers/admin.py` | `GET /api/admin/cities`, `PATCH /api/admin/cities/{city}`, `POST /api/admin/cities/{city}/sync` — all protected by `require_admin`. |
| `backend/schemas/*.py` | Pydantic response models per module (`offer.py`, `statistics.py`, `analysis.py`, `sync.py`, `auth.py`, `admin.py`). |

## 3. Database structure (SQLite, `data.db`)

The schema is created/migrated **exclusively** by `sync_service.init_db()`
(called automatically on API startup). The SQLAlchemy declarations in
`db/models.py` only mirror it for building queries.

### `offers` (current state — one row = one active listing)

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | OLX listing ID |
| `title` | TEXT NOT NULL | |
| `district` | TEXT | indexed |
| `price` | INTEGER | base rent price |
| `negotiable` | INTEGER (0/1) | "negotiable" flag found in the price text |
| `link` | TEXT | listing URL |
| `description` | TEXT | full description (only fetched for newly added offers) |
| `address` | TEXT \| NULL | extracted by AI |
| `additional_cost` | REAL \| NULL | sum of known additional monthly fees (AI) |
| `has_additional_cost` | INTEGER (0/1/NULL) | tri-state |
| `deposit` | REAL \| NULL | deposit amount (AI) |
| `has_deposit_cost` | INTEGER (0/1/NULL) | tri-state — whether a specific deposit amount was given |
| `has_deposit` | INTEGER (0/1/NULL) | tri-state — whether a deposit was mentioned at all |
| `total_monthly_cost` | REAL \| NULL | `price + additional_cost` (when both are known) |
| `photos` | TEXT | list of URLs serialized as JSON |
| `created_at` / `updated_at` | TEXT | SQLite timestamps |

**Important:** the tri-state fields (`has_*`) have three states: `1` = yes,
`0` = no (explicitly stated in the listing), `NULL` = unknown. The repository
(`_row_to_dict`) converts them to `Optional[bool]` — `None` is **not**
equivalent to `False`. Filters in `OfferFilters` (`has_deposit`,
`has_additional_cost`, `has_deposit_cost`) respect this distinction.

### `offer_history` (append-only event log)

`id, offer_id, district, price, total_monthly_cost, event ('created'|'removed'|'price_changed'), recorded_at`

Allows analyzing the market over time even after an offer is removed from
`offers` (e.g. for future price-trend analyses). Currently recorded events:
`created` (on insert) and `removed` (before delete, a snapshot of the last
known state).

### `sync_runs` (sync run log)

`id, city, started_at, finished_at, offers_seen, offers_added, offers_removed, max_page`

One row per `sync_once(city)` execution. Used by `GET /api/sync/status` /
`GET /api/admin/cities` (latest row per city).

### `city_configs` (per-city sync schedule)

`city (PK), display_name, sync_hour, sync_minute`

One row per entry in `sync_service.CITIES` (auto-seeded by
`ensure_city_configs()`, default `02:00`). Edited via
`PATCH /api/admin/cities/{city}` from the admin dashboard.

### `admin_users` / `admin_sessions` (admin panel auth)

- `admin_users`: `id, username, password_hash, salt, created_at` — PBKDF2-HMAC-SHA256
  hashed passwords (see `auth_service.py`). Seeded with `admin`/`admin` on
  first startup by `ensure_default_admin()`.
- `admin_sessions`: `token (PK), username, created_at, expires_at` — opaque
  session tokens (12h TTL), checked by the `require_admin` FastAPI dependency
  on every `/api/admin/*` request via `Authorization: Bearer <token>`.

## 4. API endpoints

### Health

- `GET /api/health` → `{"status": "ok"}`

### Offers — `backend/routers/offers.py`

- `GET /api/offers` — list with filters + sorting + pagination.
  - Query: filters from `offer_filters_params` (see below) + `sort`
    (`price|total_monthly_cost|additional_cost|deposit|created_at`, default
    `created_at`), `order` (`asc|desc`), `page` (≥1), `limit` (1–100, default
    20).
  - Response: `OfferListOut { data: OfferOut[], pagination: {page, limit, total, total_pages} }`.
- `GET /api/offers/{offer_id}` — single offer details (`OfferDetailOut`, adds
  `description`, `created_at`, `updated_at`). Returns 404 if not found.

**Shared filter query params** (`backend/dependencies.py::offer_filters_params`,
also used by `/statistics` and `/analysis`):
`district, minPrice, maxPrice, minTotalMonthlyCost, maxTotalMonthlyCost, negotiable, hasAdditionalCost, hasDeposit, hasDepositCost, search` (searches title/description/address, ILIKE).

### Statistics — `backend/routers/statistics.py` (prefix `/api/statistics`)

- `GET /overview` — `{count, price: MetricSummary, total_monthly_cost: MetricSummary}` (avg/median/min/max).
- `GET /districts` — `DistrictStatsOut[]` (same metrics per district).
- `GET /districts/{district_name}` — same as above, single district; 404 if no offers.
- `GET /price` — alias of `/overview` (convenience for clients expecting a separate `/price` endpoint).
- `GET /price-distribution?binSize=250` — price histogram `[{from, to, count}]`.
- `GET /deposits` — `DepositsStatsOut` (with/without/unknown counts, % with deposit, avg/median deposit).
- `GET /additional-costs` — same for additional fees.
- `GET /negotiation` — negotiable/non_negotiable counts + percentage.

### Analysis — `backend/routers/analysis.py` (prefix `/api/analysis`)

- `GET /price-vs-district` — offer price vs. its district's median (absolute and % difference).
- `GET /initial-cost` — estimated initial cost (deposit + total_monthly_cost), with an `initial_cost_is_estimate` flag when data is missing.
- `GET /districts` — district comparison (medians, % negotiable/no deposit/has additional cost).
- `GET /outliers?metric=price|total_monthly_cost|additional_cost|deposit` — Tukey's method (IQR × 1.5), returns bounds and the list of outlier offers.
- `GET /cost-distribution?metric=...&binSize=250` — histogram of the selected metric.
- `GET /value` — **value score**: robust z-score (district median/MAD) plus a bonus for negotiability minus a penalty for having a deposit. `value_score=None` with a `reason` when the district sample is below `MIN_DISTRICT_SAMPLE_SIZE` (default 5) or price data is missing.

### Sync — `backend/routers/sync.py` (prefix `/api/sync`)

- `GET /status` → `SyncStatusOut { running: bool, offers_count: int, last_run: SyncRunOut | null }`.
  Backward-compatible, city-agnostic: aggregates across all cities.
- `POST /run` → starts `sync_once()` for the default city (`WARSZAWA`) in a
  separate thread, returns **202** `{"status": "started"}`, or **409** if a
  sync for that city is already running.

### Auth — `backend/routers/auth.py` (prefix `/api/auth`)

- `POST /login` `{username, password}` → `LoginOut {token, username, expires_at}`,
  or **401** on bad credentials. Default account: `admin` / `admin` (change via
  `auth_service.change_password()`).
- `POST /logout` (needs `Authorization: Bearer <token>`) → **204**, invalidates the token.
- `GET /me` (needs auth) → `{"username": "..."}`.

### Admin — `backend/routers/admin.py` (prefix `/api/admin`, all endpoints require `Authorization: Bearer <token>`)

- `GET /cities` → `CityConfigOut[]` — one entry per city in `sync_service.CITIES`
  with its configured `sync_hour`/`sync_minute`, `offers_count`, `running` flag
  and `last_run`.
- `PATCH /cities/{city}` `{sync_hour, sync_minute}` → updates that city's daily
  sync schedule (used by the "Panel administratora" dashboard). 404 if the
  city is unknown.
- `POST /cities/{city}/sync` → starts `sync_once(city)` in a separate thread
  (202), or 409 if that city's sync is already running.

## 5. Sync flow (`sync_service.py`)

1. `init_db()` — creates tables (idempotently, `CREATE TABLE IF NOT EXISTS`) +
   migrations for existing databases (`city` column on `offers`/`sync_runs`) +
   a one-time migration of `data.csv` into SQLite if the database is empty +
   `ensure_city_configs()` (seeds `city_configs` for every city in `CITIES`).
2. `fetch_all_offers(city)` — fetches every listing page from OLX for that
   city's slug (`sync_service.CITIES[city]["slug"]`, e.g.
   `stancje-pokoje/warszawa`), parses cards (`parse_card`) into
   `RoomOffer(id, title, district, price, negotiable, link)`.
3. ID comparison: `existing_ids(city)` (from the DB) vs. `current_ids` (from OLX) →
   `ids_to_remove`, `ids_to_add`.
4. `delete_offers(ids_to_remove, city)` — snapshots each row into `offer_history`
   (event=`removed`), then deletes it.
5. For each new ID: `build_full_row()` fetches the description
   (`fetch_offer_description`), runs the AI analysis (`analyze_listing` →
   prompt sent to the local Ollama `llama3.2:3b` model, with retries and field
   validation), fetches photos (`fetch_offer_photos`), computes
   `total_monthly_cost`, then **immediately** calls `insert_offer(row, city)` (a
   single INSERT plus a `created` history entry) — no record is lost if the
   sync is interrupted midway.
6. `finish_sync_run()` — records the summary in `sync_runs` (tagged with `city`).

Supported cities (`sync_service.CITIES`): Warszawa, Kraków, Wrocław, Poznań,
Gdańsk, Łódź — add a new entry (`display_name` + OLX URL `slug`) to support
another city; `ensure_city_configs()` will pick it up automatically on the
next startup.

How it gets triggered:

- **Automatic**: `start_background_scheduler()` (daemon thread
  `_run_forever_loop`, polls `city_configs` every 30s and triggers each city
  at its own configured `sync_hour`/`sync_minute`, default `02:00`,
  changeable per-city via `PATCH /api/admin/cities/{city}`).
- **Manual**: `trigger_manual_sync(city)` (via `POST /api/sync/run` for the
  default city, or `POST /api/admin/cities/{city}/sync` for any city).
- Each city has its own `threading.Lock` — the scheduler and a manual trigger
  for the *same* city never run in parallel, but different cities can sync
  concurrently.

## 6. Configuration (environment variables)

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `sqlite:///{BASE_DIR}/data.db` | the only change needed to move to PostgreSQL |
| `ENABLE_SYNC_SCHEDULER` | `true` | disable in tests/local dev so the API doesn't start scraping in the background |

## 7. Admin dashboard (frontend)

`frontend/src/app/admin/login` and `frontend/src/app/admin` implement a small
admin panel: login form (calls `POST /api/auth/login`, stores the token in a
persisted zustand store — `lib/admin-auth-store.ts`) and a dashboard listing
every city with an editable sync hour/minute and a "Synchronizuj teraz"
button (calls the `/api/admin/cities*` endpoints from `lib/api/admin.ts`).
The dashboard route redirects to `/admin/login` if there is no valid token.

## 8. Notes for future development

- **New metrics/analyses**: add them in `services/analysis_service.py` or
  `statistics_service.py`, using `OfferRepository.rows_for_filters` /
  `values_for_filters` — don't write SQL outside the repository.
- **New offer filters**: extend `OfferFilters` (dataclass) + `_apply_filters()`
  in `offer_repository.py` + `offer_filters_params()` in `dependencies.py` —
  they will automatically work across all three routers.
- **Database schema changes**: modify `SCHEMA` in `sync_service.py` (schema
  owner) **and** the corresponding `Table` in `db/models.py` (so SQLAlchemy
  sees the new columns). Remember to handle `ALTER TABLE`/migration for an
  existing database — `CREATE TABLE IF NOT EXISTS` won't add new columns to an
  existing table.
- **Unit tests**: `stats_math.py` consists of pure functions — the easiest
  candidate for test coverage. `sync_service.py` also has pure parsing
  functions (`parse_price`, `extract_district`, `_to_number`,
  `calculate_total_cost`, `_parse_bool`) that can be tested without network/DB
  access.
- **Production**: consider replacing the `threading`-based scheduler with
  APScheduler/Celery if you ever need multiple API processes (the current
  design assumes one process = one scheduler).
- **Price history**: `offer_history` already has room for
  `event='price_changed'`, but `sync_once()` doesn't generate it yet
  (currently only created/removed) — a good direction for future work if you
  want to track price changes on existing offers.
