/**
 * nf-performance.spec.ts
 *
 * Spec principal de pruebas NO FUNCIONALES (carga y rendimiento).
 *
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  Cómo ejecutar:                                                      ║
 * ║    npx playwright test GenerateTest/non-functional/nf-performance.spec.ts
 * ║                                                                      ║
 * ║  Antes de ejecutar, edita:                                           ║
 * ║    GenerateTest/non-functional/config/nf-config.ts                  ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * NOTAS TÉCNICAS:
 *  - Usa Node.js https/http (sin browser) para máxima eficiencia bajo carga.
 *  - Promise.all garantiza N workers concurrentes (red I/O-bound → verdadera concurrencia).
 *  - No modifica playwright.config.ts — funciona con la configuración existente.
 *  - test.setTimeout(0) deshabilita el límite de tiempo (las pruebas de carga pueden durar minutos).
 */

import { test } from '@playwright/test';
import { NFConfig } from './config/nf-config';
import { resolveTargets } from './utils/target-resolver';
import { runIncrementalTest, runSpikeTest } from './core/load-engine';
import { printSummaryTable } from './reporters/summary-reporter';

// ─── Configuración del test ───────────────────────────────────────────────────

// Forzar ejecución serial: los tests de carga no deben correr en paralelo entre sí
test.describe.configure({ mode: 'serial' });

// ─── Test principal ───────────────────────────────────────────────────────────

test('Prueba No Funcional — Carga y Rendimiento', async () => {
  // Deshabilitar timeout: las pruebas de carga pueden durar varios minutos
  test.setTimeout(0);

  // ── Resolver targets ──────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(60));
  console.log('  🚀 INICIANDO PRUEBA NO FUNCIONAL');
  console.log('═'.repeat(60));

  const targets = resolveTargets(NFConfig);

  if (targets.length === 0) {
    console.log(`
  ⚠️  No hay targets configurados.

  Para ejecutar pruebas no funcionales, edita el archivo:
    GenerateTest/non-functional/config/nf-config.ts

  Opciones disponibles:
    recordings: ['Homebankink_PagoServicios', 'Homebankink_PlazosFijos', ...]
    apis: [{ name: 'Mi API', method: 'GET', url: 'https://...' }]

  Recordings disponibles en BoxRecordings/recordings/*.ts
`);
    return;
  }

  console.log(`\n  📋 Tipo de prueba: ${NFConfig.testType.toUpperCase()}`);
  console.log(`  🎯 Targets configurados: ${targets.length}`);
  for (const t of targets) {
    console.log(`     • [${t.type.toUpperCase()}] ${t.name} → ${t.url}`);
  }

  // ── Ejecutar prueba para cada target ─────────────────────────────────────
  const allResults: Array<{ target: typeof targets[0]; summaries: ReturnType<typeof resolveTargets>[0] }> = [];

  for (const target of targets) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`  📡 Target: ${target.name}`);
    console.log(`  🌐 URL: ${target.url}`);
    console.log(`  🔧 Método: ${target.method}`);
    if (NFConfig.assertions.expectedStatusCodes.length > 0) {
      console.log(`  ✅ Códigos esperados: [${NFConfig.assertions.expectedStatusCodes.join(', ')}]`);
    }
    if (NFConfig.assertions.expectedResponseText) {
      console.log(`  🔍 Texto esperado: "${NFConfig.assertions.expectedResponseText}"`);
    }

    let summaries;

    if (NFConfig.testType === 'incremental') {
      summaries = await runIncrementalTest(target, NFConfig.incremental, NFConfig.assertions);
    } else {
      summaries = await runSpikeTest(target, NFConfig.spike, NFConfig.assertions);
    }

    // Imprimir reporte inmediatamente después de cada target
    printSummaryTable(target, summaries, NFConfig.testType);
  }

  console.log('\n  ✅ Prueba no funcional completada.\n');
});
