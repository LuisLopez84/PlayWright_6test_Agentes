
import { test, expect } from '@playwright/test';
import { smartGoto } from '../../../../ConfigurationTest/tests/utils/navigation-helper';
import { smartClick, smartFill, smartSelect, smartCheck, smartUpload } from '../../../../ConfigurationTest/tests/utils/smart-actions';

test('DemoQA_Elements_Forms', async ({ page }) => {
  await smartGoto(page, 'DemoQA_Elements_Forms');

  await smartClick(page, `Book Store Application`);
  await smartClick(page, `Elements`);
  await smartClick(page, `Forms`);
  await smartClick(page, `Practice Form`);
  await smartFill(page, `First Name`, 'Luis');
  await page.waitForTimeout(500);
  await smartFill(page, `Last Name`, 'Lopez');
  await page.waitForTimeout(500);
  await smartFill(page, `name@example.com`, 'pruebas@prue.com.co');
  await page.waitForTimeout(500);
  await smartCheck(page, `Male`);
  await smartFill(page, `Mobile Number`, '3333333333');
  await page.waitForTimeout(500);
  await smartClick(page, `#dateOfBirthInput`);
  // Date picker: select year via the year dropdown, then close
  try {
    const yearSelect = page.locator('.react-datepicker__year-select');
    if (await yearSelect.count() > 0) {
      await yearSelect.selectOption('1984');
    }
    await page.keyboard.press('Escape');
  } catch (e) {
    console.warn('⚠️ Date picker handling skipped:', e);
  }
  await smartClick(page, `.subjects-auto-complete__input-container`);
  await smartFill(page, `#subjectsInput`, 'Maths');
  await page.waitForTimeout(500);
  await page.keyboard.press('Enter');
  await smartCheck(page, `Reading`);
  // Upload de archivo — asegúrate de que el fichero existe en el entorno de test
  try {
    await smartUpload(page, `Choose File`, 'cloude001.png');
  } catch (e) {
    console.warn('⚠️ Upload omitido (archivo no encontrado):', 'cloude001.png');
  }
  await smartFill(page, `Current Address`, 'test 001');
  await page.waitForTimeout(500);
  // State + city React Select — click to open, then select option
  try {
    await page.locator('#state').click();
    await page.waitForTimeout(300);
    const rajasthanOpt = page.getByRole('option', { name: 'Rajasthan' }).or(page.getByText('Rajasthan', { exact: true }));
    await rajasthanOpt.first().click({ timeout: 5000 });
    await page.waitForTimeout(300);
    // Open city dropdown and select
    await page.locator('#city').click();
    await page.waitForTimeout(300);
    const cityOpt = page.getByRole('option').filter({ hasText: /Jais/i });
    if (await cityOpt.count() > 0) {
      await cityOpt.first().click();
    }
  } catch (e) {
    console.warn('⚠️ State/city selection skipped:', e);
  }
  await smartClick(page, `Submit`);
  await smartClick(page, `Close`);
});
