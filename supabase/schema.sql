-- FPO Safety & Compliance Log — clean schema + seed
-- Run in Supabase Dashboard → SQL Editor → New query → Paste → Run
-- This is a full reset: drops existing tables first.

create extension if not exists "pgcrypto";

drop table if exists public.compliance_records cascade;
drop table if exists public.checklist_tasks cascade;
drop table if exists public.locations cascade;

-- Locations (canonical: loc-1, loc-2, loc-3)
create table public.locations (
  id text primary key,
  label text not null,
  short_label text not null,
  address text,
  unit_count int not null default 0
);

-- Checklist tasks (one row per checklist item per location)
create table public.checklist_tasks (
  id text primary key,
  name text not null,
  location_id text not null references public.locations (id) on delete cascade,
  frequency text not null check (frequency in ('daily', 'weekly', 'monthly')),
  status text not null check (status in ('complete', 'pending', 'overdue', 'flagged')),
  due_label text not null default '',
  assignee text,
  period_label text not null default ''
);

-- Compliance log entries (audit log, HIPAA 6yr retention)
create table public.compliance_records (
  id uuid primary key default gen_random_uuid(),
  task_id text references public.checklist_tasks (id) on delete cascade,
  location_id text references public.locations (id) on delete cascade,
  period_key text not null,
  done boolean not null default false,
  logged_at timestamptz not null default now(),
  note text,
  flag boolean not null default false
);

-- RLS: dev-open (anon can read/write). Lock down before prod.
alter table public.locations enable row level security;
alter table public.checklist_tasks enable row level security;
alter table public.compliance_records enable row level security;

drop policy if exists "anon read" on public.locations;
create policy "anon read" on public.locations for select to anon using (true);
drop policy if exists "anon write" on public.locations;
create policy "anon write" on public.locations for insert to anon with check (true);
drop policy if exists "anon update" on public.locations;
create policy "anon update" on public.locations for update to anon using (true) with check (true);

drop policy if exists "anon read" on public.checklist_tasks;
create policy "anon read" on public.checklist_tasks for select to anon using (true);
drop policy if exists "anon write" on public.checklist_tasks;
create policy "anon write" on public.checklist_tasks for insert to anon with check (true);
drop policy if exists "anon update" on public.checklist_tasks;
create policy "anon update" on public.checklist_tasks for update to anon using (true) with check (true);

drop policy if exists "anon read" on public.compliance_records;
create policy "anon read" on public.compliance_records for select to anon using (true);
drop policy if exists "anon write" on public.compliance_records;
create policy "anon write" on public.compliance_records for insert to anon with check (true);
drop policy if exists "anon update" on public.compliance_records;
create policy "anon update" on public.compliance_records for update to anon using (true) with check (true);

-- Seed: mirrors src/lib/mockData.ts
insert into public.locations (id, label, short_label, address, unit_count) values
  ('loc-1', 'Location 1 — Main Clinic', 'Location 1', '1000 Care Pkwy, Suite 100', 12),
  ('loc-2', 'Location 2 — North Wing', 'Location 2', '2450 North Wing Dr', 8),
  ('loc-3', 'Location 3 — Surgical Center', 'Location 3', '77 Meridian Blvd', 6)
on conflict (id) do update set
  label = excluded.label,
  short_label = excluded.short_label,
  address = excluded.address,
  unit_count = excluded.unit_count;

insert into public.checklist_tasks (id, name, location_id, frequency, status, due_label, assignee, period_label) values
  ('t-lock', 'Emergency Equipment & Lock Checklist', 'loc-1', 'daily', 'complete', 'Due 8:00 AM', 'R. Alvarez, RN', 'Today'),
  ('t-fridge-1', 'Refrigerator Temp Monitoring Log', 'loc-1', 'daily', 'complete', 'Due 9:00 AM', 'J. Park', 'Today'),
  ('t-gluco-1', 'Glucometer Control Log', 'loc-1', 'daily', 'pending', 'Due 5:00 PM', 'M. Chen', 'Today'),
  ('t-lock-2', 'Emergency Equipment & Lock Checklist', 'loc-2', 'daily', 'pending', 'Due 8:00 AM', 'S. Okafor, RN', 'Today'),
  ('t-fridge-2', 'Refrigerator Temp Monitoring Log', 'loc-2', 'daily', 'overdue', 'Missed yesterday', 'Unassigned', 'Yesterday'),
  ('t-eyewash-2', 'Plumbed Eye Wash Station Checklist', 'loc-2', 'weekly', 'pending', 'Due Fri', 'Facilities', 'This week'),
  ('t-aed-3', 'AED Maintenance Inspection', 'loc-3', 'monthly', 'pending', 'Due Sep 28', 'Biomed', 'September'),
  ('t-medkit-3', 'Emergency Medication Kit', 'loc-3', 'monthly', 'flagged', 'Expired item flagged', 'Pharmacy', 'September'),
  ('t-eyewash-1', 'Plumbed Eye Wash Station Checklist', 'loc-1', 'weekly', 'complete', 'Logged Mon', 'Facilities', 'This week'),
  ('t-audit-1', 'Medical/Surgical Supply Maintenance Audit', 'loc-1', 'monthly', 'complete', 'Logged Sep 4', 'Ops', 'September')
on conflict (id) do update set
  name = excluded.name,
  location_id = excluded.location_id,
  frequency = excluded.frequency,
  status = excluded.status,
  due_label = excluded.due_label,
  assignee = excluded.assignee,
  period_label = excluded.period_label;
