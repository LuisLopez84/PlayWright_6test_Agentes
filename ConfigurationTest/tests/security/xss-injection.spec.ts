import { test, expect } from '@playwright/test';
import { smartGoto } from '@utils/navigation-helper';

test('XSS Injection protection', async ({ page }) => {

  await smartGoto(page, 'GLOBAL');

  const payload = "<script>alert('xss')</script>";

  await page.fill('input[name="account"]', payload);
  await page.fill('input[name="pin"]', payload);

  await page.click('button[type="submit"]');

  const content = await page.content();

  expect(content).not.toContain(payload);

});

