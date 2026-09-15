import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { User } from '@supabase/supabase-js';
import { useRecords } from '../hooks/useRecords';
import { downloadCsv, parseCsv, recordsToCsv } from '../lib/csv';
import { fmtDate } from '../lib/catalog';
import type { NavSectionId } from '../lib/types';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { ChecklistSection } from './ChecklistSection';
import { HistoryView } from './HistoryView';
import { Overview } from './Overview';
import { Sidebar } from './Sidebar';
import { useToasts } from './Toasts';
import { TopBar } from './TopBar';
import { UserSettings } from './UserSettings';

const DATE_LABEL = new Date().toLocaleDateString('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  year: 'numeric',
});

const SECTION_TITLES: Record<NavSectionId, string> = {
  overview: 'Compliance Overview',
  daily: 'Daily Checklists',
  weekly: 'Weekly Checklists',
  monthly: 'Monthly Checklists',
  history: 'History',
  settings: 'Settings',
};

const DEFAULT_TAB_KEY = 'fpo-default-tab';
const RAIL_KEY = 'fpo-rail-collapsed';

const CONTENT_TABS: NavSectionId[] = ['overview', 'daily', 'weekly', 'monthly', 'history'];

function readDefaultTab(): NavSectionId {
  const t = localStorage.getItem(DEFAULT_TAB_KEY);
  return (CONTENT_TABS as string[]).includes(t ?? '') ? (t as NavSectionId) : 'overview';
}

// Tab switches ride a critically damped spring from the live on-screen
// value — grabbing another tab mid-flight reverses without a jump.
const TAB_TRANSITION = { type: 'spring', bounce: 0, duration: 0.35 } as const;

// Main dashboard — routes sidebar tabs to Overview / Checklist / History,
// backed by Supabase compliance_records (see supabase/schema-v2.sql).
// user is null only when Supabase isn't configured (offline demo).
export function Dashboard({ user }: { user: User | null }) {
  const [section, setSection] = useState<NavSectionId>(readDefaultTab);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [railCollapsed, setRailCollapsed] = useState(() => {
    try {
      return localStorage.getItem(RAIL_KEY) === '1';
    } catch {
      return false;
    }
  });
  const toggleRailCollapsed = () => {
    setRailCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(RAIL_KEY, next ? '1' : '0');
      } catch {
        // private mode etc.
      }
      return next;
    });
  };
  const [overviewLoc, setOverviewLoc] = useState('All');
  const [defaultTab, setDefaultTab] = useState<NavSectionId>(readDefaultTab);

  const { records, loading, saving, error: recordsError, refresh, saveEntry, undoEntry } = useRecords();
  const { push, stack } = useToasts();

  // Power-user tabs: keys 1-6 jump sections. Ignored while typing.
  useEffect(() => {
    const order: NavSectionId[] = ['overview', 'daily', 'weekly', 'monthly', 'history', 'settings'];
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)) return;
      const i = ['1', '2', '3', '4', '5', '6'].indexOf(e.key);
      if (i >= 0) {
        setSection(order[i]);
        setSidebarOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const handleDefaultTab = (t: NavSectionId) => {
    setDefaultTab(t);
    localStorage.setItem(DEFAULT_TAB_KEY, t);
    push(`Opens on ${SECTION_TITLES[t]} from now on`);
  };

  const handleResetPrefs = () => {
    localStorage.removeItem(DEFAULT_TAB_KEY);
    setDefaultTab('overview');
    push('Preferences reset');
  };

  const handleExport = () => {
    const csv = recordsToCsv(records);
    downloadCsv(`compliance-log-${fmtDate(new Date())}.csv`, csv);
    push(`Exported ${Object.keys(records).length} records`);
  };

  const handleImport = async (file: File) => {
    try {
      const text = await file.text();
      const rows = parseCsv(text);
      if (!rows.length) {
        push('No importable rows found', true);
        return;
      }
      if (!isSupabaseConfigured || !supabase) {
        push('Supabase not configured — cannot import', true);
        return;
      }
      let count = 0;
      for (const r of rows) {
        let fields: Record<string, string> = {};
        try {
          fields = r.fieldsJson ? JSON.parse(r.fieldsJson) : {};
        } catch {
          fields = {};
        }
        const { error } = await supabase.from('compliance_records').upsert(
          {
            task_id: r.taskId,
            location: r.loc,
            period_key: r.periodKey,
            done: true,
            note: r.note,
            flag: r.flag,
            fields,
          },
          { onConflict: 'task_id,location,period_key' }
        );
        if (!error) count++;
      }
      await refresh();
      push(`Imported ${count} records`);
    } catch (e) {
      push(e instanceof Error ? e.message : 'Import failed', true);
    }
  };

  return (
    <div className="min-h-dvh bg-paper font-sans text-stone-800 antialiased dark:bg-black dark:text-stone-100">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[110] focus:rounded-full focus:bg-stone-900 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white dark:focus:bg-white dark:focus:text-black"
      >
        Skip to content
      </a>
      <Sidebar
        active={section}
        onNavigate={setSection}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        user={user}
        collapsed={railCollapsed}
        onToggleCollapsed={toggleRailCollapsed}
      />

      <div className={`transition-[padding] duration-300 ${railCollapsed ? 'lg:pl-[72px]' : 'lg:pl-64'}`}>
        <TopBar
          onMenuClick={() => setSidebarOpen(true)}
          dateLabel={DATE_LABEL}
          title={SECTION_TITLES[section]}
          onExport={handleExport}
          onImportFile={handleImport}
        />

        <main id="main" className="mx-auto max-w-5xl space-y-4 px-4 py-5 sm:px-6 lg:px-8">
          {!loading && recordsError && (
            <section role="alert" className="rounded-2xl border border-alert-border bg-alert-bg px-4 py-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[13px] font-medium text-alert-text">
                  Couldn&apos;t load records: {recordsError}
                </p>
                <motion.button
                  type="button"
                  onClick={() => void refresh()}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
                  className="h-8 rounded-full bg-alert-text px-3.5 text-[13px] font-semibold text-white"
                >
                  Retry
                </motion.button>
              </div>
            </section>
          )}
          {loading ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4" aria-busy="true">
              {[0, 1, 2].map((i) => (
                <div key={i} className="glass-card h-36 animate-pulse rounded-2xl" />
              ))}
            </div>
          ) : (
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={section}
                initial={{ opacity: 0, y: 10, scale: 0.995 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.997 }}
                transition={TAB_TRANSITION}
              >
                {section === 'overview' ? (
                  <Overview
                    records={records}
                    locFilter={overviewLoc}
                    onLocChange={setOverviewLoc}
                    onGotoDaily={() => setSection('daily')}
                  />
                ) : section === 'history' ? (
                  <HistoryView records={records} />
                ) : section === 'settings' ? (
                  <UserSettings
                    user={user}
                    defaultTab={defaultTab}
                    onDefaultTabChange={handleDefaultTab}
                    onResetPrefs={handleResetPrefs}
                  />
                ) : (
                  <ChecklistSection
                    freq={section}
                    records={records}
                    saving={saving}
                    onSave={saveEntry}
                    onUndo={undoEntry}
                    notify={push}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          )}

          <p className="pb-6 pt-1 text-center font-mono text-[11px] text-stone-600 dark:text-stone-400">
            Showing: {section} · {Object.keys(records).length} records · HIPAA-audit log retained 6 yrs · Keys 1–6 switch tabs
          </p>
        </main>
      </div>
      {stack}
    </div>
  );
}
