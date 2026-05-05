'use strict';
const fs             = require('fs');
const path           = require('path');
const { execSync, spawn } = require('child_process');

const ROOT          = process.cwd();
const TESTS_DIR     = path.join(ROOT, 'GenerateTest', 'tests');
const REPORTS_DIR   = path.join(ROOT, 'reports');
const RESULTS_DIR   = path.join(ROOT, 'test-results');
const MAIN_XML      = path.join(RESULTS_DIR, 'results.xml');

// Risk 4: timeout configurable por suite — default sin límite
const SUITE_TIMEOUT_MS = parseInt(process.env.SUITE_TIMEOUT_MS || '0', 10) || undefined;

// Risk 1: modo paralelo opt-in via PARALLEL_SUITES=true
const PARALLEL_SUITES = process.env.PARALLEL_SUITES === 'true';

if (!fs.existsSync(REPORTS_DIR))  fs.mkdirSync(REPORTS_DIR,  { recursive: true });
if (!fs.existsSync(RESULTS_DIR))  fs.mkdirSync(RESULTS_DIR,  { recursive: true });

// ─── Listar suites ────────────────────────────────────────────────────────────
const suites = fs.readdirSync(TESTS_DIR).filter(item =>
  fs.statSync(path.join(TESTS_DIR, item)).isDirectory()
);
console.log(`🔍 Se encontraron ${suites.length} suite(s): ${suites.join(', ')}`);

const executedSuites    = [];  // suites con XML generado → entran al merge
const allExecutedSuites = [];  // Risk 8: todas las suites que se ejecutaron

// ─── Filtro de proyectos (Risk 5) ─────────────────────────────────────────────
// Por defecto ejecuta todos los proyectos de playwright.config.ts.
// Para limitar: PLAYWRIGHT_PROJECTS="ui-chromium,api" npm run test
function buildProjectFlags() {
  if (!process.env.PLAYWRIGHT_PROJECTS) return '';
  return process.env.PLAYWRIGHT_PROJECTS
    .split(',')
    .map(p => `--project="${p.trim()}"`)
    .join(' ');
}

// ─── Mover reporte HTML por suite (Risk 2 + Risk 7) ──────────────────────────
function moveReport(defaultReport, targetReport) {
  if (!fs.existsSync(defaultReport)) return;

  // Risk 2: conservar reporte anterior en lugar de eliminarlo permanentemente
  if (fs.existsSync(targetReport)) {
    const bak = `${targetReport}_prev`;
    try {
      if (fs.existsSync(bak)) fs.rmSync(bak, { recursive: true, force: true });
      fs.renameSync(targetReport, bak);
    } catch { /* si falla el backup, sobrescribir igualmente */ }
  }

  // Risk 7: fallback copy+delete si renameSync falla entre particiones (EXDEV)
  try {
    fs.renameSync(defaultReport, targetReport);
  } catch (err) {
    if (err.code === 'EXDEV') {
      console.warn('   ⚠️  EXDEV detectado — usando copy+delete como fallback...');
      fs.cpSync(defaultReport, targetReport, { recursive: true });
      fs.rmSync(defaultReport, { recursive: true, force: true });
    } else {
      console.error(`   ❌ No se pudo mover el reporte HTML: ${err.message}`);
      return;
    }
  }
  console.log(`   ✅ Reporte HTML movido a: ${targetReport}`);
}

// ─── Registrar resultado de una suite tras su ejecución ──────────────────────
function processSuiteResult(suite) {
  const suiteXmlBackup = path.join(RESULTS_DIR, `${suite}.results.xml`);
  const defaultReport  = path.join(ROOT, 'playwright-report');
  const targetReport   = path.join(REPORTS_DIR, suite);

  allExecutedSuites.push(suite); // Risk 8: registrar independientemente del XML

  if (fs.existsSync(MAIN_XML)) {
    fs.copyFileSync(MAIN_XML, suiteXmlBackup);
    console.log(`   💾 XML guardado: ${suiteXmlBackup}`);
    executedSuites.push(suite);
  } else {
    console.warn(`   ⚠️  No se encontró results.xml tras ejecutar "${suite}"`);
  }

  moveReport(defaultReport, targetReport);
}

// ─── Modo SECUENCIAL (default) ───────────────────────────────────────────────
function runSequential() {
  const projectFlags = buildProjectFlags();

  for (const suite of suites) {
    const suiteRelPath   = path.join('GenerateTest', 'tests', suite).replace(/\\/g, '/'); // Risk 6: necesario para Playwright CLI en Windows
    const suiteResultDir = path.join(RESULTS_DIR, suite);
    const cmd = `npx playwright test "${suiteRelPath}" --output="${suiteResultDir}" ${projectFlags}`.trim();

    console.log(`\n📦 Ejecutando suite: ${suite}`);
    console.log(`   Comando: ${cmd}`);

    if (!fs.existsSync(suiteResultDir)) fs.mkdirSync(suiteResultDir, { recursive: true });

    try {
      execSync(cmd, { stdio: 'inherit', cwd: ROOT, timeout: SUITE_TIMEOUT_MS }); // Risk 4: timeout
    } catch {
      // Exit ≠ 0 (test failures) no deben abortar el script
    }

    processSuiteResult(suite);
  }
}

