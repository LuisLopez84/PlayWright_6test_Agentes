
import { test, expect } from '@playwright/test';
import { smartGoto } from '../../../../ConfigurationTest/tests/utils/navigation-helper';
import { smartClick, smartFill } from '../../../../ConfigurationTest/tests/utils/smart-actions';

test('DemoQA_Elements_Links', async ({ page }) => {
  await smartGoto(page, 'DemoQA_Elements_Links');

  await smartClick(page, `Book Store Application`);
  await smartClick(page, `Elements`);
  await smartClick(page, `Links`);
  await smartClick(page, `Moved`);
  // Abrir nueva pestaña y esperar a que esté lista
  const [_popupPage] = await Promise.all([
    page.waitForEvent('popup'),
    (page.getByRole('link', { name: 'Home', exact: true })).click(),
  ]);
  await _popupPage.waitForLoadState();
  await smartClick(_popupPage, `Book Store Application`);
  await smartClick(_popupPage, `Elements`);
  await smartClick(_popupPage, `Links`);
  await smartClick(_popupPage, `HomeeSOYc`);
});
