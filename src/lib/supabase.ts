import { createClient } from '@supabase/supabase-js';

// Centralized Supabase client. Uses Vite env vars; views fall back to
// empty states when env is missing (local dev / preview).
// Invalid values can never blank the page: they log an error and the app
// runs offline instead of throwing inside createClient.
function cleanEnv(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined;
  const t = v.trim().replace(/^["']+|["']+$/g, '');
  return t || undefined;
}

const supabaseUrl = cleanEnv(import.meta.env.VITE_SUPABASE_URL);
const supabaseAnonKey = cleanEnv(import.meta.env.VITE_SUPABASE_ANON_KEY);

function connect() {
  if (!supabaseUrl || !supabaseAnonKey) return null;
  try {
    new URL(supabaseUrl); // throws on malformed URLs before the client does
    return createClient(supabaseUrl, supabaseAnonKey);
  } catch (e) {
    console.error('[supabase] Invalid VITE_SUPABASE_URL — running offline.', e);
    return null;
  }
}

export const supabase = connect();

export const isSupabaseConfigured = supabase !== null;

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
