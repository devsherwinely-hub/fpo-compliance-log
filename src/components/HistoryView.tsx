import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  LOCATIONS,
  TASKS,
  addDays,
  fmtDate,
  isoWeekKey,
  monthKey,
  periodLabelFor,
  recordKey,
  type ChecklistFrequency,
} from '../lib/catalog';
import type { RecordMap } from '../hooks/useRecords';

interface Period {
  key: string;
  label: string;
}

function periodsFor(freq: ChecklistFrequency): Period[] {
  const now = new Date();
  if (freq === 'daily') {
    return Array.from({ length: 14 }, (_, i) => {
      const d = addDays(now, -i);
      return { key: fmtDate(d), label: d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) };
    });
  }
  if (freq === 'weekly') {
    return Array.from({ length: 6 }, (_, i) => {
      const d = addDays(now, -7 * i);
      return { key: isoWeekKey(d), label: periodLabelFor('weekly', d) };
    });
  }
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return { key: monthKey(d), label: periodLabelFor('monthly', d) };
  });
}

interface HistoryViewProps {
  records: RecordMap;
  initialStatusFilter?: 'All' | 'done' | 'pending' | 'flagged';
}

export function HistoryView({ records, initialStatusFilter = 'All' }: HistoryViewProps) {
  const [freq, setFreq] = useState<ChecklistFrequency>('daily');
  const [taskFilter, setTaskFilter] = useState('All');
  const [locFilter, setLocFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter);

  const tasksForFreq = useMemo(() => TASKS.filter((t) => t.freq === freq), [freq]);
  const usesRealLocations = tasksForFreq.some((t) => t.perLoc);

  const rows = useMemo(() => {
    let tasks = tasksForFreq;
    if (taskFilter !== 'All') tasks = tasks.filter((t) => t.id === taskFilter);
    const periods = periodsFor(freq);
    let all: Array<{ taskName: string; loc: string; periodKey: string; periodLabel: string; done: boolean; flagged: boolean }> = [];
    for (const p of periods) {
      for (const t of tasks) {
        const locs = t.perLoc ? [...LOCATIONS] : ['all'];
        for (const loc of locs) {
          const r = records[recordKey(t.id, loc, p.key)];
          all.push({
            taskName: t.name,
            loc,
            periodKey: p.key,
            periodLabel: p.label,
            done: !!r?.done,
            flagged: !!r?.flag,
          });
        }
      }
    }
    if (locFilter !== 'All') all = all.filter((r) => r.loc === locFilter || r.loc === 'all');
    if (statusFilter === 'done') all = all.filter((r) => r.done);
    else if (statusFilter === 'pending') all = all.filter((r) => !r.done);
    else if (statusFilter === 'flagged') all = all.filter((r) => r.flagged);
    return { all, periods };
  }, [records, freq, taskFilter, locFilter, statusFilter, tasksForFreq]);

  const doneCount = rows.all.filter((r) => r.done).length;
  const flaggedCount = rows.all.filter((r) => r.flagged).length;

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="font-serif text-xl font-bold text-stone-900 dark:text-white">History</h2>
        <span className="font-mono text-xs text-stone-600 dark:text-stone-400">filter and browse below</span>
      </div>
      <div className="flex flex-wrap gap-2">
        <select value={freq} onChange={(e) => { setFreq(e.target.value as ChecklistFrequency); setTaskFilter('All'); }} aria-label="Frequency" className="h-9 rounded-full border border-stone-300/70 dark:border-white/20 bg-white/60 dark:bg-white/10 px-3 text-[13px]">
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
        <select value={taskFilter} onChange={(e) => setTaskFilter(e.target.value)} aria-label="Checklist" className="h-9 rounded-full border border-stone-300/70 dark:border-white/20 bg-white/60 dark:bg-white/10 px-3 text-[13px]">
          <option value="All">All checklists</option>
          {tasksForFreq.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        {usesRealLocations && (
          <select value={locFilter} onChange={(e) => setLocFilter(e.target.value)} aria-label="Location" className="h-9 rounded-full border border-stone-300/70 dark:border-white/20 bg-white/60 dark:bg-white/10 px-3 text-[13px]">
            <option value="All">All locations</option>
            {LOCATIONS.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        )}
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} aria-label="Status" className="h-9 rounded-full border border-stone-300/70 dark:border-white/20 bg-white/60 dark:bg-white/10 px-3 text-[13px]">
          <option value="All">All statuses</option>
          <option value="done">Logged</option>
          <option value="pending">Missing</option>
          <option value="flagged">Flagged</option>
        </select>
      </div>
      <p className="text-xs text-stone-600 dark:text-stone-400">
        {rows.all.length} records match — {doneCount} logged, {flaggedCount} flagged.
      </p>
      {rows.periods.map((p, gi) => {
        const group = rows.all.filter((r) => r.periodKey === p.key);
        if (!group.length) return null;
        return (
          <motion.div
            key={p.key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', bounce: 0, duration: 0.4, delay: Math.min(gi * 0.04, 0.2) }}
            className="glass-card overflow-hidden rounded-2xl"
          >
            <p className="border-b border-stone-200 dark:border-white/10 bg-white/60 dark:bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-wide text-stone-600 dark:text-stone-400">
              {p.label}
            </p>
            <ul className="divide-y divide-stone-200/70 dark:divide-white/10">
              {group.map((r, i) => (
                <li key={i} className={`flex items-center justify-end gap-2 px-4 py-2.5 text-[13px] ${r.flagged ? 'bg-alert-bg' : ''}`}>
                  <span className="flex-1 truncate text-stone-800 dark:text-stone-100">{r.taskName}{r.loc !== 'all' ? ` — ${r.loc}` : ''}</span>
                  {r.flagged && (
                    <span className="rounded-full bg-alert-bg px-2 py-0.5 text-[11px] font-semibold text-alert-text">Flagged</span>
                  )}
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${r.done ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300' : 'bg-amber-50 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300'}`}>
                    {r.done ? 'Logged' : 'Missing'}
                  </span>
                </li>
              ))}
            </ul>
          </motion.div>
        );
      })}
    </div>
  );
}
