'use strict';
const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT          = process.cwd();
const TESTS_DIR     = path.join(ROOT, 'GenerateTest', 'tests');
const REPORTS_DIR   = path.join(ROOT, 'reports');
const RESULTS_DIR   = path.join(ROOT, 'test-results');
const MAIN_XML      = path.join(RESULTS_DIR, 'results.xml');

if (!fs.existsSync(REPORTS_DIR))  fs.mkdirSync(REPORTS_DIR,  { recursive: true });
if (!fs.existsSync(RESULTS_DIR)) fs.mkdirSync(RESULTS_DIR, { recursive: true });

// ─── Listar suites ────────────────────────────────────────────────────────────
const suites = fs.readdirSync(TESTS_DIR).filter(item =>
  fs.statSync(path.join(TESTS_DIR, item)).isDirectory()
);
console.log(`🔍 Se encontraron ${suites.length} suite(s): ${suites.join(', ')}`);

// ─── Ejecutar cada suite ──────────────────────────────────────────────────────
const executedSuites = [];

for (const suite of suites) {
  const suiteRelPath  = path.join('GenerateTest', 'tests', suite).replace(/\\/g, '/');
  const suiteResultDir = path.join(RESULTS_DIR, suite);
  const suiteXmlBackup = path.join(RESULTS_DIR, `${suite}.results.xml`);
  const defaultReport  = path.join(ROOT, 'playwright-report');
  const targetReport   = path.join(REPORTS_DIR, suite);

  const cmd = `npx playwright test "${suiteRelPath}" --output="${suiteResultDir}"`;

  console.log(`\n📦 Ejecutando suite: ${suite}`);
  console.log(`   Comando: ${cmd}`);

  if (!fs.existsSync(suiteResultDir)) fs.mkdirSync(suiteResultDir, { recursive: true });

  try {
    execSync(cmd, { stdio: 'inherit', cwd: ROOT });
  } catch {
    // Los errores de tests (exit ≠ 0) no deben abortar el proceso
  }

  // ── Guardar copia del XML de ESTA suite antes de que el siguiente run lo sobreescriba
  if (fs.existsSync(MAIN_XML)) {
    fs.copyFileSync(MAIN_XML, suiteXmlBackup);
    console.log(`   💾 XML guardado: ${suiteXmlBackup}`);
    executedSuites.push(suite);
  } else {
    console.warn(`   ⚠️  No se encontró results.xml después de ejecutar ${suite}`);
  }

  // ── Mover playwright-report al directorio por suite
  if (fs.existsSync(defaultReport)) {
    if (fs.existsSync(targetReport)) fs.rmSync(targetReport, { recursive: true, force: true });
    fs.renameSync(defaultReport, targetReport);
    console.log(`   ✅ Reporte HTML movido a: ${targetReport}`);
  }
}

// ─── Mergear todos los XMLs en results.xml ────────────────────────────────────
mergeJUnitXMLs(executedSuites);

console.log('\n✅ Proceso completado. Reportes HTML en "reports/", XML mergeado en "test-results/results.xml"');

// ═════════════════════════════════════════════════════════════════════════════
//  MERGE: combina <suite>.results.xml → test-results/results.xml
// ═════════════════════════════════════════════════════════════════════════════
function mergeJUnitXMLs(suiteNames) {
  const xmlFiles = suiteNames
    .map(s => path.join(RESULTS_DIR, `${s}.results.xml`))
    .filter(f => fs.existsSync(f));

  if (!xmlFiles.length) {
    console.warn('\n⚠️  No hay XMLs por suite para mergear — results.xml no se actualiza');
    return;
  }

  let allTestSuites = '';
  const totals = { tests: 0, failures: 0, skipped: 0, errors: 0, time: 0 };

  for (const xmlFile of xmlFiles) {
    const content = fs.readFileSync(xmlFile, 'utf-8');

    // Extraer bloques <testsuite>...</testsuite>
    const blocks = content.match(/<testsuite[\s\S]*?<\/testsuite>/g) || [];
    allTestSuites += blocks.join('\n') + '\n';

    // Sumar totales del elemento <testsuites> raíz
    const rootM = content.match(/<testsuites[^>]*tests="(\d+)"[^>]*failures="(\d+)"[^>]*skipped="(\d+)"[^>]*errors="(\d+)"[^>]*time="([^"]+)"/);
    if (rootM) {
      totals.tests    += parseInt(rootM[1],  10);
      totals.failures += parseInt(rootM[2],  10);
      totals.skipped  += parseInt(rootM[3],  10);
      totals.errors   += parseInt(rootM[4],  10);
      totals.time     += parseFloat(rootM[5]);
    } else {
      // Fallback: sumar desde los propios <testsuite>
      const suiteRe = /<testsuite\s([^>]+)>/g;
      let sm;
      while ((sm = suiteRe.exec(content)) !== null) {
        const a = sm[1];
        const g = k => parseInt((a.match(new RegExp(`${k}="(\\d+)"`)) || [0,'0'])[1], 10);
        const gf = k => parseFloat((a.match(new RegExp(`${k}="([^"]+)"`)) || [0,'0'])[1]);
        totals.tests    += g('tests');
        totals.failures += g('failures');
        totals.skipped  += g('skipped');
        totals.errors   += g('errors');
        totals.time     += gf('time');
      }
    }
  }

  const merged = `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<testsuites id="" name="" tests="${totals.tests}" failures="${totals.failures}" ` +
    `skipped="${totals.skipped}" errors="${totals.errors}" time="${totals.time.toFixed(6)}">\n` +
    allTestSuites +
    `</testsuites>\n`;

  fs.writeFileSync(MAIN_XML, merged, 'utf-8');
  console.log(`\n✅ XML mergeado → ${MAIN_XML}`);
  console.log(`   📊 Total: ${totals.tests} pruebas | ${totals.failures} fallos | ${xmlFiles.length} suite(s) mergeada(s)`);
}
