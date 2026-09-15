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
import { useCountUp } from '../hooks/useCountUp';
import { DonutCard } from './DonutCard';
import { TrendCard } from './TrendCard';

interface OverviewProps {
  records: RecordMap;
  locFilter: string;
  onLocChange: (loc: string) => void;
  onGotoSection: (freq: ChecklistFrequency) => void;
  onViewOpenIssues: () => void;
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
  ok: 'border-emerald-200/70 dark:border-emerald-500/30',
  warn: 'border-amber-200/70',
  danger: 'border-alert-border',
};
const VALUE_STYLES: Record<string, string> = {
  ok: 'text-emerald-700 dark:text-emerald-400',
  warn: 'text-amber-700 dark:text-amber-400',
  danger: 'text-alert-text',
};
const BAR_STYLES: Record<string, string> = {
  ok: 'bg-gradient-to-r from-emerald-500 to-emerald-600 dark:from-emerald-400 dark:to-emerald-500',
  warn: 'bg-gradient-to-r from-amber-500 to-amber-600 dark:from-amber-400 dark:to-amber-500',
  danger: 'bg-gradient-to-r from-red-500 to-alert-text dark:from-red-400 dark:to-alert-text',
};

const CARD_SPRING = { type: 'spring', bounce: 0, duration: 0.5 } as const;

// PRIMARY: the one number that answers "are we compliant right now."
function ComplianceRateCard({ v }: { v: { done: number; total: number } }) {
  const p = pct(v.done, v.total);
  const shown = useCountUp(p);
  const cls = pctClass(p);
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={CARD_SPRING}
      className={`glass-card relative rounded-2xl border-l-4 p-5 sm:p-6 lg:col-span-3 ${CARD_STYLES[cls]}`}
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-600 dark:text-stone-400">Compliance rate</p>
          <p className={`display-tight mt-1 font-sans text-5xl font-bold tabular-nums sm:text-6xl ${VALUE_STYLES[cls]}`}>
            {shown}<span className="text-2xl">%</span>
          </p>
          <p className="mt-1 text-[13px] text-stone-600 dark:text-stone-400">{v.done} of {v.total} checklists this period</p>
        </div>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-stone-900/10 dark:bg-white/15">
        <motion.div
          className={`h-full origin-left rounded-full ${BAR_STYLES[cls]}`}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: Math.max(shown, 0) / 100 }}
          transition={{ type: 'spring', bounce: 0, duration: 0.6 }}
        />
      </div>
    </motion.div>
  );
}

interface SecondaryStat {
  value: number;
  label: string;
  context: string;
  tone: 'blue' | 'amber' | 'danger';
}

const STAT_VALUE_STYLES: Record<SecondaryStat['tone'], string> = {
  blue: 'text-sky-700 dark:text-sky-400',
  amber: 'text-amber-700 dark:text-amber-400',
  danger: 'text-alert-text',
};

// SECONDARY: one container, not three competing cards — items needing
// attention, ranked by urgency (due soon → overdue → open issues).
function SecondaryStats({ stats }: { stats: SecondaryStat[] }) {
  return (
    <div className="glass-card grid grid-cols-1 divide-y divide-stone-900/5 rounded-2xl dark:divide-white/10 sm:grid-cols-3 sm:divide-x sm:divide-y-0 lg:col-span-2">
      {stats.map((s) => (
        <div key={s.label} className="px-4 py-3 sm:px-5">
          <p className={`font-sans text-2xl font-bold tabular-nums ${STAT_VALUE_STYLES[s.tone]}`}>{s.value}</p>
          <p className="text-[13px] font-semibold text-stone-800 dark:text-stone-100">{s.label}</p>
          <p className="text-xs text-stone-600 dark:text-stone-400">{s.context}</p>
        </div>
      ))}
    </div>
  );
}

