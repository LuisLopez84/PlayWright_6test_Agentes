import { test, expect } from '@playwright/test';
import { smartGoto } from '../../../../ConfigurationTest/tests/utils/navigation-helper';

/**
 * Visual regression test for Homebanking_PlazosFijos
 * Compara capturas de pantalla con baseline. En la primera ejecución,
 * usa --update-snapshots para generar los baselines:
 *   npx playwright test --update-snapshots --project=visual
 */
test.describe('Visual regression for Homebanking_PlazosFijos', () => {

  test('screenshot comparison', async ({ page }) => {
    await smartGoto(page, 'Homebanking_PlazosFijos');

    // Esperar a que la página esté completamente estable
    await page.waitForLoadState('domcontentloaded');
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(800); // Animaciones y fuentes

    // Ocultar elementos dinámicos que rompen comparación (cursores, timestamps, etc.)
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-duration: 0s !important;
          transition-duration: 0s !important;
        }
        [data-testid*="timestamp"], [class*="timer"], [class*="clock"] {
          visibility: hidden !important;
        }
      `
    }).catch(() => {});

    await expect(page).toHaveScreenshot('Homebanking_PlazosFijos.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.05, // Tolerar 5% de diferencia pixel
      animations: 'disabled',
    });
  });

});
