-- FPO Safety & Compliance Log — v2 schema (matches sample/Index.html model)
-- Run in Supabase Dashboard → SQL Editor → New query → Paste → Run
-- Full reset: task catalog (9 types) + compliance_records keyed by task|location|period.
--
-- v1 used checklist_tasks with per-location status rows. v2 replaces that with:
--   task_catalog (static definitions) + compliance_records (one row per logged instance)

create extension if not exists "pgcrypto";

drop table if exists public.compliance_records cascade;
drop table if exists public.checklist_tasks cascade;
drop table if exists public.task_catalog cascade;
drop table if exists public.locations cascade;

create table public.locations (
  id text primary key,
  label text not null,
  short_label text not null,
  address text,
  unit_count int not null default 0
);

-- Static checklist definitions (9 types from sample)
create table public.task_catalog (
  id text primary key,
  name text not null,
  frequency text not null check (frequency in ('daily', 'weekly', 'monthly')),
  per_loc boolean not null default true
);

-- One row per logged instance: (task_id, location, period_key) is unique.
-- location is 'Location 1' | 'Location 2' | 'Location 3' | 'all' (global tasks like i-STAT).
-- flag is text (human-readable reason) — empty means no attention needed.
-- fields holds the submitted form values as JSON.
create table public.compliance_records (
  id uuid primary key default gen_random_uuid(),
  task_id text not null references public.task_catalog (id) on delete cascade,
  location text not null,
  period_key text not null,
  done boolean not null default true,
  logged_at timestamptz not null default now(),
  note text not null default '',
  flag text not null default '',
  fields jsonb not null default '{}'::jsonb,
  unique (task_id, location, period_key)
);

alter table public.locations enable row level security;
alter table public.task_catalog enable row level security;
alter table public.compliance_records enable row level security;

-- Dev-open policies (anon read/write). Lock down before prod.
drop policy if exists "anon read" on public.locations;
create policy "anon read" on public.locations for select to anon using (true);
drop policy if exists "anon write" on public.locations;
create policy "anon write" on public.locations for insert to anon with check (true);
drop policy if exists "anon update" on public.locations;
create policy "anon update" on public.locations for update to anon using (true) with check (true);
drop policy if exists "anon delete" on public.locations;
create policy "anon delete" on public.locations for delete to anon using (true);

drop policy if exists "anon read" on public.task_catalog;
create policy "anon read" on public.task_catalog for select to anon using (true);
drop policy if exists "anon write" on public.task_catalog;
create policy "anon write" on public.task_catalog for insert to anon with check (true);
drop policy if exists "anon update" on public.task_catalog;
create policy "anon update" on public.task_catalog for update to anon using (true) with check (true);

drop policy if exists "anon read" on public.compliance_records;
create policy "anon read" on public.compliance_records for select to anon using (true);
drop policy if exists "anon write" on public.compliance_records;
create policy "anon write" on public.compliance_records for insert to anon with check (true);
drop policy if exists "anon update" on public.compliance_records;
create policy "anon update" on public.compliance_records for update to anon using (true) with check (true);
drop policy if exists "anon delete" on public.compliance_records;
create policy "anon delete" on public.compliance_records for delete to anon using (true);

insert into public.locations (id, label, short_label, address, unit_count) values
  ('loc-1', 'Location 1 — Main Clinic', 'Location 1', '1000 Care Pkwy, Suite 100', 12),
  ('loc-2', 'Location 2 — North Wing', 'Location 2', '2450 North Wing Dr', 8),
  ('loc-3', 'Location 3 — Surgical Center', 'Location 3', '77 Meridian Blvd', 6)
on conflict (id) do update set
  label = excluded.label,
  short_label = excluded.short_label,
  address = excluded.address,
  unit_count = excluded.unit_count;

insert into public.task_catalog (id, name, frequency, per_loc) values
  ('lock', 'Emergency Equipment & Lock Checklist', 'daily', true),
  ('fridge', 'Refrigerator Temp Monitoring Log', 'daily', true),
  ('glucometer', 'Glucometer Control Log', 'daily', true),
  ('eyewash', 'Plumbed Eye Wash Station Checklist', 'weekly', true),
  ('cartTray', 'Emergency Equipment Cart Medication Tray (Banyan)', 'monthly', true),
  ('aed', 'AED Maintenance Inspection', 'monthly', true),
  ('medKit', 'Emergency Medication Kit', 'monthly', true),
  ('supplyAudit', 'Medical/Surgical Supply Maintenance Audit', 'monthly', true),
  ('istat', 'i-STAT Controls (Receipt & Monthly Check)', 'monthly', false)
on conflict (id) do update set
  name = excluded.name,
  frequency = excluded.frequency,
  per_loc = excluded.per_loc;
