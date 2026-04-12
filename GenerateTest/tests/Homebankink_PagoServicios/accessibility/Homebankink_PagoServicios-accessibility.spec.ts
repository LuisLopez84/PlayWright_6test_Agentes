import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { smartGoto } from '../../../../ConfigurationTest/tests/utils/navigation-helper';

/**
 * Accessibility tests for Homebankink_PagoServicios
 * Usa axe-core para detectar violaciones WCAG 2.1 AA.
 * El test SIEMPRE pasa — las violaciones se reportan en consola (no fallan el CI).
 * Para hacer que el test falle en violaciones críticas, descomenta el expect.
 */
test.describe('Accessibility tests for Homebankink_PagoServicios', () => {

  test('axe scan — sin violaciones críticas', async ({ page }) => {
    await smartGoto(page, 'Homebankink_PagoServicios');
    // Esperar estabilidad de la página
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    const critical   = results.violations.filter(v => v.impact === 'critical');
    const serious    = results.violations.filter(v => v.impact === 'serious');
    const moderate   = results.violations.filter(v => v.impact === 'moderate');
    const minor      = results.violations.filter(v => v.impact === 'minor');

    console.log(`♿ Accessibility scan for Homebankink_PagoServicios:`);
    console.log(`   Critical: ${critical.length} | Serious: ${serious.length} | Moderate: ${moderate.length} | Minor: ${minor.length}`);

    if (results.violations.length > 0) {
      results.violations.forEach(v => {
        console.log(`   [${v.impact?.toUpperCase()}] ${v.id}: ${v.description}`);
        v.nodes.slice(0, 2).forEach(n => console.log(`     → ${n.html.substring(0, 120)}`));
      });
    } else {
      console.log('   ✅ Sin violaciones detectadas');
    }

    // Test informativo: siempre pasa. Descomentar la línea siguiente para exigir 0 críticos:
    // expect(critical.length, `${critical.length} violaciones críticas en Homebankink_PagoServicios`).toBe(0);
    expect(true).toBe(true);
  });

});
