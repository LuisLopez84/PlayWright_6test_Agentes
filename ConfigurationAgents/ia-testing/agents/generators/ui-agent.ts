import fs from "fs";
import path from "path";
import { ensureDir } from "../../utils/fs-utils";
import { normalizeSelector } from "../../../../ConfigurationTest/tests/utils/selector-normalizer";

// Risk 5: wrapper — expresiones encadenadas (.nth/.first/.last/.filter) pasan sin modificar
// Risk 11: expresiones Playwright del recorder (page.getByLabel/Role/locator…) pasan sin modificar
//          para que resolveLocator las evalúe directamente sin perder la info de tipo de locator.
function safeNormalize(rawSel: string): string {
  if (!rawSel) return '';
  if (/\.(nth|first|last|filter|and)\(/.test(rawSel)) return rawSel;
  // Expresión completa del recorder → preservar tal cual (más fiable que solo el texto)
  if (/^page\.(getBy|locator|frameLocator)/.test(rawSel)) return rawSel;
  return normalizeSelector(rawSel) || rawSel;
}

export function generateUITest(name: string, steps: any[]) {
  const dir    = path.join('GenerateTest', 'tests', name, 'ui');
  ensureDir(dir);
  const output = path.join(dir, `${name}.spec.ts`);

  // ── Deduplicar pasos ──────────────────────────────────────────────────────
  // NOTA: fills/inputs NO se deduplicar aquí; el recorder-parser ya eliminó
  // duplicados exactos preservando el orden original. Deduplicar aquí de nuevo
  // causaría perder fills legítimos en flujos que reutilizan un campo (ej. wizard).
  const uniqueSteps: any[] = [];
  const seen = new Set();
  const NON_DEDUP_ACTIONS = new Set([
    'click', 'dblclick', 'press_enter', 'press_key', 'dialog_handler',
    'page_load', 'hover', 'rightclick', 'drag', 'frame_click', 'frame_fill', 'scroll',
    'input', 'fill',      // fills ya deduplicados en parser con orden preservado
    'select', 'selectOption', // selects: múltiples selects en el mismo campo son válidos
    'check', 'uncheck',
    'upload',
  ]);
  for (const step of steps) {
    if (NON_DEDUP_ACTIONS.has(step.action)) {
      uniqueSteps.push(step);
    } else {
      const key = `${step.action}-${step.selector || step.target}-${step.value ?? ''}`;
      if (!seen.has(key)) { seen.add(key); uniqueSteps.push(step); }
    }
  }
  console.log(`📊 generateUITest: ${uniqueSteps.length} steps únicos de ${steps.length}`);

  // ── Determinar imports necesarios ─────────────────────────────────────────
  const usesCheck      = uniqueSteps.some(s => s.action === 'check' || s.action === 'uncheck');
  const usesDbl        = uniqueSteps.some(s => s.action === 'dblclick');
  const usesUpload     = uniqueSteps.some(s => s.action === 'upload');
  const usesVerify     = uniqueSteps.some(s => s.action === 'verify');
  const usesSelect     = uniqueSteps.some(s => s.action === 'select' || s.action === 'selectOption');
  const usesPopup      = uniqueSteps.some(s => s.popupTrigger);
  const usesHover      = uniqueSteps.some(s => s.action === 'hover');
  const usesRightClick = uniqueSteps.some(s => s.action === 'rightclick');
  const usesDrag       = uniqueSteps.some(s => s.action === 'drag');
  const usesScroll     = uniqueSteps.some(s => s.action === 'scroll');

  const importedActions = ['smartClick', 'smartFill'];
  if (usesSelect)     importedActions.push('smartSelect');
  if (usesVerify)     importedActions.push('smartWaitForText');
  if (usesCheck)      importedActions.push('smartCheck');
  if (usesDbl)        importedActions.push('smartDblClick');
  if (usesUpload)     importedActions.push('smartUpload');
  if (usesHover)      importedActions.push('smartHover');
  if (usesRightClick) importedActions.push('smartRightClick');
  if (usesDrag)       importedActions.push('smartDragAndDrop');
  if (usesScroll)     importedActions.push('smartScroll');

  // ── URL base del recording ────────────────────────────────────────────────
  const pageLoadStep     = uniqueSteps.find(s => s.action === 'page_load');
  const recordingBaseURL = pageLoadStep?.url || '';

  // ── Dialog handler global ─────────────────────────────────────────────────
  const dialogSteps = uniqueSteps.filter(s => s.action === 'dialog_handler');
  const hasDialogs  = dialogSteps.length > 0;

  let dialogQueueBlock = '';
  if (hasDialogs) {
    const queueItems = dialogSteps.map(s => {
      const action      = (s.value === 'dismiss') ? 'dismiss' : 'accept';
      const promptValue = (action === 'accept' && s.promptValue) ? `, value: '${s.promptValue}'` : '';
      return `  { action: '${action}'${promptValue} }`;
    }).join(',\n');

    dialogQueueBlock = `
  // ── Manejador global de diálogos nativos (alert / confirm / prompt) ──
  const _dialogQueue: Array<{ action: 'accept' | 'dismiss'; value?: string }> = [
${queueItems},
  ];
  let _dialogIdx = 0;
  page.on('dialog', async dialog => {
    const cfg = _dialogQueue[_dialogIdx++];
    // Risk 7: diálogo inesperado (no estaba en la grabación) → advertir y aceptar
    if (!cfg) {
      console.warn(\`⚠️ Diálogo inesperado: "\${dialog.message()}" — aceptado por defecto\`);
      try { await dialog.accept(); } catch {}
      return;
    }
    try {
      if (cfg.action === 'dismiss') {
        await dialog.dismiss();
      } else {
        await dialog.accept(cfg.value);
      }
    } catch {}
  });
`;
  }

  const fixture = usesPopup ? '{ page, context }' : '{ page }';

  // Risk 6: timeouts como constantes configurables en el spec generado
  let code = `
import { test, expect } from '@playwright/test';
import { smartGoto } from '@utils/navigation-helper';
import { ${importedActions.join(', ')} } from '@utils/smart-actions';

// Risk 6: timeouts configurables via variables de entorno
const POPUP_TIMEOUT  = Number(process.env.POPUP_TIMEOUT  || 30000);
const VERIFY_TIMEOUT = Number(process.env.VERIFY_TIMEOUT || 20000);
const FILL_WAIT_MS   = Number(process.env.FILL_WAIT_MS   || 0);

test('${name}', async (${fixture}) => {
  await smartGoto(page, '${name}');
${dialogQueueBlock}`;

  let i = 0;
  while (i < uniqueSteps.length) {
    const step     = uniqueSteps[i];
    const nextStep = uniqueSteps[i + 1];

    // ── page_load / context_change → omitir (smartGoto ya navega) ──────────
    if (step.action === 'page_load' || step.action === 'context_change') { i++; continue; }

    // ── dialog_handler → consolidado en bloque global ─────────────────────
    if (step.action === 'dialog_handler') { i++; continue; }

    // ── navigate_section (menú/sidebar click) → smartClick ───────────────
    // enhanceFlow semántica: preserva selector; se ejecuta como click normal
    if (step.action === 'navigate_section') {
      const navSel = safeNormalize(step.selector || step.target || '');
      if (navSel) code += `\n  await smartClick(page, \`${navSel}\`);`;
      i++; continue;
    }

    // ── confirm (botón de confirmación) → smartClick ─────────────────────
    // enhanceFlow semántica: Transferir, Confirmar, Aceptar, etc.
    if (step.action === 'confirm') {
      const cfmSel = safeNormalize(step.selector || step.target || '');
      if (cfmSel) {
        // Si el siguiente paso es verify, usar Promise.all para capturar toast
        const nextAfterConfirm = uniqueSteps[i + 1];
        if (nextAfterConfirm?.action === 'verify') {
          const verifyTgt = safeNormalize(nextAfterConfirm.selector || nextAfterConfirm.target || '');
          if (verifyTgt) {
            code += `
  await Promise.all([
    smartWaitForText(page, \`${verifyTgt}\`, VERIFY_TIMEOUT),
    smartClick(page, \`${cfmSel}\`),
  ]);`;
            i += 2; continue;
          }
        }
        code += `\n  await smartClick(page, \`${cfmSel}\`);`;
      }
      i++; continue;
    }

    // ── press_enter ───────────────────────────────────────────────────────
    if (step.action === 'press_enter') {
      code += `\n  await page.keyboard.press('Enter');`;
      i++; continue;
    }

    // ── press_key ─────────────────────────────────────────────────────────
    if (step.action === 'press_key') {
      if (!step._editIntent) {
        code += `\n  await page.keyboard.press('${step.target}');`;
      }
      i++; continue;
    }

    // ── HOVER ─────────────────────────────────────────────────────────────
    if (step.action === 'hover') {
      const selector = safeNormalize(step.selector || step.target);
      if (selector) code += `\n  await smartHover(page, \`${selector}\`);`;
      i++; continue;
    }

    // ── RIGHT CLICK ───────────────────────────────────────────────────────
    if (step.action === 'rightclick') {
      const selector = safeNormalize(step.selector || step.target);
      if (selector) code += `\n  await smartRightClick(page, \`${selector}\`);`;
      i++; continue;
    }

    // ── DRAG AND DROP ─────────────────────────────────────────────────────
    if (step.action === 'drag') {
      const srcSel = safeNormalize(step.selector || step.source || '');
      const tgtSel = safeNormalize(step.targetSelector || step.target || '');
      if (srcSel && tgtSel) {
        code += `\n  await smartDragAndDrop(page, \`${srcSel}\`, \`${tgtSel}\`);`;
      }
      i++; continue;
    }

    // ── FRAME CLICK ───────────────────────────────────────────────────────
    if (step.action === 'frame_click') {
      const rawSel = step.selector || '';
      if (rawSel) {
        const expr = rawSel.startsWith('page.') ? rawSel : `page.${rawSel}`;
        code += `\n  // Interacción dentro de iframe: ${step.frameSelector}\n  await ${expr}.click();`;
      }
      i++; continue;
    }

    // ── FRAME FILL ────────────────────────────────────────────────────────
    if (step.action === 'frame_fill') {
      const rawSel = step.selector || '';
      const val    = step.value || '';
      if (rawSel) {
        const expr = rawSel.startsWith('page.') ? rawSel : `page.${rawSel}`;
        code += `\n  // Fill dentro de iframe: ${step.frameSelector}\n  await ${expr}.fill('${val}');`;
      }
      i++; continue;
    }

    // ── SCROLL ────────────────────────────────────────────────────────────
    if (step.action === 'scroll') {
      const target = step.target || '';
      if (target) code += `\n  await smartScroll(page, \`${target}\`);`;
      i++; continue;
    }

    // ── SELECT ────────────────────────────────────────────────────────────
    if (step.action === 'select' || step.action === 'selectOption') {
      const selector = safeNormalize(step.selector || step.target);
      const value    = step.value || '';
      if (selector && value) code += `\n  await smartSelect(page, \`${selector}\`, '${value}');`;
      i++; continue;
    }

    // ── CHECK / UNCHECK ───────────────────────────────────────────────────
    if (step.action === 'check' || step.action === 'uncheck') {
      const selector = safeNormalize(step.selector || step.target);
      if (selector) {
        code += step.action === 'uncheck'
          ? `\n  await smartCheck(page, \`${selector}\`, false);`
          : `\n  await smartCheck(page, \`${selector}\`);`;
      }
      i++; continue;
    }

    // ── DBLCLICK ──────────────────────────────────────────────────────────
    if (step.action === 'dblclick') {
      const selector = safeNormalize(step.selector || step.target);
      if (selector) code += `\n  await smartDblClick(page, \`${selector}\`);`;
      i++; continue;
    }

    // ── UPLOAD ────────────────────────────────────────────────────────────
    if (step.action === 'upload') {
      const selector = safeNormalize(step.selector || step.target);
      const filePath = step.value || '';
      code += `
  try {
    await smartUpload(page, \`${selector}\`, '${filePath}');
  } catch (e) {
    console.warn('⚠️ Upload omitido (archivo no encontrado):', '${filePath}');
  }`;
      i++; continue;
    }

    const rawSelector = step.selector || step.target || '';
    const selector    = safeNormalize(rawSelector);
    const value       = step.value || '';

    // ── POPUP TRIGGER ─────────────────────────────────────────────────────
    if (step.action === 'click' && step.popupTrigger) {
      const popupSteps: any[] = [];
      let j = i + 1;
      while (j < uniqueSteps.length && uniqueSteps[j].pageRef === 'popup') {
        popupSteps.push(uniqueSteps[j]);
        j++;
      }

      const rawStepSel      = (step.selector || '').trim();
      const isPlaywrightExpr = /get[A-Z]|locator\(/.test(rawStepSel);
      const triggerExpr      = isPlaywrightExpr
        ? `(${rawStepSel.startsWith('page.') ? rawStepSel : `page.${rawStepSel}`}).click()`
        : (selector ? `smartClick(page, \`${selector}\`)` : null);
      if (!triggerExpr) { i = j; continue; }

      // Risk 4: fallback slug frágil → solo comentario, no código ejecutable
      const prevNavStep = uniqueSteps[i - 1];
      const prevTarget  = (prevNavStep?.target || prevNavStep?.selector || '').trim();
      const isLinkNav   = prevTarget && /get[A-Z]/.test(prevNavStep?.selector || '') &&
                          (prevNavStep?.selector || '').includes('link');
      let fallbackUrlCode = '';
      if (isLinkNav && prevTarget && recordingBaseURL) {
        try {
          const origin      = new URL(recordingBaseURL).origin;
          const derivedPath = prevTarget.toLowerCase()
            .replace(/[^a-z0-9\s]/g, '').trim().replace(/\s+/g, '-');
          fallbackUrlCode = `
  // ℹ️ Fallback disponible si la navegación UI no llega al destino:
  //   await page.goto('${origin}/RUTA_REAL_DE_${derivedPath.toUpperCase()}');
  //   (ajusta la ruta real antes de descomentar)`;
        } catch {}
      }

      code += `${fallbackUrlCode}
  const [_popupPage] = await Promise.all([
    context.waitForEvent('page', { timeout: POPUP_TIMEOUT }),
    ${triggerExpr},
  ]);
  await _popupPage.waitForLoadState('load');`;

      // Risk 2: cobertura de acciones en popup ampliada
      for (const ps of popupSteps) {
        const pSel = safeNormalize(ps.selector || ps.target || '');
        const pVal = ps.value || '';

        if (ps.action === 'click') {
          if (pSel) code += `\n  await smartClick(_popupPage, \`${pSel}\`);`;
        } else if (ps.action === 'verify') {
          if (pSel) code += `\n  await smartWaitForText(_popupPage, \`${pSel}\`, VERIFY_TIMEOUT);`;
        } else if (ps.action === 'input' || ps.action === 'fill') {
          if (pSel) {
            code += `\n  await smartFill(_popupPage, \`${pSel}\`, '${pVal}');`;
            code += `\n  await _popupPage.waitForTimeout(FILL_WAIT_MS);`;
          }
        } else if (ps.action === 'select' || ps.action === 'selectOption') {
          if (pSel && pVal) code += `\n  await smartSelect(_popupPage, \`${pSel}\`, '${pVal}');`;
        } else if (ps.action === 'check' || ps.action === 'uncheck') {
          if (pSel) {
            code += ps.action === 'uncheck'
              ? `\n  await smartCheck(_popupPage, \`${pSel}\`, false);`
              : `\n  await smartCheck(_popupPage, \`${pSel}\`);`;
          }
        } else if (ps.action === 'scroll') {
          if (pSel) code += `\n  await smartScroll(_popupPage, \`${pSel}\`);`;
        } else if (ps.action === 'upload') {
          if (pSel) code += `\n  await smartUpload(_popupPage, \`${pSel}\`, '${pVal}');`;
        } else if (ps.action === 'dblclick') {
          if (pSel) code += `\n  await smartDblClick(_popupPage, \`${pSel}\`);`;
        } else {
          // Risk 2: advertir acciones de popup no soportadas en tiempo de generación
          console.warn(`⚠️ [ui-agent] Acción de popup '${ps.action}' no soportada — omitida del spec generado.`);
        }
      }
      i = j; continue;
    }

    // ── CLICK + VERIFY consecutivos → Promise.all (captura toast transitorio) ──
    if (step.action === 'click' && nextStep?.action === 'verify' && !step.pageRef) {
      if (!selector) { i++; continue; }
      const verifyTarget = safeNormalize(nextStep.selector || nextStep.target || '');
      if (!verifyTarget) { i++; continue; }

      code += `
  // Risk 8: VERIFY_TIMEOUT unificado para captura en paralelo del toast
  await Promise.all([
    smartWaitForText(page, \`${verifyTarget}\`, VERIFY_TIMEOUT),
    smartClick(page, \`${selector}\`),
  ]);`;
      i += 2; continue;
    }

    // ── CLICK simple ──────────────────────────────────────────────────────
    if (step.action === 'click' && !step.pageRef) {
      if (!selector) { i++; continue; }
      code += `\n  await smartClick(page, \`${selector}\`);`;
      i++; continue;
    }

    // ── FILL / INPUT ──────────────────────────────────────────────────────
    if ((step.action === 'input' || step.action === 'fill') && !step.pageRef) {
      if (!selector) { i++; continue; }

      if (value === '' && step._editIntent) {
        // Risk 1: NO generar smartFill con cadena vacía ejecutable — solo comentario
        code += `
  // ⚠️ VALOR NO CAPTURADO EN EL RECORDING — campo "${selector}" limpiado sin nuevo valor grabado.
  //    Para corregirlo, edita el recording y añade la línea de fill con el valor real:
  //      await page.getByLabel('...').fill('NUEVO_VALOR');
  //    Luego vuelve a ejecutar: npm run generate`;
      } else {
        // Risk 3: FILL_WAIT_MS reemplaza el waitForTimeout(500) hardcodeado
        code += `\n  await smartFill(page, \`${selector}\`, '${value}');`;
        code += `\n  await page.waitForTimeout(FILL_WAIT_MS);`;
      }
      i++; continue;
    }

    // ── Popup suelto sin trigger (fallback silencioso) ────────────────────
    if (step.pageRef === 'popup') { i++; continue; }

    // ── VERIFY standalone ─────────────────────────────────────────────────
    if (step.action === 'verify') {
      const verifyTarget = step.selector || step.target || '';
      if (!verifyTarget) { i++; continue; }
      const cleanTarget = safeNormalize(verifyTarget) || verifyTarget;
      // Risk 8: VERIFY_TIMEOUT unificado (antes 15000 aquí vs 20000 en click+verify)
      code += `\n  await smartWaitForText(page, \`${cleanTarget}\`, VERIFY_TIMEOUT);`;
      i++; continue;
    }

    i++;
  }

  code += `\n});\n`;
  fs.writeFileSync(output, code);
  console.log(`✅ UI Test generado: ${output}`);
}
