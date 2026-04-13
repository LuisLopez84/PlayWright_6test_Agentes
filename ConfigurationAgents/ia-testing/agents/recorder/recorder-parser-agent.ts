import fs from "fs";
import { buildPlaywrightSelector } from "../../utils/selector-builder";

// ─────────────────────────────────────────────────────────────
// DETECCIÓN DE TEXTO DE RESULTADO / VERIFICACIÓN
// ─────────────────────────────────────────────────────────────
/**
 * Patrones que indican que un texto grabado como click es en realidad
 * una verificación de que un mensaje/resultado apareció en pantalla.
 * Transversal: cubre español, inglés y patrones DemoQA / homebanking.
 */
const RESULT_TEXT_PATTERNS: RegExp[] = [
  // ── Español ──
  /transferencia\s+realizada/i,
  /operaci[oó]n\s+(exitosa|completada|realizada|aprobada)/i,
  /pago\s+(exitoso|realizado|confirmado|aprobado|finalizado)/i,
  /\bexitosa?\b/i,
  /\bcompletad[ao]\b/i,
  /\bconfirmad[ao]\b/i,
  /\bprocesad[ao]\b/i,
  /\baprobad[ao]\b/i,
  /\bguardad[ao]\b/i,
  /\benviad[ao]\b/i,
  /\b[eé]xito\b/i,
  /\bcorrect[ao]\b/i,
  /\bfinalizado\b/i,
  /\bregistrad[ao]\b/i,
  /\bcread[ao]\b/i,
  /\bactualizado\b/i,
  /\beliminad[ao]\b/i,
  // ── Inglés ──
  /\bsuccess(ful)?\b/i,
  /\bcompleted?\b/i,
  /\bconfirmed?\b/i,
  /\bapproved?\b/i,
  /\bprocessed?\b/i,
  /\bsaved?\b/i,
  /\bsubmitted?\b/i,
  /\bdone\b/i,
  /transaction\s+complete/i,
  /payment\s+(successful|confirmed|processed)/i,
  /order\s+(placed|confirmed|completed)/i,
  // ── Símbolos de éxito ──
  /[✓✅☑]/,
  // ── DemoQA result messages ──
  /\byou\s+have\b/i,                       // "You have done a double click", "You have selected :"
  /fakepath/i,                               // "C:\fakepath\file.png" — output del file upload
  // ── Form output "Label: value" (DemoQA style) ──
  /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s*:/,   // "Full Name :", "Permanent Address :", "Email :"
  // ── Content/body text (e.g., accordion content) ──
  /\bit\s+is\s+a\b/i,                        // "It is a long established fact..."
  /\bplaceholder\s+content\b/i,
];

/**
 * Heurística para detectar si un texto largo (≥ 40 chars con ≥ 5 palabras)
 * es contenido de la página y no un elemento interactivo.
 */
function isLongContentText(text: string): boolean {
  const trimmed = text.trim();
  const words = trimmed.split(/\s+/).length;
  return trimmed.length >= 40 && words >= 5;
}

export function isResultText(text: string): boolean {
  if (text.trim().length < 5) return false;

  // Excluir textos que son claramente acciones / etiquetas de botón
  const isAction =
    /^(transferir|confirmar|aceptar|cancelar|volver|siguiente|anterior|cerrar|salir|ingresar|login|submit|ok|sí|si|no|yes|guardar|enviar|buscar|filtrar|limpiar|nuevo|agregar|editar|eliminar|ver|detalles|más|less|more|ver\s+más|load\s+more|choose\s+file|upload|download|descargar|subir|choose file|select file)$/i.test(
      text.trim(),
    );
  if (isAction) return false;

  // Texto largo con muchas palabras → contenido de página (verificación)
  if (isLongContentText(text)) return true;

  return RESULT_TEXT_PATTERNS.some(p => p.test(text));
}

