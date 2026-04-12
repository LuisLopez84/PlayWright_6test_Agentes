
import { test, expect } from '@playwright/test';
import { smartGoto } from '../../../../ConfigurationTest/tests/utils/navigation-helper';
import { smartClick, smartFill } from '../../../../ConfigurationTest/tests/utils/smart-actions';

test('DemoQA_Elements_DownloadUpload2', async ({ page }) => {
  await smartGoto(page, 'DemoQA_Elements_DownloadUpload2');

  await smartClick(page, `Book Store Application`);
  await smartClick(page, `Elements`);
  await smartClick(page, `Upload and Download`);
  await smartClick(page, `Download`);
});