// ─── Modo PARALELO opt-in — Risk 1: PARALLEL_SUITES=true ────────────────────
async function runParallel() {
  console.log(`⚡ Ejecutando ${suites.length} suite(s) en PARALELO (PARALLEL_SUITES=true)...`);
  const projectFlags = buildProjectFlags();

  await Promise.all(suites.map(suite => new Promise(resolve => {
    const suiteRelPath   = path.join('GenerateTest', 'tests', suite).replace(/\\/g, '/');
    const suiteResultDir = path.join(RESULTS_DIR, suite);
    const suiteXmlPath   = path.join(RESULTS_DIR, `${suite}.results.xml`);
    const targetReport   = path.join(REPORTS_DIR, suite);

    if (!fs.existsSync(suiteResultDir)) fs.mkdirSync(suiteResultDir, { recursive: true });

    // En modo paralelo: XML y reporte HTML se dirigen por-suite via env vars
    // para evitar conflicto en el archivo compartido test-results/results.xml
    const env = {
      ...process.env,
      PLAYWRIGHT_JUNIT_OUTPUT_NAME: suiteXmlPath,
      PLAYWRIGHT_HTML_REPORT: targetReport,
    };

    const cmd = `npx playwright test "${suiteRelPath}" --output="${suiteResultDir}" ${projectFlags}`.trim();
    console.log(`\n📦 Iniciando (paralelo): ${suite}`);

    const proc = spawn(cmd, { shell: true, stdio: 'inherit', cwd: ROOT, env });

    // Risk 4: timeout también en modo paralelo
    const timer = SUITE_TIMEOUT_MS
      ? setTimeout(() => { proc.kill(); console.warn(`⏱️ Timeout en suite: ${suite}`); }, SUITE_TIMEOUT_MS)
      : null;

    proc.on('close', () => {
      if (timer) clearTimeout(timer);
      allExecutedSuites.push(suite); // Risk 8
      if (fs.existsSync(suiteXmlPath)) {
        executedSuites.push(suite);
        console.log(`   ✅ Suite completada: ${suite}`);
      } else {
        console.warn(`   ⚠️ Sin XML para suite: ${suite}`);
      }
      resolve();
    });
    proc.on('error', () => { if (timer) clearTimeout(timer); resolve(); });
  })));
}

// ─── Entry point ─────────────────────────────────────────────────────────────
(async () => {
  if (PARALLEL_SUITES) {
    await runParallel();
  } else {
    runSequential();
  }

  // Risk 8: advertir suites ejecutadas sin XML (no mergeadas)
  const noXml = allExecutedSuites.filter(s => !executedSuites.includes(s));
  if (noXml.length > 0) {
    console.warn(`\n⚠️  Suites ejecutadas sin XML (omitidas del merge): ${noXml.join(', ')}`);
    console.warn('   Causas posibles: suite sin tests, fallo en reporter JUnit, o configuración incorrecta');
  }

  mergeJUnitXMLs(executedSuites);
  console.log('\n✅ Proceso completado. Reportes en "reports/", XML mergeado en "test-results/results.xml"');
})().catch(err => {
  console.error('❌ Error fatal en split-reports:', err.message);
  process.exit(1);
});

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

    const blocks = content.match(/<testsuite[\s\S]*?<\/testsuite>/g) || [];
    allTestSuites += blocks.join('\n') + '\n';

    // Risk 3 (ya corregido): extrae cada atributo por nombre (word-boundary \b)
    // independientemente del orden que emita Playwright en futuras versiones
    const rootTagM = content.match(/<testsuites([^>]*)>/);
    if (rootTagM) {
      const attrs = rootTagM[1];
      const gi = k => parseInt( (attrs.match(new RegExp(`\\b${k}="(\\d+)"`))    || [0,'0'])[1], 10);
      const gf = k => parseFloat((attrs.match(new RegExp(`\\b${k}="([^"]+)"`)) || [0,'0'])[1]);
      totals.tests    += gi('tests');
      totals.failures += gi('failures');
      totals.skipped  += gi('skipped');
      totals.errors   += gi('errors');
      totals.time     += gf('time');
    } else {
      // Fallback: acumular desde cada <testsuite>
      const suiteRe = /<testsuite\s([^>]+)>/g;
      let sm;
      while ((sm = suiteRe.exec(content)) !== null) {
        const a   = sm[1];
        const g   = k => parseInt( (a.match(new RegExp(`${k}="(\\d+)"`)  ) || [0,'0'])[1], 10);
        const gf2 = k => parseFloat((a.match(new RegExp(`${k}="([^"]+)"`)) || [0,'0'])[1]);
        totals.tests    += g('tests');
        totals.failures += g('failures');
        totals.skipped  += g('skipped');
        totals.errors   += g('errors');
        totals.time     += gf2('time');
      }
    }
  }

  const merged =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<testsuites id="" name="" tests="${totals.tests}" failures="${totals.failures}" ` +
    `skipped="${totals.skipped}" errors="${totals.errors}" time="${totals.time.toFixed(6)}">\n` +
    allTestSuites +
    `</testsuites>\n`;

  fs.writeFileSync(MAIN_XML, merged, 'utf-8');
  console.log(`\n✅ XML mergeado → ${MAIN_XML}`);
  console.log(`   📊 Total: ${totals.tests} pruebas | ${totals.failures} fallos | ${xmlFiles.length} suite(s)`);
}
