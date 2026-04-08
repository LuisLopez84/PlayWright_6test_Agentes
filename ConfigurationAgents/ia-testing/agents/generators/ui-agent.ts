import fs from "fs";
import path from "path";
import { ensureDir } from "../../utils/fs-utils";
import { normalizeSelector } from "../../../../ConfigurationTest/tests/utils/selector-normalizer";

export function generateUITest(name: string, steps: any[]) {

  // 📁 Carpeta destino
  const dir = path.join('GenerateTest', 'tests', name, 'ui');
  ensureDir(dir);

  const output = path.join(dir, `${name}.spec.ts`);

  /**
   * 🔥 PASO 1 — ELIMINAR DUPLICADOS (CRÍTICO)
   */
  const uniqueSteps: any[] = [];
  const seen = new Set();

  for (const step of steps) {

    // Para selects, usar una clave especial que incluya el valor
    let key;
    if (step.action === 'select' || step.action === 'selectOption') {
      key = `${step.action}-${step.selector || step.target}-${step.value}`;
    } else {
      key = `${step.action}-${step.selector || step.target}-${step.value}`;
    }

    if (!seen.has(key)) {
      seen.add(key);
      uniqueSteps.push(step);
    }
  }

  console.log(`📊 generateUITest: steps únicos: ${uniqueSteps.length} de ${steps.length}`);

  /**
   * 🔥 GENERACIÓN DEL TEST
   */
  let code = `
import { test, expect } from '@playwright/test';
import { smartGoto } from '../../../../ConfigurationTest/tests/utils/navigation-helper';
import { smartClick, smartFill, smartSelect } from '../../../../ConfigurationTest/tests/utils/smart-actions';

test('${name}', async ({ page }) => {

  // 🔥 Navegación inteligente
  await smartGoto(page, '${name}');
`;

  /**
   * 🔥 LOOP SOBRE STEPS LIMPIOS
   */
  for (const step of uniqueSteps) {

    // 🔹 SELECT (DEBE IR PRIMERO)
    if (step.action === 'select' || step.action === 'selectOption') {

      let selector = step.selector || step.target;
      const value = step.value || '';

      if (!selector || !value) continue;

      // Limpiar selector si es necesario
      selector = normalizeSelector(selector);

      code += `
  await smartSelect(page, \`${selector}\`, '${value}');`;
      continue;
    }

    const rawSelector = step.selector || step.target || '';
    const selector = normalizeSelector(rawSelector);
    const value = step.value || '';

    // 🔹 CLICK
    if (step.action === 'click') {
      if (!selector) continue;
      code += `
  await smartClick(page, \`${selector}\`);`;
    }

    // 🔹 INPUT / FILL
    else if (step.action === 'input' || step.action === 'fill') {
      if (!selector) continue;
      code += `
  await smartFill(page, \`${selector}\`, '${value}');`;
    }
  }

  code += `
});
`;

  fs.writeFileSync(output, code);

  console.log("✅ UI Test generado: " + output);
}