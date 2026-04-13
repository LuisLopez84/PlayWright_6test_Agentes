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
  const usesVerify  = uniqueSteps.some(s => s.action === 'verify') ||
                      uniqueSteps.some(s => s.pageRef === 'popup' && s.action === 'verify');
  const usesSelect  = uniqueSteps.some(s => s.action === 'select' || s.action === 'selectOption');
  const usesPopup   = uniqueSteps.some(s => s.popupTrigger);

  const importedActions = ['smartClick', 'smartFill'];
  if (usesSelect) importedActions.push('smartSelect');
  if (usesVerify) importedActions.push('smartWaitForText');
  if (usesCheck)  importedActions.push('smartCheck');
  if (usesDbl)    importedActions.push('smartDblClick');
  if (usesUpload) importedActions.push('smartUpload');

  // ── Recopilar todos los dialog_handler para el manejador global ──
  const dialogSteps = uniqueSteps.filter(s => s.action === 'dialog_handler');
  const hasDialogs = dialogSteps.length > 0;

  // Bloque de manejador global de diálogos (cola ordenada)
  let dialogQueueBlock = '';
  if (hasDialogs) {
    const queueItems = dialogSteps.map(s => {
      const action = (s.value === 'dismiss') ? 'dismiss' : 'accept';
      const promptValue = (action === 'accept' && s.promptValue) ? `, '${s.promptValue}'` : '';
      return `  { action: '${action}'${promptValue ? `, value: '${s.promptValue}'` : ''} }`;
    }).join(',\n');
    dialogQueueBlock = `
  // ── Manejador global de diálogos nativos (alert / confirm / prompt) ──
  // Cola ordenada: cada diálogo consume una entrada; el resto se acepta por defecto.
  const _dialogQueue: Array<{ action: 'accept' | 'dismiss'; value?: string }> = [
${queueItems},
  ];
  let _dialogIdx = 0;
  page.on('dialog', async dialog => {
    const cfg = _dialogQueue[_dialogIdx++] ?? { action: 'accept' };
    try {
      if (cfg.action === 'dismiss') {
        await dialog.dismiss();
      } else {
        await dialog.accept(cfg.value);
      }
    } catch {
      // Diálogo ya manejado (race condition prevenida)
    }
  });
`;
  }

  // fixture: añadir context cuando hay popups/nuevas pestañas
  const fixture = usesPopup ? '{ page, context }' : '{ page }';

  let code = `
import { test, expect } from '@playwright/test';
import { smartGoto } from '../../../../ConfigurationTest/tests/utils/navigation-helper';
import { ${importedActions.join(', ')} } from '../../../../ConfigurationTest/tests/utils/smart-actions';

test('${name}', async (${fixture}) => {
  await smartGoto(page, '${name}');
${dialogQueueBlock}`;

  let i = 0;
  while (i < uniqueSteps.length) {
    const step = uniqueSteps[i];
    const nextStep = uniqueSteps[i + 1];

    // ── page_load → omitir (smartGoto ya se encarga) ──────────────────
    if (step.action === 'page_load') {
      i++;
      continue;
    }

    // ── dialog_handler → ya consolidado en el bloque global; omitir ───
    if (step.action === 'dialog_handler') {
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

    // ── POPUP TRIGGER → click que abre nueva pestaña ──────────────────
    // El parser marca popupTrigger:true en el click de la página principal
    // que precede a acciones sobre la popup page (pageRef:'popup').
    if (step.action === 'click' && step.popupTrigger) {
      // Recopilar todas las acciones seguidas que pertenecen a la popup
      const popupSteps: any[] = [];
      let j = i + 1;
      while (j < uniqueSteps.length && uniqueSteps[j].pageRef === 'popup') {
        popupSteps.push(uniqueSteps[j]);
        j++;
      }
      // Para el trigger usamos el selector Playwright original (no normalizado)
      // para garantizar precisión: el elemento que abre el popup debe ser exacto.
      // Si el step tiene un selector completo (getByRole/locator/etc.) lo usamos
      // directamente; de lo contrario caemos en smartClick como fallback.
      const rawStepSel = (step.selector || '').trim();
      const isPlaywrightExpr = /get[A-Z]|locator\(/.test(rawStepSel);
      const triggerExpr = isPlaywrightExpr
        ? `(${rawStepSel.startsWith('page.') ? rawStepSel : `page.${rawStepSel}`}).click()`
        : (selector ? `smartClick(page, \`${selector}\`)` : null);
      if (!triggerExpr) { i = j; continue; }
      code += `
  // Asegurar que la página está lista antes de abrir nueva pestaña
  await page.waitForLoadState('load');
  // context.waitForEvent('page') es más robusto que page.waitForEvent('popup'):
  // captura cualquier nueva página en el contexto sin depender del actionTimeout
  const [_popupPage] = await Promise.all([
    context.waitForEvent('page', { timeout: 30000 }),
    ${triggerExpr},
  ]);
  await _popupPage.waitForLoadState('load');`;
      // Generar acciones sobre la popup page
      for (const ps of popupSteps) {
        const pSel = normalizeSelector(ps.selector || ps.target || '');
        const pVal = ps.value || '';
        if (ps.action === 'click' || ps.action === 'verify') {
          if (!pSel) continue;
          if (ps.action === 'verify') {
            code += `
  await smartWaitForText(_popupPage, \`${pSel}\`, 15000);`;
          } else {
            code += `
  await smartClick(_popupPage, \`${pSel}\`);`;
          }
        } else if (ps.action === 'input' || ps.action === 'fill') {
          if (!pSel) continue;
          code += `
  await smartFill(_popupPage, \`${pSel}\`, '${pVal}');
  await _popupPage.waitForTimeout(500);`;
        }
      }
      i = j; // saltar los popup steps ya procesados
      continue;
    }

    // ── CLICK seguido de VERIFY → patrón "confirm + toast transitorio" ──
    // smartWaitForText empieza a escuchar EN PARALELO con smartClick para
    // capturar toasts que aparecen y desaparecen DURANTE el post-click.
    if (step.action === 'click' && nextStep?.action === 'verify' && !step.pageRef) {
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

    // ── CLICK simple (página principal) ───────────────────────────────
    if (step.action === 'click' && !step.pageRef) {
      if (!selector) { i++; continue; }
      code += `
  await smartClick(page, \`${selector}\`);`;
      i++;
      continue;
    }

    // ── FILL / INPUT (página principal) ───────────────────────────────
    if ((step.action === 'input' || step.action === 'fill') && !step.pageRef) {
      if (!selector) { i++; continue; }
      code += `
  await smartFill(page, \`${selector}\`, '${value}');
  await page.waitForTimeout(500);`;
      i++;
      continue;
    }

    // ── Acciones popup sueltas (sin trigger previo detectado) ─────────
    // Fallback: si por alguna razón quedó un paso con pageRef:'popup'
    // sin ser consumido por el bloque popupTrigger, lo saltamos.
    if (step.pageRef === 'popup') {
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
