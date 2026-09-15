# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo actually is

Despite `AGENTS.md`/`README.md` describing an "agent-spec" pure-documentation framework
(with `src/` as CLI/compiler/linter tooling), the `src/` tree is a real React + Vite +
Supabase single-page app: **FPO Safety & Compliance Log**, a checklist-compliance dashboard
for tracking daily/weekly/monthly facility checklists (fridge temps, AED checks, med kits,
eyewash stations, etc.) across multiple locations. The `spec/` tree and its rules are a
separate, unrelated concern (a portable agent-instruction standard vendored into this repo)
— do not conflate the two when reasoning about "the codebase."

## Commands

- `npm run dev` — start Vite dev server
- `npm run build` — typecheck (`tsc --noEmit`) then production build
- `npm run typecheck` — `tsc --noEmit` only
- `npm run preview` — preview a production build
- No test suite and no lint script are configured.
- `node scripts/audit-compliance.js` validates Markdown under `spec/` (unrelated to the app).

## Architecture

- **Data model**: a single Supabase table `compliance_records` (see `supabase/schema-v2.sql`)
  keyed by `(task_id, location, period_key)`, holding `done`, `note`, `flag`, and a JSON
  `fields` blob per checklist submission. `src/lib/catalog.ts` is the single source of truth
  for the task catalog, per-task field schemas, flag-evaluation rules, and period-key math
  (daily = ISO date, weekly = ISO week, monthly = `YYYY-MM`).
- **`useRecords` hook** (`src/hooks/useRecords.ts`) owns all record I/O: initial fetch, a
  Supabase Realtime subscription on `compliance_records` (quiet re-fetch on any change —
  requires the table in the `supabase_realtime` publication, see `supabase/realtime.sql`),
  and `saveEntry`/`undoEntry` upserts/deletes. Components never talk to Supabase directly
  except `Dashboard.tsx` for CSV import/export.
- **`Dashboard.tsx`** is the shell: sidebar nav, keyboard shortcuts (1–6 switch tabs), and
  routes the active `NavSectionId` to `Overview`, `ChecklistSection` (daily/weekly/monthly),
  `HistoryView`, or `UserSettings`.
- **`Overview.tsx`** computes today/week/month completion from the record map and renders
  the hero KPI cards, yesterday-unlogged alert, outstanding list, location breakdown, and the
  `TrendCard`/`DonutCard` pair.
- **Offline/no-Supabase mode**: `isSupabaseConfigured` (from `src/lib/supabase.ts`, gated on
  `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`) is false when env vars are missing; the app
  then renders `Dashboard` with a null user and every Supabase call becomes a no-op instead
  of throwing — never assume Supabase is always configured when touching this path.
- **Types**: `src/lib/types.ts` holds UI-facing domain types decoupled from the Supabase row
  shape (`ComplianceRecord` in `useRecords.ts`) and from `catalog.ts`'s `CatalogTask`.
- Motion: uses the `motion` (Framer Motion) library; `MotionConfig reducedMotion="user"` is
  set at the app root in `App.tsx` — respect existing reduced-motion handling when adding
  animations rather than introducing a parallel mechanism.
