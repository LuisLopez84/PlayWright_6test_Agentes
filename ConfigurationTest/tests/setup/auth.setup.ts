import { test as setup, expect } from '@playwright/test';
import { smartGoto } from '@utils/navigation-helper';

setup('authenticate', async ({ page }) => {

  console.log('🔐 Ejecutando setup de autenticación...');

  // ✅ Usa baseURL dinámico desde config
  await smartGoto(page, 'GLOBAL');

  // 🔍 Verifica si ya está autenticado
  const isLogged = await page.locator('#app-view').isVisible().catch(() => false);

  if (!isLogged) {

    console.log('🔑 Realizando login...');

    await page.fill('#username', process.env.USER || 'demo');
    await page.fill('#password', process.env.PASS || 'demo123');

    await page.click('#login-btn');

    await expect(page.locator('#app-view')).toBeVisible({ timeout: 15000 });

  } else {
    console.log('♻️ Sesión ya activa, no se requiere login');
  }

  // 💾 Guardar sesión
  await page.context().storageState({
    path: 'storage/auth.json'
  });

});