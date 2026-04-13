
import { test, expect } from '@playwright/test';
import { smartGoto } from '../../../../ConfigurationTest/tests/utils/navigation-helper';
import { smartClick, smartFill, smartWaitForText } from '../../../../ConfigurationTest/tests/utils/smart-actions';

test('DemoQA_Elements_Browser', async ({ page, context }) => {
  await smartGoto(page, 'DemoQA_Elements_Browser');

  await smartClick(page, `Book Store Application`);
  await smartClick(page, `Alerts, Frame & Windows`);
  await smartClick(page, `Browser Windows`);

  // Esperar que la página de Browser Windows esté completamente lista
  await page.waitForLoadState('load');

  // Abrir nueva pestaña usando context.waitForEvent('page') que es más robusto
  // que page.waitForEvent('popup') — captura cualquier nueva página en el contexto
  const [_popupPage] = await Promise.all([
    context.waitForEvent('page', { timeout: 30000 }),
    (page.getByRole('button', { name: 'New Tab' })).click(),
  ]);
  await _popupPage.waitForLoadState('load');

  // Verificar contenido en la nueva pestaña
  await smartWaitForText(_popupPage, `This is a sample page`, 15000);
});
