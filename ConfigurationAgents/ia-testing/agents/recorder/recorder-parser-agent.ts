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
// PARSER PRINCIPAL
// ─────────────────────────────────────────────────────────────
export function parseRecording(filePath: string): any[] {
  const content = fs.readFileSync(filePath, "utf-8");
  const rawSteps: any[] = [];
  const lines = content.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*")) continue;
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

    // Ignorar teclas de control no semánticas
    if (/\.press\(['"`](CapsLock|Shift|Control|Alt|Meta|Tab|Escape|Backspace|Delete|ArrowUp|ArrowDown|ArrowLeft|ArrowRight|F\d+|Home|End|PageUp|PageDown)['"`]\)/.test(line)) continue;

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

  return steps;
}
