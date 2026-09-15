import { useMemo } from 'react';
import { motion } from 'motion/react';
import {
  LOCATIONS,
  TASKS,
  addDays,
  fmtDate,
  isoWeekKey,
  monthKey,
  recordKey,
  type ChecklistFrequency,
} from '../lib/catalog';
import type { RecordMap } from '../hooks/useRecords';
import { tick } from '../lib/haptics';

interface OverviewProps {
  records: RecordMap;
  locFilter: string;
  onLocChange: (loc: string) => void;
  onGotoDaily: () => void;
}

function pct(done: number, total: number): number {
  return total === 0 ? 0 : Math.round((100 * done) / total);
}
function pctClass(p: number): string {
  if (p === 100) return 'ok';
  if (p < 60) return 'danger';
  return 'warn';
}

const CARD_STYLES: Record<string, string> = {
  ok: 'border-emerald-200/70',
  warn: 'border-amber-200/70',
  danger: 'border-alert-border',
};
const VALUE_STYLES: Record<string, string> = {
  ok: 'text-emerald-700',
  warn: 'text-amber-700',
  danger: 'text-alert-text',
};
const BAR_STYLES: Record<string, string> = {
  ok: 'bg-emerald-600',
  warn: 'bg-amber-600',
  danger: 'bg-alert-text',
};

const CARD_SPRING = { type: 'spring', bounce: 0, duration: 0.5 } as const;

