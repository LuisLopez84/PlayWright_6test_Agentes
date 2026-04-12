
import { test, expect } from '@playwright/test';
import { smartGoto } from '../../../../ConfigurationTest/tests/utils/navigation-helper';
import { smartClick, smartFill } from '../../../../ConfigurationTest/tests/utils/smart-actions';

test('DemoQA_Elements_Modales', async ({ page }) => {
  await smartGoto(page, 'DemoQA_Elements_Modales');

  await smartClick(page, `Book Store Application`);
  await smartClick(page, `Alerts, Frame & Windows`);
  await smartClick(page, `Modal Dialogs`);
  await smartClick(page, `Small modal`);
  await smartClick(page, `Close`);
  await smartClick(page, `Large modal`);
  await smartClick(page, `Close`);
});
