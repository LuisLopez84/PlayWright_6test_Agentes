import fs from "fs";
import path from "path";
import { ensureDir } from "../../utils/fs-utils";
import { normalizeSelector } from "../../../../ConfigurationTest/tests/utils/selector-normalizer";

export function generateUITest(name: string, steps: any[]) {
  const dir = path.join('GenerateTest', 'tests', name, 'ui');
  ensureDir(dir);
  const output = path.join(dir, `${name}.spec.ts`);

  const uniqueSteps: any[] = [];
  const seen = new Set();
  for (const step of steps) {
    const key = `${step.action}-${step.selector || step.target}-${step.value ?? ''}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueSteps.push(step);
    }
  }
  console.log(`📊 generateUITest: steps únicos: ${uniqueSteps.length} de ${steps.length}`);

  let code = `
import { test, expect } from '@playwright/test';
import { smartGoto } from '../../../../ConfigurationTest/tests/utils/navigation-helper';
import { smartClick, smartFill, smartSelect, smartWaitForText } from '../../../../ConfigurationTest/tests/utils/smart-actions';

test('${name}', async ({ page }) => {
  await smartGoto(page, '${name}');
`;

  let i = 0;
  while (i < uniqueSteps.length) {
    const step = uniqueSteps[i];
    const nextStep = uniqueSteps[i + 1];

    // ── SELECT ──────────────────────────────────────────────────
    if (step.action === 'select' || step.action === 'selectOption') {
      let selector = step.selector || step.target;
      const value = step.value || '';
      if (selector && value) {
        selector = normalizeSelector(selector);
        code += `
  await smartSelect(page, \`${selector}\`, '${value}');`;
      }
      i++;
      continue;
    }

    const rawSelector = step.selector || step.target || '';
    const selector = normalizeSelector(rawSelector);
    const value = step.value || '';

    // ── CLICK seguido de VERIFY → patrón "confirm + toast transitorio" ──
    // Se inicia smartWaitForText EN PARALELO con smartClick para capturar
    // toasts que aparecen y desaparecen DURANTE el procesamiento post-click.
    // Ejemplo: click 'Confirmar' → transfer POST → toast 'Transferencia realizada' (2-3s) → form reset
    // Sin paralelismo el toast ya desapareció cuando smartWaitForText empieza.
    if (step.action === 'click' && nextStep?.action === 'verify') {
      if (!selector) { i++; continue; }
      const verifyTarget = normalizeSelector(nextStep.selector || nextStep.target || '');
      if (!verifyTarget) { i++; continue; }

      code += `
  // Capturar toast transitorio en paralelo con el click de confirmación.
  // smartWaitForText empieza a escuchar ANTES de que el click se ejecute,
  // garantizando que detecta el mensaje aunque desaparezca rápidamente.
  await Promise.all([
    smartWaitForText(page, \`${verifyTarget}\`, 20000),
    smartClick(page, \`${selector}\`),
  ]);`;

      i += 2; // consumir tanto el click como el verify
      continue;
    }

    // ── CLICK simple ──────────────────────────────────────────────
    if (step.action === 'click') {
      if (!selector) { i++; continue; }
      code += `
  await smartClick(page, \`${selector}\`);`;
      i++;
      continue;
    }

    // ── FILL / INPUT ──────────────────────────────────────────────
    if (step.action === 'input' || step.action === 'fill') {
      if (!selector) { i++; continue; }
      code += `
  await smartFill(page, \`${selector}\`, '${value}');
  await page.waitForTimeout(500);`;
      i++;
      continue;
    }

    // ── VERIFY standalone (no precedido de click) ─────────────────
    // Texto de resultado asíncrono sin click previo en el mismo paso.
    // Timeout 15s para cubrir respuestas lentas del servidor/backend.
    if (step.action === 'verify') {
      const verifyTarget = step.selector || step.target || '';
      if (!verifyTarget) { i++; continue; }
      code += `
  // Verificar mensaje de resultado (texto asíncrono — puede ser toast transitorio)
  await smartWaitForText(page, \`${verifyTarget}\`, 15000);`;
      i++;
      continue;
    }

    i++;
  }

  code += `
});
`;
  fs.writeFileSync(output, code);
  console.log("✅ UI Test generado: " + output);
}
