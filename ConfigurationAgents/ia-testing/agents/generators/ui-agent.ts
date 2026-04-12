import fs from "fs";
import path from "path";
import { ensureDir } from "../../utils/fs-utils";
import { normalizeSelector } from "../../../../ConfigurationTest/tests/utils/selector-normalizer";

export function generateUITest(name: string, steps: any[]) {
  const dir = path.join('GenerateTest', 'tests', name, 'ui');
  ensureDir(dir);
  const output = path.join(dir, `${name}.spec.ts`);

  // ── Deduplicar pasos únicos ──
  // Solo se deduplicAN: input/fill (se tomó ya el último en el parser),
  // select/selectOption, verify (mismo texto), check/uncheck, upload.
  // Los CLICKS se preservan todos aunque sean idénticos: pueden operar sobre
  // elementos dinámicos distintos que comparten selector (e.g., árbol expandible).
  const uniqueSteps: any[] = [];
  const seen = new Set();
  const NON_DEDUP_ACTIONS = new Set(['click', 'dblclick', 'press_enter', 'dialog_handler', 'page_load']);
  for (const step of steps) {
    if (NON_DEDUP_ACTIONS.has(step.action)) {
      uniqueSteps.push(step); // clics siempre se preservan
    } else {
      const key = `${step.action}-${step.selector || step.target}-${step.value ?? ''}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueSteps.push(step);
      }
    }
  }
  console.log(`📊 generateUITest: steps únicos: ${uniqueSteps.length} de ${steps.length}`);

  // ── Determinar qué imports necesitamos ──
  const usesCheck   = uniqueSteps.some(s => s.action === 'check' || s.action === 'uncheck');
  const usesDbl     = uniqueSteps.some(s => s.action === 'dblclick');
  const usesUpload  = uniqueSteps.some(s => s.action === 'upload');
  const usesVerify  = uniqueSteps.some(s => s.action === 'verify');
  const usesSelect  = uniqueSteps.some(s => s.action === 'select' || s.action === 'selectOption');

  const importedActions = ['smartClick', 'smartFill'];
  if (usesSelect) importedActions.push('smartSelect');
  if (usesVerify) importedActions.push('smartWaitForText');
  if (usesCheck)  importedActions.push('smartCheck');
  if (usesDbl)    importedActions.push('smartDblClick');
  if (usesUpload) importedActions.push('smartUpload');

  let code = `
import { test, expect } from '@playwright/test';
import { smartGoto } from '../../../../ConfigurationTest/tests/utils/navigation-helper';
import { ${importedActions.join(', ')} } from '../../../../ConfigurationTest/tests/utils/smart-actions';

test('${name}', async ({ page }) => {
  await smartGoto(page, '${name}');
`;

  let i = 0;
  while (i < uniqueSteps.length) {
    const step = uniqueSteps[i];
    const nextStep = uniqueSteps[i + 1];

    // ── page_load → omitir (smartGoto ya se encarga) ──────────────────
    if (step.action === 'page_load') {
      i++;
      continue;
    }

    // ── dialog_handler → registrar antes del siguiente click ──────────
    if (step.action === 'dialog_handler') {
      const action = (step.value === 'dismiss') ? 'dismiss' : 'accept';
      code += `
  // Manejar diálogo nativo del navegador
  page.once('dialog', async dialog => {
    console.log(\`Dialog: \${dialog.message()}\`);
    await dialog.${action}();
  });`;
      i++;
      continue;
    }

    // ── press_enter → teclado ─────────────────────────────────────────
    if (step.action === 'press_enter') {
      code += `
  await page.keyboard.press('Enter');`;
      i++;
      continue;
    }

    // ── SELECT ────────────────────────────────────────────────────────
    if (step.action === 'select' || step.action === 'selectOption') {
      const rawSel = step.selector || step.target;
      const selector = normalizeSelector(rawSel);
      const value = step.value || '';
      if (selector && value) {
        code += `
  await smartSelect(page, \`${selector}\`, '${value}');`;
      }
      i++;
      continue;
    }

    // ── CHECK / UNCHECK ───────────────────────────────────────────────
    if (step.action === 'check' || step.action === 'uncheck') {
      const rawSel = step.selector || step.target;
      const selector = normalizeSelector(rawSel);
      if (selector) {
        if (step.action === 'uncheck') {
          code += `
  await smartCheck(page, \`${selector}\`, false);`;
        } else {
          code += `
  await smartCheck(page, \`${selector}\`);`;
        }
      }
      i++;
      continue;
    }

    // ── DBLCLICK ──────────────────────────────────────────────────────
    if (step.action === 'dblclick') {
      const rawSel = step.selector || step.target;
      const selector = normalizeSelector(rawSel);
      if (selector) {
        code += `
  await smartDblClick(page, \`${selector}\`);`;
      }
      i++;
      continue;
    }

    // ── UPLOAD ────────────────────────────────────────────────────────
    if (step.action === 'upload') {
      const rawSel = step.selector || step.target;
      const selector = normalizeSelector(rawSel);
      const filePath = step.value || '';
      code += `
  // Upload de archivo — asegúrate de que el fichero existe en el entorno de test
  try {
    await smartUpload(page, \`${selector}\`, '${filePath}');
  } catch (e) {
    console.warn('⚠️ Upload omitido (archivo no encontrado):', '${filePath}');
  }`;
      i++;
      continue;
    }

    const rawSelector = step.selector || step.target || '';
    const selector = normalizeSelector(rawSelector);
    const value = step.value || '';

    // ── CLICK seguido de VERIFY → patrón "confirm + toast transitorio" ──
    // smartWaitForText empieza a escuchar EN PARALELO con smartClick para
    // capturar toasts que aparecen y desaparecen DURANTE el post-click.
    if (step.action === 'click' && nextStep?.action === 'verify') {
      if (!selector) { i++; continue; }
      const verifyTarget = normalizeSelector(nextStep.selector || nextStep.target || '');
      if (!verifyTarget) { i++; continue; }

      code += `
  // Capturar toast transitorio en paralelo con el click de confirmación.
  await Promise.all([
    smartWaitForText(page, \`${verifyTarget}\`, 20000),
    smartClick(page, \`${selector}\`),
  ]);`;

      i += 2;
      continue;
    }

    // ── CLICK simple ──────────────────────────────────────────────────
    if (step.action === 'click') {
      if (!selector) { i++; continue; }
      code += `
  await smartClick(page, \`${selector}\`);`;
      i++;
      continue;
    }

    // ── FILL / INPUT ──────────────────────────────────────────────────
    if (step.action === 'input' || step.action === 'fill') {
      if (!selector) { i++; continue; }
      code += `
  await smartFill(page, \`${selector}\`, '${value}');
  await page.waitForTimeout(500);`;
      i++;
      continue;
    }

    // ── VERIFY standalone ─────────────────────────────────────────────
    if (step.action === 'verify') {
      const verifyTarget = step.selector || step.target || '';
      if (!verifyTarget) { i++; continue; }
      const cleanTarget = normalizeSelector(verifyTarget) || verifyTarget;
      code += `
  // Verificar mensaje de resultado (texto asíncrono — puede ser toast transitorio)
  await smartWaitForText(page, \`${cleanTarget}\`, 15000);`;
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
