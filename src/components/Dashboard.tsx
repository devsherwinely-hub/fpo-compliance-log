import { useState, type CSSProperties } from 'react';
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
};

const GLASS_KEY = 'fpo-glass-clarity';

// Tab switches ride a critically damped spring from the live on-screen
// value — grabbing another tab mid-flight reverses without a jump.
const TAB_TRANSITION = { type: 'spring', bounce: 0, duration: 0.35 } as const;

// Main dashboard — routes sidebar tabs to Overview / Checklist / History,
// backed by Supabase compliance_records (see supabase/schema-v2.sql).
// user is null only when Supabase isn't configured (offline demo).
export function Dashboard({ user }: { user: User | null }) {
  const [section, setSection] = useState<NavSectionId>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [overviewLoc, setOverviewLoc] = useState('All');
  const [glass, setGlass] = useState(() => {
    const raw = Number(localStorage.getItem(GLASS_KEY));
    return Number.isFinite(raw) && raw >= 0 && raw <= 1 ? raw : 0.45;
  });

  const { records, loading, saving, refresh, saveEntry, undoEntry } = useRecords();
  const { push, stack } = useToasts();

  const handleGlass = (v: number) => {
    setGlass(v);
    localStorage.setItem(GLASS_KEY, String(v));
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
    <div
      className="min-h-screen bg-paper font-sans text-stone-800 antialiased"
      style={{ '--glass': glass } as CSSProperties}
    >
      <Sidebar
        active={section}
        onNavigate={setSection}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        glass={glass}
        onGlassChange={handleGlass}
        user={user}
      />

      <div className="lg:pl-64">
        <TopBar
          onMenuClick={() => setSidebarOpen(true)}
          dateLabel={DATE_LABEL}
          title={SECTION_TITLES[section]}
          onExport={handleExport}
          onImportFile={handleImport}
        />

        <main className="mx-auto max-w-5xl space-y-4 px-4 py-5 sm:px-6 lg:px-8">
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

          <p className="pb-6 pt-1 text-center font-mono text-[11px] text-stone-600">
            Showing: {section} · {Object.keys(records).length} records · HIPAA-audit log retained 6 yrs
          </p>
        </main>
      </div>
      {stack}
    </div>
  );
}
