/**
 * test-suite.ts
 *
 * Ejecuta el pipeline completo de pruebas para UNA SOLA suite:
 *   generate → bdd → playwright test → report
 *
 * Uso:
 *   npm run test:suite -- --suite=herokuapp_CrearUsuario
 *   $env:SUITE='herokuapp_CrearUsuario'; npm run test:suite   (PowerShell)
 *
 * Variables de entorno opcionales heredadas de npm run test:
 *   PLAYWRIGHT_PROJECTS="ui-chromium,api"  → limitar proyectos de Playwright
 *   FILL_WAIT_MS=500                        → espera entre fills
 *   SUITE_TIMEOUT_MS=300000                 → timeout por suite
 */

import { execSync } from 'child_process';
import fs   from 'fs';
import path from 'path';

// ─── Leer suite ───────────────────────────────────────────────────────────────

const suiteArg   = process.argv.find(a => a.startsWith('--suite='));
const suiteName  = suiteArg
  ? suiteArg.replace('--suite=', '').trim()
  : (process.env.SUITE ?? '').trim();

if (!suiteName) {
  console.error('\n❌ Debes especificar la suite:');
  console.error('   npm run test:suite -- --suite=<nombre_del_recording>\n');
  process.exit(1);
}

const ROOT         = process.cwd();
const SUITE_DIR    = path.join(ROOT, 'GenerateTest', 'tests', suiteName);
const REPORTS_DIR  = path.join(ROOT, 'reports');
const RESULTS_DIR  = path.join(ROOT, 'test-results', suiteName);

// ─── Helper ───────────────────────────────────────────────────────────────────

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Fusiona dos archivos JUnit XML (bloques <testsuite> + totales) en uno solo.
 * Usado porque el proyecto bdd-ui se corre en un comando aparte (ver más abajo)
 * y su reporter JUnit, si no se fusiona, sobreescribiría el de los demás
 * proyectos (o viceversa) en vez de sumarse.
 */
