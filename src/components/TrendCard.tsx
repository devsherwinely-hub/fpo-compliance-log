import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  LOCATIONS,
  TASKS,
  addDays,
  fmtDate,
  recordKey,
} from '../lib/catalog';
import type { RecordMap } from '../hooks/useRecords';

const DAYS = 14;
const W = 560;
const H = 190;
const PAD = { top: 12, right: 10, bottom: 26, left: 34 };

interface DayPoint {
  key: string;
  label: string;
  done: number;
  total: number;
  pct: number;
}

/** Smooth path through points (catmull-rom → bezier). */
function smoothPath(pts: Array<{ x: number; y: number }>): string {
  if (pts.length < 2) return pts.length ? `M ${pts[0].x} ${pts[0].y}` : '';
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

export function TrendCard({ records, locFilter }: { records: RecordMap; locFilter: string }) {
  const [hovered, setHovered] = useState<number | null>(null);

  const data = useMemo(() => {
    const now = new Date();
    const locs: string[] = locFilter === 'All' ? [...LOCATIONS] : [locFilter];
    const dailyTasks = TASKS.filter((t) => t.freq === 'daily');
    const perDayTotal = dailyTasks.reduce((n, t) => n + (t.perLoc ? locs.length : 1), 0);

    const days: DayPoint[] = Array.from({ length: DAYS }, (_, i) => {
      const d = addDays(now, i - (DAYS - 1));
      const key = fmtDate(d);
      let done = 0;
      for (const t of dailyTasks) {
        const taskLocs = t.perLoc ? locs : ['all'];
        for (const loc of taskLocs) {
          if (records[recordKey(t.id, loc, key)]?.done) done++;
        }
      }
      return {
        key,
        label: d.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' }),
        done,
        total: perDayTotal,
        pct: perDayTotal === 0 ? 0 : Math.round((100 * done) / perDayTotal),
      };
    });

    const avg = (slice: DayPoint[]) =>
      slice.length === 0 ? 0 : slice.reduce((s, p) => s + p.pct, 0) / slice.length;
    const delta = Math.round(avg(days.slice(7)) - avg(days.slice(0, 7)));
    const logged = days.reduce((s, p) => s + p.done, 0);
    const possible = days.reduce((s, p) => s + p.total, 0);
    return { days, delta, logged, possible };
  }, [records, locFilter]);

  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (innerW * i) / (DAYS - 1);
  const y = (p: number) => PAD.top + innerH - (innerH * Math.min(100, Math.max(0, p))) / 100;

  const pts = data.days.map((d, i) => ({ x: x(i), y: y(d.pct) }));
  const line = smoothPath(pts);
  const area = `${line} L ${x(DAYS - 1)} ${PAD.top + innerH} L ${x(0)} ${PAD.top + innerH} Z`;

  const active = hovered !== null ? data.days[hovered] : null;
  const trendWord = data.delta > 0 ? 'up' : data.delta < 0 ? 'down' : 'flat';
  const summary = `Logged ${data.logged} of ${data.possible} daily checklists over the last 14 days. Trend ${trendWord} ${Math.abs(data.delta)} points versus the prior week.`;

  return (
    <section aria-label="14-day compliance trend" className="glass-card h-full rounded-2xl p-4 sm:p-5">
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-100">Daily trend</h3>
          <p className="font-mono text-[11px] text-stone-600 dark:text-stone-400">last 14 days · % of daily checklists logged</p>
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
            data.delta > 0
              ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300'
              : data.delta < 0
                ? 'bg-alert-bg text-alert-text'
                : 'bg-stone-900/5 text-stone-600 dark:bg-white/10 dark:text-stone-300'
          }`}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden fill="currentColor">
            {data.delta < 0 ? <path d="M5 8 1 3h8z" /> : <path d="M5 2l4 5H1z" />}
          </svg>
          {data.delta === 0 ? 'Flat vs prior week' : `${data.delta > 0 ? '+' : ''}${data.delta} pts vs prior week`}
        </span>
      </div>

      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label={summary}>
          {[0, 50, 100].map((g) => (
            <g key={g}>
              <line
                x1={PAD.left}
                x2={W - PAD.right}
                y1={y(g)}
                y2={y(g)}
                className="stroke-stone-900/10 dark:stroke-white/15"
                strokeWidth={1}
                strokeDasharray={g === 0 ? undefined : '3 4'}
              />
              <text
                x={PAD.left - 6}
                y={y(g) + 3.5}
                textAnchor="end"
                fontSize={10}
                className="fill-stone-600 font-mono dark:fill-stone-400"
              >
                {g}%
              </text>
            </g>
          ))}
          <motion.path
            d={area}
            initial={false}
            animate={{ opacity: 1 }}
            className="fill-emerald-600/20 dark:fill-emerald-400/20"
          />
          <motion.path
            d={line}
            fill="none"
            strokeWidth={2.5}
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ type: 'spring', bounce: 0, duration: 0.9 }}
            className="stroke-emerald-600 dark:stroke-emerald-400"
          />
          {data.days.map((d, i) => (
            <g key={d.key}>
              <circle
                cx={x(i)}
                cy={y(d.pct)}
                r={12}
                fill="transparent"
                tabIndex={0}
                role="img"
                aria-label={`${d.label}: ${d.done} of ${d.total} logged, ${d.pct} percent`}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(i)}
                onBlur={() => setHovered(null)}
                className="cursor-pointer outline-none"
              />
              <circle
                cx={x(i)}
                cy={y(d.pct)}
                r={hovered === i ? 5 : 3}
                pointerEvents="none"
                className="fill-emerald-600 transition-all dark:fill-emerald-400"
              />
              {i % 2 === 0 && (
                <text
                  x={x(i)}
                  y={H - 8}
                  textAnchor="middle"
                  fontSize={10}
                  className="fill-stone-600 font-mono dark:fill-stone-400"
                >
                  {d.label}
                </text>
              )}
            </g>
          ))}
          {active && hovered !== null && (
            <g pointerEvents="none">
              <rect
                x={Math.min(Math.max(x(hovered) - 62, PAD.left), W - PAD.right - 124)}
                y={Math.max(y(active.pct) - 52, 4)}
                width={124}
                height={40}
                rx={10}
                className="fill-stone-900 dark:fill-white"
              />
              <text
                x={Math.min(Math.max(x(hovered) - 62, PAD.left), W - PAD.right - 124) + 62}
                y={Math.max(y(active.pct) - 52, 4) + 16}
                textAnchor="middle"
                fontSize={11}
                fontWeight={700}
                className="fill-white dark:fill-black"
              >
                {active.label} · {active.pct}%
              </text>
              <text
                x={Math.min(Math.max(x(hovered) - 62, PAD.left), W - PAD.right - 124) + 62}
                y={Math.max(y(active.pct) - 52, 4) + 30}
                textAnchor="middle"
                fontSize={10}
                className="fill-white/80 font-mono dark:fill-black/70"
              >
                {active.done}/{active.total} logged
              </text>
            </g>
          )}
        </svg>
      </div>

      <p className="mt-1 text-[13px] text-stone-600 dark:text-stone-400">{summary}</p>
      <details className="mt-2">
        <summary className="cursor-pointer text-[13px] font-medium text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white">
          View data table
        </summary>
        <table className="mt-2 w-full border-collapse text-[13px]">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-stone-600 dark:text-stone-400">
              <th className="py-1 pr-3 font-semibold">Day</th>
              <th className="py-1 pr-3 font-semibold">Logged</th>
              <th className="py-1 font-semibold">Rate</th>
            </tr>
          </thead>
          <tbody>
            {data.days.map((d) => (
              <tr key={d.key} className="border-t border-stone-900/5 dark:border-white/10">
                <td className="py-1.5 pr-3 font-mono text-stone-800 dark:text-stone-100">{d.key}</td>
                <td className="py-1.5 pr-3 text-stone-600 dark:text-stone-400">{d.done}/{d.total}</td>
                <td className="py-1.5 font-semibold text-stone-800 dark:text-stone-100">{d.pct}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  );
}
