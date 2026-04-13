/**
 * nf.playwright.config.ts
 *
 * Configuración de Playwright EXCLUSIVA para pruebas no funcionales.
 * Separada del playwright.config.ts principal para no interferir con
 * las suites de UI/API/Performance ya existentes.
 *
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  Cómo ejecutar:                                                  ║
 * ║    npx playwright test --config GenerateTest/non-functional/nf.playwright.config.ts
 * ║                                                                  ║
 * ║  O con el alias npm (añadir al package.json si se desea):       ║
 * ║    npm run test:nf                                               ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import { defineConfig } from '@playwright/test';

export default defineConfig({
  // ─── Archivos de test ──────────────────────────────────────────────────────
  testDir: './',
  testMatch: ['**/nf-performance.spec.ts'],

  // ─── Timeout ───────────────────────────────────────────────────────────────
  // 0 = sin límite (las pruebas de carga pueden tardar varios minutos)
  timeout: 0,
  globalTimeout: 0,

  // ─── Ejecución ─────────────────────────────────────────────────────────────
  // 1 worker: las pruebas de carga se ejecutan serialmente, no en paralelo
  workers: 1,
  retries: 0,
  fullyParallel: false,

  // ─── Reporte ───────────────────────────────────────────────────────────────
  reporter: [
    ['list'],
  ],

  // ─── Proyecto ──────────────────────────────────────────────────────────────
  projects: [
    {
      name: 'non-functional',
      testMatch: ['**/nf-performance.spec.ts'],
    },
  ],
});
