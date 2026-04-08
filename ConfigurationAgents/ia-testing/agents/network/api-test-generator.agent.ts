import fs from 'fs';
import path from 'path';
import { ensureDir } from '../../utils/fs-utils';

export function generateApiTests(flowName: string, apis: any[]) {
  if (!apis.length) {
    console.log('ℹ️ No API calls discovered, skipping API tests');
    return;
  }

  const projectRoot = process.cwd();
  const testDir = path.join(projectRoot, 'GenerateTest', 'tests', flowName, 'api');
  ensureDir(testDir);

  let tests = `import { test, expect } from '@playwright/test';\n\n`;
  tests += `test.describe('API tests for ${flowName}', () => {\n`;

  apis.forEach((api, index) => {
    const method = api.method.toLowerCase();
    tests += `
  test('${method.toUpperCase()} ${api.url}', async ({ request }) => {
    const response = await request.${method}("${api.url}");
    expect(response.status()).toBeLessThan(500);
  });
`;
  });

  tests += `});\n`;

  const filePath = path.join(testDir, `${flowName}-api.spec.ts`);
  fs.writeFileSync(filePath, tests);
  console.log(`✅ API tests generados: ${filePath}`);
}