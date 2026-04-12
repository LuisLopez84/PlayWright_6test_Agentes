
import { test, expect } from '@playwright/test';
import { smartGoto } from '../../../../ConfigurationTest/tests/utils/navigation-helper';
import { smartClick, smartFill } from '../../../../ConfigurationTest/tests/utils/smart-actions';

test('DemoQA_Elements_Interactions2', async ({ page }) => {
  await smartGoto(page, 'DemoQA_Elements_Interactions2');

  await smartClick(page, `Book Store Application`);
  await smartClick(page, `Interactions`);
  await smartClick(page, `Selectable`);
  await smartClick(page, `Resizable`);
  await smartClick(page, `Resizable box, starting at`);
  await smartClick(page, `#resizable`);
});
