import fs from "fs";
import { buildPlaywrightSelector } from "../../utils/selector-builder";

// ─────────────────────────────────────────────────────────────
// DETECCIÓN DE TEXTO DE RESULTADO/VERIFICACIÓN
// ─────────────────────────────────────────────────────────────
/**
 * Patrones que indican que el texto es un mensaje de resultado/confirmación
 * y NO un elemento interactivo. Cuando Playwright codegen graba un click sobre
 * este tipo de texto, en realidad el tester estaba verificando que apareció.
 *
 * Transversal: aplica para cualquier idioma (es/en/pt).
 */
const RESULT_TEXT_PATTERNS: RegExp[] = [
  // Español
  /transferencia\s+realizada/i,
  /operaci[oó]n\s+(exitosa|completada|realizada|aprobada)/i,
  /pago\s+(exitoso|realizado|confirmado|aprobado)/i,
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
  // Inglés
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
  // Símbolos comunes en mensajes de éxito
  /✓|✅|☑/,
];

/**
 * Determina si un texto de click es realmente un mensaje de resultado/verificación.
 * Excluye textos que son claramente elementos de navegación o acciones.
 */
export function isResultText(text: string): boolean {
  // Excluir textos cortos que probablemente sean botones o links de nav
  if (text.trim().length < 5) return false;

  // Excluir textos que son claramente acciones/navegación
  const isAction = /^(transferir|confirmar|aceptar|cancelar|volver|siguiente|anterior|cerrar|salir|ingresar|login|submit|ok|si|no|yes|guardar|enviar|buscar|filtrar|limpiar|nuevo|agregar|editar|eliminar|ver|detalles|más|less|more|ver\s+más|load\s+more)$/i.test(text.trim());
  if (isAction) return false;

  return RESULT_TEXT_PATTERNS.some(p => p.test(text));
}

