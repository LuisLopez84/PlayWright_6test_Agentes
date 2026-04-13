
import { test, expect } from '@playwright/test';
import { smartGoto } from '../../../../ConfigurationTest/tests/utils/navigation-helper';
import { smartClick, smartFill, smartWaitForText } from '../../../../ConfigurationTest/tests/utils/smart-actions';

test('DemoQA_Elements_Browser2', async ({ page, context }) => {
  await smartGoto(page, 'DemoQA_Elements_Browser2');

  await smartClick(page, `Book Store Application`);
  await smartClick(page, `Alerts, Frame & Windows`);
  await smartClick(page, `Browser Windows`);

  // Fallback de navegación directa: si los clicks de sidebar no llegaron al destino
  // (menú colapsado, SPA, overlay, etc.), navegar directamente.
  if (!page.url().includes('browser-windows')) {
    console.log('⚠️ Navegación UI no llegó a browser-windows — usando goto directo');
    await page.goto('https://demoqa.com/browser-windows');
    await page.waitForLoadState('load');
  }

  // context.waitForEvent('page') captura cualquier nueva página del contexto
  // sin depender del actionTimeout del config (más robusto que page.waitForEvent('popup'))
  const [_popupPage] = await Promise.all([
    context.waitForEvent('page', { timeout: 30000 }),
    page.getByRole('button', { name: 'New Window', exact: true }).click(),
  ]);
  await _popupPage.waitForLoadState('load');

  // Verificar contenido en la nueva pestaña
  await smartWaitForText(_popupPage, `This is a sample page`, 15000);
});
