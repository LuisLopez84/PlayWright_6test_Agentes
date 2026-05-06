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

function run(label: string, cmd: string, opts: { allowFail?: boolean } = {}): boolean {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`▶  ${label}`);
  console.log(`   ${cmd}`);
  console.log('─'.repeat(60));
  try {
    execSync(cmd, { stdio: 'inherit', cwd: ROOT });
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
    { allowFail: true },   // los fallos de tests no deben abortar el reporte
  );

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
