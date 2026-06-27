# TM Journal Monitor

A web-based Trademark Journal Monitoring System for tracking, scanning, and processing trademark publication journals.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, served at `/api`)
- `pnpm --filter @workspace/tm-journal run dev` — run the frontend (served at `/`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + shadcn/ui + Tailwind CSS + wouter + TanStack Query
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI contract (source of truth)
- `lib/db/src/schema/` — Drizzle table definitions (dashboard.ts, journal.ts, review.ts, records.ts)
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/tm-journal/src/` — React frontend (pages/, components/)

## Architecture decisions

- Contract-first: OpenAPI spec gates codegen, which gates the frontend hooks
- All keyword/TM matching logic lives in `actions.ts` route handler (mirrors the GAS `runScan` logic)
- Dashboard config is a singleton row in `dashboard` table (created on first GET)
- Unique scan deduplication uses `unique_key` column (`journalNo|appNo|matchType|matchedTerm`)
- Google Drive/Docs generation is stubbed — records are created with placeholder doc URLs until GAS integration is wired up

## Product

- **Dashboard**: Journal config (number, date, match mode), stats overview, keywords/TM numbers management, action buttons (Scan, Generate Docs, Export, Normalize Dates)
- **Journal Entries**: Paginated searchable table, CSV bulk import dialog, clear all
- **Review Items**: Scan match results with color-coded status badges (REVIEW → MAILMERGE → GENERATED), filterable by match type and status
- **Records**: Read-only historical log of generated document records

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- After schema changes in `lib/db/src/schema/`, run `pnpm run typecheck:libs` before typechecking leaf packages
- `@import url(...)` for Google Fonts must be the very first line in `index.css` — PostCSS fails silently otherwise
- Orval schema naming: never name a component `Record` (conflicts with TypeScript built-in `Record<K,V>`)
- Always use entity-shaped component names in OpenAPI (e.g. `TmRecord`, `ReviewItemUpdate`) not operation-shaped names

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
