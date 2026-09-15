-- FPO Safety & Compliance Log — auth policies (add-on, non-destructive)
-- Run AFTER supabase/schema-v2.sql in SQL Editor.
-- Grants the signed-in (authenticated) role full access to app tables.
-- Existing anon policies are left untouched so current previews keep working;
-- once Google login is verified, drop the anon WRITE policies to lock down:
--   drop policy if exists "anon write" on public.locations;
--   drop policy if exists "anon update" on public.locations;
--   drop policy if exists "anon delete" on public.locations;
--   drop policy if exists "anon write" on public.task_catalog;
--   drop policy if exists "anon update" on public.task_catalog;
--   drop policy if exists "anon write" on public.compliance_records;
--   drop policy if exists "anon update" on public.compliance_records;
--   drop policy if exists "anon delete" on public.compliance_records;

drop policy if exists "auth full access" on public.locations;
create policy "auth full access" on public.locations
  for all to authenticated using (true) with check (true);

drop policy if exists "auth full access" on public.task_catalog;
create policy "auth full access" on public.task_catalog
  for all to authenticated using (true) with check (true);

drop policy if exists "auth full access" on public.compliance_records;
create policy "auth full access" on public.compliance_records
  for all to authenticated using (true) with check (true);
