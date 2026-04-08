import { test, expect } from '@playwright/test';
import { smartGoto } from '@utils/navigation-helper';

test('HTTPS enforcement', async ({ page }) => {

  await smartGoto(page, 'GLOBAL');

  const url = page.url();

  expect(url.startsWith('https')).toBeTruthy();

});



