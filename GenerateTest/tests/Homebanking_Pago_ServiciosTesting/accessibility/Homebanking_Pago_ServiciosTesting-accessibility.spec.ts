import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Risk 7: viewport fijo para resultados consistentes entre ejecuciones
const VIEWPORT = { width: 1280, height: 720 };

// Risk 8: selectores de elementos de terceros que generan falsos positivos
const EXCLUDE_SELECTORS = [
  '[id*="cookie"]', '[class*="cookie"]',
  '[id*="chat"]',   '[class*="chat"]',
  '[id*="widget"]', '[class*="widget"]',
  'iframe',
];

test.describe('Accessibility: Homebanking_Pago_ServiciosTesting', () => {

  test('axe scan — sin violaciones críticas', async ({ page }) => {
    await page.setViewportSize(VIEWPORT);

    // Risk 1: navega a la URL embebida en el spec (no depende de metadata JSON)
    await page.goto('https://homebanking-demo-tests.netlify.app');

    // Risk 5: esperar estabilidad real en lugar de timeout fijo
    await page.waitForLoadState('domcontentloaded');
    await page.waitForLoadState('networkidle');

    let builder = new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa']);

    // Risk 8: excluir widgets de terceros para evitar falsos positivos
    for (const sel of EXCLUDE_SELECTORS) {
      builder = builder.exclude(sel);
    }

    const results = await builder.analyze();

    const critical = results.violations.filter(v => v.impact === 'critical');
    const serious  = results.violations.filter(v => v.impact === 'serious');
    const moderate = results.violations.filter(v => v.impact === 'moderate');
    const minor    = results.violations.filter(v => v.impact === 'minor');

    console.log(`♿ Accessibility scan — Homebanking_Pago_ServiciosTesting:`);
    console.log(`   Critical: ${critical.length} | Serious: ${serious.length} | Moderate: ${moderate.length} | Minor: ${minor.length}`);

    if (results.violations.length > 0) {
      results.violations.forEach(v => {
        console.log(`   [${v.impact?.toUpperCase()}] ${v.id}: ${v.description}`);
        // Risk 6: mostrar hasta 5 nodos en lugar de 2
        v.nodes.slice(0, 5).forEach(n => console.log(`     → ${n.html.substring(0, 120)}`));
      });
    } else {
      console.log('   ✅ Sin violaciones detectadas');
    }

    // Risk 2: assertion real — falla en CI si hay violaciones críticas o graves
    expect(critical.length, `${critical.length} violaciones críticas en Homebanking_Pago_ServiciosTesting`).toBe(0);
    expect(serious.length,  `${serious.length} violaciones graves en Homebanking_Pago_ServiciosTesting`).toBe(0);
  });

});
