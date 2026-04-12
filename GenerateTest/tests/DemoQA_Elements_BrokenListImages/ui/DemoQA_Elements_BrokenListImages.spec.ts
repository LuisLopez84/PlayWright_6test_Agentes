
import { test, expect } from '@playwright/test';
import { smartGoto } from '../../../../ConfigurationTest/tests/utils/navigation-helper';
import { smartClick, smartFill } from '../../../../ConfigurationTest/tests/utils/smart-actions';

test('DemoQA_Elements_BrokenListImages', async ({ page }) => {
  await smartGoto(page, 'DemoQA_Elements_BrokenListImages');

  await smartClick(page, `Book Store Application`);
  await smartClick(page, `Elements`);
  await smartClick(page, `Broken Links - Images`);
  await smartClick(page, `Click Here for Valid Link`);
  await smartClick(page, `Book Store Application`);
  await smartClick(page, `Elements`);
  await smartClick(page, `Broken Links - Images`);
  await smartClick(page, `Click Here for Broken Link`);
  await smartClick(page, `This page returned a 500`);
});
