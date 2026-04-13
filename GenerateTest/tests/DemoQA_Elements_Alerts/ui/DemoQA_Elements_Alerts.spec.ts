
import { test, expect } from '@playwright/test';
import { smartGoto } from '../../../../ConfigurationTest/tests/utils/navigation-helper';
import { smartClick, smartFill } from '../../../../ConfigurationTest/tests/utils/smart-actions';

test('DemoQA_Elements_Alerts', async ({ page }) => {
  await smartGoto(page, 'DemoQA_Elements_Alerts');

  await smartClick(page, `Book Store Application`);
  await smartClick(page, `Alerts, Frame & Windows`);
  await smartClick(page, `Alerts`);
  // Manejar diálogo nativo del navegador
  page.once('dialog', async dialog => {
    console.log(`Dialog: ${dialog.message()}`);
    await dialog.accept();
  });
  await smartClick(page, `#alertButton`);
  await smartClick(page, `#timerAlertButton`);
  // Manejar diálogo nativo del navegador
  page.once('dialog', async dialog => {
    console.log(`Dialog: ${dialog.message()}`);
    await dialog.accept();
  });
  await smartClick(page, `#timerAlertButton`);
  // Manejar diálogo nativo del navegador
  page.once('dialog', async dialog => {
    console.log(`Dialog: ${dialog.message()}`);
    await dialog.accept();
  });
  await smartClick(page, `#confirmButton`);
  // Manejar diálogo nativo del navegador
  page.once('dialog', async dialog => {
    console.log(`Dialog: ${dialog.message()}`);
    await dialog.accept();
  });
  await smartClick(page, `#promtButton`);
});
