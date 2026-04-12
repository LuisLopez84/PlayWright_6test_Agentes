import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://demoqa.com/');
  await page.getByRole('link', { name: 'Book Store Application' }).click();
  await page.getByText('Elements').click();
  await page.getByRole('link', { name: 'Check Box' }).click();
  await page.getByRole('checkbox', { name: 'Select Home' }).click();
  await page.locator('.rc-tree-switcher').click();
  await page.locator('.rc-tree-switcher.rc-tree-switcher_close').first().click();
  await page.locator('.rc-tree-switcher.rc-tree-switcher_close').first().click();
  await page.locator('.rc-tree-switcher.rc-tree-switcher_close').first().click();
  await page.locator('.rc-tree-switcher.rc-tree-switcher_close').first().click();
  await page.locator('.rc-tree-switcher.rc-tree-switcher_close').click();
  await page.getByRole('treeitem', { name: 'Select Excel File.doc Excel' }).click();
  await page.getByRole('checkbox', { name: 'Select Excel File.doc' }).click();
  await page.getByRole('checkbox', { name: 'Select Word File.doc' }).click();
  await page.getByRole('checkbox', { name: 'Select Public' }).click();
  await page.getByRole('checkbox', { name: 'Select React' }).click();
  await page.getByRole('checkbox', { name: 'Select Notes' }).click();
  await page.getByText('You have selected :').click();
});