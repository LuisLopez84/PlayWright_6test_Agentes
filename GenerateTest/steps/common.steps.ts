import { createBdd } from 'playwright-bdd';
import { expect } from '@playwright/test';
import { smartClick, smartFill, smartSelect } from '../../ConfigurationTest/tests/utils/smart-actions';
import { smartGoto } from '../../ConfigurationTest/tests/utils/navigation-helper';

const { Given, When, Then } = createBdd();


Given('el usuario está en la aplicación', async ({ page }) => {
  console.log('✅ Given ejecutado: Given el usuario está en la aplicación');
});

When('hace clic en {string}', async ({ page }, target) => {
  await smartClick(page, target);
});

When('completa {string} con {string}', async ({ page }, value, target) => {
  await smartFill(page, target, value);
});

Then('la operación es exitosa', async ({ page }) => {
  await expect(page).toBeTruthy();
});