function mergeJUnitFiles(mainXmlPath: string, extraXmlPath: string | null): void {
  if (!extraXmlPath || !fs.existsSync(extraXmlPath)) return;
  if (!fs.existsSync(mainXmlPath)) {
    fs.copyFileSync(extraXmlPath, mainXmlPath);
    return;
  }

  const totals = { tests: 0, failures: 0, skipped: 0, errors: 0, time: 0 };
  let allTestSuites = '';

  for (const xmlFile of [mainXmlPath, extraXmlPath]) {
    const content = fs.readFileSync(xmlFile, 'utf-8');
    const blocks = content.match(/<testsuite[\s\S]*?<\/testsuite>/g) || [];
    allTestSuites += blocks.join('\n') + '\n';

    const rootTagM = content.match(/<testsuites([^>]*)>/);
    const attrs = rootTagM ? rootTagM[1] : '';
    const gi = (k: string) => parseInt((attrs.match(new RegExp(`\\b${k}="(\\d+)"`)) || [0, '0'])[1] as string, 10);
    const gf = (k: string) => parseFloat((attrs.match(new RegExp(`\\b${k}="([^"]+)"`)) || [0, '0'])[1] as string);
    totals.tests    += gi('tests');
    totals.failures += gi('failures');
    totals.skipped  += gi('skipped');
    totals.errors   += gi('errors');
    totals.time     += gf('time');
  }

  const merged =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<testsuites id="" name="" tests="${totals.tests}" failures="${totals.failures}" ` +
    `skipped="${totals.skipped}" errors="${totals.errors}" time="${totals.time.toFixed(6)}">\n` +
    allTestSuites +
    `</testsuites>\n`;

  fs.writeFileSync(mainXmlPath, merged, 'utf-8');
}

function run(label: string, cmd: string, opts: { allowFail?: boolean; env?: NodeJS.ProcessEnv } = {}): boolean {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`▶  ${label}`);
  console.log(`   ${cmd}`);
  console.log('─'.repeat(60));
  try {
    execSync(cmd, { stdio: 'inherit', cwd: ROOT, env: opts.env ? { ...process.env, ...opts.env } : process.env });
    return true;
  } catch (err: any) {
    if (opts.allowFail) {
      console.warn(`⚠️  "${label}" terminó con errores (continúa pipeline)`);
      return false;
    }
    throw err;
  }
}

// ─── Pipeline ─────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n' + '═'.repeat(60));
  console.log(`  🚀 Pipeline de tests para suite: "${suiteName}"`);
  console.log('═'.repeat(60));

  // ── Paso 1: Generar tests solo para esta suite ──────────────────────────────
  run(
    'GENERAR tests (solo esta suite)',
    `ts-node -r tsconfig-paths/register ConfigurationAgents/ia-testing/scripts/run-agents.ts --suite=${suiteName}`,
  );

  // ── Validar que el directorio de la suite se creó ──────────────────────────
  if (!fs.existsSync(SUITE_DIR)) {
    console.error(`\n❌ No se generó el directorio de la suite: ${SUITE_DIR}`);
    console.error(`   Verifica que existe la grabación: BoxRecordings/recordings/${suiteName}.ts`);
    process.exit(1);
  }

  // ── Paso 2: Compilar features BDD → specs ──────────────────────────────────
  run(
    'BDD: compilar features → specs',
    'npx playwright-bdd test',
    { allowFail: true },
  );

  // ── Paso 3: Ejecutar tests de Playwright para esta suite ────────────────────
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  fs.mkdirSync(REPORTS_DIR, { recursive: true });

  const suiteRelPath = path.join('GenerateTest', 'tests', suiteName).replace(/\\/g, '/');
  const projectFlags = process.env.PLAYWRIGHT_PROJECTS
    ? process.env.PLAYWRIGHT_PROJECTS.split(',').map(p => `--project="${p.trim()}"`).join(' ')
    : '';
  const timeoutFlag = process.env.SUITE_TIMEOUT_MS ? '' : '';

  run(
    `EJECUTAR tests de Playwright — ${suiteName}`,
    `npx playwright test "${suiteRelPath}" --output="${RESULTS_DIR}" ${projectFlags}`.trim(),
    // los fallos de tests no deben abortar el reporte
    // SMART_REPORT_DIR: un smart-report + historial por suite (ver playwright.config.ts)
    { allowFail: true, env: { SMART_REPORT_DIR: path.join('smart-report', suiteName) } },
  );

  // ── Paso 3b: Ejecutar bdd-ui acotado a esta suite ───────────────────────────
  // El proyecto bdd-ui compila sus specs en .features-gen/, fuera de
  // GenerateTest/tests/<suite> — el filtro de ruta del paso 3 nunca lo alcanza,
  // así que se corre aparte con --grep sobre "@UI" + el nombre exacto de la
  // suite (coincide con "Flujo <suite>", el título de Scenario que genera
  // generator-agent.ts). Su JUnit se fusiona con el del paso 3 en vez de
  // sobreescribirlo.
  const mainXmlPath = path.join(RESULTS_DIR, 'results.xml');
  const bddXmlPath  = path.join(RESULTS_DIR, `${suiteName}.bdd.results.xml`);
  const grepPattern = `(?=.*@UI)(?=.*${escapeRegExp(suiteName)})`;
  run(
    `EJECUTAR bdd-ui (acotado a la suite) — ${suiteName}`,
    // --output PROPIO (<suite>/_bdd): Playwright vacía su carpeta de salida al arrancar; con la misma
    // carpeta que el paso 3 borraría los videos/trazas/capturas de todos los demás tipos de prueba.
    `npx playwright test --project=bdd-ui --grep "${grepPattern}" --output="${path.join(RESULTS_DIR, '_bdd')}"`,
    // Playwright solo reconoce PLAYWRIGHT_<REPORTER>_OUTPUT_FILE (ver
    // resolveOutputFile() en node_modules/playwright/lib/reporters/base.js) —
    // *_OUTPUT_NAME se ignora en silencio y el reporter cae al outputFile fijo
    // de playwright.config.ts, sobrescribiendo el results.xml real de la suite.
    // SMART_REPORT_DISABLE: bdd-ui es informativo y de 1 test — no debe sobreescribir el
    // smart-report de la suite del paso 3 ni ensuciar su historial (ver playwright.config.ts).
    { allowFail: true, env: { PLAYWRIGHT_JUNIT_OUTPUT_FILE: bddXmlPath, SMART_REPORT_DISABLE: '1' } },
  );
  mergeJUnitFiles(mainXmlPath, fs.existsSync(bddXmlPath) ? bddXmlPath : null);

  // ── Paso 4: Mover reporte HTML a reports/<suite> ────────────────────────────
  const defaultReport = path.join(ROOT, 'playwright-report');
  const targetReport  = path.join(REPORTS_DIR, suiteName);

  if (fs.existsSync(defaultReport)) {
    if (fs.existsSync(targetReport)) {
      const bak = `${targetReport}_prev`;
      if (fs.existsSync(bak)) fs.rmSync(bak, { recursive: true, force: true });
      try { fs.renameSync(targetReport, bak); } catch { /* ignorar */ }
    }
    try {
      fs.renameSync(defaultReport, targetReport);
    } catch (e: any) {
      if (e.code === 'EXDEV') {
        fs.cpSync(defaultReport, targetReport, { recursive: true });
        fs.rmSync(defaultReport, { recursive: true, force: true });
      }
    }
    console.log(`\n📁 Reporte HTML guardado en: ${targetReport}`);
  }

  // ── Paso 5: Regenerar portal de reportes ────────────────────────────────────
  run(
    'Actualizar portal de reportes',
    'node ConfigurationAgents/ia-testing/scripts/generate-portal.js',
    { allowFail: true },
  );

  // ── Paso 6: Aplicar selectores curados al spec ───────────────────────────────
  // Escribe de vuelta los selectores que el healing resolvió durante la ejecución,
  // para que el próximo run use el selector estable directamente (sin re-sanar).
  run(
    'Curar selectores en spec (heal-specs)',
    'ts-node ConfigurationAgents/ia-testing/scripts/heal-specs.ts',
    { allowFail: true },
  );

  console.log('\n' + '═'.repeat(60));
  console.log(`  ✅ Suite "${suiteName}" completada.`);
  console.log(`\n  📊 Ver reporte:`);
  console.log(`     npx playwright show-report reports/${suiteName}`);
  console.log('═'.repeat(60) + '\n');
}

main().catch(err => {
  console.error('\n🔥 ERROR en test:suite:', err?.message ?? err);
  process.exit(1);
});
