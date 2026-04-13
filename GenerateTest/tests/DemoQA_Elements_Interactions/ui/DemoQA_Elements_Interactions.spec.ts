
import { test, expect } from '@playwright/test';
import { smartGoto } from '../../../../ConfigurationTest/tests/utils/navigation-helper';
import { smartClick, smartFill } from '../../../../ConfigurationTest/tests/utils/smart-actions';

test('DemoQA_Elements_Interactions', async ({ page }) => {
  await smartGoto(page, 'DemoQA_Elements_Interactions');

  await smartClick(page, `Book Store Application`);
  await smartClick(page, `Interactions`);
  await smartClick(page, `Sortable`);
  await smartClick(page, `One`);
  await smartClick(page, `Two`);
  await smartClick(page, `Grid`);
  await smartClick(page, `Five`);
  await smartClick(page, `Three`);
  await smartClick(page, `One`);
});
