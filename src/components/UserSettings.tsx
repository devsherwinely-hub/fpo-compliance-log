import { motion } from 'motion/react';
import type { User } from '@supabase/supabase-js';
import { tick } from '../lib/haptics';
import { isSupabaseConfigured, signOut } from '../lib/supabase';
import type { NavSectionId } from '../lib/types';
import { APP_VERSION } from '../lib/version';

const STARTUP_OPTIONS: Array<{ value: NavSectionId; label: string }> = [
  { value: 'overview', label: 'Overview' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'history', label: 'History' },
];

interface UserSettingsProps {
  user: User | null;
  glass: number;
  onGlassChange: (v: number) => void;
  defaultTab: NavSectionId;
  onDefaultTabChange: (t: NavSectionId) => void;
  onResetPrefs: () => void;
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="glass-card rounded-2xl p-4 sm:p-5">
      <h3 className="text-sm font-semibold text-stone-800">{title}</h3>
      {hint && <p className="mt-0.5 text-[13px] text-stone-600">{hint}</p>}
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

export function UserSettings({ user, glass, onGlassChange, defaultTab, onDefaultTabChange, onResetPrefs }: UserSettingsProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="display-tight font-sans text-xl font-bold text-stone-900">Settings</h2>
        <span className="font-mono text-xs text-stone-600">account &amp; preferences</span>
      </div>

      <Section title="Account" hint={user ? 'Signed in with Google.' : 'Offline demo — no account.'}>
        {user ? (
          <div className="flex items-center gap-3">
            {user.user_metadata?.avatar_url ? (
              <img
                src={user.user_metadata.avatar_url as string}
                alt="Profile photo"
                className="h-11 w-11 rounded-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span
                aria-hidden
                className="flex h-11 w-11 items-center justify-center rounded-full bg-stone-900 text-sm font-bold text-white"
              >
                {(user.email?.[0] ?? 'U').toUpperCase()}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-semibold text-stone-900">
                {user.user_metadata?.full_name || user.email}
              </p>
              <p className="truncate text-[13px] text-stone-600">{user.email}</p>
            </div>
            <motion.button
              type="button"
              onClick={() => { tick(); void signOut(); }}
              whileTap={{ scale: 0.96 }}
              transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
              className="h-9 shrink-0 rounded-full border border-stone-300/70 bg-white/60 px-4 text-[13px] font-semibold text-stone-700"
            >
              Sign out
            </motion.button>
          </div>
        ) : (
          <p className="text-[13px] text-stone-600">Sign in to attach entries to your identity.</p>
        )}
      </Section>

      <Section title="Appearance" hint="Liquid Glass clarity, like Settings → Appearance on iOS.">
        <div>
          <label htmlFor="settingsGlass" className="flex items-center justify-between text-[13px] font-medium text-stone-800">
            <span>Glass clarity</span>
            <span className="font-mono text-xs text-stone-600">
              {glass < 0.33 ? 'Clear' : glass > 0.66 ? 'Tinted' : 'Balanced'}
            </span>
          </label>
          <input
            id="settingsGlass"
            type="range"
            min={0}
            max={100}
            value={Math.round(glass * 100)}
            onChange={(e) => onGlassChange(Number(e.target.value) / 100)}
            className="mt-1.5 w-full accent-stone-900"
          />
        </div>
      </Section>

      <Section title="Startup" hint="Which tab opens when you launch the app.">
        <div className="flex items-center gap-2">
          <label htmlFor="defaultTab" className="text-[13px] font-medium text-stone-800">Default tab</label>
          <select
            id="defaultTab"
            value={defaultTab}
            onChange={(e) => onDefaultTabChange(e.target.value as NavSectionId)}
            className="h-9 rounded-full border border-stone-300/70 bg-white/60 px-3 text-[13px] font-medium text-stone-800"
          >
            {STARTUP_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </Section>

      <Section title="About">
        <dl className="space-y-1.5 text-[13px]">
          <div className="flex justify-between gap-3">
            <dt className="text-stone-600">Version</dt>
            <dd className="font-mono font-semibold text-stone-800">v{APP_VERSION}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-stone-600">Backend</dt>
            <dd className="font-medium text-stone-800">{isSupabaseConfigured ? 'Supabase connected' : 'Offline demo mode'}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-stone-600">Audit log</dt>
            <dd className="font-medium text-stone-800">Retained 6 yrs</dd>
          </div>
        </dl>
        <motion.button
          type="button"
          onClick={() => { tick(); onResetPrefs(); }}
          whileTap={{ scale: 0.96 }}
          transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
          className="h-9 rounded-full border border-stone-300/70 bg-white/60 px-4 text-[13px] font-semibold text-stone-700"
        >
          Reset preferences
        </motion.button>
      </Section>
    </div>
  );
}
