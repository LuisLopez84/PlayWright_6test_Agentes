import { test, expect } from '@playwright/test';

/**
 * Visual regression — Heroku_CrearUsuario
 * Primera ejecución: npx playwright test --update-snapshots --project=visual
 *
 * Configuración via variables de entorno:
 *   BASE_URL          — sobreescribe la URL sin regenerar
 *   VISUAL_DIFF_RATIO — tolerancia de píxeles (default 0.05 = 5%)
 *   VISUAL_WAIT_MS    — espera post-networkidle en ms (default 500)
 */

// Risk 1: URL embebida y sobreescribible sin regenerar
const TARGET_URL = process.env.BASE_URL || 'https://thinking-tester-contact-list.herokuapp.com';

// Risk 2: tolerancia configurable (por OS el anti-aliasing varía)
const VISUAL_DIFF_RATIO = Number(process.env.VISUAL_DIFF_RATIO || 0.05);

// Risk 5: espera post-carga configurable
const VISUAL_WAIT_MS = Number(process.env.VISUAL_WAIT_MS || 500);

// Risk 3: CSS de estabilización — oculta todos los elementos dinámicos conocidos
const STABILITY_CSS = `
  *, *::before, *::after {
    animation-duration: 0s !important;
    transition-duration: 0s !important;
    animation-delay: 0s !important;
  }
  /* timestamps, relojes, contadores */
  [data-testid*="timestamp"], [data-testid*="time"], [data-testid*="date"],
  [class*="timer"], [class*="clock"], [class*="countdown"], [class*="counter"],
  /* avisos de estado transitorio */
  [class*="toast"], [class*="notification"], [class*="snackbar"],
  [role="status"], [role="timer"], [aria-live],
  /* indicadores de carga */
  [class*="spinner"], [class*="loading"], [class*="skeleton"],
  [class*="loader"], [role="progressbar"], [class*="progress"],
  /* contenido dinámico de usuario */
  [class*="avatar"], [class*="badge"], [class*="initials"],
  /* banners y carruseles */
  [class*="carousel"], [class*="banner-rotate"], [class*="slider"],
  /* gráficos con animaciones */
  [class*="chart"], [class*="graph"], [class*="sparkline"],
  /* cookie / chat / widget de terceros */
  [id*="cookie"], [class*="cookie"], [id*="chat"], [class*="chat"],
  iframe {
    visibility: hidden !important;
  }
`;

// Risk 7: esperar estabilidad post-networkidle en frameworks SPA (React/Vue re-renders)
async function waitForVisualStability(page: any): Promise<void> {
  await page.waitForLoadState('domcontentloaded');
  try { await page.waitForLoadState('networkidle', { timeout: 10000 }); } catch {}

  // Esperar a que las fuentes web terminen de cargar
  await page.evaluate(() => document.fonts.ready).catch(() => {});

  // Esperar a que desaparezcan spinners y skeletons (re-renders SPA)
  await page.waitForFunction(() =>
    !document.querySelector(
      '.loading, .spinner, .skeleton, [aria-busy="true"], [data-loading="true"]'
    )
  , { timeout: 5000 }).catch(() => {});

  // Risk 5: pausa configurable para fuentes pesadas o lazy loading
  if (VISUAL_WAIT_MS > 0) await page.waitForTimeout(VISUAL_WAIT_MS);
}

test.describe('Visual regression: Heroku_CrearUsuario', () => {

  // ── Test 1: Desktop (1280×720) ────────────────────────────────────────────
  test('screenshot — desktop 1280×720', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(TARGET_URL);
    await waitForVisualStability(page);

    // Risk 4: advertir si la CSP bloquea la inyección en lugar de silenciar
    await page.addStyleTag({ content: STABILITY_CSS }).catch(err =>
      console.warn('⚠️ No se pudo inyectar CSS de estabilización (posible CSP):', err.message)
    );

    await expect(page).toHaveScreenshot('Heroku_CrearUsuario-desktop.png', {
      fullPage:           true,
      maxDiffPixelRatio:  VISUAL_DIFF_RATIO,
      animations:         'disabled',
    });
  });

  // ── Test 2: Móvil (375×812) — Risk 6: cobertura de viewport adicional ────
  test('screenshot — mobile 375×812', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(TARGET_URL);
    await waitForVisualStability(page);

    await page.addStyleTag({ content: STABILITY_CSS }).catch(err =>
      console.warn('⚠️ No se pudo inyectar CSS de estabilización (móvil, posible CSP):', err.message)
    );

    await expect(page).toHaveScreenshot('Heroku_CrearUsuario-mobile.png', {
      fullPage:           true,
      maxDiffPixelRatio:  VISUAL_DIFF_RATIO,
      animations:         'disabled',
    });
  });

});
