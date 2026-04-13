import fs from 'fs';
import path from 'path';
import { Page } from '@playwright/test';
import { closeAnyModal } from './modal-handler';

/**
 * Registra listeners de consola y red para detectar errores durante el test.
 * Los errores se acumulan en arrays para diagnóstico, NO fallan el test.
 */
export function attachErrorMonitors(page: Page): {
  consoleErrors: string[];
  networkFailures: string[];
} {
  const consoleErrors: string[] = [];
  const networkFailures: string[] = [];

  if (page.isClosed()) return { consoleErrors, networkFailures };

  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text();
      // Filtrar errores de terceros no relevantes (analytics, ads, etc.)
      const ignored = [
        'favicon.ico', 'googletagmanager', 'google-analytics',
        'doubleclick', 'hotjar', 'adservice',
      ];
      if (!ignored.some(ig => text.toLowerCase().includes(ig))) {
        consoleErrors.push(`[console.error] ${text}`);
        console.log(`🔴 Console error: ${text.substring(0, 120)}`);
      }
    }
  });

  page.on('requestfailed', request => {
    const url = request.url();
    const failure = request.failure();
    // Solo loguear recursos propios (no analytics/CDN externos irrelevantes)
    const ignored = [
      'googletagmanager', 'google-analytics', 'doubleclick',
      'hotjar', 'adservice', 'facebook', 'twitter',
    ];
    if (!ignored.some(ig => url.toLowerCase().includes(ig))) {
      const msg = `[network.failed] ${request.method()} ${url} — ${failure?.errorText || 'unknown'}`;
      networkFailures.push(msg);
      console.log(`🔴 Request failed: ${url.substring(0, 100)}`);
    }
  });

  return { consoleErrors, networkFailures };
}

export async function smartGoto(page: Page, testName: string = 'GLOBAL') {

  try {

    // 🔥 Buscar metadata por testName exacto (top-level GenerateTest/)
    let metadataPath = path.join('GenerateTest', `${testName}.metadata.json`);

    // Fallback 1: dentro del subdirectorio del test
    if (!fs.existsSync(metadataPath)) {
      metadataPath = path.join('GenerateTest', 'tests', testName, `${testName}.metadata.json`);
    }

    // Fallback 2: buscar cualquier metadata con el nombre del test en GenerateTest/
    if (!fs.existsSync(metadataPath)) {
      const files = fs.readdirSync('GenerateTest');
      const found = files.find(f => f === `${testName}.metadata.json`);
      if (found) metadataPath = path.join('GenerateTest', found);
    }

    if (!fs.existsSync(metadataPath)) {
      console.log(`⚠️ No metadata found for: ${testName}`);
      return;
    }

    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));

    if (!metadata.baseURL) {
      console.log('⚠️ No baseURL in metadata');
      return;
    }

    console.log(`🌐 Navigating to: ${metadata.baseURL}`);

    // 🔥 NAVEGACIÓN ROBUSTA (CLAVE)
    await page.goto(metadata.baseURL, {
      waitUntil: 'domcontentloaded'
    });

    // 🔥 ESPERAR CARGA COMPLETA (TRANSVERSAL)
    await page.waitForLoadState('networkidle').catch(() => {});

    // 🔥 ESTABILIZAR UI (CRÍTICO PARA MENÚS Y LOGIN)
    await page.waitForTimeout(1000);

    // 🔥 CERRAR MODALES QUE PUEDAN BLOQUEAR LA INTERACCIÓN (ubicación, cookies, etc.)
    await closeAnyModal(page);

  } catch (e) {
    console.error('❌ smartGoto error:', e);
  }
}