
import { test, expect } from '@playwright/test';
import { smartGoto } from '../../../../ConfigurationTest/tests/utils/navigation-helper';
import { smartClick, smartFill, smartSelect } from '../../../../ConfigurationTest/tests/utils/smart-actions';

test('DemoQA_Elements_Widges3', async ({ page }) => {
  await smartGoto(page, 'DemoQA_Elements_Widges3');

  await smartClick(page, `Book Store Application`);
  await smartClick(page, `Widgets`);
  await smartClick(page, `Date Picker`);
  await smartClick(page, `#datePickerMonthYearInput`);
  await smartSelect(page, `Choose Saturday, April 11th,`, '1950');
  await smartClick(page, `Choose Tuesday, January 31st,`);
  await smartClick(page, `#dateAndTimePickerInput`);
  await smartClick(page, `Next Month`);
  await smartClick(page, `17:45`);
});
