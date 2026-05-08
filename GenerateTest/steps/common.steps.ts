// AUTO-GENERADO — agrega "// CUSTOMIZADO" en esta línea para proteger el archivo de sobreescrituras.
import { createBdd } from 'playwright-bdd';
import { expect } from '@playwright/test';
import { smartClick, smartFill, smartSelect } from '@utils/smart-actions';

const { Given, When, Then } = createBdd();

// ── Inicio de sesión / estado inicial ─────────────────────────────────────────
Given('el usuario está en la aplicación', async ({ page }) => {
  // La navegación inicial la realiza smartGoto en el spec generado.
});

// ── Clicks genéricos ──────────────────────────────────────────────────────────
When('hace clic en {string}', async ({ page }, target: string) => {
  await smartClick(page, target);
});

// ── Fill / entrada de datos ───────────────────────────────────────────────────
When('el usuario ingresa {string} en {string}', async ({ page }, value: string, target: string) => {
  await smartFill(page, target, value);
});

When('ingresa {string} en {string}', async ({ page }, value: string, target: string) => {
  await smartFill(page, target, value);
});

When('completa {string} con {string}', async ({ page }, value: string, target: string) => {
  await smartFill(page, target, value);
});

// ── Select ────────────────────────────────────────────────────────────────────
When('selecciona {string} en {string}', async ({ page }, value: string, target: string) => {
  await smartSelect(page, target, value);
});

// ── Navegación ────────────────────────────────────────────────────────────────
When('navega a {string}', async ({ page }, target: string) => {
  const isUrl = target.startsWith('http') || target.startsWith('/') ||
                target.includes('.com')    || target.includes('localhost');
  if (isUrl) { await page.goto(target); } else { await smartClick(page, target); }
});

// ── Pasos emitidos por el validador de flujo (sin acción en el spec) ──────────
When('page_load', async () => {});
When('verify',    async () => {});

// ── Verificación final ────────────────────────────────────────────────────────
Then('la página está disponible sin errores', async ({ page }) => {
  await expect(page.locator('body')).toBeVisible();
  await expect(page).not.toHaveURL(/error|exception|not-found|404/i);
});
