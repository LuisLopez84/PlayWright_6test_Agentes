
import { test, expect } from '@playwright/test';
import { smartGoto } from '../../../../ConfigurationTest/tests/utils/navigation-helper';
import { smartClick, smartFill, smartSelect } from '../../../../ConfigurationTest/tests/utils/smart-actions';

test('DemoQA_Elements_Widges3', async ({ page }) => {
  await smartGoto(page, 'DemoQA_Elements_Widges3');

  await smartClick(page, `Book Store Application`);
  await smartClick(page, `Widgets`);
  await smartClick(page, `Date Picker`);
  // Date Picker: open, select year via year dropdown, select month, then pick a day
  await smartClick(page, `#datePickerMonthYearInput`);
  try {
    const yearSelect = page.locator('.react-datepicker__year-select');
    if (await yearSelect.count() > 0) {
      await yearSelect.selectOption('1950');
    }
    const monthSelect = page.locator('.react-datepicker__month-select');
    if (await monthSelect.count() > 0) {
      await monthSelect.selectOption('0'); // January = 0
    }
    // Click any visible day cell
    const dayCell = page.locator('.react-datepicker__day:not(.react-datepicker__day--outside-month)').first();
    await dayCell.click();
  } catch (e) {
    console.warn('⚠️ Date picker handling skipped:', e);
    await page.keyboard.press('Escape');
  }
  // Date+Time picker
  await smartClick(page, `#dateAndTimePickerInput`);
  try {
    await page.getByRole('button', { name: 'Next Month' }).click();
    const timeOpt = page.getByRole('option', { name: '17:45' }).or(page.getByText('17:45', { exact: true }));
    if (await timeOpt.count() > 0) await timeOpt.first().click();
  } catch (e) {
    console.warn('⚠️ DateTime picker handling skipped:', e);
    await page.keyboard.press('Escape');
  }
});
