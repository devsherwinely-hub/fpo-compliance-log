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
  icon: (props: { className?: string }) => JSX.Element;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

// Minimalist outlined icons, stroke-width 2 — matches the hamburger/sign-out
// glyphs already used elsewhere in the shell.
function IconGrid({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}
function IconSun({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}
function IconCalendarRange({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18M8 15h2M14 15h2" />
    </svg>
  );
}
function IconCalendar({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}
function IconClock({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  );
}
function IconGear({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

const NAV_GROUPS: NavGroup[] = [
  { title: 'Dashboard', items: [{ id: 'overview', label: 'Overview', icon: IconGrid }] },
  {
    title: 'Checklists',
    items: [
      { id: 'daily', label: 'Daily', icon: IconSun },
      { id: 'weekly', label: 'Weekly', icon: IconCalendarRange },
      { id: 'monthly', label: 'Monthly', icon: IconCalendar },
    ],
  },
  { title: 'Records', items: [{ id: 'history', label: 'History', icon: IconClock }] },
  { title: 'Account', items: [{ id: 'settings', label: 'Settings', icon: IconGear }] },
];

interface SidebarProps {
  active: NavSectionId;
  onNavigate: (id: NavSectionId) => void;
  open: boolean;
  onClose: () => void;
  user: User | null;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

// Heavy glass rail. On mobile it's a spring-driven sheet that can be
// grabbed and reversed mid-flight — never a locked CSS transition.
// On desktop it can collapse to an icon-only rail (persisted per device).
export function Sidebar({ active, onNavigate, open, onClose, user, collapsed, onToggleCollapsed }: SidebarProps) {
  const [desktop, setDesktop] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches
  );
  const rail = desktop && collapsed;

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
        animate={{ x: visible ? 0 : '-100%', width: rail ? 72 : 256 }}
        transition={{ type: 'spring', bounce: 0.05, duration: 0.4 }}
        className="glass-rail fixed inset-y-0 left-0 z-40 flex flex-col overflow-hidden"
      >
        <div className="border-b border-stone-900/10 px-5 pb-5 pt-6">
          <div className={`flex items-center gap-2.5 ${rail ? 'justify-center' : ''}`}>
            <span
              aria-hidden
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-stone-900 text-sm font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]"
            >
              F
            </span>
            {!rail && (
              <div className="min-w-0">
                <p className="display-tight truncate text-[15px] font-bold leading-tight text-stone-900 dark:text-white">
                  FPO Safety &amp; Compliance Log
                </p>
                <p className="mt-0.5 truncate text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-600 dark:text-stone-400">
                  Clinical Operations
                </p>
              </div>
            )}
          </div>
          {desktop && (
            <motion.button
              type="button"
              onClick={() => { tick(); onToggleCollapsed(); }}
              aria-label={rail ? 'Expand navigation' : 'Collapse navigation'}
              title={rail ? 'Expand navigation' : 'Collapse navigation'}
              whileTap={{ scale: 0.92 }}
              transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
              className={`mt-4 flex h-7 w-7 items-center justify-center rounded-full text-stone-600 hover:bg-stone-900/5 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-white/10 dark:hover:text-white ${rail ? 'mx-auto' : ''}`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={rail ? 'rotate-180' : ''}>
                <path d="M15 6l-6 6 6 6" />
              </svg>
            </motion.button>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {NAV_GROUPS.map((group) => (
            <div key={group.title} className="mb-5 last:mb-0">
              {!rail && (
                <p className="px-3 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-stone-600 dark:text-stone-400">
                  {group.title}
                </p>
              )}
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = item.id === active;
                  const Icon = item.icon;
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
                        title={rail ? item.label : undefined}
                        whileTap={{ scale: 0.97 }}
                        transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
                        className={`relative flex w-full items-center rounded-xl px-3 py-2 text-[13.5px] ${rail ? 'justify-center' : ''} ${
                          isActive
                            ? 'font-semibold text-white dark:text-black'
                            : 'font-medium text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
                        }`}
                      >
                        {isActive && (
                          <motion.span
                            layoutId="sidebar-active"
                            aria-hidden
                            transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
                            className="absolute inset-0 rounded-xl bg-stone-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] dark:bg-white dark:shadow-none"
                          />
                        )}
                        <Icon className={`relative shrink-0 ${rail ? '' : 'mr-2.5'}`} />
                        {!rail && <span className="relative truncate">{item.label}</span>}
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
              {!rail && (
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-stone-900 dark:text-white">
                    {user.user_metadata?.full_name || user.email}
                  </p>
                  {user.user_metadata?.full_name && (
                    <p className="truncate text-xs text-stone-600 dark:text-stone-400">{user.email}</p>
                  )}
                </div>
              )}
              {!rail && (
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
              )}
            </div>
          </div>
        )}

        <div className={`border-t border-stone-900/10 px-5 py-4 ${rail ? 'flex justify-center px-2' : ''}`}>
          {!rail && <p className="font-mono text-[11px] text-stone-600 dark:text-stone-400">v{APP_VERSION} · Audit-ready</p>}
          {isSupabaseConfigured ? (
            <p
              title="Supabase connected"
              className={`flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 ${rail ? '' : 'mt-1'}`}
            >
              <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
              {!rail && 'Supabase connected'}
            </p>
          ) : (
            <p
              title="Offline demo mode"
              className={`flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400 ${rail ? '' : 'mt-1'}`}
            >
              <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
              {!rail && 'Offline demo mode'}
            </p>
          )}
        </div>
      </motion.aside>
    </>
  );
}
