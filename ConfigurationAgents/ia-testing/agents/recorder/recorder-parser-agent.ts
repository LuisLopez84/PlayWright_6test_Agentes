import fs from "fs";
import { buildPlaywrightSelector } from "../../utils/selector-builder";
import { Action } from "../../types/action.types"; // Risk 1: tipo canónico

// ─────────────────────────────────────────────────────────────
// DETECCIÓN DE TEXTO DE RESULTADO / VERIFICACIÓN
// ─────────────────────────────────────────────────────────────
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
  // ── Português ──  Risk 5
  /\bsucesso\b/i,
  /\bconclu[ií]d[ao]\b/i,
  /opera[çc][aã]o\s+(conclu[ií]da|realizada|aprovada)/i,
  /pagamento\s+(realizado|confirmado|aprovado)/i,
  /\benviad[ao]\b/i,
  // ── Français ──  Risk 5
  /\bsucc[eè]s\b/i,
  /\bconfirm[eé]e?\b/i,
  /\btermin[eé]e?\b/i,
  /\benvoy[eé]e?\b/i,
  /op[eé]ration\s+(r[eé]ussie?|valid[eé]e?|confirm[eé]e?)/i,
  /paiement\s+(effectu[eé]|confirm[eé]|valid[eé])/i,
  // ── Símbolos de éxito ──
  /[✓✅☑]/,
  // ── DemoQA result messages ──
  /\byou\s+have\b/i,
  /fakepath/i,
  // ── Form output "Label: value" (DemoQA style) ──
  /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s*:/,
  // ── Content/body text ──
  /\bit\s+is\s+a\b/i,
  /\bplaceholder\s+content\b/i,
];

function isLongContentText(text: string): boolean {
  const trimmed = text.trim();
  return trimmed.length >= 40 && trimmed.split(/\s+/).length >= 5;
}

export function isResultText(text: string): boolean {
  if (text.trim().length < 5) return false;
  const isAction =
    /^(transferir|confirmar|aceptar|cancelar|volver|siguiente|anterior|cerrar|salir|ingresar|login|submit|ok|sí|si|no|yes|guardar|enviar|buscar|filtrar|limpiar|nuevo|agregar|editar|eliminar|ver|detalles|más|less|more|ver\s+más|load\s+more|choose\s+file|upload|download|descargar|subir|choose file|select file)$/i.test(
      text.trim(),
    );
  if (isAction) return false;
  if (isLongContentText(text)) return true;
  return RESULT_TEXT_PATTERNS.some(p => p.test(text));
}

// ─────────────────────────────────────────────────────────────
// Risk 6: Extracción robusta de valores fill con comillas escapadas
// ─────────────────────────────────────────────────────────────
function extractFillValue(line: string): string | null {
  const idx = line.indexOf('.fill(');
  if (idx === -1) return null;
  const start = idx + 6;
  if (start >= line.length) return null;
  const q = line[start];
  if (q !== "'" && q !== '"' && q !== '`') return null;
  let val = '';
  let i = start + 1;
  while (i < line.length) {
    if (line[i] === '\\' && i + 1 < line.length) { val += line[i + 1]; i += 2; }
    else if (line[i] === q) { return val; }
    else { val += line[i++]; }
  }
  return null;
}

// Risk 9: escapa caracteres que rompen template strings en el selector generado
function safeRegexContent(raw: string): string {
  return raw.replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
}

