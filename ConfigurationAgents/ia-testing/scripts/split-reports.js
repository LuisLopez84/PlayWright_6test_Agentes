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

// ─── Escapar un nombre de suite para uso seguro dentro de un regex de --grep ──
function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ─── Fusiona uno o más archivos JUnit XML en un único XML combinado ──────────
// (misma lógica que usaba mergeJUnitXMLs, extraída para reutilizarla también
// por-suite cuando hay más de una fuente — ej. proyectos normales + bdd-ui).
function mergeXmlFiles(xmlFiles) {
  let allTestSuites = '';
  const totals = { tests: 0, failures: 0, skipped: 0, errors: 0, time: 0 };

  for (const xmlFile of xmlFiles) {
    const content = fs.readFileSync(xmlFile, 'utf-8');
    const blocks = content.match(/<testsuite[\s\S]*?<\/testsuite>/g) || [];
    allTestSuites += blocks.join('\n') + '\n';

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

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<testsuites id="" name="" tests="${totals.tests}" failures="${totals.failures}" ` +
    `skipped="${totals.skipped}" errors="${totals.errors}" time="${totals.time.toFixed(6)}">\n` +
    allTestSuites +
    `</testsuites>\n`;

  return { xml, totals };
}

// ─── Registrar resultado de una suite tras su ejecución ──────────────────────
// Risk 9: bddXmlPath es opcional — cuando existe (el proyecto bdd-ui SÍ corrió
// para esta suite, ver runBddForSuite()), se fusiona con MAIN_XML en vez de
// simplemente copiar MAIN_XML, para no perder ninguna de las dos fuentes.
function processSuiteResult(suite, bddXmlPath) {
  const suiteXmlBackup = path.join(RESULTS_DIR, `${suite}.results.xml`);
  const defaultReport  = path.join(ROOT, 'playwright-report');
  const targetReport   = path.join(REPORTS_DIR, suite);

  allExecutedSuites.push(suite); // Risk 8: registrar independientemente del XML

  const sources = [MAIN_XML, bddXmlPath].filter(f => f && fs.existsSync(f));
  if (sources.length > 0) {
    const { xml } = mergeXmlFiles(sources);
    fs.writeFileSync(suiteXmlBackup, xml, 'utf-8');
    console.log(`   💾 XML guardado: ${suiteXmlBackup}${sources.length > 1 ? ' (incluye bdd-ui)' : ''}`);
    executedSuites.push(suite);
  } else {
    console.warn(`   ⚠️  No se encontró results.xml tras ejecutar "${suite}"`);
  }

  moveReport(defaultReport, targetReport);
}

// ─── Corre el proyecto bdd-ui acotado a UNA suite (ver Risk 10 más abajo) ────
// El proyecto bdd-ui compila sus specs en .features-gen/, fuera de
// GenerateTest/tests/<suite> — el filtro de ruta usado para las demás
// pruebas nunca lo alcanza, así que se corre aparte con --grep sobre el
// nombre exacto de la suite (coincide con "Flujo <suite>", el título de
// Scenario que genera generator-agent.ts) combinado con el tag @UI que ya
// exige el proyecto. Devuelve la ruta del XML generado, o null si no hubo
// features/no corrió nada (ej. sin OPENAI_API_KEY el feature no cambia,
// pero igual puede no encontrar features tageados @UI).
function runBddForSuite(suite, suiteResultDir) {
  const bddXmlPath = path.join(RESULTS_DIR, `${suite}.bdd.results.xml`);
  const grepPattern = `(?=.*@UI)(?=.*${escapeRegExp(suite)})`;
  // --output PROPIO (<suite>/_bdd): Playwright vacía su carpeta de salida al arrancar; con la misma
  // carpeta que la corrida principal borraría los videos/trazas/capturas de UI, API, performance,
  // security, accessibility y visual recién generados (el portal los mostraba rotos).
  const bddOutDir = path.join(suiteResultDir, '_bdd');
  const cmd = `npx playwright test --project=bdd-ui --grep "${grepPattern}" --output="${bddOutDir}"`;

  console.log(`   Comando BDD: ${cmd}`);
  try {
    execSync(cmd, {
      stdio: 'inherit',
      cwd: ROOT,
      timeout: SUITE_TIMEOUT_MS,
      // Playwright solo reconoce PLAYWRIGHT_<REPORTER>_OUTPUT_FILE (ver
      // resolveOutputFile() en node_modules/playwright/lib/reporters/base.js) —
      // *_OUTPUT_NAME no existe y se ignora en silencio, con lo cual el reporter
      // cae al outputFile fijo de playwright.config.ts (test-results/results.xml)
      // y esta corrida de bdd-ui sobrescribe el XML real de la suite.
      // SMART_REPORT_DISABLE: bdd-ui es informativo y de 1 test — no debe sobreescribir el
      // smart-report de la suite (ver playwright.config.ts) ni ensuciar su historial de runs.
      env: { ...process.env, PLAYWRIGHT_JUNIT_OUTPUT_FILE: bddXmlPath, SMART_REPORT_DISABLE: '1' },
    });
  } catch {
    // Exit ≠ 0 (escenario BDD fallido) no debe abortar el script — igual que el resto.
  }

  return fs.existsSync(bddXmlPath) ? bddXmlPath : null;
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
      execSync(cmd, {
        stdio: 'inherit',
        cwd: ROOT,
        timeout: SUITE_TIMEOUT_MS, // Risk 4: timeout
        // playwright-smart-reporter: un reporte + historial por suite (ver playwright.config.ts)
        env: { ...process.env, SMART_REPORT_DIR: path.join('smart-report', suite) },
      });
    } catch {
      // Exit ≠ 0 (test failures) no deben abortar el script
    }

    // Risk 10: bdd-ui no lo cubre el comando de arriba (ver runBddForSuite) — se
    // corre aparte y se fusiona en processSuiteResult().
    const bddXmlPath = runBddForSuite(suite, suiteResultDir);

    processSuiteResult(suite, bddXmlPath);
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
      PLAYWRIGHT_JUNIT_OUTPUT_FILE: suiteXmlPath,
      PLAYWRIGHT_HTML_REPORT: targetReport,
      SMART_REPORT_DIR: path.join('smart-report', suite),
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

  const { xml, totals } = mergeXmlFiles(xmlFiles);
  fs.writeFileSync(MAIN_XML, xml, 'utf-8');
  console.log(`\n✅ XML mergeado → ${MAIN_XML}`);
  console.log(`   📊 Total: ${totals.tests} pruebas | ${totals.failures} fallos | ${xmlFiles.length} suite(s)`);
}
