import fs from 'fs';
import path from 'path';
import { ensureDir } from '../../utils/fs-utils';

export function generateVisual(name: string, url: string) {
  const testDir = path.join('GenerateTest', 'tests', name, 'visual');
  ensureDir(testDir);
  const file = path.join(testDir, `${name}-visual.spec.ts`);

  const code = `import { test, expect } from '@playwright/test';
import { smartGoto } from '../../../../ConfigurationTest/tests/utils/navigation-helper';

/**
 * Visual regression test for ${name}
 * Compara capturas de pantalla con baseline. En la primera ejecución,
 * usa --update-snapshots para generar los baselines:
 *   npx playwright test --update-snapshots --project=visual
 */
test.describe('Visual regression for ${name}', () => {

  test('screenshot comparison', async ({ page }) => {
    await smartGoto(page, '${name}');

    // Esperar a que la página esté completamente estable
    await page.waitForLoadState('domcontentloaded');
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(800); // Animaciones y fuentes

    // Ocultar elementos dinámicos que rompen comparación (cursores, timestamps, etc.)
    await page.addStyleTag({
      content: \`
        *, *::before, *::after {
          animation-duration: 0s !important;
          transition-duration: 0s !important;
        }
        [data-testid*="timestamp"], [class*="timer"], [class*="clock"] {
          visibility: hidden !important;
        }
      \`
    }).catch(() => {});

    await expect(page).toHaveScreenshot('${name}.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.05, // Tolerar 5% de diferencia pixel
      animations: 'disabled',
    });
  });

});
`;
  fs.writeFileSync(file, code);
  console.log(`✅ Visual test generado: ${file}`);
}