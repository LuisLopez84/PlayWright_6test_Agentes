
import { test, expect } from '@playwright/test';
import { smartGoto } from '../../../../ConfigurationTest/tests/utils/navigation-helper';
import { smartClick, smartFill } from '../../../../ConfigurationTest/tests/utils/smart-actions';

test('DemoQA_Elements_Links', async ({ page, context }) => {
  await smartGoto(page, 'DemoQA_Elements_Links');

  await smartClick(page, `Book Store Application`);
  await smartClick(page, `Elements`);
  await smartClick(page, `Links`);
  await smartClick(page, `Moved`);
  // Asegurar que la página está lista antes de abrir nueva pestaña
  await page.waitForLoadState('load');
  // context.waitForEvent('page') es más robusto que page.waitForEvent('popup'):
  // captura cualquier nueva página en el contexto sin depender del actionTimeout
  const [_popupPage] = await Promise.all([
    context.waitForEvent('page', { timeout: 30000 }),
    (page.getByRole('link', { name: 'Home', exact: true })).click(),
  ]);
  await _popupPage.waitForLoadState('load');
  await smartClick(_popupPage, `Book Store Application`);
  await smartClick(_popupPage, `Elements`);
  await smartClick(_popupPage, `Links`);
  await smartClick(_popupPage, `HomeeSOYc`);
});
