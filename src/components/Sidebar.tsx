import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import type { User } from '@supabase/supabase-js';
import { tick } from '../lib/haptics';
import { isSupabaseConfigured, signOut } from '../lib/supabase';
import { APP_VERSION } from '../lib/version';
import type { NavSectionId } from '../lib/types';

interface NavItem {
  id: NavSectionId;
  label: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  { title: 'Dashboard', items: [{ id: 'overview', label: 'Overview' }] },
  {
    title: 'Checklists',
    items: [
      { id: 'daily', label: 'Daily' },
      { id: 'weekly', label: 'Weekly' },
      { id: 'monthly', label: 'Monthly' },
    ],
  },
  { title: 'Records', items: [{ id: 'history', label: 'History' }] },
  { title: 'Account', items: [{ id: 'settings', label: 'Settings' }] },
];

interface SidebarProps {
  active: NavSectionId;
  onNavigate: (id: NavSectionId) => void;
  open: boolean;
  onClose: () => void;
  user: User | null;
}

// Heavy glass rail. On mobile it's a spring-driven sheet that can be
// grabbed and reversed mid-flight — never a locked CSS transition.
export function Sidebar({ active, onNavigate, open, onClose, user }: SidebarProps) {
  const [desktop, setDesktop] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches
  );

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const onChange = () => setDesktop(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const visible = open || desktop;

  return (
    <>
      <motion.button
        type="button"
        aria-label="Close navigation"
        onClick={onClose}
        tabIndex={visible ? 0 : -1}
        initial={false}
        animate={{ opacity: visible && !desktop ? 1 : 0 }}
        transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
        className={`fixed inset-0 z-30 cursor-default bg-stone-950/30 lg:hidden ${
          visible && !desktop ? '' : 'pointer-events-none'
        }`}
      />
      <motion.aside
        aria-label="Primary"
        initial={false}
        animate={{ x: visible ? 0 : '-100%' }}
        transition={{ type: 'spring', bounce: 0.05, duration: 0.4 }}
        className="glass-rail fixed inset-y-0 left-0 z-40 flex w-64 flex-col"
      >
        <div className="border-b border-stone-900/10 px-5 pb-5 pt-6">
          <div className="flex items-center gap-2.5">
            <span
              aria-hidden
              className="flex h-9 w-9 items-center justify-center rounded-2xl bg-stone-900 text-sm font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]"
            >
              F
            </span>
            <div>
              <p className="display-tight text-[15px] font-bold leading-tight text-stone-900 dark:text-white">
                FPO Safety &amp; Compliance Log
              </p>
              <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-600 dark:text-stone-400">
                Clinical Operations
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {NAV_GROUPS.map((group) => (
            <div key={group.title} className="mb-5 last:mb-0">
              <p className="px-3 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-stone-600 dark:text-stone-400">
                {group.title}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = item.id === active;
                  return (
                    <li key={item.id}>
                      <motion.button
                        type="button"
                        onClick={() => {
                          tick();
                          onNavigate(item.id);
                          onClose();
                        }}
                        aria-current={isActive ? 'page' : undefined}
                        whileTap={{ scale: 0.97 }}
                        transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
                        className={`flex w-full items-center rounded-xl px-3 py-2 text-[13.5px] ${
                          isActive
                            ? 'bg-stone-900 font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] dark:bg-white dark:text-black dark:shadow-none'
                            : 'font-medium text-stone-600 dark:text-stone-400 hover:bg-stone-900/5 dark:hover:bg-white/10 hover:text-stone-900 dark:hover:text-white'
                        }`}
                      >
                        <span
                          aria-hidden
                          className={`mr-2.5 h-1.5 w-1.5 rounded-full ${
                            isActive ? 'bg-emerald-300' : 'bg-stone-400'
                          }`}
                        />
                        {item.label}
                      </motion.button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {user && (
          <div className="border-t border-stone-900/10 px-5 py-3">
            <div className="flex items-center gap-2.5">
              {user.user_metadata?.avatar_url ? (
                <img
                  src={user.user_metadata.avatar_url as string}
                  alt=""
                  className="h-8 w-8 rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span
                  aria-hidden
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-900 text-xs font-bold text-white"
                >
                  {(user.email?.[0] ?? 'U').toUpperCase()}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-stone-900 dark:text-white">
                  {user.user_metadata?.full_name || user.email}
                </p>
                {user.user_metadata?.full_name && (
                  <p className="truncate text-xs text-stone-600 dark:text-stone-400">{user.email}</p>
                )}
              </div>
              <motion.button
                type="button"
                onClick={() => { tick(); void signOut(); }}
                whileTap={{ scale: 0.94 }}
                transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
                aria-label="Sign out"
                title="Sign out"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-stone-600 dark:text-stone-400 hover:bg-stone-900/5 dark:hover:bg-white/10 hover:text-stone-900 dark:hover:text-white"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <path d="m16 17 5-5-5-5" />
                  <path d="M21 12H9" />
                </svg>
              </motion.button>
            </div>
          </div>
        )}

        <div className="border-t border-stone-900/10 px-5 py-4">
          <p className="font-mono text-[11px] text-stone-600 dark:text-stone-400">v{APP_VERSION} · Audit-ready</p>
          {isSupabaseConfigured ? (
            <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Supabase connected
            </p>
          ) : (
            <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              Offline demo mode
            </p>
          )}
        </div>
      </motion.aside>
    </>
  );
}
