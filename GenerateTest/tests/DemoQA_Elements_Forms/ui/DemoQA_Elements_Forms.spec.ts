
import { test, expect } from '@playwright/test';
import { smartGoto } from '../../../../ConfigurationTest/tests/utils/navigation-helper';
import { smartClick, smartFill, smartSelect, smartCheck, smartUpload } from '../../../../ConfigurationTest/tests/utils/smart-actions';

test('DemoQA_Elements_Forms', async ({ page }) => {
  await smartGoto(page, 'DemoQA_Elements_Forms');

  await smartClick(page, `Book Store Application`);
  await smartClick(page, `Elements`);
  await smartClick(page, `Elements`);
  await smartClick(page, `Forms`);
  await smartClick(page, `Practice Form`);
  await smartClick(page, `First Name`);
  await smartFill(page, `First Name`, 'Luis');
  await page.waitForTimeout(500);
  await smartClick(page, `Last Name`);
  await smartFill(page, `Last Name`, 'Lopez');
  await page.waitForTimeout(500);
  await smartClick(page, `name@example.com`);
  await smartFill(page, `name@example.com`, 'pruebas@prue.com.co');
  await page.waitForTimeout(500);
  await smartCheck(page, `Male`);
  await smartClick(page, `Mobile Number`);
  await smartFill(page, `Mobile Number`, '3333333333');
  await page.waitForTimeout(500);
  await smartClick(page, `#dateOfBirthInput`);
  await smartSelect(page, `Choose Saturday, April 11th,`, '1984');
  await smartClick(page, `Choose Sunday, April 1st,`);
  await smartClick(page, `.subjects-auto-complete__input-container`);
  await smartFill(page, `#subjectsInput`, 'no se');
  await page.waitForTimeout(500);
  await smartCheck(page, `Reading`);
  await smartClick(page, `Choose File`);
  // Upload de archivo — asegúrate de que el fichero existe en el entorno de test
  try {
    await smartUpload(page, `Choose File`, 'cloude001.png');
  } catch (e) {
    console.warn('⚠️ Upload omitido (archivo no encontrado):', 'cloude001.png');
  }
  await smartClick(page, `Current Address`);
  await smartFill(page, `Current Address`, 'test 001');
  await page.waitForTimeout(500);
  await smartClick(page, `#state > .css-13cymwt-control > .css-hlgwow > .css-19bb58m`);
  await smartClick(page, `Rajasthan`);
  await smartClick(page, `.css-1xc3v61-indicatorContainer`);
  await smartClick(page, `Jaiselmer`);
  await smartClick(page, `Submit`);
  await smartClick(page, `Close`);
  await smartClick(page, `Close`);
});
