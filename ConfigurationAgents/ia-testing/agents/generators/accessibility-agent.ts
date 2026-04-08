import fs from 'fs';
import path from 'path';
import { ensureDir } from '../../utils/fs-utils';

export function generateAccessibility(name: string, url: string) {
  const testDir = path.join('GenerateTest', 'tests', name, 'accessibility');
  ensureDir(testDir);
  const file = path.join(testDir, `${name}-accessibility.spec.ts`);

  const code = `
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('accessibility ${name}', async ({ page }) => {
  await page.goto('${url}');
  const results = await new AxeBuilder({ page }).analyze();
  console.log("Violations:", results.violations.length);
});
`;
  fs.writeFileSync(file, code);
  console.log(`✅ Accessibility test generado: ${file}`);
}