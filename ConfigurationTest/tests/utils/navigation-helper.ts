import fs from 'fs';
import path from 'path';
import { Page } from '@playwright/test';
import { closeAnyModal } from './modal-handler';

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