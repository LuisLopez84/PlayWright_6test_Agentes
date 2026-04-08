import fs from 'fs';
import path from 'path';
import { ensureDir } from '../../utils/fs-utils';

export function generateVisual(name: string, url: string) {
  const testDir = path.join('GenerateTest', 'tests', name, 'visual');
  ensureDir(testDir);
  const file = path.join(testDir, `${name}-visual.spec.ts`);

  const code = `
import { test, expect } from '@playwright/test';

test('visual ${name}', async ({ page }) => {
  await page.goto('${url}');
  await expect(page).toHaveScreenshot('${name}.png', { fullPage: true });
});
`;
  fs.writeFileSync(file, code);
  console.log(`✅ Visual test generado: ${file}`);
}