import ExcelJS from 'exceljs';

export type Cell = string | number | Date | null;

export class ImportError extends Error {}

const MAX_ROWS = 20_000;

/** Reads CSV, Excel (.xlsx) or JSON exports into a plain table of rows. */
export async function readTable(buffer: Buffer, filename: string): Promise<Cell[][]> {
  const ext = filename.toLowerCase().split('.').pop() ?? '';
  if (ext === 'xls') {
    throw new ImportError('Alte .xls-Dateien werden nicht unterstützt – bitte als .xlsx oder .csv exportieren.');
  }
  if (ext === 'xlsx' || ext === 'xlsm' || isZip(buffer)) return readXlsx(buffer);

  const text = decodeText(buffer);
  const start = text.trimStart();
  if (ext === 'json' || start.startsWith('[') || start.startsWith('{')) return readJson(start);
  return readCsv(text);
}

const isZip = (buffer: Buffer) => buffer.length > 4 && buffer[0] === 0x50 && buffer[1] === 0x4b;

/** UTF-8 first; Austrian bank CSVs are often Windows-1252 (umlauts). */
function decodeText(buffer: Buffer) {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer).replace(/^﻿/, '');
  } catch {
    try {
      return new TextDecoder('windows-1252').decode(buffer);
    } catch {
      return buffer.toString('latin1');
    }
  }
}

async function readXlsx(buffer: Buffer): Promise<Cell[][]> {
  const workbook = new ExcelJS.Workbook();
  try {
    // exceljs' Buffer typing lags behind @types/node
    await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  } catch {
    throw new ImportError('Die Excel-Datei konnte nicht gelesen werden.');
  }
  const sheet = workbook.worksheets.reduce<ExcelJS.Worksheet | undefined>(
    (best, ws) => (!best || ws.actualRowCount > best.actualRowCount ? ws : best),
    undefined
  );
  if (!sheet) throw new ImportError('Die Excel-Datei enthält keine Tabelle.');

  const rows: Cell[][] = [];
  sheet.eachRow({ includeEmpty: false }, (row) => {
    if (rows.length >= MAX_ROWS) return;
    const cells: Cell[] = [];
    for (let i = 1; i <= row.cellCount; i++) cells.push(cellValue(row.getCell(i).value));
    rows.push(cells);
  });
  return rows;
}

function cellValue(value: ExcelJS.CellValue): Cell {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' || typeof value === 'number') return value;
  if (typeof value === 'boolean') return String(value);
  if (value instanceof Date) return value;
  if (typeof value === 'object') {
    const v = value as unknown as Record<string, unknown>;
    if (Array.isArray(v.richText)) return (v.richText as { text: string }[]).map((r) => r.text).join('');
    if (typeof v.text === 'string') return v.text;
    if ('result' in v) return cellValue(v.result as ExcelJS.CellValue);
    if ('error' in v) return null;
  }
  return String(value);
}

function readJson(text: string): Cell[][] {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new ImportError('Die JSON-Datei ist ungültig.');
  }
  const list = Array.isArray(data) ? data : findArray(data);
  if (!list || list.length === 0) throw new ImportError('In der JSON-Datei wurden keine Umsätze gefunden.');

  const flat = list.slice(0, MAX_ROWS).map((item) => flatten(item));
  const headers = Array.from(new Set(flat.flatMap((row) => Object.keys(row))));
  return [headers, ...flat.map((row) => headers.map((h) => row[h] ?? null))];
}

function findArray(data: unknown): unknown[] | undefined {
  if (!data || typeof data !== 'object') return undefined;
  for (const value of Object.values(data)) {
    if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') return value;
  }
  return undefined;
}

function flatten(value: unknown, prefix = '', out: Record<string, Cell> = {}): Record<string, Cell> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const [key, child] of Object.entries(value)) flatten(child, prefix ? `${prefix}.${key}` : key, out);
  } else if (Array.isArray(value)) {
    out[prefix] = value.filter((x) => typeof x !== 'object').join(' ');
  } else if (value === null || value === undefined) {
    out[prefix] = null;
  } else {
    out[prefix] = typeof value === 'number' ? value : String(value);
  }
  return out;
}

function countOutsideQuotes(line: string, delimiter: string) {
  let count = 0;
  let quoted = false;
  for (const ch of line) {
    if (ch === '"') quoted = !quoted;
    else if (ch === delimiter && !quoted) count++;
  }
  return count;
}

function detectDelimiter(text: string) {
  const lines = text
    .split(/\r?\n/)
    .filter((l) => l.trim())
    .slice(0, 12);
  let best = ',';
  let bestScore = -1;
  for (const delimiter of [';', ',', '\t', '|']) {
    const counts = lines.map((l) => countOutsideQuotes(l, delimiter));
    const max = Math.max(0, ...counts);
    if (max === 0) continue;
    const score = counts.filter((c) => c === max).length * 10 + max;
    if (score > bestScore) {
      bestScore = score;
      best = delimiter;
    }
  }
  return best;
}

function readCsv(text: string): Cell[][] {
  const delimiter = detectDelimiter(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  const endRow = () => {
    row.push(field);
    field = '';
    if (row.some((c) => c.trim())) rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length && rows.length < MAX_ROWS; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"' && field.trim() === '') {
      quoted = true;
      field = '';
    } else if (ch === delimiter) {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      endRow();
    } else {
      field += ch;
    }
  }
  if (field || row.length) endRow();

  return rows.map((r) => r.map((c) => c.trim() || null));
}
