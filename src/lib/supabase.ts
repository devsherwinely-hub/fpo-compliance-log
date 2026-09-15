import { createClient } from '@supabase/supabase-js';

// Centralized Supabase client. Uses Vite env vars; views fall back to
// empty states when env is missing (local dev / preview).
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase =
  isSupabaseConfigured
    ? createClient(supabaseUrl as string, supabaseAnonKey as string)
    : null;

// Google sign-in (Supabase Auth OAuth). Returns to this origin after the
// provider round-trip; the client picks the session up from the URL.
export async function signInWithGoogle(): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured');
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
  });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// Live tables — see supabase/schema-v2.sql:
//   locations(id, label, short_label, address, unit_count)
//   task_catalog(id, name, frequency, per_loc)
//   compliance_records(id, task_id, location, period_key, done, logged_at, note, flag, fields)
