
import { test, expect } from '@playwright/test';
import { smartGoto } from '../../../../ConfigurationTest/tests/utils/navigation-helper';
import { smartClick, smartFill } from '../../../../ConfigurationTest/tests/utils/smart-actions';

test('DemoQA_Elements_Links', async ({ page }) => {
  await smartGoto(page, 'DemoQA_Elements_Links');

  await smartClick(page, `Book Store Application`);
  await smartClick(page, `Elements`);
  await smartClick(page, `Links`);
  await smartClick(page, `Moved`);
  await smartClick(page, `Home`);
  await smartClick(page, `Book Store Application`);
  await smartClick(page, `Elements`);
  await smartClick(page, `Links`);
  await smartClick(page, `HomeeSOYc`);
});
