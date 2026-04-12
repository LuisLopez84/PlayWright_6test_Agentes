
import { test, expect } from '@playwright/test';
import { smartGoto } from '../../../../ConfigurationTest/tests/utils/navigation-helper';
import { smartClick, smartFill, smartSelect } from '../../../../ConfigurationTest/tests/utils/smart-actions';

test('DemoQA_Elements_Widges9', async ({ page }) => {
  await smartGoto(page, 'DemoQA_Elements_Widges9');

  await smartClick(page, `Book Store Application`);
  await smartClick(page, `Widgets`);
  await smartClick(page, `Select Menu`);
  await smartClick(page, `.css-8mmkcg`);
  await smartClick(page, `Group 1, option 2`);
  await smartClick(page, `.css-1xc3v61-indicatorContainer > .css-8mmkcg`);
  await smartClick(page, `Mr.`);
  await smartSelect(page, `#oldSelectMenu`, '4');
  await smartClick(page, `div:nth-child(8) > .col-md-6 > .css-b62m3t-container > .css-13cymwt-control > .css-1wy0on6 > .css-1xc3v61-indicatorContainer > .css-8mmkcg`);
  await smartClick(page, `#react-select-4-option-2`);
  await smartClick(page, `#react-select-4-option-1`);
  await smartClick(page, `div:nth-child(8)`);
  await smartSelect(page, `#cars`, 'saab');
});
