import type { RecordMap } from '../hooks/useRecords';

// CSV export/import for compliance_records — same columns as sample/Index.html.

const HEADER = ['task_id', 'location', 'period_key', 'done', 'logged_at', 'note', 'flag', 'fields_json'];

function escapeCsv(v: string): string {
  return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
}

export function recordsToCsv(records: RecordMap): string {
  const rows: string[][] = [HEADER];
  for (const [key, r] of Object.entries(records)) {
    const [taskId, loc, periodKey] = key.split('|');
    rows.push([
      taskId,
      loc,
      periodKey,
      r.done ? 'yes' : 'no',
      r.logged_at || '',
      r.note || '',
      r.flag || '',
      r.fields ? JSON.stringify(r.fields) : '',
    ]);
  }
  return rows.map((r) => r.map(escapeCsv).join(',')).join('\n');
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function parseLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') inQ = false;
      else cur += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

export interface ParsedRow {
  taskId: string;
  loc: string;
  periodKey: string;
  done: boolean;
  loggedAt: string;
  note: string;
  flag: string;
  fieldsJson: string;
}

/** Parse CSV text into rows. Throws on bad header. */
export function parseCsv(text: string): ParsedRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length);
  if (!lines.length) return [];
  const header = parseLine(lines[0]).map((h) => h.trim().toLowerCase());
  const idx = (n: string) => header.indexOf(n);
  const iTask = idx('task_id'), iLoc = idx('location'), iPeriod = idx('period_key'), iDone = idx('done');
  if (iTask < 0 || iLoc < 0 || iPeriod < 0 || iDone < 0) {
    throw new Error('CSV must have columns: task_id, location, period_key, done, logged_at, note');
  }
  const iLogged = idx('logged_at'), iNote = idx('note'), iFlag = idx('flag'), iFields = idx('fields_json');
  const rows: ParsedRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseLine(lines[i]);
    const done = /^y|^true|^1/i.test(cols[iDone] || '');
    if (!cols[iTask] || !cols[iPeriod] || !done) continue;
    rows.push({
      taskId: cols[iTask],
      loc: cols[iLoc] || 'all',
      periodKey: cols[iPeriod],
      done,
      loggedAt: iLogged >= 0 ? cols[iLogged] : '',
      note: iNote >= 0 ? cols[iNote] : '',
      flag: iFlag >= 0 ? cols[iFlag] : '',
      fieldsJson: iFields >= 0 ? cols[iFields] : '',
    });
  }
  return rows;
}
