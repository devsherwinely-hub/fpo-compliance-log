import { useMemo } from 'react';
import { motion } from 'motion/react';
import {
  LOCATIONS,
  TASKS,
  fmtDate,
  isoWeekKey,
  monthKey,
  recordKey,
  type ChecklistFrequency,
} from '../lib/catalog';
import type { RecordMap } from '../hooks/useRecords';
import { useCountUp } from '../hooks/useCountUp';

const R = 64;
const CIRC = 2 * Math.PI * R;
const GAP = 4;

// Completion mix for the current period across every frequency in scope:
// complete vs flagged vs still outstanding. Same instance universe as the
// KPI hero, so the numbers always agree with it.
export function DonutCard({ records, locFilter }: { records: RecordMap; locFilter: string }) {
  const data = useMemo(() => {
    const now = new Date();
    const periodFor: Record<ChecklistFrequency, string> = {
      daily: fmtDate(now),
      weekly: isoWeekKey(now),
      monthly: monthKey(now),
    };
    const locs: string[] = locFilter === 'All' ? [...LOCATIONS] : [locFilter];
    let complete = 0;
    let flagged = 0;
    let outstanding = 0;
    for (const t of TASKS) {
      const taskLocs = t.perLoc ? locs : ['all'];
      for (const loc of taskLocs) {
        const r = records[recordKey(t.id, loc, periodFor[t.freq])];
        if (r?.done) {
          if (r.flag) flagged++;
          else complete++;
        } else {
          outstanding++;
        }
      }
    }
    const total = complete + flagged + outstanding;
    return {
      complete,
      flagged,
      outstanding,
      total,
      pct: total === 0 ? 0 : Math.round((100 * complete) / total),
    };
  }, [records, locFilter]);

  const shown = useCountUp(data.pct);

  const slices = [
    {
      label: 'Complete',
      count: data.complete,
      frac: data.total === 0 ? 0 : data.complete / data.total,
      stroke: 'stroke-emerald-600 dark:stroke-emerald-400',
      dot: 'bg-emerald-600 dark:bg-emerald-400',
    },
    {
      label: 'Flagged',
      count: data.flagged,
      frac: data.total === 0 ? 0 : data.flagged / data.total,
      stroke: 'stroke-alert-text',
      dot: 'bg-alert-text',
    },
    {
      label: 'Outstanding',
      count: data.outstanding,
      frac: data.total === 0 ? 0 : data.outstanding / data.total,
      stroke: 'stroke-stone-300 dark:stroke-white/20',
      dot: 'bg-stone-300 dark:bg-white/20',
    },
  ];

  let acc = 0;
  const arcs = slices.map((s) => {
    const len = Math.max(s.frac * CIRC - GAP, 0);
    const off = -(acc * CIRC);
    acc += s.frac;
    return { ...s, len, off };
  });

  const summary = `${data.complete} of ${data.total} current checklists complete, ${data.flagged} flagged, ${data.outstanding} outstanding.`;

  return (
    <section aria-label="Completion mix" className="glass-card h-full rounded-2xl p-4 sm:p-5 lg:col-span-2">
      <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-100">Completion mix</h3>
      <p className="font-mono text-[11px] text-stone-600 dark:text-stone-400">this period · all frequencies</p>

      <div className="mt-3 flex items-center gap-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', bounce: 0, duration: 0.5 }}
          className="w-32 shrink-0 sm:w-36"
        >
          <svg viewBox="0 0 160 160" className="block w-full" role="img" aria-label={summary}>
            <circle
              cx={80}
              cy={80}
              r={R}
              fill="none"
              strokeWidth={18}
              className="stroke-stone-900/10 dark:stroke-white/10"
            />
            {arcs
              .filter((a) => a.len > 1)
              .map((a) => (
                <circle
                  key={a.label}
                  cx={80}
                  cy={80}
                  r={R}
                  fill="none"
                  strokeWidth={18}
                  strokeLinecap="round"
                  strokeDasharray={`${a.len} ${CIRC - a.len}`}
                  strokeDashoffset={a.off}
                  transform="rotate(-90 80 80)"
                  className={a.stroke}
                >
                  <title>{`${a.label}: ${a.count}`}</title>
                </circle>
              ))}
            <text
              x={80}
              y={82}
              textAnchor="middle"
              fontSize={30}
              fontWeight={700}
              className="fill-stone-900 font-sans tabular-nums dark:fill-white"
            >
              {shown}%
            </text>
            <text
              x={80}
              y={99}
              textAnchor="middle"
              fontSize={10}
              className="fill-stone-600 font-mono dark:fill-stone-400"
            >
              complete
            </text>
          </svg>
        </motion.div>

        <ul className="min-w-0 flex-1 space-y-2">
          {slices.map((s) => (
            <li key={s.label} className="flex items-center gap-2 text-[13px]">
              <span aria-hidden className={`h-2.5 w-2.5 shrink-0 rounded-full ${s.dot}`} />
              <span className="flex-1 truncate text-stone-800 dark:text-stone-100">{s.label}</span>
              <span className="font-mono font-semibold tabular-nums text-stone-800 dark:text-stone-100">
                {s.count}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-3 text-[13px] leading-snug text-stone-600 dark:text-stone-400">{summary}</p>
    </section>
  );
}