// ─────────────────────────────────────────────────────────────
// PARSER DE LÍNEA INDIVIDUAL
// Risk 2: mantener en sync EXACTO con el loop principal para que
//         las acciones de popup se detecten con los mismos patrones.
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
  if (/\.press\(['"`](Enter|Return)['"`]\)/.test(line))
    return { action: "press_enter", target: "Enter", raw: line };

  // press key
  const pressKeyM = line.match(/\.press\(['"`](Tab|Escape|Backspace|Delete|Space|ArrowUp|ArrowDown|ArrowLeft|ArrowRight)['"`]\)/);
  if (pressKeyM) return { action: "press_key", target: pressKeyM[1], raw: line };

  // selectOption
  const selOptM = line.match(/\.selectOption\(['"`](.*?)['"`]\)/);
  if (selOptM) {
    const rM = line.match(/getByRole\(['"`](.*?)['"`],\s*\{[^}]*name:\s*['"`](.*?)['"`][^}]*\}\)/);
    const lM = line.match(/locator\(['"`](.*?)['"`]\)/);
    const bM = line.match(/getByLabel\(['"`](.*?)['"`](?:,\s*\{[^}]*\})?\)/);
    const pM = line.match(/getByPlaceholder\(['"`](.*?)['"`]\)/);
    let sel = '', tgt = '';
    if (rM)       { sel = `page.getByRole('${rM[1]}', { name: '${rM[2]}' })`; tgt = rM[2]; }
    else if (lM)  { sel = lM[1]; tgt = sel; }
    else if (bM)  { sel = `page.getByLabel('${bM[1]}')`; tgt = bM[1]; }
    else if (pM)  { sel = `page.getByPlaceholder('${pM[1]}')`; tgt = pM[1]; }
    return { action: "select", target: tgt || sel, value: selOptM[1], selector: sel, raw: line };
  }

  // setInputFiles
  const sifM = line.match(/\.setInputFiles\(['"`](.*?)['"`]\)/);
  if (sifM) {
    const rM = line.match(/getByRole\(['"`](.*?)['"`],\s*\{[^}]*name:\s*['"`](.*?)['"`][^}]*\}\)/);
    const lM = line.match(/locator\(['"`](.*?)['"`]\)/);
    const tgt = rM ? rM[2] : (lM ? lM[1] : 'file-input');
    const sel = rM ? `page.getByRole('${rM[1]}', { name: '${rM[2]}' })` : (lM ? `page.locator('${lM[1]}')` : '');
    return { action: "upload", target: tgt, value: sifM[1], selector: sel, raw: line };
  }

  // dblclick
  const dblRoleM = line.match(/getByRole\(['"`](.*?)['"`],\s*\{[^}]*name:\s*['"`](.*?)['"`][^}]*\}\)\.dblclick/);
  if (dblRoleM) return { action: "dblclick", target: dblRoleM[2], raw: line, selector: `page.getByRole('${dblRoleM[1]}', { name: '${dblRoleM[2]}' })` };
  const dblTextM = line.match(/getByText\(['"`](.*?)['"`]\)\.dblclick/);
  if (dblTextM) return { action: "dblclick", target: dblTextM[1], raw: line, selector: `page.getByText('${dblTextM[1]}')` };
  const dblLocM = line.match(/locator\(['"`](.*?)['"`]\)\.dblclick/);
  if (dblLocM) return { action: "dblclick", target: dblLocM[1], raw: line, selector: `page.locator('${dblLocM[1]}')` };

  // check / uncheck
  const rChk = line.match(/getByRole\(['"`](radio|checkbox)['"`],\s*\{[^}]*name:\s*['"`](.*?)['"`][^}]*\}\)\.check/);
  if (rChk) return { action: "check", target: rChk[2], raw: line, selector: `page.getByRole('${rChk[1]}', { name: '${rChk[2]}' })` };
  const rUnc = line.match(/getByRole\(['"`](radio|checkbox)['"`],\s*\{[^}]*name:\s*['"`](.*?)['"`][^}]*\}\)\.uncheck/);
  if (rUnc) return { action: "uncheck", target: rUnc[2], raw: line, selector: `page.getByRole('${rUnc[1]}', { name: '${rUnc[2]}' })` };
  const rChkCl = line.match(/getByRole\(['"`](checkbox|radio)['"`],\s*\{[^}]*name:\s*['"`](.*?)['"`][^}]*\}\)\.click/);
  if (rChkCl) return { action: "check", target: rChkCl[2], raw: line, selector: `page.getByRole('${rChkCl[1]}', { name: '${rChkCl[2]}' })` };
  const lChk = line.match(/locator\(['"`](.*?)['"`]\)\.check/);
  if (lChk) return { action: "check", target: lChk[1], raw: line, selector: `page.locator('${lChk[1]}')` };
  const lUnc = line.match(/locator\(['"`](.*?)['"`]\)\.uncheck/);
  if (lUnc) return { action: "uncheck", target: lUnc[1], raw: line, selector: `page.locator('${lUnc[1]}')` };

  // fills — Risk 6: extractFillValue para comillas escapadas
  const phFill = line.match(/getByPlaceholder\(['"`](.*?)['"`]\)\.fill\(/);
  if (phFill) return { action: "input", target: phFill[1], value: extractFillValue(line) ?? '', raw: line, selector: `page.getByPlaceholder('${phFill[1]}')` };
  const lblFill = line.match(/getByLabel\(['"`](.*?)['"`](?:,\s*\{[^}]*\})?\)\.fill\(/);
  if (lblFill) return { action: "input", target: lblFill[1], value: extractFillValue(line) ?? '', raw: line, selector: `page.getByLabel('${lblFill[1]}')` };
  const roleFill = line.match(/getByRole\(['"`](.*?)['"`],\s*\{[^}]*name:\s*['"`](.*?)['"`][^}]*\}\)\.fill\(/);
  if (roleFill) return { action: "input", target: roleFill[2], value: extractFillValue(line) ?? '', raw: line, selector: `page.getByRole('${roleFill[1]}', { name: '${roleFill[2]}' })` };
  const locNthFillP = line.match(/locator\(['"`](.*?)['"`]\)\.nth\((\d+)\)\.fill\(/);
  if (locNthFillP) return { action: "input", target: locNthFillP[1], value: extractFillValue(line) ?? '', raw: line, selector: `page.locator('${locNthFillP[1]}').nth(${locNthFillP[2]})` };
  const roleNthFillP = line.match(/getByRole\(['"`](\w+)['"`]\)\.nth\((\d+)\)\.fill\(/);
  if (roleNthFillP) return { action: "input", target: `${roleNthFillP[1]}[${roleNthFillP[2]}]`, value: extractFillValue(line) ?? '', raw: line, selector: `page.getByRole('${roleNthFillP[1]}').nth(${roleNthFillP[2]})` };
  const locRoleFillP = line.match(/locator\(['"`](.*?)['"`]\)\.getByRole\(['"`](.*?)['"`],\s*\{[^}]*name:\s*['"`](.*?)['"`][^}]*\}\)\.fill\(/);
  if (locRoleFillP) return { action: "input", target: locRoleFillP[3], value: extractFillValue(line) ?? '', raw: line, selector: `page.locator('${locRoleFillP[1]}').getByRole('${locRoleFillP[2]}', { name: '${locRoleFillP[3]}' })` };
  const locFill = line.match(/locator\(['"`](.*?)['"`]\)\.fill\(/);
  if (locFill) return { action: "input", target: locFill[1], value: extractFillValue(line) ?? '', raw: line, selector: `page.locator('${locFill[1]}')` };
  const tidFill = line.match(/getByTestId\(['"`](.*?)['"`]\)\.fill\(/);
  if (tidFill) return { action: "input", target: tidFill[1], value: extractFillValue(line) ?? '', raw: line, selector: `page.getByTestId('${tidFill[1]}')` };

  // hover
  const hvRoleM = line.match(/getByRole\(['"`](.*?)['"`],\s*\{[^}]*name:\s*['"`](.*?)['"`][^}]*\}\)\.hover/);
  if (hvRoleM) return { action: "hover", target: hvRoleM[2], raw: line, selector: `page.getByRole('${hvRoleM[1]}', { name: '${hvRoleM[2]}' })` };
  const hvTextM = line.match(/getByText\(['"`](.*?)['"`]\)\.hover/);
  if (hvTextM) return { action: "hover", target: hvTextM[1], raw: line, selector: `page.getByText('${hvTextM[1]}')` };
  const hvLocM = line.match(/locator\(['"`](.*?)['"`]\)\.hover/);
  if (hvLocM) return { action: "hover", target: hvLocM[1], raw: line, selector: `page.locator('${hvLocM[1]}')` };

  // right-click
  const rcRoleM = line.match(/getByRole\(['"`](.*?)['"`],\s*\{[^}]*name:\s*['"`](.*?)['"`][^}]*\}\)\.click\([^)]*button:\s*['"`]right['"`]/);
  if (rcRoleM) return { action: "rightclick", target: rcRoleM[2], raw: line, selector: `page.getByRole('${rcRoleM[1]}', { name: '${rcRoleM[2]}' })` };
  const rcLocM = line.match(/locator\(['"`](.*?)['"`]\)\.click\([^)]*button:\s*['"`]right['"`]/);
  if (rcLocM) return { action: "rightclick", target: rcLocM[1], raw: line, selector: `page.locator('${rcLocM[1]}')` };
  const rcTextM = line.match(/getByText\(['"`](.*?)['"`]\)\.click\([^)]*button:\s*['"`]right['"`]/);
  if (rcTextM) return { action: "rightclick", target: rcTextM[1], raw: line, selector: `page.getByText('${rcTextM[1]}')` };

  // dragTo
  const dtM = line.match(/locator\(['"`](.*?)['"`]\)\.dragTo\(.*?locator\(['"`](.*?)['"`]\)/);
  if (dtM) return { action: "drag", source: dtM[1], target: dtM[2], raw: line, selector: `page.locator('${dtM[1]}')`, targetSelector: `page.locator('${dtM[2]}')` };

  // frameLocator
  if (line.includes('.frameLocator(')) {
    const flRoleClkM = line.match(/frameLocator\(['"`](.*?)['"`]\)\.getByRole\(['"`](.*?)['"`],\s*\{[^}]*name:\s*['"`](.*?)['"`][^}]*\}\)\.click/);
    if (flRoleClkM) return { action: "frame_click", frameSelector: flRoleClkM[1], target: flRoleClkM[3], raw: line, selector: `page.frameLocator('${flRoleClkM[1]}').getByRole('${flRoleClkM[2]}', { name: '${flRoleClkM[3]}' })` };
    const flTxtClkM = line.match(/frameLocator\(['"`](.*?)['"`]\)\.getByText\(['"`](.*?)['"`]\)\.click/);
    if (flTxtClkM) return { action: "frame_click", frameSelector: flTxtClkM[1], target: flTxtClkM[2], raw: line, selector: `page.frameLocator('${flTxtClkM[1]}').getByText('${flTxtClkM[2]}')` };
    const flRoleFillM = line.match(/frameLocator\(['"`](.*?)['"`]\)\.getByRole\(['"`](.*?)['"`],\s*\{[^}]*name:\s*['"`](.*?)['"`][^}]*\}\)\.fill\(['"`](.*?)['"`]\)/);
    if (flRoleFillM) return { action: "frame_fill", frameSelector: flRoleFillM[1], target: flRoleFillM[3], value: flRoleFillM[4], raw: line, selector: `page.frameLocator('${flRoleFillM[1]}').getByRole('${flRoleFillM[2]}', { name: '${flRoleFillM[3]}' })` };
    const flLblFillM = line.match(/frameLocator\(['"`](.*?)['"`]\)\.getByLabel\(['"`](.*?)['"`]\)\.fill\(['"`](.*?)['"`]\)/);
    if (flLblFillM) return { action: "frame_fill", frameSelector: flLblFillM[1], target: flLblFillM[2], value: flLblFillM[3], raw: line, selector: `page.frameLocator('${flLblFillM[1]}').getByLabel('${flLblFillM[2]}')` };
    const flLocClkM = line.match(/frameLocator\(['"`](.*?)['"`]\)\.locator\(['"`](.*?)['"`]\)\.click/);
    if (flLocClkM) return { action: "frame_click", frameSelector: flLocClkM[1], target: flLocClkM[2], raw: line, selector: `page.frameLocator('${flLocClkM[1]}').locator('${flLocClkM[2]}')` };
    const flLocFillM = line.match(/frameLocator\(['"`](.*?)['"`]\)\.locator\(['"`](.*?)['"`]\)\.fill\(['"`](.*?)['"`]\)/);
    if (flLocFillM) return { action: "frame_fill", frameSelector: flLocFillM[1], target: flLocFillM[2], value: flLocFillM[3], raw: line, selector: `page.frameLocator('${flLocFillM[1]}').locator('${flLocFillM[2]}')` };
    // Risk 7: advertir patrón de frame no cubierto
    console.warn(`⚠️ [Parser] frameLocator no reconocido (popup ctx): ${line.trim().slice(0, 80)}`);
    return null;
  }

  // contentFrame
  if (line.includes('.contentFrame()')) {
    const cfRoleM = line.match(/locator\(['"`](.*?)['"`]\)\.contentFrame\(\)\.getByRole\(['"`](.*?)['"`],\s*\{[^}]*name:\s*['"`](.*?)['"`][^}]*\}\)\.click/);
    if (cfRoleM) {
      const role = cfRoleM[2], name = cfRoleM[3];
      if (role === 'heading' || role === 'paragraph')
        return { action: "verify", target: name, raw: line, selector: name, verifyType: "text-visible" };
      return { action: "click", target: name, raw: line, selector: name };
    }
    const cfTextM = line.match(/locator\(['"`](.*?)['"`]\)\.contentFrame\(\)\.getByText\(['"`](.*?)['"`]\)\.click/);
    if (cfTextM) {
      const text = cfTextM[2];
      return resultTextFn(text)
        ? { action: "verify", target: text, raw: line, selector: text, verifyType: "text-visible" }
        : { action: "click", target: text, raw: line, selector: text };
    }
    return null;
  }

  // option + strong click
  const optStrongM = line.match(/getByRole\(['"`]option['"`],\s*\{[^}]*name:\s*['"`](.*?)['"`][^}]*\}\)\.getByRole\(['"`]strong['"`]\)\.click/);
  if (optStrongM) return { action: "click", target: optStrongM[1], raw: line, selector: `page.getByRole('option', { name: '${optStrongM[1]}' }).getByRole('strong')` };

  // list patterns
  const listTxtM = line.match(/getByRole\(['"`]list['"`]\)\.getByText\(['"`](.*?)['"`]\)\.click/);
  if (listTxtM) return { action: "click", target: listTxtM[1], raw: line, selector: buildPlaywrightSelector({ type: "list-text", text: listTxtM[1] }) };
  const listItemStrM = line.match(/getByRole\(['"`]listitem['"`]\)\.filter\(\{\s*hasText:\s*['"`](.*?)['"`]\s*\}\)\.click/);
  if (listItemStrM) return { action: "click", target: listItemStrM[1], raw: line, selector: `page.getByRole('listitem').filter({ hasText: '${listItemStrM[1]}' })` };
  const listItemRexM = line.match(/getByRole\(['"`]listitem['"`]\)\.filter\(\{\s*hasText:\s*\/(.*?)\/\s*\}\)\.click/);
  if (listItemRexM) {
    // Risk 9: escapar caracteres que rompen template strings
    const safeRex = safeRegexContent(listItemRexM[1]);
    return { action: "click", target: listItemRexM[1], raw: line, selector: `page.getByRole('listitem').filter({ hasText: /${safeRex}/ })` };
  }

  // paragraph + getByText → verificación
  const paraTxtM = line.match(/getByRole\(['"`]paragraph['"`]\)\.getByText\(['"`](.*?)['"`]\)\.click/);
  if (paraTxtM) return { action: "verify", target: paraTxtM[1], raw: line, selector: paraTxtM[1], verifyType: "text-visible" };

  // Chained: parentRole.childRole(name).click() — preserva selector completo
  const chainedRoleClkP = line.match(/getByRole\(['"`](\w+)['"`]\)\.getByRole\(['"`](.*?)['"`],\s*\{[^}]*name:\s*['"`](.*?)['"`][^}]*\}\)\.click/);
  if (chainedRoleClkP) return { action: "click", target: chainedRoleClkP[3], raw: line, selector: `page.getByRole('${chainedRoleClkP[1]}').getByRole('${chainedRoleClkP[2]}', { name: '${chainedRoleClkP[3]}' })` };
  // Indexed no-name: role.nth(n).click()
  const roleNthClkP = line.match(/getByRole\(['"`](\w+)['"`]\)\.nth\((\d+)\)\.click/);
  if (roleNthClkP) return { action: "click", target: `${roleNthClkP[1]}[${roleNthClkP[2]}]`, raw: line, selector: `page.getByRole('${roleNthClkP[1]}').nth(${roleNthClkP[2]})` };
  // role click (heading/paragraph → verify; soporta .first() y .nth(n))
  const roleClkM = line.match(/getByRole\(['"`](.*?)['"`],\s*\{[^}]*name:\s*['"`](.*?)['"`][^}]*\}\)(?:\.first\(\)|\.nth\(\d+\))?\.click/);
  if (roleClkM) {
    const role = roleClkM[1]; const name = roleClkM[2];
    if (role === 'heading' || role === 'paragraph')
      return { action: "verify", target: name, raw: line, selector: name, verifyType: "text-visible" };
    const exactM = line.match(/exact:\s*(true|false)/);
    const exact = exactM ? exactM[1] === 'true' : undefined;
    const sel = exact
      ? `page.getByRole('${role}', { name: '${name}', exact: true })`
      : buildPlaywrightSelector({ type: "role", role, name });
    return { action: "click", target: name, raw: line, selector: sel };
  }

  // role fill
  const roleFillM = line.match(/getByRole\(['"`](.*?)['"`],\s*\{[^}]*name:\s*['"`](.*?)['"`][^}]*\}\)\.fill\(/);
  if (roleFillM) return { action: "input", target: roleFillM[2], value: extractFillValue(line) ?? '', raw: line, selector: buildPlaywrightSelector({ type: "role", role: roleFillM[1], name: roleFillM[2] }) };

  // getByText click
  const txtClkM = line.match(/(?<![.]getByRole[^.]*\.)getByText\(['"`](.*?)['"`](?:,\s*\{[^}]*\})?\)\.click/);
  if (txtClkM) {
    const text = txtClkM[1];
    const exactInLine = line.match(/exact:\s*(true|false)/);
    const exactOptInLine = exactInLine?.[1] === 'true' ? ', { exact: true }' : '';
    return resultTextFn(text)
      ? { action: "verify", target: text, raw: line, selector: text, verifyType: "text-visible" }
      : { action: "click",  target: text, raw: line, selector: `page.getByText('${safeRegexContent(text)}'${exactOptInLine})` };
  }

  // locator .first() / .nth(n) click
  const locFirstM = line.match(/locator\(['"`](.*?)['"`]\)\.first\(\)\.click/);
  if (locFirstM) return { action: "click", target: locFirstM[1], raw: line, selector: `page.locator('${locFirstM[1]}').first()` };
  const locNthM = line.match(/locator\(['"`](.*?)['"`]\)\.nth\((\d+)\)\.click/);
  if (locNthM) return { action: "click", target: locNthM[1], raw: line, selector: `page.locator('${locNthM[1]}').nth(${locNthM[2]})` };

  // locator click / fill
  const locClkM = line.match(/locator\(['"`](.*?)['"`]\)\.click/);
  if (locClkM) {
    const sel = locClkM[1];
    const inTxt = sel.match(/:(?:has-)?text\(['"`](.*?)['"`]\)/);
    if (inTxt && resultTextFn(inTxt[1])) return { action: "verify", target: inTxt[1], raw: line, selector: inTxt[1], verifyType: "text-visible" };
    return { action: "click", target: sel, raw: line, selector: `page.locator('${sel}')` };
  }
  const locFillM = line.match(/locator\(['"`](.*?)['"`]\)\.fill\(/);
  if (locFillM) return { action: "input", target: locFillM[1], value: extractFillValue(line) ?? '', raw: line, selector: buildPlaywrightSelector({ type: "css", selector: locFillM[1] }) };

  // button .first().click()
  const btnFirstM = line.match(/getByRole\(['"`]button['"`],\s*\{[^}]*name:\s*['"`](.*?)['"`][^}]*\}\)\.first\(\)\.click/);
  if (btnFirstM) return { action: "click", target: btnFirstM[1], raw: line, selector: `page.getByRole('button', { name: '${btnFirstM[1]}' }).first()` };

  // clicks — label / placeholder / altText / title / testId
  const lblClkM = line.match(/getByLabel\(['"`](.*?)['"`](?:,\s*\{[^}]*\})?\)\.click/);
  if (lblClkM) return { action: "click", target: lblClkM[1], raw: line, selector: `page.getByLabel('${lblClkM[1]}')` };
  const phClkM = line.match(/getByPlaceholder\(['"`](.*?)['"`]\)\.click/);
  if (phClkM) return { action: "click", target: phClkM[1], raw: line, selector: `page.getByPlaceholder('${phClkM[1]}')` };
  const altClkM = line.match(/getByAltText\(['"`](.*?)['"`](?:,\s*\{[^}]*\})?\)\.click/);
  if (altClkM) return { action: "click", target: altClkM[1], raw: line, selector: `page.getByAltText('${altClkM[1]}')` };
  const titClkM = line.match(/getByTitle\(['"`](.*?)['"`](?:,\s*\{[^}]*\})?\)\.click/);
  if (titClkM) return { action: "click", target: titClkM[1], raw: line, selector: `page.getByTitle('${titClkM[1]}')` };
  const tidClkM = line.match(/getByTestId\(['"`](.*?)['"`]\)\.click/);
  if (tidClkM) return { action: "click", target: tidClkM[1], raw: line, selector: `page.getByTestId('${tidClkM[1]}')` };

  // Chained con contexto del padre preservado: locator/role.getByText('text').click()
  const locTxtClkP = line.match(/locator\(['"`](.*?)['"`]\)\.getByText\(['"`](.*?)['"`]\)\.click/);
  if (locTxtClkP) {
    const text = locTxtClkP[2];
    return resultTextFn(text)
      ? { action: "verify", target: text, raw: line, selector: text, verifyType: "text-visible" }
      : { action: "click",  target: text, raw: line, selector: `page.locator('${locTxtClkP[1]}').getByText('${safeRegexContent(text)}')` };
  }
  const roleTxtClkP = line.match(/getByRole\(['"`](\w+)['"`]\)\.getByText\(['"`](.*?)['"`]\)\.click/);
  if (roleTxtClkP) {
    const text = roleTxtClkP[2];
    return resultTextFn(text)
      ? { action: "verify", target: text, raw: line, selector: text, verifyType: "text-visible" }
      : { action: "click",  target: text, raw: line, selector: `page.getByRole('${roleTxtClkP[1]}').getByText('${safeRegexContent(text)}')` };
  }
  // chained .getByText('...').click()  (ej: page.getByRole('nav').getByText('...'))
  const chainTxtM = line.match(/\.getByText\(['"`](.*?)['"`]\)\.click/);
  if (chainTxtM) {
    const text = chainTxtM[1];
    return resultTextFn(text)
      ? { action: "verify", target: text, raw: line, selector: text, verifyType: "text-visible" }
      : { action: "click",  target: text, raw: line, selector: buildPlaywrightSelector({ type: "text", text }) };
  }

  // expect assertions
  const expVisM = line.match(/expect\(.*getByText\(['"`](.*?)['"`].*\)\)\.toBeVisible/);
  if (expVisM) return { action: "verify", target: expVisM[1], raw: line, selector: expVisM[1], verifyType: "text-visible" };
  const expTxtM = line.match(/expect\(.*\)\.toHaveText\(['"`](.*?)['"`]/);
  if (expTxtM) return { action: "verify", target: expTxtM[1], raw: line, selector: expTxtM[1], verifyType: "text-exact" };

  return null;
}

// ─────────────────────────────────────────────────────────────
// PARSER PRINCIPAL
// ─────────────────────────────────────────────────────────────
export function parseRecording(filePath: string): Action[] {
  // Risk 1: capturar error de lectura para no abortar todo el pipeline
  let content: string;
  try {
    content = fs.readFileSync(filePath, "utf-8");
  } catch (err: any) {
    console.warn(`⚠️ [Parser] No se pudo leer la grabación "${filePath}": ${err.message}`);
    return [];
  }

  const rawSteps: Action[] = [];
  const lines = content.split("\n");

  // ── Estado de detección de popups / nuevas pestañas ───────────────────
  // Risk 3: Set en lugar de variable única — soporta múltiples popups en paralelo
  const pendingPopupPromiseVars = new Set<string>();
  const popupPageVars           = new Set<string>();

  // Risk 8: variables auxiliares  const myBtn = page.getBy*()  →  await myBtn.click()
  const selectorVars = new Map<string, string>();

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*")) continue;

    // ─────────────────────────────────────────
    // 🔥 POPUP  const pageXPromise = page.waitForEvent('popup')
    // ─────────────────────────────────────────
    const popupPromiseM = line.match(/const\s+(\w+)\s*=\s*page\.waitForEvent\(['"`]popup['"`]\)/);
    if (popupPromiseM) {
      pendingPopupPromiseVars.add(popupPromiseM[1]); // Risk 3: add en lugar de assign
      continue;
    }

    // ─────────────────────────────────────────
    // 🔥 POPUP  const pageX = await pageXPromise  (Risk 3: iterar el Set)
    // ─────────────────────────────────────────
    let resolvedPopupVar = false;
    for (const ppv of pendingPopupPromiseVars) {
      const assignM = line.match(new RegExp(`const\\s+(\\w+)\\s*=\\s*await\\s+${ppv}`));
      if (assignM) {
        popupPageVars.add(assignM[1]);
        pendingPopupPromiseVars.delete(ppv);
        resolvedPopupVar = true;
        break;
      }
    }
    if (resolvedPopupVar) continue;

    // ─────────────────────────────────────────
    // 🔥 ACCIÓN EN POPUP PAGE  pageX.getByRole/getByText/etc.
    // ─────────────────────────────────────────
    let popupLinePageVar: string | null = null;
    for (const pv of popupPageVars) {
      if (trimmed.startsWith(`await ${pv}.`) || trimmed.startsWith(`${pv}.`)) {
        popupLinePageVar = pv;
        break;
      }
    }
    if (popupLinePageVar) {
      const nl = line.replace(
        new RegExp(`(await\\s+)?${popupLinePageVar}\\.`),
        (_m, aw) => `${aw || ''}page.`,
      );
      const ps = parseOneLine(nl, isResultText);
      if (ps) rawSteps.push({ ...ps, pageRef: 'popup' });
      continue;
    }

    // Risk 8: detectar declaración de variable auxiliar de selector
    //   const myBtn = page.getByRole('button', { name: 'Submit' })
    const varDeclM = trimmed.match(
      /^const\s+(\w+)\s*=\s*(page\.(?:getByRole|getByText|getByLabel|getByPlaceholder|getByTestId|getByAltText|getByTitle|locator)\(.*)/,
    );
    if (varDeclM) {
      // Guardar expresión (sin punto y coma ni await trailing)
      selectorVars.set(varDeclM[1], varDeclM[2].replace(/;?\s*$/, ''));
      // Continúa hacia el filtro de const/let/var — no generar step
    }

    // Ignorar imports, export, declaraciones de variables genéricas y comentarios de bloque
    if (/^\s*(import|export|const\s+\w+\s*=|let\s+\w+|var\s+\w+|\/\/|\/\*)/.test(trimmed)) continue;

    // Risk 8: resolver llamadas sobre variable auxiliar: await myBtn.click()
    const varCallM = trimmed.match(/^(?:await\s+)?(\w+)\.(click|fill|dblclick|hover|check|uncheck|selectOption|setInputFiles)\(/);
    if (varCallM && selectorVars.has(varCallM[1])) {
      const selExpr = selectorVars.get(varCallM[1])!;
      // Construir línea sintética reemplazando la variable por su selector
      const synthLine = line.replace(
        new RegExp(`(await\\s+)?${varCallM[1]}\\.`),
        (_m, aw) => `${aw || ''}${selExpr}.`,
      );
      const ps = parseOneLine(synthLine, isResultText);
      if (ps) rawSteps.push(ps);
      continue;
    }

    // ─────────────────────────────────────────
    // 🔥 NAVIGATION  goto()
    // ─────────────────────────────────────────
    const gotoM = line.match(/page\.goto\(['"`](.*?)['"`]\)/);
    if (gotoM) { rawSteps.push({ action: "page_load", url: gotoM[1], raw: line }); continue; }

    // ─────────────────────────────────────────
    // 🔥 DIALOG HANDLER
    // ─────────────────────────────────────────
    if (line.includes("page.once('dialog'") || line.includes('page.once("dialog"')) {
      rawSteps.push({ action: "dialog_handler", value: line.includes("dismiss") ? "dismiss" : "accept", raw: line });
      continue;
    }

    // ─────────────────────────────────────────
    // 🔥 PRESS ENTER
    // ─────────────────────────────────────────
    const pressEnterM = line.match(/\.press\(['"`](Enter|Return)['"`]\)/);
    if (pressEnterM) { rawSteps.push({ action: "press_enter", target: "Enter", raw: line }); continue; }

    // ─────────────────────────────────────────
    // 🔥 PRESS KEY  (teclas semánticas)
    // ─────────────────────────────────────────
    const pressKeyM = line.match(/\.press\(['"`](Tab|Escape|Space|Backspace|Delete|ArrowUp|ArrowDown|ArrowLeft|ArrowRight)['"`]\)/);
    if (pressKeyM) { rawSteps.push({ action: "press_key", target: pressKeyM[1], raw: line }); continue; }
    if (/\.press\(['"`](CapsLock|Shift|Control|Alt|Meta|F\d+|Home|End|PageUp|PageDown)['"`]\)/.test(line)) continue;

    // ─────────────────────────────────────────
    // 🔥 HOVER
    // ─────────────────────────────────────────
    if (line.includes('.hover(')) {
      const hvRoleM = line.match(/getByRole\(['"`](.*?)['"`],\s*\{[^}]*name:\s*['"`](.*?)['"`][^}]*\}\)\.hover/);
      if (hvRoleM) { rawSteps.push({ action: "hover", target: hvRoleM[2], raw: line, selector: `page.getByRole('${hvRoleM[1]}', { name: '${hvRoleM[2]}' })` }); continue; }
      const hvTextM = line.match(/getByText\(['"`](.*?)['"`]\)\.hover/);
      if (hvTextM) { rawSteps.push({ action: "hover", target: hvTextM[1], raw: line, selector: `page.getByText('${hvTextM[1]}')` }); continue; }
      const hvLocM = line.match(/locator\(['"`](.*?)['"`]\)\.hover/);
      if (hvLocM) { rawSteps.push({ action: "hover", target: hvLocM[1], raw: line, selector: `page.locator('${hvLocM[1]}')` }); continue; }
    }

    // ─────────────────────────────────────────
    // 🔥 RIGHT-CLICK
    // ─────────────────────────────────────────
    if (line.includes("button: 'right'") || line.includes('button: "right"')) {
      const rcRoleM = line.match(/getByRole\(['"`](.*?)['"`],\s*\{[^}]*name:\s*['"`](.*?)['"`][^}]*\}\)\.click/);
      if (rcRoleM) { rawSteps.push({ action: "rightclick", target: rcRoleM[2], raw: line, selector: `page.getByRole('${rcRoleM[1]}', { name: '${rcRoleM[2]}' })` }); continue; }
      const rcLocM = line.match(/locator\(['"`](.*?)['"`]\)\.click/);
      if (rcLocM) { rawSteps.push({ action: "rightclick", target: rcLocM[1], raw: line, selector: `page.locator('${rcLocM[1]}')` }); continue; }
      const rcTextM = line.match(/getByText\(['"`](.*?)['"`]\)\.click/);
      if (rcTextM) { rawSteps.push({ action: "rightclick", target: rcTextM[1], raw: line, selector: `page.getByText('${rcTextM[1]}')` }); continue; }
    }

    // ─────────────────────────────────────────
    // 🔥 DRAG AND DROP
    // ─────────────────────────────────────────
    if (line.includes('.dragTo(')) {
      const dtM = line.match(/locator\(['"`](.*?)['"`]\)\.dragTo\(.*?locator\(['"`](.*?)['"`]\)/);
      if (dtM) { rawSteps.push({ action: "drag", source: dtM[1], target: dtM[2], raw: line, selector: `page.locator('${dtM[1]}')`, targetSelector: `page.locator('${dtM[2]}')` }); continue; }
    }

    // ─────────────────────────────────────────
    // 🔥 FRAME LOCATOR
    // ─────────────────────────────────────────
    if (line.includes('.frameLocator(')) {
      const flRoleClkM = line.match(/frameLocator\(['"`](.*?)['"`]\)\.getByRole\(['"`](.*?)['"`],\s*\{[^}]*name:\s*['"`](.*?)['"`][^}]*\}\)\.click/);
      if (flRoleClkM) { rawSteps.push({ action: "frame_click", frameSelector: flRoleClkM[1], target: flRoleClkM[3], raw: line, selector: `page.frameLocator('${flRoleClkM[1]}').getByRole('${flRoleClkM[2]}', { name: '${flRoleClkM[3]}' })` }); continue; }
      const flTxtClkM = line.match(/frameLocator\(['"`](.*?)['"`]\)\.getByText\(['"`](.*?)['"`]\)\.click/);
      if (flTxtClkM) { rawSteps.push({ action: "frame_click", frameSelector: flTxtClkM[1], target: flTxtClkM[2], raw: line, selector: `page.frameLocator('${flTxtClkM[1]}').getByText('${flTxtClkM[2]}')` }); continue; }
      const flRoleFillM = line.match(/frameLocator\(['"`](.*?)['"`]\)\.getByRole\(['"`](.*?)['"`],\s*\{[^}]*name:\s*['"`](.*?)['"`][^}]*\}\)\.fill\(['"`](.*?)['"`]\)/);
      if (flRoleFillM) { rawSteps.push({ action: "frame_fill", frameSelector: flRoleFillM[1], target: flRoleFillM[3], value: flRoleFillM[4], raw: line, selector: `page.frameLocator('${flRoleFillM[1]}').getByRole('${flRoleFillM[2]}', { name: '${flRoleFillM[3]}' })` }); continue; }
      const flLblFillM = line.match(/frameLocator\(['"`](.*?)['"`]\)\.getByLabel\(['"`](.*?)['"`]\)\.fill\(['"`](.*?)['"`]\)/);
      if (flLblFillM) { rawSteps.push({ action: "frame_fill", frameSelector: flLblFillM[1], target: flLblFillM[2], value: flLblFillM[3], raw: line, selector: `page.frameLocator('${flLblFillM[1]}').getByLabel('${flLblFillM[2]}')` }); continue; }
      const flLocClkM = line.match(/frameLocator\(['"`](.*?)['"`]\)\.locator\(['"`](.*?)['"`]\)\.click/);
      if (flLocClkM) { rawSteps.push({ action: "frame_click", frameSelector: flLocClkM[1], target: flLocClkM[2], raw: line, selector: `page.frameLocator('${flLocClkM[1]}').locator('${flLocClkM[2]}')` }); continue; }
      const flLocFillM = line.match(/frameLocator\(['"`](.*?)['"`]\)\.locator\(['"`](.*?)['"`]\)\.fill\(['"`](.*?)['"`]\)/);
      if (flLocFillM) { rawSteps.push({ action: "frame_fill", frameSelector: flLocFillM[1], target: flLocFillM[2], value: flLocFillM[3], raw: line, selector: `page.frameLocator('${flLocFillM[1]}').locator('${flLocFillM[2]}')` }); continue; }
      // Risk 7: advertir en lugar de ignorar silenciosamente
      console.warn(`⚠️ [Parser] frameLocator pattern no reconocido — línea omitida: ${trimmed.slice(0, 80)}`);
      continue;
    }

    // ─────────────────────────────────────────
    // 🔥 CONTENT FRAME  locator('#id').contentFrame()...
    // ─────────────────────────────────────────
    if (line.includes(".contentFrame()")) {
      const cfRoleM = line.match(
        /locator\(['"`](.*?)['"`]\)\.contentFrame\(\)\.getByRole\(['"`](.*?)['"`],\s*\{[^}]*name:\s*['"`](.*?)['"`][^}]*\}\)\.click/,
      );
      if (cfRoleM) {
        const role = cfRoleM[2], name = cfRoleM[3];
        if (role === "heading" || role === "paragraph") {
          rawSteps.push({ action: "verify", target: name, raw: line, selector: name, verifyType: "text-visible" });
        } else {
          rawSteps.push({ action: "click", target: name, raw: line, selector: name });
        }
        continue;
      }
      const cfTextM = line.match(
        /locator\(['"`](.*?)['"`]\)\.contentFrame\(\)\.getByText\(['"`](.*?)['"`]\)\.click/,
      );
      if (cfTextM) {
        const text = cfTextM[2];
        rawSteps.push({
          action: isResultText(text) ? "verify" : "click",
          target: text,
          raw: line,
          selector: text,
          ...(isResultText(text) ? { verifyType: "text-visible" } : {}),
        });
        continue;
      }
      // Risk 7: advertir contentFrame no reconocido
      console.warn(`⚠️ [Parser] contentFrame pattern no reconocido — línea omitida: ${trimmed.slice(0, 80)}`);
      continue;
    }

    // ─────────────────────────────────────────
    // 🔥 SELECT OPTION
    // ─────────────────────────────────────────
    const selectOptionM = line.match(/\.selectOption\(['"`](.*?)['"`]\)/);
    if (selectOptionM) {
      let selector = "", target = "";
      const locM = line.match(/locator\(['"`](.*?)['"`]\)/);
      const roleM = line.match(/getByRole\(['"`](.*?)['"`],\s*\{[^}]*name:\s*['"`](.*?)['"`][^}]*\}\)/);
      const labelM = line.match(/getByLabel\(['"`](.*?)['"`](?:,\s*\{[^}]*\})?\)/);
      const phM = line.match(/getByPlaceholder\(['"`](.*?)['"`]\)/);
      if (locM)        { selector = locM[1]; target = selector; }
      else if (roleM)  { selector = `page.getByRole('${roleM[1]}', { name: '${roleM[2]}' })`; target = roleM[2]; }
      else if (labelM) { selector = `page.getByLabel('${labelM[1]}')`; target = labelM[1]; }
      else if (phM)    { selector = `page.getByPlaceholder('${phM[1]}')`; target = phM[1]; }
      rawSteps.push({ action: "select", target: target || selector, value: selectOptionM[1], selector, raw: line });
      continue;
    }

    // ─────────────────────────────────────────
    // 🔥 SET INPUT FILES  (file upload)
    // ─────────────────────────────────────────
    const setInputFilesM = line.match(/\.setInputFiles\(['"`](.*?)['"`]\)/);
    if (setInputFilesM) {
      let uploadTarget = "file-input", uploadSelector = "";
      const roleM = line.match(/getByRole\(['"`](.*?)['"`],\s*\{[^}]*name:\s*['"`](.*?)['"`][^}]*\}\)/);
      const locM = line.match(/locator\(['"`](.*?)['"`]\)/);
      if (roleM) { uploadTarget = roleM[2]; uploadSelector = `page.getByRole('${roleM[1]}', { name: '${roleM[2]}' })`; }
      else if (locM) { uploadTarget = locM[1]; uploadSelector = `page.locator('${locM[1]}')`; }
      rawSteps.push({ action: "upload", target: uploadTarget, value: setInputFilesM[1], selector: uploadSelector, raw: line });
      continue;
    }

    // ─────────────────────────────────────────
    // 🔥 DBLCLICK  (antes que click para no confundirse)
    // ─────────────────────────────────────────
    const dblRoleM = line.match(/getByRole\(['"`](.*?)['"`],\s*\{[^}]*name:\s*['"`](.*?)['"`][^}]*\}\)\.dblclick/);
    if (dblRoleM) { rawSteps.push({ action: "dblclick", target: dblRoleM[2], raw: line, selector: `page.getByRole('${dblRoleM[1]}', { name: '${dblRoleM[2]}' })` }); continue; }
    const dblTextM = line.match(/getByText\(['"`](.*?)['"`]\)\.dblclick/);
    if (dblTextM) { rawSteps.push({ action: "dblclick", target: dblTextM[1], raw: line, selector: `page.getByText('${dblTextM[1]}')` }); continue; }
    const dblLocM = line.match(/locator\(['"`](.*?)['"`]\)\.dblclick/);
    if (dblLocM) { rawSteps.push({ action: "dblclick", target: dblLocM[1], raw: line, selector: `page.locator('${dblLocM[1]}')` }); continue; }

    // ─────────────────────────────────────────
    // 🔥 CHECK / UNCHECK
    // ─────────────────────────────────────────
    const roleCheckM = line.match(/getByRole\(['"`](radio|checkbox)['"`],\s*\{[^}]*name:\s*['"`](.*?)['"`][^}]*\}\)\.check/);
    if (roleCheckM) { rawSteps.push({ action: "check", target: roleCheckM[2], raw: line, selector: `page.getByRole('${roleCheckM[1]}', { name: '${roleCheckM[2]}' })` }); continue; }
    const roleUncheckM = line.match(/getByRole\(['"`](radio|checkbox)['"`],\s*\{[^}]*name:\s*['"`](.*?)['"`][^}]*\}\)\.uncheck/);
    if (roleUncheckM) { rawSteps.push({ action: "uncheck", target: roleUncheckM[2], raw: line, selector: `page.getByRole('${roleUncheckM[1]}', { name: '${roleUncheckM[2]}' })` }); continue; }
    const checkboxClickM = line.match(/getByRole\(['"`](checkbox|radio)['"`],\s*\{[^}]*name:\s*['"`](.*?)['"`][^}]*\}\)\.click/);
    if (checkboxClickM) { rawSteps.push({ action: "check", target: checkboxClickM[2], raw: line, selector: `page.getByRole('${checkboxClickM[1]}', { name: '${checkboxClickM[2]}' })` }); continue; }
    const locCheckM = line.match(/locator\(['"`](.*?)['"`]\)\.check/);
    if (locCheckM) { rawSteps.push({ action: "check", target: locCheckM[1], raw: line, selector: `page.locator('${locCheckM[1]}')` }); continue; }
    const locUncheckM = line.match(/locator\(['"`](.*?)['"`]\)\.uncheck/);
    if (locUncheckM) { rawSteps.push({ action: "uncheck", target: locUncheckM[1], raw: line, selector: `page.locator('${locUncheckM[1]}')` }); continue; }

    // ─────────────────────────────────────────
    // 🔥 FILLS  Risk 6: extractFillValue para comillas escapadas
    // ─────────────────────────────────────────
    const phFillM = line.match(/getByPlaceholder\(['"`](.*?)['"`]\)\.fill\(/);
    if (phFillM) { rawSteps.push({ action: "input", target: phFillM[1], value: extractFillValue(line) ?? '', raw: line, selector: `page.getByPlaceholder('${phFillM[1]}')` }); continue; }
    const lblFillM = line.match(/getByLabel\(['"`](.*?)['"`](?:,\s*\{[^}]*\})?\)\.fill\(/);
    if (lblFillM) { rawSteps.push({ action: "input", target: lblFillM[1], value: extractFillValue(line) ?? '', raw: line, selector: `page.getByLabel('${lblFillM[1]}')` }); continue; }
    const roleFillM = line.match(/getByRole\(['"`](.*?)['"`],\s*\{[^}]*name:\s*['"`](.*?)['"`][^}]*\}\)\.fill\(/);
    if (roleFillM) { rawSteps.push({ action: "input", target: roleFillM[2], value: extractFillValue(line) ?? '', raw: line, selector: buildPlaywrightSelector({ type: "role", role: roleFillM[1], name: roleFillM[2] }) }); continue; }
    const locNthFillM = line.match(/locator\(['"`](.*?)['"`]\)\.nth\((\d+)\)\.fill\(/);
    if (locNthFillM) { rawSteps.push({ action: "input", target: locNthFillM[1], value: extractFillValue(line) ?? '', raw: line, selector: `page.locator('${locNthFillM[1]}').nth(${locNthFillM[2]})` }); continue; }
    const roleNthFillM2 = line.match(/getByRole\(['"`](\w+)['"`]\)\.nth\((\d+)\)\.fill\(/);
    if (roleNthFillM2) { rawSteps.push({ action: "input", target: `${roleNthFillM2[1]}[${roleNthFillM2[2]}]`, value: extractFillValue(line) ?? '', raw: line, selector: `page.getByRole('${roleNthFillM2[1]}').nth(${roleNthFillM2[2]})` }); continue; }
    const locRoleFillM2 = line.match(/locator\(['"`](.*?)['"`]\)\.getByRole\(['"`](.*?)['"`],\s*\{[^}]*name:\s*['"`](.*?)['"`][^}]*\}\)\.fill\(/);
    if (locRoleFillM2) { rawSteps.push({ action: "input", target: locRoleFillM2[3], value: extractFillValue(line) ?? '', raw: line, selector: `page.locator('${locRoleFillM2[1]}').getByRole('${locRoleFillM2[2]}', { name: '${locRoleFillM2[3]}' })` }); continue; }
    const locFillM = line.match(/locator\(['"`](.*?)['"`]\)\.fill\(/);
    if (locFillM) { rawSteps.push({ action: "input", target: locFillM[1], value: extractFillValue(line) ?? '', raw: line, selector: buildPlaywrightSelector({ type: "css", selector: locFillM[1] }) }); continue; }
    const tidFillM = line.match(/getByTestId\(['"`](.*?)['"`]\)\.fill\(/);
    if (tidFillM) { rawSteps.push({ action: "input", target: tidFillM[1], value: extractFillValue(line) ?? '', raw: line, selector: `page.getByTestId('${tidFillM[1]}')` }); continue; }

    // ─────────────────────────────────────────
    // 🔥 OPTION + STRONG CLICK
    // ─────────────────────────────────────────
    const optStrongM = line.match(
      /getByRole\(['"`]option['"`],\s*\{[^}]*name:\s*['"`](.*?)['"`][^}]*\}\)\.getByRole\(['"`]strong['"`]\)\.click/,
    );
    if (optStrongM) { rawSteps.push({ action: "click", target: optStrongM[1], raw: line, selector: `page.getByRole('option', { name: '${optStrongM[1]}' }).getByRole('strong')` }); continue; }

    // ─────────────────────────────────────────
    // 🔥 LIST PATTERNS
    // ─────────────────────────────────────────
    const listTextM = line.match(/getByRole\(['"`]list['"`]\)\.getByText\(['"`](.*?)['"`]\)\.click/);
    if (listTextM) { rawSteps.push({ action: "click", target: listTextM[1], raw: line, selector: buildPlaywrightSelector({ type: "list-text", text: listTextM[1] }) }); continue; }
    const listItemStrM = line.match(/getByRole\(['"`]listitem['"`]\)\.filter\(\{\s*hasText:\s*['"`](.*?)['"`]\s*\}\)\.click/);
    if (listItemStrM) { rawSteps.push({ action: "click", target: listItemStrM[1], raw: line, selector: `page.getByRole('listitem').filter({ hasText: '${listItemStrM[1]}' })` }); continue; }
    const listItemRexM = line.match(/getByRole\(['"`]listitem['"`]\)\.filter\(\{\s*hasText:\s*\/(.*?)\/\s*\}\)\.click/);
    if (listItemRexM) {
      // Risk 9: escapar caracteres que rompen template strings en el selector generado
      const safeRex = safeRegexContent(listItemRexM[1]);
      rawSteps.push({ action: "click", target: listItemRexM[1], raw: line, selector: `page.getByRole('listitem').filter({ hasText: /${safeRex}/ })` });
      continue;
    }

    // ─────────────────────────────────────────
    // 🔥 getByRole('paragraph').getByText() → verificación de resultado
    // ─────────────────────────────────────────
    const paraTextM = line.match(/getByRole\(['"`]paragraph['"`]\)\.getByText\(['"`](.*?)['"`]\)\.click/);
    if (paraTextM) { rawSteps.push({ action: "verify", target: paraTextM[1], raw: line, selector: paraTextM[1], verifyType: "text-visible" }); continue; }

    // Chained: page.getByRole('parentRole').getByRole('childRole', { name }).click()
    const chainedRoleClickM = line.match(/getByRole\(['"`](\w+)['"`]\)\.getByRole\(['"`](.*?)['"`],\s*\{[^}]*name:\s*['"`](.*?)['"`][^}]*\}\)\.click/);
    if (chainedRoleClickM) { rawSteps.push({ action: "click", target: chainedRoleClickM[3], raw: line, selector: `page.getByRole('${chainedRoleClickM[1]}').getByRole('${chainedRoleClickM[2]}', { name: '${chainedRoleClickM[3]}' })` }); continue; }
    // Indexed no-name: page.getByRole('role').nth(n).click()
    const roleNthClickM = line.match(/getByRole\(['"`](\w+)['"`]\)\.nth\((\d+)\)\.click/);
    if (roleNthClickM) { rawSteps.push({ action: "click", target: `${roleNthClickM[1]}[${roleNthClickM[2]}]`, raw: line, selector: `page.getByRole('${roleNthClickM[1]}').nth(${roleNthClickM[2]})` }); continue; }
    // ─────────────────────────────────────────
    // 🔥 ROLE CLICK  (cualquier rol, soporta exact:true, .first() y .nth(n))
    // ─────────────────────────────────────────
    const roleClickM = line.match(/getByRole\(['"`](.*?)['"`],\s*\{[^}]*name:\s*['"`](.*?)['"`][^}]*\}\)(?:\.first\(\)|\.nth\(\d+\))?\.click/);
    if (roleClickM) {
      const role = roleClickM[1]; const name = roleClickM[2];
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
    const roleFill2M = line.match(/getByRole\(['"`](.*?)['"`],\s*\{[^}]*name:\s*['"`](.*?)['"`][^}]*\}\)\.fill\(/);
    if (roleFill2M) { rawSteps.push({ action: "input", target: roleFill2M[2], value: extractFillValue(line) ?? '', raw: line, selector: buildPlaywrightSelector({ type: "role", role: roleFill2M[1], name: roleFill2M[2] }) }); continue; }

    // ─────────────────────────────────────────
    // 🔥 GETBYTEXT CLICK
    // ─────────────────────────────────────────
    const textClickM = line.match(/(?<![.]getByRole[^.]*\.)getByText\(['"`](.*?)['"`](?:,\s*\{[^}]*\})?\)\.click/);
    if (textClickM) {
      const text = textClickM[1];
      const exactTextM = line.match(/exact:\s*(true|false)/);
      const exactTextOpt = exactTextM?.[1] === 'true' ? ', { exact: true }' : '';
      if (isResultText(text)) {
        rawSteps.push({ action: "verify", target: text, raw: line, selector: text, verifyType: "text-visible" });
      } else {
        rawSteps.push({ action: "click", target: text, raw: line, selector: exactTextOpt ? `page.getByText('${safeRegexContent(text)}'${exactTextOpt})` : buildPlaywrightSelector({ type: "text", text }) });
      }
      continue;
    }

    // ─────────────────────────────────────────
    // 🔥 LOCATOR .first().click()  y  .nth(n).click()
    // ─────────────────────────────────────────
    const locFirstClickM = line.match(/locator\(['"`](.*?)['"`]\)\.first\(\)\.click/);
    if (locFirstClickM) { rawSteps.push({ action: "click", target: locFirstClickM[1], raw: line, selector: `page.locator('${locFirstClickM[1]}').first()` }); continue; }
    const locNthClickM = line.match(/locator\(['"`](.*?)['"`]\)\.nth\((\d+)\)\.click/);
    if (locNthClickM) { rawSteps.push({ action: "click", target: locNthClickM[1], raw: line, selector: `page.locator('${locNthClickM[1]}').nth(${locNthClickM[2]})` }); continue; }

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
    const locFill2M = line.match(/locator\(['"`](.*?)['"`]\)\.fill\(/);
    if (locFill2M) { rawSteps.push({ action: "input", target: locFill2M[1], value: extractFillValue(line) ?? '', raw: line, selector: buildPlaywrightSelector({ type: "css", selector: locFill2M[1] }) }); continue; }

    // ─────────────────────────────────────────
    // 🔥 GETBYTESTID  click / fill
    // ─────────────────────────────────────────
    const testIdClickM = line.match(/getByTestId\(['"`](.*?)['"`]\)\.click/);
    if (testIdClickM) { rawSteps.push({ action: "click", target: testIdClickM[1], raw: line, selector: `page.getByTestId('${testIdClickM[1]}')` }); continue; }
    const testIdFillM = line.match(/getByTestId\(['"`](.*?)['"`]\)\.fill\(/);
    if (testIdFillM) { rawSteps.push({ action: "input", target: testIdFillM[1], value: extractFillValue(line) ?? '', raw: line, selector: `page.getByTestId('${testIdFillM[1]}')` }); continue; }

    // ─────────────────────────────────────────
    // 🔥 BUTTON .first().click()
    // ─────────────────────────────────────────
    const btnFirstM = line.match(/getByRole\(['"`]button['"`],\s*\{[^}]*name:\s*['"`](.*?)['"`][^}]*\}\)\.first\(\)\.click/);
    if (btnFirstM) { rawSteps.push({ action: "click", target: btnFirstM[1], raw: line, selector: `page.getByRole('button', { name: '${btnFirstM[1]}' }).first()` }); continue; }

    // ─────────────────────────────────────────
    // 🔥 GETBYPLACEHOLDER  click
    // ─────────────────────────────────────────
    const phClickM = line.match(/getByPlaceholder\(['"`](.*?)['"`]\)\.click/);
    if (phClickM) { rawSteps.push({ action: "click", target: phClickM[1], raw: line, selector: `page.getByPlaceholder('${phClickM[1]}')` }); continue; }

    // ─────────────────────────────────────────
    // 🔥 GETBYLABEL  click
    // ─────────────────────────────────────────
    const lblClickM = line.match(/getByLabel\(['"`](.*?)['"`](?:,\s*\{[^}]*\})?\)\.click/);
    if (lblClickM) { rawSteps.push({ action: "click", target: lblClickM[1], raw: line, selector: `page.getByLabel('${lblClickM[1]}')` }); continue; }

    // ─────────────────────────────────────────
    // 🔥 GETBYALTTEXT  click
    // ─────────────────────────────────────────
    const altClickM = line.match(/getByAltText\(['"`](.*?)['"`](?:,\s*\{[^}]*\})?\)\.click/);
    if (altClickM) { rawSteps.push({ action: "click", target: altClickM[1], raw: line, selector: `page.getByAltText('${altClickM[1]}')` }); continue; }

    // ─────────────────────────────────────────
    // 🔥 GETBYTITLE  click
    // ─────────────────────────────────────────
    const titleClickM = line.match(/getByTitle\(['"`](.*?)['"`](?:,\s*\{[^}]*\})?\)\.click/);
    if (titleClickM) { rawSteps.push({ action: "click", target: titleClickM[1], raw: line, selector: `page.getByTitle('${titleClickM[1]}')` }); continue; }

    // Chained con contexto del padre preservado
    const locTxtClickM = line.match(/locator\(['"`](.*?)['"`]\)\.getByText\(['"`](.*?)['"`]\)\.click/);
    if (locTxtClickM) {
      const text = locTxtClickM[2];
      if (isResultText(text)) {
        rawSteps.push({ action: "verify", target: text, raw: line, selector: text, verifyType: "text-visible" });
      } else {
        rawSteps.push({ action: "click", target: text, raw: line, selector: `page.locator('${locTxtClickM[1]}').getByText('${safeRegexContent(text)}')` });
      }
      continue;
    }
    const roleTxtClickM = line.match(/getByRole\(['"`](\w+)['"`]\)\.getByText\(['"`](.*?)['"`]\)\.click/);
    if (roleTxtClickM) {
      const text = roleTxtClickM[2];
      if (isResultText(text)) {
        rawSteps.push({ action: "verify", target: text, raw: line, selector: text, verifyType: "text-visible" });
      } else {
        rawSteps.push({ action: "click", target: text, raw: line, selector: `page.getByRole('${roleTxtClickM[1]}').getByText('${safeRegexContent(text)}')` });
      }
      continue;
    }
    // ─────────────────────────────────────────
    // 🔥 CHAINED .getByText(...).click()
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
    const expectVisM = line.match(/expect\(.*getByText\(['"`](.*?)['"`].*\)\)\.toBeVisible/);
    if (expectVisM) { rawSteps.push({ action: "verify", target: expectVisM[1], raw: line, selector: expectVisM[1], verifyType: "text-visible" }); continue; }
    const expectTxtM = line.match(/expect\(.*\)\.toHaveText\(['"`](.*?)['"`]/);
    if (expectTxtM) { rawSteps.push({ action: "verify", target: expectTxtM[1], raw: line, selector: expectTxtM[1], verifyType: "text-exact" }); continue; }
  }

  // ─────────────────────────────────────────────────────────────
  // POST-PROCESADO 1: Deduplicar fills preservando el ORDEN original
  //
  // Regla: para el mismo selector+valor (duplicado exacto), conservar
  // la PRIMERA ocurrencia y descartar las repeticiones posteriores.
  // Si el valor cambia entre dos fills del mismo selector (corrección
  // intencional) → conservar ambos.
  // Esto evita el reordenamiento que producía "keep last":
  //   fill(A,'x') click(B) fill(A,'x') → antes: click(B) fill(A,'x')
  //                                       ahora: fill(A,'x') click(B)
  // ─────────────────────────────────────────────────────────────
  const seenFillValues = new Map<string, string>(); // key→último valor visto

  const steps: Action[] = rawSteps.filter(s => {
    if (s.action !== "input" && s.action !== "fill") return true;
    const key = s.selector || s.target || '';
    const val = s.value ?? '';
    if (seenFillValues.has(key) && seenFillValues.get(key) === val) {
      // Duplicado exacto (mismo selector + mismo valor) → descartar
      return false;
    }
    seenFillValues.set(key, val);
    return true;
  });

  // ─────────────────────────────────────────────────────────────
  // POST-PROCESADO 2: Eliminar dblclick redundante antes de fill
  // Risk 4: también salta hover entre dblclick y fill
  // ─────────────────────────────────────────────────────────────
  const DBLCLICK_SKIP_ACTIONS = new Set(['press_key', 'press_enter', 'hover']);
  const stepsClean: Action[] = [];
  for (let idx = 0; idx < steps.length; idx++) {
    const curr = steps[idx];
    if (curr.action !== 'dblclick') { stepsClean.push(curr); continue; }

    const currField = curr.selector || curr.target || '';
    let fillIdx = -1;
    const intermediateIdxs: number[] = [];

    for (let k = idx + 1; k < steps.length; k++) {
      const s = steps[k];
      if (DBLCLICK_SKIP_ACTIONS.has(s.action)) {  // Risk 4: incluye hover
        intermediateIdxs.push(k);
        continue;
      }
      if ((s.action === 'input' || s.action === 'fill') &&
          (s.selector || s.target || '') === currField) {
        fillIdx = k;
      }
      break;
    }

    if (fillIdx !== -1) {
      console.log(`🔧 dblclick redundante eliminado antes de fill en: "${curr.target}"`);
      if (steps[fillIdx].value === '') {
        steps[fillIdx] = { ...steps[fillIdx], _editIntent: true };
        intermediateIdxs.forEach(k => { steps[k] = { ...steps[k], _editIntent: true }; });
      }
      continue; // saltar el dblclick
    }

    stepsClean.push(curr);
  }
  const cleanSteps = stepsClean;

  // ─────────────────────────────────────────────────────────────
  // POST-PROCESADO 3: Marcar popup triggers
  // ─────────────────────────────────────────────────────────────
  for (let i = 1; i < cleanSteps.length; i++) {
    if (cleanSteps[i].pageRef === 'popup' && cleanSteps[i - 1].action === 'click' && !cleanSteps[i - 1].pageRef) {
      cleanSteps[i - 1] = { ...cleanSteps[i - 1], popupTrigger: true };
    }
  }

  // Risk 10: advertir si la grabación no produjo ningún paso reconocible
  if (cleanSteps.length === 0) {
    console.warn(`⚠️ [Parser] No se encontraron pasos en "${filePath}" — verifica el formato de la grabación`);
  }

  return cleanSteps;
}
