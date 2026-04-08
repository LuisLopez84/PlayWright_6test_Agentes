import { test, expect } from '@playwright/test';
import { smartGoto } from '@utils/navigation-helper';

test('Core Web Vitals', async ({ page }) => {

  await smartGoto(page, 'GLOBAL');

  const metrics = await page.evaluate(() => {
    const navigation = performance.getEntriesByType('navigation')[0];
    return {
      loadTime: navigation.loadEventEnd - navigation.fetchStart
    };
  });

  expect(metrics.loadTime).toBeLessThan(3000);

});

test('Resource Performance', async ({ page }) => {

  await smartGoto(page, 'GLOBAL');

  const resources = await page.evaluate(() =>
    performance.getEntriesByType('resource')
  );

  const slow = resources.filter((r: any) => r.duration > 1000);

  expect(slow.length).toBe(0);
});

test('Performance Budget', async ({ page }) => {

  await smartGoto(page, 'GLOBAL');

  const metrics = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    return {
      pageLoad: nav.loadEventEnd - nav.fetchStart
    };
  });

  const budget = 3000;
  expect(metrics.pageLoad).toBeLessThan(budget);

});









/*
Documentación:

Esta clase core-web-vitals.spec.ts es la que permite que tu framework también ejecute pruebas de rendimiento (performance testing) directamente con Playwright.

Qué objetivo tiene esta clase:
Esta clase valida tiempos de carga y recursos del frontend usando la API Performance del navegador.
Específicamente valida:

1. Tiempo total de carga
2. Recursos lentos
3. Cumplimiento de un Performance Budget

Qué es un Performance Budget
Un performance budget es una regla que dice:
“La página no puede tardar más de X milisegundos en cargar”.


const metrics = await page.evaluate(() => {
page.evaluate() ejecuta JavaScript dentro del navegador.
Esto es muy poderoso porque permite usar:
window.performance


Obtener datos de navegación
const navigation = performance.getEntriesByType('navigation')[0];
Esto devuelve métricas reales del navegador.
Ejemplo:
DNS lookup
TCP connection
TTFB
DOM load
Page load


Calcular tiempo de carga
loadTime: navigation.loadEventEnd - navigation.fetchStart
Esto calcula:
tiempo total de carga
Ejemplo real:
fetchStart = 0
loadEventEnd = 1450
loadTime = 1450 ms


Validación
expect(metrics.loadTime).toBeLessThan(3000);
Regla:
la página debe cargar en menos de 3 segundos
Si tarda más:
❌ test falla


Test: Resource Performance
test('Resource Performance', async ({ page }) => {
Este test revisa recursos lentos.
Obtener todos los recursos
const resources = await page.evaluate(() =>
  performance.getEntriesByType('resource')
);
Esto devuelve:
JS files
CSS
imagenes
fonts
APIs

Ejemplo:
main.js
styles.css
logo.png
api/dashboard
Detectar recursos lentos
const slow = resources.filter((r: any) => r.duration > 1000);

Regla:
si un recurso tarda más de 1000ms → es lento
Validación
expect(slow.length).toBe(0);

Esto significa:
no debe existir ningún recurso lento
Si encuentra uno:
❌ el test falla

Este test valida el presupuesto de performance del sistema.
Obtener tiempo de carga
const nav = performance.getEntriesByType('navigation')[0];
Calcular carga
pageLoad: nav.loadEventEnd - nav.fetchStart
Definir presupuesto
const budget = 3000;

Presupuesto:
3 segundos
Validación
expect(metrics.pageLoad).toBeLessThan(budget);
Si el sistema supera el presupuesto:
❌ el pipeline falla


*/

