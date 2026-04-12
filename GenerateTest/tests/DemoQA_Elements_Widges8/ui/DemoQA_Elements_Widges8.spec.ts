
import { test, expect } from '@playwright/test';
import { smartGoto } from '../../../../ConfigurationTest/tests/utils/navigation-helper';
import { smartClick, smartFill } from '../../../../ConfigurationTest/tests/utils/smart-actions';

test('DemoQA_Elements_Widges8', async ({ page }) => {
  await smartGoto(page, 'DemoQA_Elements_Widges8');

  await smartClick(page, `Book Store Application`);
  await smartClick(page, `Widgets`);
  await smartClick(page, `Menu`);
  await smartClick(page, `Main Item 1`);
  await smartClick(page, `Main Item 1`);
  await smartClick(page, `Main Item 2`);
  await smartClick(page, `Main Item 3`);
  await smartClick(page, `Main Item 3`);
  await smartClick(page, `Main Item 2`);
  await smartClick(page, `SUB SUB LIST »`);
  await smartClick(page, `Sub Sub Item 1`);
  await smartClick(page, `Sub Sub Item 2`);
});
