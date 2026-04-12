
import { test, expect } from '@playwright/test';
import { smartGoto } from '../../../../ConfigurationTest/tests/utils/navigation-helper';
import { smartClick } from '../../../../ConfigurationTest/tests/utils/smart-actions';

test('DemoQA_Elements_Alerts', async ({ page }) => {
  await smartGoto(page, 'DemoQA_Elements_Alerts');

  await smartClick(page, `Book Store Application`);
  await smartClick(page, `Alerts, Frame & Windows`);
  await smartClick(page, `Alerts`);

  // Registrar un handler persistente para todos los diálogos nativos del navegador
  page.on('dialog', dialog => { dialog.dismiss().catch(() => {}); });

  // Alerta inmediata
  await page.locator('#alertButton').click();
  await page.waitForTimeout(500);

  // Alerta con timer de 5 segundos
  await page.locator('#timerAlertButton').click();
  await page.waitForTimeout(6000); // esperar que dispare el timer

  // Diálogo de confirmación
  await page.locator('#confirmButton').click();
  await page.waitForTimeout(500);

  // Diálogo de prompt
  await page.locator('#promtButton').click();
  await page.waitForTimeout(500);
});
