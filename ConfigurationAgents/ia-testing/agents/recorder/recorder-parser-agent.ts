import fs from "fs";
import { buildPlaywrightSelector } from "../../utils/selector-builder";

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

    // Ignorar presiones de teclas
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

    // 🔥 getByText CLICK
    const textClick = line.match(/getByText\(['"`](.*?)['"`]\)\.click/);
    if (textClick) {
      steps.push({ action: "click", target: textClick[1], raw: line, selector: buildPlaywrightSelector({ type: "text", text: textClick[1] }) });
      continue;
    }

    // 🔥 LOCATOR CLICK
    const locatorClick = line.match(/locator\(['"`](.*?)['"`]\)\.click/);
    if (locatorClick) {
      steps.push({ action: "click", target: locatorClick[1], raw: line, selector: buildPlaywrightSelector({ type: "css", selector: locatorClick[1] }) });
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

    // 🔥 NUEVO: getByRole('listitem').filter({ hasText: /.../ }).click()
    const listItemFilterClick = line.match(/getByRole\(['"`]listitem['"`]\)\.filter\(\{\s*hasText:\s*\/(.*?)\/\s*\}\)\.click/);
    if (listItemFilterClick) {
      steps.push({ action: "click", target: listItemFilterClick[1], raw: line, selector: `page.getByRole('listitem').filter({ hasText: /${listItemFilterClick[1]}/ })` });
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
  }

  return steps;
}