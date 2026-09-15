-- FPO Safety & Compliance Log — enable live updates (run once)
-- Puts compliance_records on the realtime publication so teammates'
-- saves arrive in every open dashboard without a reload.
-- Safe to re-run.

alter publication supabase_realtime add table public.compliance_records;