// TERTIARY: per-frequency detail behind the blended Compliance Rate number
// above — one container, three columns, not three separate glass cards.
function PeriodBreakdown({
  periods,
}: {
  periods: Array<{ label: string; sub: string; v: { done: number; total: number } }>;
}) {
  return (
    <div className="glass-card grid grid-cols-1 divide-y divide-stone-900/5 rounded-2xl dark:divide-white/10 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
      {periods.map((p) => {
        const pv = pct(p.v.done, p.v.total);
        const cls = pctClass(pv);
        return (
          <div key={p.label} className="px-4 py-3 sm:px-5">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-[13px] font-semibold text-stone-800 dark:text-stone-100">{p.label}</p>
              <p className={`font-sans text-xl font-bold tabular-nums ${VALUE_STYLES[cls]}`}>{pv}%</p>
            </div>
            <p className="text-xs text-stone-600 dark:text-stone-400">{p.v.done}/{p.v.total} · {p.sub}</p>
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-stone-900/10 dark:bg-white/15">
              <div className={`h-full rounded-full ${BAR_STYLES[cls]}`} style={{ width: `${pv}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface AttentionItem {
  key: string;
  title: string;
  freq: ChecklistFrequency;
  severity: 'critical' | 'warn';
  statusLabel: string;
  detail: string;
}

const ATTENTION_DOT: Record<AttentionItem['severity'], string> = {
  critical: 'bg-alert-text',
  warn: 'bg-amber-500',
};
const ATTENTION_BADGE: Record<AttentionItem['severity'], string> = {
  critical: 'bg-alert-bg text-alert-text',
  warn: 'bg-amber-50 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
};

// Prioritized, itemized, actionable — replaces the separate flagged/overdue
// banners from Phase 1 with one section instead of stacking several.
function NeedsAttention({ items, onReview }: { items: AttentionItem[]; onReview: (freq: ChecklistFrequency) => void }) {
  return (
    <section className="glass-card overflow-hidden rounded-2xl">
      <div className="border-b border-stone-900/5 px-4 py-3 dark:border-white/10 sm:px-5">
        <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-100">Needs attention</h3>
      </div>
      {items.length === 0 ? (
        <p className="px-4 py-4 text-[13px] text-emerald-700 dark:text-emerald-400 sm:px-5">
          Nothing needs attention. All caught up.
        </p>
      ) : (
        <ul className="divide-y divide-stone-900/5 dark:divide-white/10">
          {items.map((item) => (
            <li key={item.key} className="flex items-center gap-3 px-4 py-2.5 sm:px-5">
              <span aria-hidden className={`h-2 w-2 shrink-0 rounded-full ${ATTENTION_DOT[item.severity]}`} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-medium text-stone-800 dark:text-stone-100">{item.title}</p>
                <p className="truncate text-xs text-stone-600 dark:text-stone-400">{item.detail}</p>
              </div>
              <span className={`hidden shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold sm:inline-block ${ATTENTION_BADGE[item.severity]}`}>
                {item.statusLabel}
              </span>
              <motion.button
                type="button"
                onClick={() => { tick(); onReview(item.freq); }}
                whileTap={{ scale: 0.94 }}
                transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
                className="h-8 shrink-0 rounded-full border border-stone-300/70 dark:border-white/20 bg-white/60 dark:bg-white/10 px-3.5 text-xs font-semibold text-stone-700 dark:text-stone-300"
              >
                Review
              </motion.button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

interface QuickAction {
  label: string;
  onClick: () => void;
  primary?: boolean;
}

// Compact single row, no cards — existing actions only (routes to tabs
// that already exist via setSection).
function QuickActions({ actions }: { actions: QuickAction[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((a) => (
        <motion.button
          key={a.label}
          type="button"
          onClick={() => { tick(); a.onClick(); }}
          whileTap={{ scale: 0.96 }}
          transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
          className={
            a.primary
              ? 'h-9 rounded-full bg-stone-900 px-4 text-[13px] font-semibold text-white dark:bg-white dark:text-black'
              : 'h-9 rounded-full border border-stone-300/70 dark:border-white/20 bg-white/60 dark:bg-white/10 px-4 text-[13px] font-semibold text-stone-700 dark:text-stone-300'
          }
        >
          {a.label}
        </motion.button>
      ))}
    </div>
  );
}

export function Overview({ records, locFilter, onLocChange, onGotoSection, onViewOpenIssues }: OverviewProps) {
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

    // Yesterday's daily items still unlogged, grouped by checklist so
    // "3 tasks × 3 locations" reads as 3 rows instead of 9.
    const overdueGroups: Array<{ name: string; locs: string[] }> = [];
    for (const t of TASKS.filter((t) => t.freq === 'daily')) {
      const missing = locsFor(t.perLoc).filter((loc) => !records[recordKey(t.id, loc, yKey)]?.done);
      if (missing.length > 0) overdueGroups.push({ name: t.name, locs: missing });
    }
    const overdueCount = overdueGroups.reduce((s, g) => s + g.locs.length, 0);
    const locScope = locsFor(true).length;

    // Flagged entries in current periods
    const issueItems: AttentionItem[] = [];
    for (const t of TASKS) {
      for (const loc of locsFor(t.perLoc)) {
        const r = records[recordKey(t.id, loc, periodFor[t.freq])];
        if (r?.done && r.flag) {
          issueItems.push({
            key: `issue:${t.id}:${loc}`,
            title: loc === 'all' ? t.name : `${t.name} — ${loc}`,
            freq: t.freq,
            severity: 'critical',
            statusLabel: 'Flagged',
            detail: r.flag,
          });
        }
      }
    }

    // Weekly/monthly items not yet logged before their period closes.
    const dueSoonItems: AttentionItem[] = [];
    for (const t of TASKS.filter((t) => t.freq === 'weekly' || t.freq === 'monthly')) {
      for (const loc of locsFor(t.perLoc)) {
        if (!records[recordKey(t.id, loc, periodFor[t.freq])]?.done) {
          dueSoonItems.push({
            key: `duesoon:${t.id}:${loc}`,
            title: loc === 'all' ? t.name : `${t.name} — ${loc}`,
            freq: t.freq,
            severity: 'warn',
            statusLabel: 'Due soon',
            detail: t.freq === 'weekly' ? 'Due this week' : 'Due this month',
          });
        }
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

    const d = compliance('daily');
    const w = compliance('weekly');
    const m = compliance('monthly');
    // Compliance rate: blended across every checklist due this period
    // (same universe the completion-mix donut uses), not just today's daily log.
    const complianceRate = { done: d.done + w.done + m.done, total: d.total + w.total + m.total };

    const overdueItems: AttentionItem[] = overdueGroups.flatMap((g) =>
      g.locs.map((loc) => ({
        key: `overdue:${g.name}:${loc}`,
        title: loc === 'all' ? g.name : `${g.name} — ${loc}`,
        freq: 'daily' as ChecklistFrequency,
        severity: 'critical' as const,
        statusLabel: 'Overdue',
        detail: 'Since yesterday',
      }))
    );
    // Priority order: critical (overdue, then flagged issues) before warn (due soon).
    const attentionItems = [...overdueItems, ...issueItems, ...dueSoonItems];

    return {
      d, w, m, complianceRate,
      dueSoon: dueSoonItems.length,
      overdueGroups, overdueCount, locScope,
      issueCount: issueItems.length,
      attentionItems,
      outstanding, breakdown,
    };
  }, [records, locFilter]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <label htmlFor="overviewLoc" className="text-[13px] text-stone-600 dark:text-stone-400">Location:</label>
        <select
          id="overviewLoc"
          value={locFilter}
          onChange={(e) => onLocChange(e.target.value)}
          className="h-9 rounded-full border border-stone-300/70 dark:border-white/20 bg-white/60 dark:bg-white/10 px-3 text-[13px] font-medium text-stone-800 dark:text-stone-100"
        >
          <option value="All">All locations</option>
          {LOCATIONS.map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
      </div>

      <QuickActions
        actions={[
          { label: '+ New Compliance Log', onClick: () => onGotoSection('daily'), primary: true },
          { label: `Review Overdue Items${data.overdueCount ? ` (${data.overdueCount})` : ''}`, onClick: () => onGotoSection('daily') },
          { label: `View Open Issues${data.issueCount ? ` (${data.issueCount})` : ''}`, onClick: onViewOpenIssues },
        ]}
      />

      <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-5">
        <ComplianceRateCard v={data.complianceRate} />
        <SecondaryStats
          stats={[
            { value: data.dueSoon, label: 'Due soon', context: 'Weekly & monthly, this period', tone: 'blue' },
            { value: data.overdueCount, label: 'Overdue', context: 'Daily, since yesterday', tone: 'danger' },
            { value: data.issueCount, label: 'Open issues', context: 'Flagged for review', tone: 'amber' },
          ]}
        />
      </div>

      <PeriodBreakdown
        periods={[
          { label: 'Today', sub: 'daily', v: data.d },
          { label: 'This week', sub: 'weekly', v: data.w },
          { label: 'This month', sub: 'monthly', v: data.m },
        ]}
      />

      <NeedsAttention items={data.attentionItems} onReview={onGotoSection} />

      <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <TrendCard records={records} locFilter={locFilter} />
        </div>
        <DonutCard records={records} locFilter={locFilter} />
      </div>

      <section className="glass-card rounded-2xl p-4 sm:p-5">
        <div className="mb-2 flex items-baseline justify-between">
          <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-100">Outstanding today</h3>
          <span className="font-mono text-[11px] text-stone-600 dark:text-stone-400">daily items not yet logged</span>
        </div>
        {data.outstanding.length === 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-2 py-2">
            <p className="text-[13px] text-stone-600 dark:text-stone-400">Nothing outstanding for today. Audit-ready.</p>
            <motion.button
              type="button"
              onClick={() => { tick(); onGotoSection('daily'); }}
              whileTap={{ scale: 0.94 }}
              transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
              className="h-8 shrink-0 rounded-full border border-stone-300/70 dark:border-white/20 bg-white/60 dark:bg-white/10 px-3.5 text-xs font-semibold text-stone-700 dark:text-stone-300"
            >
              Review daily log
            </motion.button>
          </div>
        ) : (
          <ul className="divide-y divide-stone-900/5 dark:divide-white/10">
            {data.outstanding.map((o, i) => (
              <motion.li
                key={`${o.name}|${o.loc}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', bounce: 0, duration: 0.4, delay: Math.min(i * 0.04, 0.24) }}
                className="flex items-center justify-between gap-3 py-2.5 text-[13.5px]"
              >
                <span className="truncate text-stone-800 dark:text-stone-100">{o.name} — {o.loc}</span>
                <motion.button
                  type="button"
                  onClick={() => { tick(); onGotoSection('daily'); }}
                  whileTap={{ scale: 0.94 }}
                  transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
                  className="h-8 shrink-0 rounded-full border border-stone-300/70 dark:border-white/20 bg-white/60 dark:bg-white/10 px-3.5 text-xs font-semibold text-stone-700 dark:text-stone-300"
                >
                  Log now
                </motion.button>
              </motion.li>
            ))}
          </ul>
        )}
      </section>

      <section className="glass-card overflow-hidden rounded-2xl">
        <div className="border-b border-stone-900/5 bg-white/40 dark:bg-white/5 px-4 py-3 sm:px-5">
          <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-100">Compliance by location</h3>
          <p className="font-mono text-[11px] text-stone-600 dark:text-stone-400">today / this week / this month</p>
        </div>
        <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] border-collapse text-[13px]">
          <thead>
            <tr className="text-[11px] uppercase tracking-wide text-stone-600 dark:text-stone-400">
              <th className="px-4 py-2 text-left font-semibold" />
              <th className="px-2 py-2 font-semibold">Daily</th>
              <th className="px-2 py-2 font-semibold">Weekly</th>
              <th className="px-2 py-2 font-semibold">Monthly</th>
            </tr>
          </thead>
          <tbody>
            {LOCATIONS.map((loc) => (
              <tr key={loc} className="border-t border-stone-900/5">
                <td className="px-4 py-3 text-left font-semibold text-stone-800 dark:text-stone-100">{loc}</td>
                {(['daily', 'weekly', 'monthly'] as ChecklistFrequency[]).map((f) => {
                  const v = data.breakdown[loc][f];
                  const p = pct(v.done, v.total);
                  return (
                    <td key={f} className="px-2 py-3 text-center">
                      <span className={`font-sans text-base font-bold tabular-nums ${VALUE_STYLES[pctClass(p)]}`}>{p}%</span>
                      <div className="font-mono text-[11px] text-stone-600 dark:text-stone-400">{v.done}/{v.total}</div>
                      <div
                        role="img"
                        aria-label={`${loc} ${f}: ${p} percent`}
                        className="mx-auto mt-1.5 h-1 w-16 overflow-hidden rounded-full bg-stone-900/10 dark:bg-white/15"
                      >
                        <motion.div
                          className={`h-full origin-left rounded-full ${BAR_STYLES[pctClass(p)]}`}
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: p / 100 }}
                          transition={{ type: 'spring', bounce: 0, duration: 0.6 }}
                        />
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </section>
    </div>
  );
}
