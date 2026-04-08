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
      steps.push({
        action: "page_load",
        url: goto[1],
        raw: line
      });
      continue;
    }

    // 🔥 SELECT OPTION (CRÍTICO - DEBE IR ANTES QUE OTROS PATRONES)
    const selectOption = line.match(/\.selectOption\(['"`](.*?)['"`]\)/);
    if (selectOption) {
      // Extraer el selector del locator o getByRole
      let selector = '';
      let target = '';

      // Buscar locator o getByRole antes del selectOption
      const locatorMatch = line.match(/locator\(['"`](.*?)['"`]\)/);
      const roleMatch = line.match(/getByRole\(['"`](.*?)['"`],\s*{\s*name:\s*['"`](.*?)['"`]\s*}\)/);

      if (locatorMatch) {
        selector = locatorMatch[1];
        target = selector;
      } else if (roleMatch) {
        selector = `getByRole('${roleMatch[1]}', { name: '${roleMatch[2]}' })`;
        target = roleMatch[2];
      }

      steps.push({
        action: "select",
        target: target,
        value: selectOption[1],
        selector: selector,
        raw: line,
        locator: locatorMatch ? { type: "css", selector: selector } : { type: "role", role: roleMatch?.[1], name: roleMatch?.[2] }
      });
      continue;
    }

    // 🔥 ROLE CLICK
    const roleClick = line.match(/getByRole\(['"`](.*?)['"`],\s*{\s*name:\s*['"`](.*?)['"`]\s*}\)\.click/);
    if (roleClick) {
      steps.push({
        action: "click",
        target: roleClick[2],
        raw: line,
        locator: {
          type: "role",
          role: roleClick[1],
          name: roleClick[2]
        },
        selector: buildPlaywrightSelector({
          type: "role",
          role: roleClick[1],
          name: roleClick[2]
        })
      });
      continue;
    }

    // 🔥 ROLE FILL
    const roleFill = line.match(/getByRole\(['"`](.*?)['"`],\s*{\s*name:\s*['"`](.*?)['"`]\s*}\)\.fill\(['"`](.*?)['"`]\)/);
    if (roleFill) {
      steps.push({
        action: "input",
        target: roleFill[2],
        value: roleFill[3],
        raw: line,
        locator: {
          type: "role",
          role: roleFill[1],
          name: roleFill[2]
        },
        selector: buildPlaywrightSelector({
          type: "role",
          role: roleFill[1],
          name: roleFill[2]
        })
      });
      continue;
    }

    // 🔥 getByText CLICK
    const textClick = line.match(/getByText\(['"`](.*?)['"`]\)\.click/);
    if (textClick) {
      steps.push({
        action: "click",
        target: textClick[1],
        raw: line,
        locator: {
          type: "text",
          text: textClick[1]
        },
        selector: buildPlaywrightSelector({
          type: "text",
          text: textClick[1]
        })
      });
      continue;
    }

    // 🔥 LOCATOR CLICK
    const locatorClick = line.match(/locator\(['"`](.*?)['"`]\)\.click/);
    if (locatorClick) {
      steps.push({
        action: "click",
        target: locatorClick[1],
        raw: line,
        locator: {
          type: "css",
          selector: locatorClick[1]
        },
        selector: buildPlaywrightSelector({
          type: "css",
          selector: locatorClick[1]
        })
      });
      continue;
    }

    // 🔥 LOCATOR FILL
    const locatorFill = line.match(/locator\(['"`](.*?)['"`]\)\.fill\(['"`](.*?)['"`]\)/);
    if (locatorFill) {
      steps.push({
        action: "input",
        target: locatorFill[1],
        value: locatorFill[2],
        raw: line,
        locator: {
          type: "css",
          selector: locatorFill[1]
        },
        selector: buildPlaywrightSelector({
          type: "css",
          selector: locatorFill[1]
        })
      });
      continue;
    }
  }

  return steps;
}