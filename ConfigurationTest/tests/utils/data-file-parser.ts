import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';

/**
 * data-file-parser.ts
 *
 * Lee archivos de datos (.csv, .txt, .xlsx) declarados por el tester en BoxTestData/
 * y los convierte en un array de filas { columna: valor } — una fila = una ejecución
 * de prueba con esos datos.
 *
 * Se ubica en ConfigurationTest/tests/utils/ (no en ConfigurationAgents/) porque lo
 * usan dos consumidores distintos:
 *   - El motor de generación (data-binding.agent.ts) en tiempo de "npm run generate".
 *   - Specs de API manuales en GenerateTest/api-testing-rest-soap/, en runtime, vía
 *     loadSuiteTestData() para iterar el archivo de datos ellos mismos.
 */

export type DataRow = Record<string, string>;

const DEFAULT_DATA_DIR = 'BoxTestData';
const SUPPORTED_EXTENSIONS = ['.csv', '.txt', '.xlsx'] as const;

/**
 * Busca `<suiteName>.csv|.txt|.xlsx` dentro de BoxTestData/ (en ese orden de
 * preferencia si existiera más de uno). Devuelve la ruta absoluta o null si no hay.
 */
export function findSuiteDataFile(suiteName: string, dir: string = DEFAULT_DATA_DIR): string | null {
  const root = path.isAbsolute(dir) ? dir : path.join(process.cwd(), dir);
  for (const ext of SUPPORTED_EXTENSIONS) {
    const candidate = path.join(root, `${suiteName}${ext}`);
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

/** Parsea un archivo de datos (.csv, .txt o .xlsx) a un array de filas { columna: valor }. */
export function parseDataFile(filePath: string): DataRow[] {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.xlsx') return parseXlsx(filePath);

  const raw = fs.readFileSync(filePath, 'utf-8');
  const delimiter = ext === '.csv' ? ',' : detectDelimiter(raw);
  return parseDelimited(raw, delimiter);
}

/**
 * Combina findSuiteDataFile + parseDataFile para una suite.
 * Devuelve [] si la suite no tiene archivo de datos — así se puede usar sin
 * comprobaciones extra tanto en el motor de generación como en specs manuales.
 */
export function loadSuiteTestData(suiteName: string, dir: string = DEFAULT_DATA_DIR): DataRow[] {
  const file = findSuiteDataFile(suiteName, dir);
  return file ? parseDataFile(file) : [];
}

// ─── XLSX ───────────────────────────────────────────────────────────────────

function parseXlsx(filePath: string): DataRow[] {
  const wb = XLSX.readFile(filePath);
  const firstSheetName = wb.SheetNames[0];
  if (!firstSheetName) return [];
  const sheet = wb.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
  return rows.map(stringifyRow);
}

function stringifyRow(row: Record<string, unknown>): DataRow {
  const out: DataRow = {};
  for (const [k, v] of Object.entries(row)) {
    out[k.trim()] = v === null || v === undefined ? '' : String(v);
  }
  return out;
}

// ─── CSV / TXT ──────────────────────────────────────────────────────────────

/** Detecta el separador probando coma, tabulación y punto y coma sobre la primera línea. */
function detectDelimiter(raw: string): string {
  const firstLine = raw.split(/\r?\n/).find(l => l.trim().length > 0) ?? '';
  const candidates = [',', '\t', ';'];
  let best = ',';
  let bestCount = 1;
  for (const c of candidates) {
    const count = firstLine.split(c).length;
    if (count > bestCount) { bestCount = count; best = c; }
  }
  return best;
}

/**
 * Parser CSV/TXT con soporte básico de comillas dobles (RFC 4180): respeta el
 * delimitador y los saltos de línea dentro de campos entre comillas, y "" como
 * comilla escapada.
 */
function parseDelimited(raw: string, delimiter: string): DataRow[] {
  const lines = splitLogicalLines(raw);
  if (lines.length === 0) return [];

  const headers = parseLine(lines[0], delimiter).map(h => h.trim());
  const rows: DataRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue; // ignora líneas en blanco
    const cells = parseLine(lines[i], delimiter);
    const row: DataRow = {};
    headers.forEach((h, idx) => { row[h] = (cells[idx] ?? '').trim(); });
    rows.push(row);
  }
  return rows;
}

/** Divide el contenido en líneas lógicas, sin partir saltos de línea dentro de comillas. */
function splitLogicalLines(raw: string): string[] {
  const lines: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (ch === '"') inQuotes = !inQuotes;
    if (ch === '\n' && !inQuotes) {
      lines.push(current.replace(/\r$/, ''));
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim().length > 0) lines.push(current.replace(/\r$/, ''));
  return lines;
}

/** Parsea una línea respetando campos entre comillas dobles. */
function parseLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { current += '"'; i++; }
        else inQuotes = false;
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      cells.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  cells.push(current);
  return cells;
}
