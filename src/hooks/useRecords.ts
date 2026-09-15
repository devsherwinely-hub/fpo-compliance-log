import { useCallback, useEffect, useState } from 'react';
import { evaluateFlag, recordKey, type FieldValues } from '../lib/catalog';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

export interface ComplianceRecord {
  task_id: string;
  location: string;
  period_key: string;
  done: boolean;
  logged_at: string;
  note: string;
  flag: string;
  fields: FieldValues;
}

/** Map of recordKey(task,loc,period) -> record. */
export type RecordMap = Record<string, ComplianceRecord>;

function rowToRecord(row: Record<string, unknown>): ComplianceRecord {
  return {
    task_id: String(row.task_id ?? ''),
    location: String(row.location ?? ''),
    period_key: String(row.period_key ?? ''),
    done: Boolean(row.done ?? true),
    logged_at: String(row.logged_at ?? ''),
    note: String(row.note ?? ''),
    flag: String(row.flag ?? ''),
    fields: (row.fields as FieldValues) ?? {},
  };
}

export function useRecords() {
  const [records, setRecords] = useState<RecordMap>({});
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase.from('compliance_records').select('*');
      if (err) throw err;
      const next: RecordMap = {};
      for (const row of (data ?? []) as Record<string, unknown>[]) {
        const r = rowToRecord(row);
        next[recordKey(r.task_id, r.location, r.period_key)] = r;
      }
      setRecords(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load records');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const saveEntry = useCallback(
    async (taskId: string, loc: string, periodKey: string, note: string, fields: FieldValues) => {
      if (!isSupabaseConfigured || !supabase) return false;
      setSaving(true);
      try {
        const flag = evaluateFlag(taskId, fields) ?? '';
        const payload = {
          task_id: taskId,
          location: loc,
          period_key: periodKey,
          done: true,
          note: note || '',
          flag,
          fields,
        };
        const { error: err } = await supabase
          .from('compliance_records')
          .upsert(payload, { onConflict: 'task_id,location,period_key' });
        if (err) throw err;
        setRecords((prev) => ({
          ...prev,
          [recordKey(taskId, loc, periodKey)]: {
            ...payload,
            logged_at: new Date().toISOString(),
          },
        }));
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Save failed');
        return false;
      } finally {
        setSaving(false);
      }
    },
    []
  );

  const undoEntry = useCallback(async (taskId: string, loc: string, periodKey: string) => {
    if (!isSupabaseConfigured || !supabase) return false;
    setSaving(true);
    try {
      const { error: err } = await supabase
        .from('compliance_records')
        .delete()
        .eq('task_id', taskId)
        .eq('location', loc)
        .eq('period_key', periodKey);
      if (err) throw err;
      setRecords((prev) => {
        const next = { ...prev };
        delete next[recordKey(taskId, loc, periodKey)];
        return next;
      });
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Undo failed');
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  return { records, loading, saving, error, refresh, saveEntry, undoEntry };
}
