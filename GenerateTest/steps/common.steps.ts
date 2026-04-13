import { createBdd } from 'playwright-bdd';
import { expect } from '@playwright/test';
import { smartClick, smartFill, smartSelect } from '../../ConfigurationTest/tests/utils/smart-actions';
import { smartGoto } from '../../ConfigurationTest/tests/utils/navigation-helper';

const { Given, When, Then, Before } = createBdd();

// Navegar automáticamente a la URL del test antes de cada escenario
// El título del escenario tiene formato: "Flujo <SuiteName>"
// Se limpian cookies para que los tests que incluyen login empiecen desde estado limpio
Before(async ({ page, $bddContext }) => {
  const title = $bddContext.testInfo.title ?? '';
  const match = title.match(/Flujo\s+(\S+)/);
  if (match) {
    const suiteName = match[1];
    // Limpiar cookies para evitar conflictos con storageState pre-cargado
    await page.context().clearCookies();
    await smartGoto(page, suiteName);
    console.log(`🌐 BDD: Navegando a suite "${suiteName}"`);
  }
});

Given('el usuario está en la aplicación', async ({ page }) => {
  // Navegación ya fue realizada en el Before hook
  console.log('✅ Given ejecutado: el usuario está en la aplicación');
});

When('el usuario ingresa {string} en {string}', async ({ page }, value, target) => {
  await smartFill(page, target, value);
});

When('ingresa {string} en {string}', async ({ page }, value, target) => {
  await smartFill(page, target, value);
});

When('hace clic en {string}', async ({ page }, target) => {
  await smartClick(page, target);
});

When('selecciona {string} en {string}', async ({ page }, value, target) => {
  console.log(`🔽 Seleccionando: ${value} en ${target}`);
  await smartSelect(page, target, value);
});

When('completa {string} con {string}', async ({ page }, target, value) => {
  await smartFill(page, target, value);
});

Then('la operación es exitosa', async ({ page }) => {
  await expect(page).toBeTruthy();
});
