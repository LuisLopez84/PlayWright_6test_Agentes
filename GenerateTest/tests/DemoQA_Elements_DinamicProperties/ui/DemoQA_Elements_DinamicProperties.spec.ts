
import { test, expect } from '@playwright/test';
import { smartGoto } from '../../../../ConfigurationTest/tests/utils/navigation-helper';
import { smartClick, smartFill } from '../../../../ConfigurationTest/tests/utils/smart-actions';

test('DemoQA_Elements_DinamicProperties', async ({ page }) => {
  await smartGoto(page, 'DemoQA_Elements_DinamicProperties');

  await smartClick(page, `Book Store Application`);
  await smartClick(page, `Elements`);
  await smartClick(page, `Dynamic Properties`);
  await smartClick(page, `Color Change`);
  await smartClick(page, `Will enable 5 seconds`);
  // The "Visible After 5 Seconds" button appears 5s after page load — wait and retry
  await page.waitForTimeout(4000);
  await smartClick(page, `Visible After 5 Seconds`);
  await smartClick(page, `Color Change`);
});
