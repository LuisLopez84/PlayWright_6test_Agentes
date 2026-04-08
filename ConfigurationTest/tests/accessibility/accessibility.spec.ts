import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { smartGoto } from '@utils/navigation-helper';

test('homepage accessibility scan', async ({ page }) => {

  await smartGoto(page, 'GLOBAL');

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();

  console.log("Violations:", results.violations.length);

});
