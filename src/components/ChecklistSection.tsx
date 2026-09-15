import { useMemo, useState, type KeyboardEvent } from 'react';
import { motion } from 'motion/react';
import { thud, tick } from '../lib/haptics';
import {
  FIELD_SCHEMAS,
  LOCATIONS,
  TASKS,
  fmtDate,
  itemChecklistFields,
  periodKeyFor,
  periodLabelFor,
  recordKey,
  type ChecklistFrequency,
  type FieldValues,
  type SchemaField,
} from '../lib/catalog';
import type { RecordMap } from '../hooks/useRecords';

interface ChecklistSectionProps {
  freq: ChecklistFrequency;
  records: RecordMap;
  saving: boolean;
  onSave: (taskId: string, loc: string, periodKey: string, note: string, fields: FieldValues) => Promise<boolean>;
  onUndo: (taskId: string, loc: string, periodKey: string) => Promise<boolean>;
  notify: (msg: string, isError?: boolean) => void;
}

function ToggleGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  const onKeyDown = (e: KeyboardEvent) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
    e.preventDefault();
    const group = (e.target as HTMLElement).closest('[role="radiogroup"]');
    const btns = group ? Array.from(group.querySelectorAll<HTMLButtonElement>('[role="radio"]')) : [];
    if (!btns.length) return;
    const i = btns.indexOf(document.activeElement as HTMLButtonElement);
    const dir = e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 1;
    const next = btns[(i + dir + btns.length) % btns.length];
    next.focus();
    next.click();
  };

  return (
    <div
      className="segmented inline-flex"
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
    >
      {options.map((o) => {
        const active = value === o || value.toLowerCase() === o.toLowerCase();
        const lv = o.toLowerCase();
        const tone =
          lv === 'yes' || lv === 'pass'
            ? 'text-emerald-700 dark:text-emerald-400'
            : lv === 'no' || lv === 'fail'
              ? 'text-alert-text'
              : 'text-amber-700 dark:text-amber-400';
        return (
          <motion.button
            key={o}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => { tick(); onChange(o); }}
            whileTap={{ scale: 0.94 }}
            transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold ${
              active ? `bg-white ${tone} shadow-sm` : 'text-stone-600 dark:text-stone-400'
            }`}
          >
            {o}
          </motion.button>
        );
      })}
    </div>
  );
}

function FieldInput({
  f,
  value,
  onChange,
}: {
  f: SchemaField;
  value: string;
  onChange: (v: string) => void;
}) {
  if (f.type === 'yesno') {
    return <ToggleGroup label={f.label} options={['Yes', 'No']} value={value} onChange={(v) => onChange(v.toLowerCase())} />;
  }
  if (f.type === 'select' && f.options && f.options.length <= 3) {
    return <ToggleGroup label={f.label} options={f.options} value={value} onChange={onChange} />;
  }
  if (f.type === 'select') {
    return (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-stone-300/70 dark:border-white/20 bg-white/70 dark:bg-white/10 px-2 py-1.5 text-[13px]"
      >
        <option value="">— select —</option>
        {f.options!.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    );
  }
  if (f.type === 'checkbox') {
    return (
      <input
        type="checkbox"
        checked={value === 'yes'}
        onChange={(e) => { tick(); onChange(e.target.checked ? 'yes' : 'no'); }}
        className="h-5 w-5 accent-stone-900 dark:accent-white"
      />
    );
  }
  if (f.type === 'date') {
    return (
      <input
        type="date"
        value={value || fmtDate(new Date())}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-stone-300/70 dark:border-white/20 bg-white/70 dark:bg-white/10 px-2 py-1.5 text-[13px]"
      />
    );
  }
  if (f.type === 'time') {
    return (
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-stone-300/70 dark:border-white/20 bg-white/70 dark:bg-white/10 px-2 py-1.5 text-[13px]"
      />
    );
  }
  return (
    <input
      type={f.type === 'number' ? 'number' : 'text'}
      step={f.type === 'number' ? '0.1' : undefined}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border border-stone-300/70 dark:border-white/20 bg-white/70 dark:bg-white/10 px-2 py-1.5 text-[13px]"
    />
  );
}

function Summary({ taskId, fields }: { taskId: string; fields: FieldValues }) {
  const items = itemChecklistFields(taskId);
  const itemKeys = new Set(items.map((f) => f.key));
  const others = (FIELD_SCHEMAS[taskId] || []).filter((f) => f.type !== 'header' && f.key && !itemKeys.has(f.key));
  const checked = items.filter((f) => fields[f.key!] === 'yes').length;
  const missing = items.filter((f) => fields[f.key!] !== 'yes').map((f) => f.label);
  return (
    <div>
      {items.length > 0 && (
        <>
          <p className="mt-2 text-[12.5px] text-stone-600 dark:text-stone-400">{checked} of {items.length} items present &amp; in date</p>
          {missing.length > 0 && (
            <p className="mt-1 text-[12.5px] font-medium text-alert-text">Missing/expired: {missing.join(', ')}</p>
          )}
        </>
      )}
      {others.length > 0 && (
        <table className="mt-2 border-collapse text-[13px]">
          <tbody>
            {others.map((f) => (
              <tr key={f.key}>
                <td className="py-0.5 pr-3 text-stone-600 dark:text-stone-400">{f.label}</td>
                <td className="py-0.5 font-mono font-semibold text-stone-800 dark:text-stone-100">{String(fields[f.key!] ?? '—')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function TaskCard({
  taskId,
  taskName,
  loc,
  periodKey,
  periodLabel,
  record,
  saving,
  onSave,
  onUndo,
  notify,
  enterDelay = 0,
}: {
  taskId: string;
  taskName: string;
  loc: string;
  periodKey: string;
  periodLabel: string;
  record: RecordMap[string] | undefined;
  saving: boolean;
  onSave: ChecklistSectionProps['onSave'];
  onUndo: ChecklistSectionProps['onUndo'];
  notify: ChecklistSectionProps['notify'];
  enterDelay?: number;
}) {
  const schema = FIELD_SCHEMAS[taskId];
  const [fields, setFields] = useState<FieldValues>({});
  const [note, setNote] = useState('');
  const done = !!record?.done;
  const flagged = !!record?.flag;

  const set = (k: string, v: string) => setFields((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    const ok = await onSave(taskId, loc, periodKey, note, fields);
    if (ok) {
      thud();
      notify('Entry saved');
      setFields({});
      setNote('');
    } else {
      notify("Couldn't save this entry. Check your connection and try again.", true);
    }
  };

  const handleUndo = async () => {
    const ok = await onUndo(taskId, loc, periodKey);
    if (ok) thud();
    notify(ok ? 'Entry removed' : 'Undo failed', !ok);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', bounce: 0, duration: 0.45, delay: enterDelay }}
      className={`glass-card rounded-2xl p-4 ${flagged ? 'border-l-[3px] border-l-alert-text' : done ? 'border-l-[3px] border-l-emerald-600' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[14.5px] font-semibold text-stone-800 dark:text-stone-100">{taskName}</p>
          <p className="mt-0.5 text-xs text-stone-600 dark:text-stone-400">{loc} · {periodLabel}</p>
        </div>
        <span
          className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${
            flagged
              ? 'bg-alert-bg text-alert-text'
              : done
                ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300'
                : 'bg-amber-50 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300'
          }`}
        >
          {flagged ? 'Flagged' : done ? 'Complete' : 'Pending'}
        </span>
      </div>

      {done && record ? (
        <div>
          <Summary taskId={taskId} fields={record.fields} />
          {record.note && <p className="mt-1.5 text-[13px] text-stone-600 dark:text-stone-400">Note: {record.note}</p>}
          {record.flag && <p className="mt-1.5 text-[13px] font-medium text-alert-text">⚠ {record.flag}</p>}
          {record.logged_at && (
            <p className="mt-1 font-mono text-[11px] text-stone-600 dark:text-stone-400">Logged {new Date(record.logged_at).toLocaleString()}</p>
          )}
          <motion.button
            type="button"
            onClick={handleUndo}
            disabled={saving}
            whileTap={{ scale: 0.96 }}
            transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
            className="mt-2.5 h-9 rounded-full border border-stone-300/70 dark:border-white/20 bg-white/60 dark:bg-white/10 px-4 text-[13px] font-semibold text-stone-600 dark:text-stone-400 disabled:opacity-60"
          >
            Undo
          </motion.button>
        </div>
      ) : schema ? (
        <div>
          <div className="mt-3 grid grid-cols-1 gap-x-4 gap-y-2.5 sm:grid-cols-2">
            {schema.map((f, i) => {
              if (f.type === 'header') {
                return (
                  <p key={i} className="mt-1 border-t border-stone-200 dark:border-white/10 pt-2 text-xs font-bold uppercase tracking-wide text-stone-900 dark:text-white sm:col-span-2">
                    {f.label}
                  </p>
                );
              }
              const isToggle = f.type === 'checkbox' || f.type === 'yesno' || (f.type === 'select' && f.options!.length <= 3);
              return (
                <label key={f.key} className={`flex gap-2 text-[12.5px] text-stone-600 dark:text-stone-400 ${isToggle ? 'flex-row items-center' : 'flex-col'}`}>
                  {isToggle ? (
                    <>
                      <FieldInput f={f} value={fields[f.key!] ?? ''} onChange={(v) => set(f.key!, v)} />
                      <span>{f.label}</span>
                    </>
                  ) : (
                    <>
                      <span className="font-medium">{f.label}</span>
                      <FieldInput f={f} value={fields[f.key!] ?? ''} onChange={(v) => set(f.key!, v)} />
                    </>
                  )}
                </label>
              );
            })}
          </div>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Additional note (optional)"
            className="mt-2.5 w-full rounded-xl border border-stone-300/70 dark:border-white/20 bg-white/70 dark:bg-white/10 px-2.5 py-1.5 text-[13px]"
          />
          <motion.button
            type="button"
            onClick={handleSave}
            disabled={saving}
            whileTap={{ scale: 0.96 }}
            transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
            className="mt-2.5 h-10 rounded-full bg-stone-900 px-5 text-[13px] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] disabled:opacity-60 dark:bg-white dark:text-black dark:shadow-none"
          >
            Save entry
          </motion.button>
        </div>
      ) : (
        <div>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional note"
            className="mt-2.5 w-full rounded-xl border border-stone-300/70 dark:border-white/20 bg-white/70 dark:bg-white/10 px-3 py-2 text-[13px]"
          />
          <motion.button
            type="button"
            onClick={handleSave}
            disabled={saving}
            whileTap={{ scale: 0.96 }}
            transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
            className="mt-2.5 h-10 rounded-full bg-stone-900 px-5 text-[13px] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] disabled:opacity-60 dark:bg-white dark:text-black dark:shadow-none"
          >
            Mark complete
          </motion.button>
        </div>
      )}
    </motion.div>
  );
}

export function ChecklistSection(props: ChecklistSectionProps) {
  const { freq } = props;
  const [tabLoc, setTabLoc] = useState<string>(LOCATIONS[0]);
  const now = useMemo(() => new Date(), []);
  const periodKey = periodKeyFor(freq, now);
  const periodLabel = periodLabelFor(freq, now);
  const tasks = TASKS.filter((t) => t.freq === freq);
  const hasSharedLoc = tasks.some((t) => t.perLoc);

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="font-serif text-xl font-bold text-stone-900 dark:text-white">
          {freq[0].toUpperCase() + freq.slice(1)} checklist
        </h2>
        <span className="font-mono text-xs text-stone-600 dark:text-stone-400">{periodLabel}</span>
      </div>
      {hasSharedLoc && (
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="tabLoc" className="text-[13px] text-stone-600 dark:text-stone-400">Location:</label>
          <select
            id="tabLoc"
            value={tabLoc}
            onChange={(e) => setTabLoc(e.target.value)}
            className="h-9 rounded-xl border border-stone-300/70 dark:border-white/20 bg-white/70 dark:bg-white/10 px-2.5 text-[13px] font-medium"
          >
            {LOCATIONS.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
          <span className="text-xs text-stone-600 dark:text-stone-400">applies to all location-based checklists below</span>
        </div>
      )}
      {tasks.map((t, i) => {
        const loc = t.perLoc ? tabLoc : 'all';
        return (
          <TaskCard
            key={t.id}
            taskId={t.id}
            taskName={t.name}
            loc={loc}
            periodKey={periodKey}
            periodLabel={periodLabel}
            record={props.records[recordKey(t.id, loc, periodKey)]}
            saving={props.saving}
            onSave={props.onSave}
            onUndo={props.onUndo}
            notify={props.notify}
            enterDelay={Math.min(i * 0.05, 0.25)}
          />
        );
      })}
    </div>
  );
}
