import fs from 'fs';
import path from 'path';
import { ensureDir } from '../../utils/fs-utils';

export function generateAccessibility(name: string, url: string) {
  const testDir = path.join('GenerateTest', 'tests', name, 'accessibility');
  ensureDir(testDir);
  const file = path.join(testDir, `${name}-accessibility.spec.ts`);

  // Risk 4: no sobrescribir si el archivo ya fue editado manualmente
  if (fs.existsSync(file)) {
    console.log(`⚠️ Accessibility spec ya existe, omitiendo: ${file}`);
    return;
  }

  // Risk 1: determinar la URL de navegación en tiempo de generación
  // Si url está disponible se embebe directamente; si no, usa smartGoto (metadata).
  const navLine   = url
    ? `await page.goto('${url}');`
    : `await smartGoto(page, '${name}');`;
  const navImport = url
    ? ''
    : `import { smartGoto } from '@utils/navigation-helper';\n`;

  const code = `import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
${navImport}
// Risk 7: viewport fijo para resultados consistentes entre ejecuciones
const VIEWPORT = { width: 1280, height: 720 };

// Risk 8: selectores de elementos de terceros que generan falsos positivos
const EXCLUDE_SELECTORS = [
  '[id*="cookie"]', '[class*="cookie"]',
  '[id*="chat"]',   '[class*="chat"]',
  '[id*="widget"]', '[class*="widget"]',
  'iframe',
];

test.describe('Accessibility: ${name}', () => {

  test('axe scan — sin violaciones críticas', async ({ page }) => {
    await page.setViewportSize(VIEWPORT);

    // Risk 1: navega a la URL embebida en el spec (no depende de metadata JSON)
    ${navLine}

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

    console.log(\`♿ Accessibility scan — ${name}:\`);
    console.log(\`   Critical: \${critical.length} | Serious: \${serious.length} | Moderate: \${moderate.length} | Minor: \${minor.length}\`);

    if (results.violations.length > 0) {
      results.violations.forEach(v => {
        console.log(\`   [\${v.impact?.toUpperCase()}] \${v.id}: \${v.description}\`);
        // Risk 6: mostrar hasta 5 nodos en lugar de 2
        v.nodes.slice(0, 5).forEach(n => console.log(\`     → \${n.html.substring(0, 120)}\`));
      });
    } else {
      console.log('   ✅ Sin violaciones detectadas');
    }

    // Risk 2: assertion real — falla en CI si hay violaciones críticas o graves
    expect(critical.length, \`\${critical.length} violaciones críticas en ${name}\`).toBe(0);
    expect(serious.length,  \`\${serious.length} violaciones graves en ${name}\`).toBe(0);
  });

});
`;

  fs.writeFileSync(file, code);
  console.log(`✅ Accessibility test generado: ${file}`);
}