// ─────────────────────────────────────────────────────────────
// PARSER PRINCIPAL
// ─────────────────────────────────────────────────────────────
export function parseRecording(filePath: string) {

  const content = fs.readFileSync(filePath, "utf-8");
  const steps: any[] = [];
  const lines = content.split("\n");

  for (const line of lines) {

    // 🔥 NAVIGATION
    const goto = line.match(/goto\(['"`](.*?)['"`]\)/);
    if (goto) {
      steps.push({ action: "page_load", url: goto[1], raw: line });
      continue;
    }

    // Ignorar presiones de teclas de control (no ignorar Enter/Tab para preservar flujo)
    const ignorePress = line.match(/\.press\(['"`](CapsLock|Shift|Control|Alt|Meta|Tab|Enter)['"`]\)/);
    if (ignorePress) continue;

    // 🔥 SELECT OPTION
    const selectOption = line.match(/\.selectOption\(['"`](.*?)['"`]\)/);
    if (selectOption) {
      let selector = '', target = '';
      const locatorMatch = line.match(/locator\(['"`](.*?)['"`]\)/);
      const roleMatch = line.match(/getByRole\(['"`](.*?)['"`],\s*{\s*name:\s*['"`](.*?)['"`]\s*}\)/);
      if (locatorMatch) { selector = locatorMatch[1]; target = selector; }
      else if (roleMatch) { selector = `getByRole('${roleMatch[1]}', { name: '${roleMatch[2]}' })`; target = roleMatch[2]; }
      steps.push({ action: "select", target, value: selectOption[1], selector, raw: line });
      continue;
    }

    // 🔥 OPTION + STRONG CLICK
    const optionStrongClick = line.match(/getByRole\(['"`]option['"`],\s*{\s*name:\s*['"`](.*?)['"`]\s*}\)\.getByRole\(['"`]strong['"`]\)\.click/);
    if (optionStrongClick) {
      steps.push({ action: "click", target: optionStrongClick[1], raw: line, selector: `page.getByRole('option', { name: '${optionStrongClick[1]}' }).getByRole('strong')` });
      continue;
    }

    // 🔥 NUEVO: getByRole('list').getByText('...').click() — items de lista/sidebar/nav
    // Este patrón SIEMPRE es click de navegación (no resultado).
    const listTextClick = line.match(/getByRole\(['"`]list['"`]\)\.getByText\(['"`](.*?)['"`]\)\.click/);
    if (listTextClick) {
      steps.push({
        action: "click",
        target: listTextClick[1],
        raw: line,
        selector: buildPlaywrightSelector({ type: "list-text", text: listTextClick[1] })
      });
      continue;
    }

    // 🔥 NUEVO: getByRole('listitem').filter({ hasText: '...' }).click()
    const listItemFilterTextClick = line.match(/getByRole\(['"`]listitem['"`]\)\.filter\(\{\s*hasText:\s*['"`](.*?)['"`]\s*\}\)\.click/);
    if (listItemFilterTextClick) {
      steps.push({
        action: "click",
        target: listItemFilterTextClick[1],
        raw: line,
        selector: `page.getByRole('listitem').filter({ hasText: '${listItemFilterTextClick[1]}' })`
      });
      continue;
    }

    // 🔥 NUEVO: getByRole('listitem').filter({ hasText: /regex/ }).click()
    const listItemFilterClick = line.match(/getByRole\(['"`]listitem['"`]\)\.filter\(\{\s*hasText:\s*\/(.*?)\/\s*\}\)\.click/);
    if (listItemFilterClick) {
      steps.push({ action: "click", target: listItemFilterClick[1], raw: line, selector: `page.getByRole('listitem').filter({ hasText: /${listItemFilterClick[1]}/ })` });
      continue;
    }

    // 🔥 ROLE CLICK (genérico)
    const roleClick = line.match(/getByRole\(['"`](.*?)['"`],\s*{\s*name:\s*['"`](.*?)['"`]\s*}\)\.click/);
    if (roleClick) {
      steps.push({ action: "click", target: roleClick[2], raw: line, selector: buildPlaywrightSelector({ type: "role", role: roleClick[1], name: roleClick[2] }) });
      continue;
    }

    // 🔥 ROLE FILL
    const roleFill = line.match(/getByRole\(['"`](.*?)['"`],\s*{\s*name:\s*['"`](.*?)['"`]\s*}\)\.fill\(['"`](.*?)['"`]\)/);
    if (roleFill) {
      steps.push({ action: "input", target: roleFill[2], value: roleFill[3], raw: line, selector: buildPlaywrightSelector({ type: "role", role: roleFill[1], name: roleFill[2] }) });
      continue;
    }

    // 🔥 getByText CLICK — distinguir entre click de acción y verificación de resultado
    const textClick = line.match(/getByText\(['"`](.*?)['"`]\)\.click/);
    if (textClick) {
      const text = textClick[1];
      if (isResultText(text)) {
        // Es un mensaje de resultado → verificar que apareció, no hacer click
        steps.push({
          action: "verify",
          target: text,
          raw: line,
          selector: text,
          verifyType: "text-visible"
        });
      } else {
        steps.push({
          action: "click",
          target: text,
          raw: line,
          selector: buildPlaywrightSelector({ type: "text", text })
        });
      }
      continue;
    }

    // 🔥 LOCATOR CLICK — verificar si es texto de resultado
    const locatorClick = line.match(/locator\(['"`](.*?)['"`]\)\.click/);
    if (locatorClick) {
      const sel = locatorClick[1];
      // Si el selector es :text(...) o :has-text(...) con contenido de resultado
      const textInLocator = sel.match(/:(?:has-)?text\(['"`](.*?)['"`]\)/);
      if (textInLocator && isResultText(textInLocator[1])) {
        steps.push({
          action: "verify",
          target: textInLocator[1],
          raw: line,
          selector: textInLocator[1],
          verifyType: "text-visible"
        });
      } else {
        steps.push({ action: "click", target: sel, raw: line, selector: buildPlaywrightSelector({ type: "css", selector: sel }) });
      }
      continue;
    }

    // 🔥 LOCATOR FILL
    const locatorFill = line.match(/locator\(['"`](.*?)['"`]\)\.fill\(['"`](.*?)['"`]\)/);
    if (locatorFill) {
      steps.push({ action: "input", target: locatorFill[1], value: locatorFill[2], raw: line, selector: buildPlaywrightSelector({ type: "css", selector: locatorFill[1] }) });
      continue;
    }

    // 🔥 GETBYTESTID CLICK
    const testIdClick = line.match(/getByTestId\(['"`](.*?)['"`]\)\.click/);
    if (testIdClick) {
      steps.push({ action: "click", target: testIdClick[1], raw: line, selector: `page.getByTestId('${testIdClick[1]}')` });
      continue;
    }

    // 🔥 GETBYTESTID FILL
    const testIdFill = line.match(/getByTestId\(['"`](.*?)['"`]\)\.fill\(['"`](.*?)['"`]\)/);
    if (testIdFill) {
      steps.push({ action: "input", target: testIdFill[1], value: testIdFill[2], raw: line, selector: `page.getByTestId('${testIdFill[1]}')` });
      continue;
    }

    // 🔥 NUEVO: getByRole('link', { name: '...', exact: true }).click()
    const linkExactClick = line.match(/getByRole\(['"`]link['"`],\s*{\s*name:\s*['"`](.*?)['"`],\s*exact:\s*true\s*}\)\.click/);
    if (linkExactClick) {
      steps.push({ action: "click", target: linkExactClick[1], raw: line, selector: `page.getByRole('link', { name: '${linkExactClick[1]}', exact: true })` });
      continue;
    }

    // 🔥 NUEVO: getByRole('button', { name: '...' }).first().click()
    const buttonFirstClick = line.match(/getByRole\(['"`]button['"`],\s*{\s*name:\s*['"`](.*?)['"`]\s*}\)\.first\(\)\.click/);
    if (buttonFirstClick) {
      steps.push({ action: "click", target: buttonFirstClick[1], raw: line, selector: `page.getByRole('button', { name: '${buttonFirstClick[1]}' }).first()` });
      continue;
    }

    // 🔥 NUEVO: getByText('...').click() con cadena compleja tipo role+text
    // Ejemplo: page.getByRole('navigation').getByText('...').click()
    const chainedTextClick = line.match(/\.getByText\(['"`](.*?)['"`]\)\.click/);
    if (chainedTextClick && !textClick) {
      const text = chainedTextClick[1];
      if (isResultText(text)) {
        steps.push({ action: "verify", target: text, raw: line, selector: text, verifyType: "text-visible" });
      } else {
        steps.push({ action: "click", target: text, raw: line, selector: buildPlaywrightSelector({ type: "text", text }) });
      }
      continue;
    }

    // 🔥 EXPECT / ASSERTIONS del recording (to.be.visible, etc.) → convertir a verify
    const expectVisible = line.match(/expect\(.*getByText\(['"`](.*?)['"`].*\)\)\.toBeVisible/);
    if (expectVisible) {
      steps.push({ action: "verify", target: expectVisible[1], raw: line, selector: expectVisible[1], verifyType: "text-visible" });
      continue;
    }

    const expectText = line.match(/expect\(.*\)\.toHaveText\(['"`](.*?)['"`]/);
    if (expectText) {
      steps.push({ action: "verify", target: expectText[1], raw: line, selector: expectText[1], verifyType: "text-exact" });
      continue;
    }
  }

  return steps;
}
