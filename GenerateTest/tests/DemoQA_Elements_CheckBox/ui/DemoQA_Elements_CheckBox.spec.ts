
import { test, expect } from '@playwright/test';
import { smartGoto } from '../../../../ConfigurationTest/tests/utils/navigation-helper';
import { smartClick, smartFill, smartWaitForText, smartCheck } from '../../../../ConfigurationTest/tests/utils/smart-actions';

test('DemoQA_Elements_CheckBox', async ({ page }) => {
  await smartGoto(page, 'DemoQA_Elements_CheckBox');

  await smartClick(page, `Book Store Application`);
  await smartClick(page, `Elements`);
  await smartClick(page, `Check Box`);
  await smartCheck(page, `Select Home`);
  await smartClick(page, `.rc-tree-switcher`);
  await smartClick(page, `.rc-tree-switcher.rc-tree-switcher_close`);
  await smartClick(page, `.rc-tree-switcher.rc-tree-switcher_close`);
  await smartClick(page, `.rc-tree-switcher.rc-tree-switcher_close`);
  await smartClick(page, `.rc-tree-switcher.rc-tree-switcher_close`);
  await smartClick(page, `.rc-tree-switcher.rc-tree-switcher_close`);
  await smartClick(page, `Select Excel File.doc Excel`);
  await smartCheck(page, `Select Excel File.doc`);
  await smartCheck(page, `Select Word File.doc`);
  await smartCheck(page, `Select Public`);
  await smartCheck(page, `Select React`);
  await smartCheck(page, `Select Notes`);
  // Verificar mensaje de resultado (texto asíncrono — puede ser toast transitorio)
  await smartWaitForText(page, `You have selected :`, 15000);
});
