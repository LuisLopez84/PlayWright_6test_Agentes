/**
 * heal-specs.ts
 *
 * Post-run spec healer: lee healer-db.json y learning-db.json,
 * identifica selectores curados con alta confianza, y los escribe
 * de vuelta en los archivos *.spec.ts.
 *
 * Esto cierra el ciclo: test falla → healing ocurre → spec actualizado →
 * siguiente ejecución usa el selector curado directamente (sin re-sanar).
 *
 * Solo reemplaza con selectores ESTRUCTURALES (más estables que texto):
 *   #id, [name=…], [aria-label=…], [data-testid=…], page.getByLabel(…), etc.
 *
 * Ejecución:
 *   npm run heal:specs
 *   (se integra automáticamente al final de npm run test y npm run test:suite)
 */

import fs from 'fs';
import path from 'path';

// ─── Rutas ────────────────────────────────────────────────────────────────────
const ROOT        = process.cwd();
const HEALER_DB   = path.join(ROOT, 'healer-db.json');
const LEARNING_DB = path.join(ROOT, 'learning-db.json');
const SPECS_DIR   = path.join(ROOT, 'GenerateTest', 'tests');

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface HealerEntry  { selector: string; savedAt: number; }
interface LearnedEntry { selector: string; successCount: number; lastUsed: string; }

// ─── Cargar bases de datos ────────────────────────────────────────────────────

function loadHealerDB(): Record<string, HealerEntry> {
  if (!fs.existsSync(HEALER_DB)) return {};
  try {
    const raw = JSON.parse(fs.readFileSync(HEALER_DB, 'utf-8'));
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const result: Record<string, HealerEntry> = {};
    for (const [key, val] of Object.entries(raw) as [string, any][]) {
      const entry: HealerEntry = typeof val === 'string'
        ? { selector: val, savedAt: now }
        : val;
      if (now - entry.savedAt < sevenDays) result[key] = entry;
    }
    return result;
  } catch { return {}; }
}

function loadLearningDB(): Record<string, LearnedEntry[]> {
  if (!fs.existsSync(LEARNING_DB)) return {};
  try { return JSON.parse(fs.readFileSync(LEARNING_DB, 'utf-8')); }
  catch { return {}; }
}

// ─── Clasificación de selector ────────────────────────────────────────────────

/**
 * Un selector es "estructural" cuando apunta a un elemento por atributo estable
 * en lugar de por texto visible. Solo reemplazamos texto → estructural.
 */