// ─────────────────────────────────────────────────────────────
// PARSER DE LÍNEA INDIVIDUAL
// Reutilizado tanto por el loop principal como por el handler de popup.
// ─────────────────────────────────────────────────────────────
function parseOneLine(line: string, resultTextFn: (t: string) => boolean): any | null {
  // goto
  const gotoM = line.match(/page\.goto\(['"`](.*?)['"`]\)/);
  if (gotoM) return { action: "page_load", url: gotoM[1], raw: line };

  // dialog
  if (line.includes("page.once('dialog'") || line.includes('page.once("dialog"')) {
    return { action: "dialog_handler", value: line.includes("dismiss") ? "dismiss" : "accept", raw: line };
  }

  // press enter
  if (/\.press\(['"`](Enter|Return)['"`]\)/.test(line)) return { action: "press_enter", target: "Enter", raw: line };

  // press key (other keys: Tab, Escape, etc.)
  const pressKeyM = line.match(/\.press\(['"`](Tab|Escape|Backspace|Delete|Space|ArrowUp|ArrowDown|ArrowLeft|ArrowRight)['"`]\)/);
  if (pressKeyM) return { action: "press_key", target: pressKeyM[1], raw: line };

  // selectOption
  const selOptM = line.match(/\.selectOption\(['"`](.*?)['"`]\)/);
  if (selOptM) {
    const roleM2 = line.match(/getByRole\(['"`](.*?)['"`],\s*\{[^}]*name:\s*['"`](.*?)['"`][^}]*\}\)/);
    const locM2  = line.match(/locator\(['"`](.*?)['"`]\)/);
    const lblM2  = line.match(/getByLabel\(['"`](.*?)['"`]\)/);
    const phM2   = line.match(/getByPlaceholder\(['"`](.*?)['"`]\)/);
    let sel2 = '', tgt2 = '';
    if (roleM2)  { sel2 = `page.getByRole('${roleM2[1]}', { name: '${roleM2[2]}' })`; tgt2 = roleM2[2]; }
    else if (locM2) { sel2 = locM2[1]; tgt2 = sel2; }
    else if (lblM2)  { sel2 = `page.getByLabel('${lblM2[1]}')`; tgt2 = lblM2[1]; }
    else if (phM2)   { sel2 = `page.getByPlaceholder('${phM2[1]}')`; tgt2 = phM2[1]; }
    return { action: "select", target: tgt2 || sel2, value: selOptM[1], selector: sel2, raw: line };
  }

  // setInputFiles
  const sifM = line.match(/\.setInputFiles\(['"`](.*?)['"`]\)/);
  if (sifM) {
    const roleM3 = line.match(/getByRole\(['"`](.*?)['"`],\s*\{[^}]*name:\s*['"`](.*?)['"`][^}]*\}\)/);
    const locM3  = line.match(/locator\(['"`](.*?)['"`]\)/);
    const tgt3   = roleM3 ? roleM3[2] : (locM3 ? locM3[1] : 'file-input');
    const sel3   = roleM3 ? `page.getByRole('${roleM3[1]}', { name: '${roleM3[2]}' })` : (locM3 ? `page.locator('${locM3[1]}')` : '');
    return { action: "upload", target: tgt3, value: sifM[1], selector: sel3, raw: line };
  }

  // dblclick
  const dblRole = line.match(/getByRole\(['"`](.*?)['"`],\s*\{[^}]*name:\s*['"`](.*?)['"`][^}]*\}\)\.dblclick/);
  if (dblRole) return { action: "dblclick", target: dblRole[2], raw: line, selector: `page.getByRole('${dblRole[1]}', { name: '${dblRole[2]}' })` };
  const dblText = line.match(/getByText\(['"`](.*?)['"`]\)\.dblclick/);
  if (dblText) return { action: "dblclick", target: dblText[1], raw: line, selector: `page.getByText('${dblText[1]}')` };
  const dblLoc  = line.match(/locator\(['"`](.*?)['"`]\)\.dblclick/);
  if (dblLoc)  return { action: "dblclick", target: dblLoc[1],  raw: line, selector: `page.locator('${dblLoc[1]}')` };

  // check/uncheck
  const rChk  = line.match(/getByRole\(['"`](radio|checkbox)['"`],\s*\{[^}]*name:\s*['"`](.*?)['"`][^}]*\}\)\.check/);
  if (rChk) return { action: "check", target: rChk[2], raw: line, selector: `page.getByRole('${rChk[1]}', { name: '${rChk[2]}' })` };
  const rUnc  = line.match(/getByRole\(['"`](radio|checkbox)['"`],\s*\{[^}]*name:\s*['"`](.*?)['"`][^}]*\}\)\.uncheck/);
  if (rUnc) return { action: "uncheck", target: rUnc[2], raw: line, selector: `page.getByRole('${rUnc[1]}', { name: '${rUnc[2]}' })` };
  const rChkCl = line.match(/getByRole\(['"`](checkbox|radio)['"`],\s*\{[^}]*name:\s*['"`](.*?)['"`][^}]*\}\)\.click/);
  if (rChkCl) return { action: "check", target: rChkCl[2], raw: line, selector: `page.getByRole('${rChkCl[1]}', { name: '${rChkCl[2]}' })` };
  const lChk  = line.match(/locator\(['"`](.*?)['"`]\)\.check/);
  if (lChk) return { action: "check", target: lChk[1], raw: line, selector: `page.locator('${lChk[1]}')` };
  const lUnc  = line.match(/locator\(['"`](.*?)['"`]\)\.uncheck/);
  if (lUnc) return { action: "uncheck", target: lUnc[1], raw: line, selector: `page.locator('${lUnc[1]}')` };

  // fills
  const phFill = line.match(/getByPlaceholder\(['"`](.*?)['"`]\)\.fill\(['"`](.*?)['"`]\)/);
  if (phFill) return { action: "input", target: phFill[1], value: phFill[2], raw: line, selector: `page.getByPlaceholder('${phFill[1]}')` };
  const lblFill = line.match(/getByLabel\(['"`](.*?)['"`](?:,\s*\{[^}]*\})?\)\.fill\(['"`](.*?)['"`]\)/);
  if (lblFill) return { action: "input", target: lblFill[1], value: lblFill[2], raw: line, selector: `page.getByLabel('${lblFill[1]}')` };
  const roleFill = line.match(/getByRole\(['"`](.*?)['"`],\s*\{[^}]*name:\s*['"`](.*?)['"`][^}]*\}\)\.fill\(['"`](.*?)['"`]\)/);
  if (roleFill) return { action: "input", target: roleFill[2], value: roleFill[3], raw: line, selector: `page.getByRole('${roleFill[1]}', { name: '${roleFill[2]}' })` };
  const locFill = line.match(/locator\(['"`](.*?)['"`]\)\.fill\(['"`](.*?)['"`]\)/);
  if (locFill) return { action: "input", target: locFill[1], value: locFill[2], raw: line, selector: `page.locator('${locFill[1]}')` };

  // hover — getByRole / getByText / locator
  const hoverRoleM = line.match(/getByRole\(['"`](.*?)['"`],\s*\{[^}]*name:\s*['"`](.*?)['"`][^}]*\}\)\.hover/);
  if (hoverRoleM) return { action: "hover", target: hoverRoleM[2], raw: line, selector: `page.getByRole('${hoverRoleM[1]}', { name: '${hoverRoleM[2]}' })` };
  const hoverTextM = line.match(/getByText\(['"`](.*?)['"`]\)\.hover/);
  if (hoverTextM) return { action: "hover", target: hoverTextM[1], raw: line, selector: `page.getByText('${hoverTextM[1]}')` };
  const hoverLocM = line.match(/locator\(['"`](.*?)['"`]\)\.hover/);
  if (hoverLocM) return { action: "hover", target: hoverLocM[1], raw: line, selector: `page.locator('${hoverLocM[1]}')` };

  // right-click — click({ button: 'right' })
  const rightClickRoleM = line.match(/getByRole\(['"`](.*?)['"`],\s*\{[^}]*name:\s*['"`](.*?)['"`][^}]*\}\)\.click\([^)]*button:\s*['"`]right['"`]/);
  if (rightClickRoleM) return { action: "rightclick", target: rightClickRoleM[2], raw: line, selector: `page.getByRole('${rightClickRoleM[1]}', { name: '${rightClickRoleM[2]}' })` };
  const rightClickLocM = line.match(/locator\(['"`](.*?)['"`]\)\.click\([^)]*button:\s*['"`]right['"`]/);
  if (rightClickLocM) return { action: "rightclick", target: rightClickLocM[1], raw: line, selector: `page.locator('${rightClickLocM[1]}')` };
  const rightClickTextM = line.match(/getByText\(['"`](.*?)['"`]\)\.click\([^)]*button:\s*['"`]right['"`]/);
  if (rightClickTextM) return { action: "rightclick", target: rightClickTextM[1], raw: line, selector: `page.getByText('${rightClickTextM[1]}')` };

  // dragTo — locator().dragTo(locator())
  const dragToM = line.match(/locator\(['"`](.*?)['"`]\)\.dragTo\(.*locator\(['"`](.*?)['"`]\)/);
  if (dragToM) return { action: "drag", source: dragToM[1], target: dragToM[2], raw: line, selector: `page.locator('${dragToM[1]}')`, targetSelector: `page.locator('${dragToM[2]}')` };

  // frameLocator — page.frameLocator('selector').getByRole/getByText/locator
  const frameLocRoleM = line.match(/frameLocator\(['"`](.*?)['"`]\)\.getByRole\(['"`](.*?)['"`],\s*\{[^}]*name:\s*['"`](.*?)['"`][^}]*\}\)\.click/);
  if (frameLocRoleM) return { action: "frame_click", frameSelector: frameLocRoleM[1], target: frameLocRoleM[3], raw: line, selector: `page.frameLocator('${frameLocRoleM[1]}').getByRole('${frameLocRoleM[2]}', { name: '${frameLocRoleM[3]}' })` };
  const frameLocTextM = line.match(/frameLocator\(['"`](.*?)['"`]\)\.getByText\(['"`](.*?)['"`]\)\.click/);
  if (frameLocTextM) return { action: "frame_click", frameSelector: frameLocTextM[1], target: frameLocTextM[2], raw: line, selector: `page.frameLocator('${frameLocTextM[1]}').getByText('${frameLocTextM[2]}')` };
  const frameLocFillM = line.match(/frameLocator\(['"`](.*?)['"`]\)\.getByRole\(['"`](.*?)['"`],\s*\{[^}]*name:\s*['"`](.*?)['"`][^}]*\}\)\.fill\(['"`](.*?)['"`]\)/);
  if (frameLocFillM) return { action: "frame_fill", frameSelector: frameLocFillM[1], target: frameLocFillM[3], value: frameLocFillM[4], raw: line, selector: `page.frameLocator('${frameLocFillM[1]}').getByRole('${frameLocFillM[2]}', { name: '${frameLocFillM[3]}' })` };
  const frameLocLblFillM = line.match(/frameLocator\(['"`](.*?)['"`]\)\.getByLabel\(['"`](.*?)['"`]\)\.fill\(['"`](.*?)['"`]\)/);
  if (frameLocLblFillM) return { action: "frame_fill", frameSelector: frameLocLblFillM[1], target: frameLocLblFillM[2], value: frameLocLblFillM[3], raw: line, selector: `page.frameLocator('${frameLocLblFillM[1]}').getByLabel('${frameLocLblFillM[2]}')` };

  // clicks — role (heading/paragraph → verify)
  const roleClk = line.match(/getByRole\(['"`](.*?)['"`],\s*\{[^}]*name:\s*['"`](.*?)['"`][^}]*\}\)\.(?:first\(\)\.)?click/);
  if (roleClk) {
    const role = roleClk[1]; const name = roleClk[2];
    if (role === 'heading' || role === 'paragraph') {
      return { action: "verify", target: name, raw: line, selector: name, verifyType: "text-visible" };
    }
    const exactM = line.match(/exact:\s*(true|false)/);
    const exact = exactM ? exactM[1] === 'true' : undefined;
    const sel = exact ? `page.getByRole('${role}', { name: '${name}', exact: true })` : `page.getByRole('${role}', { name: '${name}' })`;
    return { action: "click", target: name, raw: line, selector: sel };
  }

  // clicks — text
  const txtClk = line.match(/getByText\(['"`](.*?)['"`](?:,\s*\{[^}]*\})?\)\.click/);
  if (txtClk) {
    const text = txtClk[1];
    return resultTextFn(text)
      ? { action: "verify", target: text, raw: line, selector: text, verifyType: "text-visible" }
      : { action: "click",  target: text, raw: line, selector: `page.getByText('${text}')` };
  }

  // clicks — locator variants
  const locFirst = line.match(/locator\(['"`](.*?)['"`]\)\.first\(\)\.click/);
  if (locFirst) return { action: "click", target: locFirst[1], raw: line, selector: `page.locator('${locFirst[1]}').first()` };
  const locNth   = line.match(/locator\(['"`](.*?)['"`]\)\.nth\((\d+)\)\.click/);
  if (locNth)   return { action: "click", target: locNth[1], raw: line, selector: `page.locator('${locNth[1]}').nth(${locNth[2]})` };
  const locClk   = line.match(/locator\(['"`](.*?)['"`]\)\.click/);
  if (locClk) {
    const sel = locClk[1];
    const inTxt = sel.match(/:(?:has-)?text\(['"`](.*?)['"`]\)/);
    if (inTxt && resultTextFn(inTxt[1])) return { action: "verify", target: inTxt[1], raw: line, selector: inTxt[1], verifyType: "text-visible" };
    return { action: "click", target: sel, raw: line, selector: `page.locator('${sel}')` };
  }

  // clicks — label/placeholder/altText/title/testId
  const lblClk  = line.match(/getByLabel\(['"`](.*?)['"`](?:,\s*\{[^}]*\})?\)\.click/);
  if (lblClk)  return { action: "click", target: lblClk[1], raw: line, selector: `page.getByLabel('${lblClk[1]}')` };
  const phClk   = line.match(/getByPlaceholder\(['"`](.*?)['"`]\)\.click/);
  if (phClk)   return { action: "click", target: phClk[1], raw: line, selector: `page.getByPlaceholder('${phClk[1]}')` };
  const altClk  = line.match(/getByAltText\(['"`](.*?)['"`](?:,\s*\{[^}]*\})?\)\.click/);
  if (altClk)  return { action: "click", target: altClk[1], raw: line, selector: `page.getByAltText('${altClk[1]}')` };
  const titClk  = line.match(/getByTitle\(['"`](.*?)['"`](?:,\s*\{[^}]*\})?\)\.click/);
  if (titClk)  return { action: "click", target: titClk[1], raw: line, selector: `page.getByTitle('${titClk[1]}')` };
  const tidClk  = line.match(/getByTestId\(['"`](.*?)['"`]\)\.click/);
  if (tidClk)  return { action: "click", target: tidClk[1], raw: line, selector: `page.getByTestId('${tidClk[1]}')` };

  // expect assertions
  const expVis = line.match(/expect\(.*getByText\(['"`](.*?)['"`].*\)\)\.toBeVisible/);
  if (expVis) return { action: "verify", target: expVis[1], raw: line, selector: expVis[1], verifyType: "text-visible" };
  const expTxt = line.match(/expect\(.*\)\.toHaveText\(['"`](.*?)['"`]/);
  if (expTxt) return { action: "verify", target: expTxt[1], raw: line, selector: expTxt[1], verifyType: "text-exact" };

  return null;
}

// ─────────────────────────────────────────────────────────────
// PARSER PRINCIPAL
// ─────────────────────────────────────────────────────────────
export function parseRecording(filePath: string): any[] {
  const content = fs.readFileSync(filePath, "utf-8");
  const rawSteps: any[] = [];
  const lines = content.split("\n");

  // ── Estado para manejo de popups / nuevas pestañas ──────────────────
  // Detecta el patrón de Playwright codegen:
  //   const page1Promise = page.waitForEvent('popup');
  //   await page.getByRole(...).click();
  //   const page1 = await page1Promise;
  //   await page1.getByRole(...).click();
  let pendingPopupPromiseVar: string | null = null;  // nombre de la var promise
  const popupPageVars = new Set<string>();            // vars que son popup pages

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*")) continue;

    // ─────────────────────────────────────────
    // 🔥 POPUP  const pageXPromise = page.waitForEvent('popup')
    // ─────────────────────────────────────────
    const popupPromiseM = line.match(/const\s+(\w+)\s*=\s*page\.waitForEvent\(['"`]popup['"`]\)/);
    if (popupPromiseM) {
      pendingPopupPromiseVar = popupPromiseM[1];
      continue;
    }

    // ─────────────────────────────────────────
    // 🔥 POPUP  const pageX = await pageXPromise
    // ─────────────────────────────────────────
    if (pendingPopupPromiseVar) {
      const popupAssignM = line.match(new RegExp(`const\\s+(\\w+)\\s*=\\s*await\\s+${pendingPopupPromiseVar}`));
      if (popupAssignM) {
        popupPageVars.add(popupAssignM[1]);
        pendingPopupPromiseVar = null;
        continue;
      }
    }

    // ─────────────────────────────────────────
    // 🔥 ACCIÓN EN POPUP PAGE  pageX.getByRole/getByText/etc.
    // ─────────────────────────────────────────
    // Detectar si la línea empieza con una var de popup conocida
    let popupLinePageVar: string | null = null;
    for (const pv of popupPageVars) {
      if (trimmed.startsWith(`await ${pv}.`) || trimmed.startsWith(`${pv}.`)) {
        popupLinePageVar = pv;
        break;
      }
    }
    if (popupLinePageVar) {
      // Normalizar: reemplazar la var popup por 'page' para reutilizar los parsers
      const nl = line.replace(
        new RegExp(`(await\\s+)?${popupLinePageVar}\\.`),
        (_m, aw) => `${aw || ''}page.`
      );
      // Parsear la línea normalizada con los mismos patrones del main loop
      const ps = parseOneLine(nl, isResultText);
      if (ps) rawSteps.push({ ...ps, pageRef: 'popup' });
      continue;
    }

    // Ignorar imports, test() wrapper y expect() de setup
    if (/^\s*(import|export|const\s+\w+\s*=|let\s+\w+|var\s+\w+|\/\/|\/\*)/.test(trimmed)) continue;

    // ─────────────────────────────────────────
    // 🔥 NAVIGATION  goto()
    // ─────────────────────────────────────────
    const goto = line.match(/page\.goto\(['"`](.*?)['"`]\)/);
    if (goto) {
      rawSteps.push({ action: "page_load", url: goto[1], raw: line });
      continue;
    }

    // ─────────────────────────────────────────
    // 🔥 DIALOG HANDLER  page.once('dialog', ...)
    // ─────────────────────────────────────────
    if (line.includes("page.once('dialog'") || line.includes('page.once("dialog"')) {
      const isDismiss = line.includes("dismiss");
      rawSteps.push({ action: "dialog_handler", value: isDismiss ? "dismiss" : "accept", raw: line });
      continue;
    }

    // ─────────────────────────────────────────
    // 🔥 PRESS ENTER  → disparo de formulario
    // ─────────────────────────────────────────
    const pressEnter = line.match(/\.press\(['"`](Enter|Return)['"`]\)/);
    if (pressEnter) {
      rawSteps.push({ action: "press_enter", target: "Enter", raw: line });
      continue;
    }

    // ─────────────────────────────────────────
    // 🔥 PRESS KEY  (Tab, Escape, etc.) — solo teclas semánticas útiles
    // ─────────────────────────────────────────
    const pressKeyMain = line.match(/\.press\(['"`](Tab|Escape|Space|Backspace|Delete|ArrowUp|ArrowDown|ArrowLeft|ArrowRight)['"`]\)/);
    if (pressKeyMain) {
      rawSteps.push({ action: "press_key", target: pressKeyMain[1], raw: line });
      continue;
    }

    // Ignorar teclas de control no semánticas
    if (/\.press\(['"`](CapsLock|Shift|Control|Alt|Meta|F\d+|Home|End|PageUp|PageDown)['"`]\)/.test(line)) continue;

    // ─────────────────────────────────────────
    // 🔥 HOVER  — genera submenús y tooltips
    // ─────────────────────────────────────────
    if (line.includes('.hover(')) {
      const hvRoleM = line.match(/getByRole\(['"`](.*?)['"`],\s*\{[^}]*name:\s*['"`](.*?)['"`][^}]*\}\)\.hover/);
      if (hvRoleM) {
        rawSteps.push({ action: "hover", target: hvRoleM[2], raw: line, selector: `page.getByRole('${hvRoleM[1]}', { name: '${hvRoleM[2]}' })` });
        continue;
      }
      const hvTextM = line.match(/getByText\(['"`](.*?)['"`]\)\.hover/);
      if (hvTextM) {
        rawSteps.push({ action: "hover", target: hvTextM[1], raw: line, selector: `page.getByText('${hvTextM[1]}')` });
        continue;
      }
      const hvLocM = line.match(/locator\(['"`](.*?)['"`]\)\.hover/);
      if (hvLocM) {
        rawSteps.push({ action: "hover", target: hvLocM[1], raw: line, selector: `page.locator('${hvLocM[1]}')` });
        continue;
      }
    }

    // ─────────────────────────────────────────
    // 🔥 RIGHT-CLICK  — click({ button: 'right' })
    // ─────────────────────────────────────────
    if (line.includes("button: 'right'") || line.includes('button: "right"')) {
      const rcRoleM = line.match(/getByRole\(['"`](.*?)['"`],\s*\{[^}]*name:\s*['"`](.*?)['"`][^}]*\}\)\.click/);
      if (rcRoleM) {
        rawSteps.push({ action: "rightclick", target: rcRoleM[2], raw: line, selector: `page.getByRole('${rcRoleM[1]}', { name: '${rcRoleM[2]}' })` });
        continue;
      }
      const rcLocM = line.match(/locator\(['"`](.*?)['"`]\)\.click/);
      if (rcLocM) {
        rawSteps.push({ action: "rightclick", target: rcLocM[1], raw: line, selector: `page.locator('${rcLocM[1]}')` });
        continue;
      }
      const rcTextM = line.match(/getByText\(['"`](.*?)['"`]\)\.click/);
      if (rcTextM) {
        rawSteps.push({ action: "rightclick", target: rcTextM[1], raw: line, selector: `page.getByText('${rcTextM[1]}')` });
        continue;
      }
    }

    // ─────────────────────────────────────────
    // 🔥 DRAG AND DROP  — locator().dragTo()
    // ─────────────────────────────────────────
    if (line.includes('.dragTo(')) {
      const dtM = line.match(/locator\(['"`](.*?)['"`]\)\.dragTo\(.*?locator\(['"`](.*?)['"`]\)/);
      if (dtM) {
        rawSteps.push({ action: "drag", source: dtM[1], target: dtM[2], raw: line, selector: `page.locator('${dtM[1]}')`, targetSelector: `page.locator('${dtM[2]}')` });
        continue;
      }
    }

    // ─────────────────────────────────────────
    // 🔥 FRAME LOCATOR  — page.frameLocator('sel').getBy*/locator
    // ─────────────────────────────────────────
    if (line.includes('.frameLocator(')) {
      const flRoleClickM = line.match(/frameLocator\(['"`](.*?)['"`]\)\.getByRole\(['"`](.*?)['"`],\s*\{[^}]*name:\s*['"`](.*?)['"`][^}]*\}\)\.click/);
      if (flRoleClickM) {
        rawSteps.push({ action: "frame_click", frameSelector: flRoleClickM[1], target: flRoleClickM[3], raw: line, selector: `page.frameLocator('${flRoleClickM[1]}').getByRole('${flRoleClickM[2]}', { name: '${flRoleClickM[3]}' })` });
        continue;
      }
      const flTextClickM = line.match(/frameLocator\(['"`](.*?)['"`]\)\.getByText\(['"`](.*?)['"`]\)\.click/);
      if (flTextClickM) {
        rawSteps.push({ action: "frame_click", frameSelector: flTextClickM[1], target: flTextClickM[2], raw: line, selector: `page.frameLocator('${flTextClickM[1]}').getByText('${flTextClickM[2]}')` });
        continue;
      }
      const flRoleFillM = line.match(/frameLocator\(['"`](.*?)['"`]\)\.getByRole\(['"`](.*?)['"`],\s*\{[^}]*name:\s*['"`](.*?)['"`][^}]*\}\)\.fill\(['"`](.*?)['"`]\)/);
      if (flRoleFillM) {
        rawSteps.push({ action: "frame_fill", frameSelector: flRoleFillM[1], target: flRoleFillM[3], value: flRoleFillM[4], raw: line, selector: `page.frameLocator('${flRoleFillM[1]}').getByRole('${flRoleFillM[2]}', { name: '${flRoleFillM[3]}' })` });
        continue;
      }
      const flLblFillM = line.match(/frameLocator\(['"`](.*?)['"`]\)\.getByLabel\(['"`](.*?)['"`]\)\.fill\(['"`](.*?)['"`]\)/);
      if (flLblFillM) {
        rawSteps.push({ action: "frame_fill", frameSelector: flLblFillM[1], target: flLblFillM[2], value: flLblFillM[3], raw: line, selector: `page.frameLocator('${flLblFillM[1]}').getByLabel('${flLblFillM[2]}')` });
        continue;
      }
      // frame + locator click
      const flLocClickM = line.match(/frameLocator\(['"`](.*?)['"`]\)\.locator\(['"`](.*?)['"`]\)\.click/);
      if (flLocClickM) {
        rawSteps.push({ action: "frame_click", frameSelector: flLocClickM[1], target: flLocClickM[2], raw: line, selector: `page.frameLocator('${flLocClickM[1]}').locator('${flLocClickM[2]}')` });
        continue;
      }
      // frame + locator fill
      const flLocFillM = line.match(/frameLocator\(['"`](.*?)['"`]\)\.locator\(['"`](.*?)['"`]\)\.fill\(['"`](.*?)['"`]\)/);
      if (flLocFillM) {
        rawSteps.push({ action: "frame_fill", frameSelector: flLocFillM[1], target: flLocFillM[2], value: flLocFillM[3], raw: line, selector: `page.frameLocator('${flLocFillM[1]}').locator('${flLocFillM[2]}')` });
        continue;
      }
      // frame genérico → skip sin crashear
      continue;
    }

    // ─────────────────────────────────────────
    // 🔥 CONTENT FRAME  locator('#id').contentFrame()...
    // ─────────────────────────────────────────
    if (line.includes(".contentFrame()")) {
      const frameRoleClick = line.match(
        /locator\(['"`](.*?)['"`]\)\.contentFrame\(\)\.getByRole\(['"`](.*?)['"`],\s*\{[^}]*name:\s*['"`](.*?)['"`][^}]*\}\)\.click/,
      );
      if (frameRoleClick) {
        const role = frameRoleClick[2];
        const name = frameRoleClick[3];
        // headings/paragraphs en iframes son verificaciones de contenido
        if (role === "heading" || role === "paragraph") {
          rawSteps.push({ action: "verify", target: name, raw: line, selector: name, verifyType: "text-visible" });
        } else {
          rawSteps.push({ action: "click", target: name, raw: line, selector: name });
        }
        continue;
      }
      const frameTextClick = line.match(
        /locator\(['"`](.*?)['"`]\)\.contentFrame\(\)\.getByText\(['"`](.*?)['"`]\)\.click/,
      );
      if (frameTextClick) {
        const text = frameTextClick[2];
        rawSteps.push({
          action: isResultText(text) ? "verify" : "click",
          target: text,
          raw: line,
          selector: text,
          ...(isResultText(text) ? { verifyType: "text-visible" } : {}),
        });
        continue;
      }
      // Cualquier otra interacción en iframe → skip (demasiado contextual)
      continue;
    }

    // ─────────────────────────────────────────
    // 🔥 SELECT OPTION  (cualquier locator: locator, getByRole, getByLabel, getByPlaceholder)
    // ─────────────────────────────────────────
    const selectOptionMatch = line.match(/\.selectOption\(['"`](.*?)['"`]\)/);
    if (selectOptionMatch) {
      let selector = "";
      let target = "";
      const locM = line.match(/locator\(['"`](.*?)['"`]\)/);
      const roleM = line.match(/getByRole\(['"`](.*?)['"`],\s*\{[^}]*name:\s*['"`](.*?)['"`][^}]*\}\)/);
      const labelM = line.match(/getByLabel\(['"`](.*?)['"`]\)/);
      const placeholderM = line.match(/getByPlaceholder\(['"`](.*?)['"`]\)/);
      if (locM) { selector = locM[1]; target = selector; }
      else if (roleM) { selector = `page.getByRole('${roleM[1]}', { name: '${roleM[2]}' })`; target = roleM[2]; }
      else if (labelM) { selector = `page.getByLabel('${labelM[1]}')`; target = labelM[1]; }
      else if (placeholderM) { selector = `page.getByPlaceholder('${placeholderM[1]}')`; target = placeholderM[1]; }
      rawSteps.push({ action: "select", target: target || selector, value: selectOptionMatch[1], selector, raw: line });
      continue;
    }

    // ─────────────────────────────────────────
    // 🔥 SET INPUT FILES  (file upload)
    // ─────────────────────────────────────────
    const setInputFilesMatch = line.match(/\.setInputFiles\(['"`](.*?)['"`]\)/);
    if (setInputFilesMatch) {
      let uploadTarget = "file-input";
      let uploadSelector = "";
      const roleM = line.match(/getByRole\(['"`](.*?)['"`],\s*\{[^}]*name:\s*['"`](.*?)['"`][^}]*\}\)/);
      const locM = line.match(/locator\(['"`](.*?)['"`]\)/);
      if (roleM) { uploadTarget = roleM[2]; uploadSelector = `page.getByRole('${roleM[1]}', { name: '${roleM[2]}' })`; }
      else if (locM) { uploadTarget = locM[1]; uploadSelector = `page.locator('${locM[1]}')`; }
      rawSteps.push({ action: "upload", target: uploadTarget, value: setInputFilesMatch[1], selector: uploadSelector, raw: line });
      continue;
    }

    // ─────────────────────────────────────────
    // 🔥 DBLCLICK  (antes que click para no confundirse)
    // ─────────────────────────────────────────
    const dblRoleM = line.match(/getByRole\(['"`](.*?)['"`],\s*\{[^}]*name:\s*['"`](.*?)['"`][^}]*\}\)\.dblclick/);
    if (dblRoleM) {
      rawSteps.push({ action: "dblclick", target: dblRoleM[2], raw: line, selector: `page.getByRole('${dblRoleM[1]}', { name: '${dblRoleM[2]}' })` });
      continue;
    }
    const dblTextM = line.match(/getByText\(['"`](.*?)['"`]\)\.dblclick/);
    if (dblTextM) {
      rawSteps.push({ action: "dblclick", target: dblTextM[1], raw: line, selector: `page.getByText('${dblTextM[1]}')` });
      continue;
    }
    const dblLocM = line.match(/locator\(['"`](.*?)['"`]\)\.dblclick/);
    if (dblLocM) {
      rawSteps.push({ action: "dblclick", target: dblLocM[1], raw: line, selector: `page.locator('${dblLocM[1]}')` });
      continue;
    }

    // ─────────────────────────────────────────
    // 🔥 CHECK / UNCHECK  (radio & checkbox)
    // ─────────────────────────────────────────
    // getByRole(checkbox/radio).check()
    const roleCheckM = line.match(/getByRole\(['"`](radio|checkbox)['"`],\s*\{[^}]*name:\s*['"`](.*?)['"`][^}]*\}\)\.check/);
    if (roleCheckM) {
      rawSteps.push({ action: "check", target: roleCheckM[2], raw: line, selector: `page.getByRole('${roleCheckM[1]}', { name: '${roleCheckM[2]}' })` });
      continue;
    }
    // getByRole(checkbox/radio).uncheck()
    const roleUncheckM = line.match(/getByRole\(['"`](radio|checkbox)['"`],\s*\{[^}]*name:\s*['"`](.*?)['"`][^}]*\}\)\.uncheck/);
    if (roleUncheckM) {
      rawSteps.push({ action: "uncheck", target: roleUncheckM[2], raw: line, selector: `page.getByRole('${roleUncheckM[1]}', { name: '${roleUncheckM[2]}' })` });
      continue;
    }
    // getByRole(checkbox/radio).click() → tratamos como check (equivalente en la mayoría de frameworks)
    const checkboxClickM = line.match(/getByRole\(['"`](checkbox|radio)['"`],\s*\{[^}]*name:\s*['"`](.*?)['"`][^}]*\}\)\.click/);
    if (checkboxClickM) {
      rawSteps.push({ action: "check", target: checkboxClickM[2], raw: line, selector: `page.getByRole('${checkboxClickM[1]}', { name: '${checkboxClickM[2]}' })` });
      continue;
    }
    // locator().check() / uncheck()
    const locCheckM = line.match(/locator\(['"`](.*?)['"`]\)\.check/);
    if (locCheckM) {
      rawSteps.push({ action: "check", target: locCheckM[1], raw: line, selector: `page.locator('${locCheckM[1]}')` });
      continue;
    }
    const locUncheckM = line.match(/locator\(['"`](.*?)['"`]\)\.uncheck/);
    if (locUncheckM) {
      rawSteps.push({ action: "uncheck", target: locUncheckM[1], raw: line, selector: `page.locator('${locUncheckM[1]}')` });
      continue;
    }

    // ─────────────────────────────────────────
    // 🔥 GETBYPLACEHOLDER  fill / click
    // ─────────────────────────────────────────
    const phFillM = line.match(/getByPlaceholder\(['"`](.*?)['"`]\)\.fill\(['"`](.*?)['"`]\)/);
    if (phFillM) {
      rawSteps.push({ action: "input", target: phFillM[1], value: phFillM[2], raw: line, selector: `page.getByPlaceholder('${phFillM[1]}')` });
      continue;
    }
    const phClickM = line.match(/getByPlaceholder\(['"`](.*?)['"`]\)\.click/);
    if (phClickM) {
      rawSteps.push({ action: "click", target: phClickM[1], raw: line, selector: `page.getByPlaceholder('${phClickM[1]}')` });
      continue;
    }

    // ─────────────────────────────────────────
    // 🔥 GETBYLABEL  fill / click
    // ─────────────────────────────────────────
    const lblFillM = line.match(/getByLabel\(['"`](.*?)['"`](?:,\s*\{[^}]*\})?\)\.fill\(['"`](.*?)['"`]\)/);
    if (lblFillM) {
      rawSteps.push({ action: "input", target: lblFillM[1], value: lblFillM[2], raw: line, selector: `page.getByLabel('${lblFillM[1]}')` });
      continue;
    }
    const lblClickM = line.match(/getByLabel\(['"`](.*?)['"`](?:,\s*\{[^}]*\})?\)\.click/);
    if (lblClickM) {
      rawSteps.push({ action: "click", target: lblClickM[1], raw: line, selector: `page.getByLabel('${lblClickM[1]}')` });
      continue;
    }

    // ─────────────────────────────────────────
    // 🔥 GETBYALTTEXT  click
    // ─────────────────────────────────────────
    const altClickM = line.match(/getByAltText\(['"`](.*?)['"`](?:,\s*\{[^}]*\})?\)\.click/);
    if (altClickM) {
      rawSteps.push({ action: "click", target: altClickM[1], raw: line, selector: `page.getByAltText('${altClickM[1]}')` });
      continue;
    }

    // ─────────────────────────────────────────
    // 🔥 GETBYTITLE  click
    // ─────────────────────────────────────────
    const titleClickM = line.match(/getByTitle\(['"`](.*?)['"`](?:,\s*\{[^}]*\})?\)\.click/);
    if (titleClickM) {
      rawSteps.push({ action: "click", target: titleClickM[1], raw: line, selector: `page.getByTitle('${titleClickM[1]}')` });
      continue;
    }

    // ─────────────────────────────────────────
    // 🔥 OPTION + STRONG CLICK
    // ─────────────────────────────────────────
    const optStrongM = line.match(
      /getByRole\(['"`]option['"`],\s*\{[^}]*name:\s*['"`](.*?)['"`][^}]*\}\)\.getByRole\(['"`]strong['"`]\)\.click/,
    );
    if (optStrongM) {
      rawSteps.push({ action: "click", target: optStrongM[1], raw: line, selector: `page.getByRole('option', { name: '${optStrongM[1]}' }).getByRole('strong')` });
      continue;
    }

    // ─────────────────────────────────────────
    // 🔥 LIST PATTERNS
    // ─────────────────────────────────────────
    // getByRole('list').getByText('...').click()
    const listTextM = line.match(/getByRole\(['"`]list['"`]\)\.getByText\(['"`](.*?)['"`]\)\.click/);
    if (listTextM) {
      rawSteps.push({ action: "click", target: listTextM[1], raw: line, selector: buildPlaywrightSelector({ type: "list-text", text: listTextM[1] }) });
      continue;
    }
    // getByRole('listitem').filter({ hasText: '...' }).click()
    const listItemFilterStrM = line.match(/getByRole\(['"`]listitem['"`]\)\.filter\(\{\s*hasText:\s*['"`](.*?)['"`]\s*\}\)\.click/);
    if (listItemFilterStrM) {
      rawSteps.push({ action: "click", target: listItemFilterStrM[1], raw: line, selector: `page.getByRole('listitem').filter({ hasText: '${listItemFilterStrM[1]}' })` });
      continue;
    }
    // getByRole('listitem').filter({ hasText: /regex/ }).click()
    const listItemFilterRexM = line.match(/getByRole\(['"`]listitem['"`]\)\.filter\(\{\s*hasText:\s*\/(.*?)\/\s*\}\)\.click/);
    if (listItemFilterRexM) {
      rawSteps.push({ action: "click", target: listItemFilterRexM[1], raw: line, selector: `page.getByRole('listitem').filter({ hasText: /${listItemFilterRexM[1]}/ })` });
      continue;
    }

    // ─────────────────────────────────────────
    // 🔥 getByRole('paragraph').getByText() → verificación de resultado
    // ─────────────────────────────────────────
    const paraTextM = line.match(/getByRole\(['"`]paragraph['"`]\)\.getByText\(['"`](.*?)['"`]\)\.click/);
    if (paraTextM) {
      rawSteps.push({ action: "verify", target: paraTextM[1], raw: line, selector: paraTextM[1], verifyType: "text-visible" });
      continue;
    }

    // ─────────────────────────────────────────
    // 🔥 ROLE CLICK  (cualquier rol, incluye exact:true)
    // ─────────────────────────────────────────
    const roleClickM = line.match(/getByRole\(['"`](.*?)['"`],\s*\{[^}]*name:\s*['"`](.*?)['"`][^}]*\}\)\.click/);
    if (roleClickM) {
      const role = roleClickM[1];
      const name = roleClickM[2];
      const exactM = line.match(/exact:\s*(true|false)/);
      const exact = exactM ? exactM[1] === "true" : undefined;
      const sel = exact
        ? `page.getByRole('${role}', { name: '${name}', exact: true })`
        : buildPlaywrightSelector({ type: "role", role, name });
      rawSteps.push({ action: "click", target: name, raw: line, selector: sel });
      continue;
    }

    // ─────────────────────────────────────────
    // 🔥 ROLE FILL
    // ─────────────────────────────────────────
    const roleFillM = line.match(/getByRole\(['"`](.*?)['"`],\s*\{[^}]*name:\s*['"`](.*?)['"`][^}]*\}\)\.fill\(['"`](.*?)['"`]\)/);
    if (roleFillM) {
      rawSteps.push({ action: "input", target: roleFillM[2], value: roleFillM[3], raw: line, selector: buildPlaywrightSelector({ type: "role", role: roleFillM[1], name: roleFillM[2] }) });
      continue;
    }

    // ─────────────────────────────────────────
    // 🔥 GETBYTEXT CLICK  (distinguir click de verificación)
    // ─────────────────────────────────────────
    const textClickM = line.match(/(?<![.]getByRole[^.]*\.)getByText\(['"`](.*?)['"`](?:,\s*\{[^}]*\})?\)\.click/);
    if (textClickM) {
      const text = textClickM[1];
      if (isResultText(text)) {
        rawSteps.push({ action: "verify", target: text, raw: line, selector: text, verifyType: "text-visible" });
      } else {
        rawSteps.push({ action: "click", target: text, raw: line, selector: buildPlaywrightSelector({ type: "text", text }) });
      }
      continue;
    }

    // ─────────────────────────────────────────
    // 🔥 LOCATOR .first().click() y .nth(n).click()
    // ─────────────────────────────────────────
    const locFirstClickM = line.match(/locator\(['"`](.*?)['"`]\)\.first\(\)\.click/);
    if (locFirstClickM) {
      rawSteps.push({ action: "click", target: locFirstClickM[1], raw: line, selector: `page.locator('${locFirstClickM[1]}').first()` });
      continue;
    }
    const locNthClickM = line.match(/locator\(['"`](.*?)['"`]\)\.nth\((\d+)\)\.click/);
    if (locNthClickM) {
      rawSteps.push({ action: "click", target: locNthClickM[1], raw: line, selector: `page.locator('${locNthClickM[1]}').nth(${locNthClickM[2]})` });
      continue;
    }

    // ─────────────────────────────────────────
    // 🔥 LOCATOR CLICK / FILL  (genérico)
    // ─────────────────────────────────────────
    const locClickM = line.match(/locator\(['"`](.*?)['"`]\)\.click/);
    if (locClickM) {
      const sel = locClickM[1];
      const textInLoc = sel.match(/:(?:has-)?text\(['"`](.*?)['"`]\)/);
      if (textInLoc && isResultText(textInLoc[1])) {
        rawSteps.push({ action: "verify", target: textInLoc[1], raw: line, selector: textInLoc[1], verifyType: "text-visible" });
      } else {
        rawSteps.push({ action: "click", target: sel, raw: line, selector: buildPlaywrightSelector({ type: "css", selector: sel }) });
      }
      continue;
    }
    const locFillM = line.match(/locator\(['"`](.*?)['"`]\)\.fill\(['"`](.*?)['"`]\)/);
    if (locFillM) {
      rawSteps.push({ action: "input", target: locFillM[1], value: locFillM[2], raw: line, selector: buildPlaywrightSelector({ type: "css", selector: locFillM[1] }) });
      continue;
    }

    // ─────────────────────────────────────────
    // 🔥 GETBYTESTID  click / fill
    // ─────────────────────────────────────────
    const testIdClickM = line.match(/getByTestId\(['"`](.*?)['"`]\)\.click/);
    if (testIdClickM) {
      rawSteps.push({ action: "click", target: testIdClickM[1], raw: line, selector: `page.getByTestId('${testIdClickM[1]}')` });
      continue;
    }
    const testIdFillM = line.match(/getByTestId\(['"`](.*?)['"`]\)\.fill\(['"`](.*?)['"`]\)/);
    if (testIdFillM) {
      rawSteps.push({ action: "input", target: testIdFillM[1], value: testIdFillM[2], raw: line, selector: `page.getByTestId('${testIdFillM[1]}')` });
      continue;
    }

    // ─────────────────────────────────────────
    // 🔥 BUTTON .first().click()  (patrón específico de Playwright codegen)
    // ─────────────────────────────────────────
    const btnFirstM = line.match(/getByRole\(['"`]button['"`],\s*\{[^}]*name:\s*['"`](.*?)['"`][^}]*\}\)\.first\(\)\.click/);
    if (btnFirstM) {
      rawSteps.push({ action: "click", target: btnFirstM[1], raw: line, selector: `page.getByRole('button', { name: '${btnFirstM[1]}' }).first()` });
      continue;
    }

    // ─────────────────────────────────────────
    // 🔥 CHAINED .getByText(...).click()  (ej: page.getByRole('nav').getByText('...'))
    // ─────────────────────────────────────────
    const chainedTextM = line.match(/\.getByText\(['"`](.*?)['"`]\)\.click/);
    if (chainedTextM) {
      const text = chainedTextM[1];
      if (isResultText(text)) {
        rawSteps.push({ action: "verify", target: text, raw: line, selector: text, verifyType: "text-visible" });
      } else {
        rawSteps.push({ action: "click", target: text, raw: line, selector: buildPlaywrightSelector({ type: "text", text }) });
      }
      continue;
    }

    // ─────────────────────────────────────────
    // 🔥 EXPECT / ASSERTIONS del recording
    // ─────────────────────────────────────────
    const expectVisibleM = line.match(/expect\(.*getByText\(['"`](.*?)['"`].*\)\)\.toBeVisible/);
    if (expectVisibleM) {
      rawSteps.push({ action: "verify", target: expectVisibleM[1], raw: line, selector: expectVisibleM[1], verifyType: "text-visible" });
      continue;
    }
    const expectTextM = line.match(/expect\(.*\)\.toHaveText\(['"`](.*?)['"`]/);
    if (expectTextM) {
      rawSteps.push({ action: "verify", target: expectTextM[1], raw: line, selector: expectTextM[1], verifyType: "text-exact" });
      continue;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // POST-PROCESADO: Deduplicar fills  → conservar SÓLO el último
  // fill por selector (elimina tipeos intermedios de CapsLock etc.)
  // ─────────────────────────────────────────────────────────────
  const fillLastIdx = new Map<string, number>();
  rawSteps.forEach((s, i) => {
    if (s.action === "input" || s.action === "fill") {
      fillLastIdx.set(s.selector || s.target, i);
    }
  });

  const steps: any[] = [];
  rawSteps.forEach((s, i) => {
    if (s.action === "input" || s.action === "fill") {
      const key = s.selector || s.target;
      if (fillLastIdx.get(key) === i) steps.push(s); // sólo el último
    } else {
      steps.push(s);
    }
  });

  // ── Post-procesado: marcar popup triggers ──────────────────────────
  // El click en la página principal que antecede a acciones de popup
  // debe marcarse con popupTrigger:true para que el ui-agent genere
  // el waitForEvent('popup') + Promise.all correspondiente.
  for (let i = 1; i < steps.length; i++) {
    if (steps[i].pageRef === 'popup' && steps[i - 1].action === 'click' && !steps[i - 1].pageRef) {
      steps[i - 1] = { ...steps[i - 1], popupTrigger: true };
    }
  }

  return steps;
}
