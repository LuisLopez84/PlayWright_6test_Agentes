import fs from 'fs';
import path from 'path';
import { ensureDir } from '../../utils/fs-utils';

export function generatePerformance(name: string, url: string) {
  const testDir = path.join('GenerateTest', 'tests', name, 'performance');
  ensureDir(testDir);
  const file = path.join(testDir, `${name}-performance.spec.ts`);

  const code = `
import { test, expect } from '@playwright/test';

test('performance ${name}', async ({ page }) => {
  const start = Date.now();
  await page.goto('${url}');
  const load = Date.now() - start;
  const budget = process.env.PERF_BUDGET
  ? Number(process.env.PERF_BUDGET)
  : 10000;

expect(load).toBeLessThan(budget);
});
`;
  fs.writeFileSync(file, code);
  console.log(`✅ Performance test generado: ${file}`);
}