function isStructural(sel: string): boolean {
  if (!sel) return false;
  return (
    /^#[\w-]+$/.test(sel) ||                          // #id
    sel.startsWith('[name=')                    ||
    sel.startsWith('[id=')                      ||
    sel.startsWith('[data-testid=')             ||
    sel.startsWith('[aria-label=')              ||
    sel.startsWith('[placeholder=')             ||
    /^input\[type=/.test(sel)                   ||
    /^button\[type=/.test(sel)                  ||
    // Expresiones Playwright estructurales del recorder
    /^page\.(getByLabel|getByRole|getByPlaceholder|getByTestId|getByAltText)\(/.test(sel)
  );
}

/**
 * Un selector "de texto" es el candidato a ser reemplazado.
 * No reemplazamos expresiones Playwright existentes (ya son buenas).
 */
function isTextSelector(sel: string): boolean {
  if (!sel) return false;
  if (isStructural(sel)) return false;
  if (/^page\.(getBy|locator)/.test(sel)) return false; // ya es expresión Playwright → no tocar
  if (sel.startsWith('#') || sel.startsWith('[') || sel.startsWith('.')) return false;
  if (sel.startsWith('//')) return false; // XPath
  return true; // texto puro
}

// ─── Parchear un spec ─────────────────────────────────────────────────────────

/**
 * Escapa un string para usarlo dentro de una expresión regular.
 */
function escRx(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Lee un spec, aplica los reemplazos y devuelve el número de cambios.
 */
function patchSpecFile(
  specPath: string,
  replacements: Map<string, string>,  // original → healed
): number {
  let content = fs.readFileSync(specPath, 'utf-8');
  let count = 0;

  for (const [original, healed] of replacements) {
    if (!isTextSelector(original)) continue;
    if (!isStructural(healed))     continue;
    if (original === healed)       continue;

    // Patrón: smartXxx(page, `original`) o smartXxx(_popupPage, `original`)
    // También smartXxx(page, `original`, 'valor') y las variantes
    const rx = new RegExp(
      `(smart(?:Click|Fill|Select|Check|Uncheck|Hover|RightClick|DblClick|Scroll|Upload)` +
      `\\s*\\(\\s*(?:page|_popupPage|\\w+Page)\\s*,\\s*)\\\`${escRx(original)}\\\``,
      'g',
    );

    const before = content;
    content = content.replace(rx, `$1\`${healed}\``);
    if (content !== before) {
      count++;
      console.log(`  ✅ [${path.basename(specPath)}] "${original}" → "${healed}"`);
    }
  }

  if (count > 0) fs.writeFileSync(specPath, content, 'utf-8');
  return count;
}

// ─── Buscar specs ─────────────────────────────────────────────────────────────

function findSpecFiles(): string[] {
  const files: string[] = [];
  if (!fs.existsSync(SPECS_DIR)) return files;
  for (const suite of fs.readdirSync(SPECS_DIR)) {
    const uiDir = path.join(SPECS_DIR, suite, 'ui');
    if (!fs.existsSync(uiDir)) continue;
    for (const file of fs.readdirSync(uiDir)) {
      if (file.endsWith('.spec.ts')) files.push(path.join(uiDir, file));
    }
  }
  return files;
}

// ─── Construir mapa de reemplazos desde healer-db + learning-db ───────────────

function buildReplacementMap(): Map<string, string> {
  const map = new Map<string, string>();

  // 1. healer-db: mapeo directo original → healed (confirmado que funcionó)
  const healerDB = loadHealerDB();
  for (const [original, { selector: healed }] of Object.entries(healerDB)) {
    if (isTextSelector(original) && isStructural(healed)) {
      map.set(original, healed);
    }
  }

  // 2. learning-db: selectores con alto successCount (≥ 3 = confianza alta)
  const learningDB = loadLearningDB();
  const MIN_SUCCESS = 3;
  for (const [key, entries] of Object.entries(learningDB)) {
    if (!Array.isArray(entries) || entries.length === 0) continue;
    // key = "url|action|targetText"
    const parts = key.split('|');
    if (parts.length < 3) continue;
    const targetText = parts.slice(2).join('|'); // puede contener '|' en el texto
    if (!isTextSelector(targetText)) continue;

    // Elegir el selector más exitoso que sea estructural
    const best = entries
      .filter(e => e.successCount >= MIN_SUCCESS && isStructural(e.selector))
      .sort((a, b) => b.successCount - a.successCount)[0];

    if (best && !map.has(targetText)) {
      map.set(targetText, best.selector);
    }
  }

  return map;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function main(): void {
  console.log('\n' + '═'.repeat(60));
  console.log('  🔧 HEAL SPECS — Aplicando selectores curados a specs UI');
  console.log('═'.repeat(60));

  const replacements = buildReplacementMap();

  if (replacements.size === 0) {
    console.log('\n  ℹ️  No hay selectores curados para aplicar todavía.');
    console.log('  Los healings se acumulan en healer-db.json y learning-db.json');
    console.log('  tras las ejecuciones de prueba.\n');
    console.log('═'.repeat(60) + '\n');
    return;
  }

  console.log(`\n  📚 ${replacements.size} reemplazo(s) disponible(s):\n`);
  for (const [orig, healed] of replacements) {
    console.log(`     "${orig}" → "${healed}"`);
  }

  const specFiles = findSpecFiles();
  if (specFiles.length === 0) {
    console.log('\n  ℹ️  No se encontraron specs UI. Ejecuta npm run generate primero.\n');
    console.log('═'.repeat(60) + '\n');
    return;
  }

  console.log(`\n  📂 Procesando ${specFiles.length} spec(s) UI...\n`);

  let totalPatched = 0;
  let filesPatched = 0;

  for (const specFile of specFiles) {
    const count = patchSpecFile(specFile, replacements);
    if (count > 0) { totalPatched += count; filesPatched++; }
  }

  console.log('\n' + '─'.repeat(60));
  if (totalPatched > 0) {
    console.log(`  ✅ ${totalPatched} selector(es) curado(s) en ${filesPatched} spec(s)`);
    console.log('  Los specs actualizados usarán selectores estables en el próximo run.');
  } else {
    console.log('  ℹ️  Ningún selector de texto fue reemplazado (todos ya son estables).');
  }
  console.log('═'.repeat(60) + '\n');
}

main();