export function Overview({ records, locFilter, onLocChange, onGotoDaily }: OverviewProps) {
  const data = useMemo(() => {
    const now = new Date();
    const dKey = fmtDate(now);
    const wKey = isoWeekKey(now);
    const mKey = monthKey(now);
    const yKey = fmtDate(addDays(now, -1));
    const periodFor: Record<ChecklistFrequency, string> = { daily: dKey, weekly: wKey, monthly: mKey };

    const locsFor = (perLoc: boolean): string[] => {
      if (!perLoc) return ['all'];
      return locFilter === 'All' ? [...LOCATIONS] : [locFilter];
    };

    const compliance = (freq: ChecklistFrequency) => {
      const tasks = TASKS.filter((t) => t.freq === freq);
      let done = 0;
      let total = 0;
      for (const t of tasks) {
        for (const loc of locsFor(t.perLoc)) {
          total++;
          if (records[recordKey(t.id, loc, periodFor[freq])]?.done) done++;
        }
      }
      return { done, total };
    };

    // Yesterday's daily items still unlogged
    const overdue: string[] = [];
    for (const t of TASKS.filter((t) => t.freq === 'daily')) {
      for (const loc of locsFor(t.perLoc)) {
        if (!records[recordKey(t.id, loc, yKey)]?.done) {
          overdue.push(`${t.name} — ${loc}`);
        }
      }
    }

    // Flagged entries in current periods
    const flagged: string[] = [];
    for (const t of TASKS) {
      for (const loc of locsFor(t.perLoc)) {
        const r = records[recordKey(t.id, loc, periodFor[t.freq])];
        if (r?.done && r.flag) flagged.push(`${t.name} — ${loc}: ${r.flag}`);
      }
    }

    // Outstanding daily today
    const outstanding: Array<{ name: string; loc: string }> = [];
    for (const t of TASKS.filter((t) => t.freq === 'daily')) {
      for (const loc of locsFor(t.perLoc)) {
        if (!records[recordKey(t.id, loc, dKey)]?.done) {
          outstanding.push({ name: t.name, loc });
        }
      }
    }

    // Per-location breakdown (real facility locations only)
    const breakdown: Record<string, Record<ChecklistFrequency, { done: number; total: number }>> = {};
    for (const loc of LOCATIONS) {
      breakdown[loc] = {
        daily: { done: 0, total: 0 },
        weekly: { done: 0, total: 0 },
        monthly: { done: 0, total: 0 },
      };
      (Object.keys(periodFor) as ChecklistFrequency[]).forEach((freq) => {
        for (const t of TASKS.filter((t) => t.freq === freq && t.perLoc)) {
          breakdown[loc][freq].total++;
          if (records[recordKey(t.id, loc, periodFor[freq])]?.done) breakdown[loc][freq].done++;
        }
      });
    }

    return { d: compliance('daily'), w: compliance('weekly'), m: compliance('monthly'), overdue, flagged, outstanding, breakdown };
  }, [records, locFilter]);

  const card = (label: string, sub: string, v: { done: number; total: number }, i: number) => {
    const p = pct(v.done, v.total);
    const cls = pctClass(p);
    return (
      <motion.div
        key={label}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...CARD_SPRING, delay: i * 0.06 }}
        className={`glass-card flex-1 rounded-2xl p-4 sm:p-5 ${CARD_STYLES[cls]}`}
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-600">{label}</p>
        <p className={`display-tight mt-1.5 font-sans text-4xl font-bold tabular-nums ${VALUE_STYLES[cls]}`}>{p}<span className="text-2xl">%</span></p>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-stone-900/10">
          <motion.div
            className={`h-full rounded-full ${BAR_STYLES[cls]}`}
            initial={false}
            animate={{ width: `${p}%` }}
            transition={{ type: 'spring', bounce: 0, duration: 0.6 }}
          />
        </div>
        <p className="mt-2 text-xs text-stone-600">{v.done} of {v.total} logged · {sub}</p>
      </motion.div>
    );
  };

  const todayLabel = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <label htmlFor="overviewLoc" className="text-[13px] text-stone-600">Location:</label>
        <select
          id="overviewLoc"
          value={locFilter}
          onChange={(e) => onLocChange(e.target.value)}
          className="h-9 rounded-full border border-stone-300/70 bg-white/60 px-3 text-[13px] font-medium text-stone-800"
        >
          <option value="All">All locations</option>
          {LOCATIONS.map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
      </div>

      {data.flagged.length > 0 && (
        <motion.section
          role="alert"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={CARD_SPRING}
          className="rounded-2xl border border-alert-border bg-alert-bg px-4 py-3.5"
        >
          <h2 className="text-sm font-semibold text-alert-text">
            {data.flagged.length} reading{data.flagged.length > 1 ? 's' : ''} need attention
          </h2>
          <ul className="mt-1.5 space-y-1">
            {data.flagged.map((n) => (
              <li key={n} className="text-[13px] text-alert-text">• {n}</li>
            ))}
          </ul>
        </motion.section>
      )}
      {data.overdue.length > 0 && (
        <motion.section
          role="alert"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={CARD_SPRING}
          className="rounded-2xl border border-alert-border bg-alert-bg px-4 py-3.5"
        >
          <h2 className="text-sm font-semibold text-alert-text">
            {data.overdue.length} item{data.overdue.length > 1 ? 's' : ''} from yesterday still unlogged
          </h2>
          <ul className="mt-1.5 space-y-1">
            {data.overdue.map((n) => (
              <li key={n} className="text-[13px] text-alert-text">• {n}</li>
            ))}
          </ul>
        </motion.section>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        {card("Today's daily log", todayLabel, data.d, 0)}
        {card("This week's log", 'This week', data.w, 1)}
        {card("This month's log", 'This month', data.m, 2)}
      </div>

      <section className="glass-card rounded-2xl p-4 sm:p-5">
        <div className="mb-2 flex items-baseline justify-between">
          <h3 className="text-sm font-semibold text-stone-800">Outstanding today</h3>
          <span className="font-mono text-[11px] text-stone-600">daily items not yet logged</span>
        </div>
        {data.outstanding.length === 0 ? (
          <p className="py-2 text-[13px] text-stone-600">Nothing outstanding for today.</p>
        ) : (
          <ul className="divide-y divide-stone-900/5">
            {data.outstanding.map((o) => (
              <li key={`${o.name}|${o.loc}`} className="flex items-center justify-between gap-3 py-2.5 text-[13.5px]">
                <span className="truncate text-stone-800">{o.name} — {o.loc}</span>
                <motion.button
                  type="button"
                  onClick={() => { tick(); onGotoDaily(); }}
                  whileTap={{ scale: 0.94 }}
                  transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
                  className="h-8 shrink-0 rounded-full border border-stone-300/70 bg-white/60 px-3.5 text-xs font-semibold text-stone-700"
                >
                  Log now
                </motion.button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="glass-card overflow-hidden rounded-2xl">
        <div className="border-b border-stone-900/5 bg-white/40 px-4 py-3 sm:px-5">
          <h3 className="text-sm font-semibold text-stone-800">Compliance by location</h3>
          <p className="font-mono text-[11px] text-stone-600">today / this week / this month</p>
        </div>
        <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] border-collapse text-[13px]">
          <thead>
            <tr className="text-[11px] uppercase tracking-wide text-stone-600">
              <th className="px-4 py-2 text-left font-semibold" />
              <th className="px-2 py-2 font-semibold">Daily</th>
              <th className="px-2 py-2 font-semibold">Weekly</th>
              <th className="px-2 py-2 font-semibold">Monthly</th>
            </tr>
          </thead>
          <tbody>
            {LOCATIONS.map((loc) => (
              <tr key={loc} className="border-t border-stone-900/5">
                <td className="px-4 py-3 text-left font-semibold text-stone-800">{loc}</td>
                {(['daily', 'weekly', 'monthly'] as ChecklistFrequency[]).map((f) => {
                  const v = data.breakdown[loc][f];
                  const p = pct(v.done, v.total);
                  return (
                    <td key={f} className="px-2 py-3 text-center">
                      <span className={`font-sans text-base font-bold tabular-nums ${VALUE_STYLES[pctClass(p)]}`}>{p}%</span>
                      <div className="font-mono text-[11px] text-stone-600">{v.done}/{v.total}</div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </section>

      <section className="glass-card rounded-2xl p-4 sm:p-5">
        <h3 className="display-tight font-sans text-lg font-bold text-stone-900">Facility</h3>
        <p className="mt-1 text-[13px] leading-relaxed text-stone-600">
          Tracking {TASKS.length} checklist types across daily, weekly, and monthly cadences —
          lock checks, fridge logs, glucometer controls, eye wash station, AED, emergency
          medication kits, supply audits, and i-STAT controls.
        </p>
      </section>
    </div>
  );
}
