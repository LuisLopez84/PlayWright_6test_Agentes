import fs from 'fs';
import path from 'path';
import { Page } from '@playwright/test';

export async function smartGoto(page: Page, testName: string = 'GLOBAL') {

  try {

    // 🔥 Buscar metadata dinámicamente
    const metadataFile = fs.readdirSync('GenerateTest')
      .find(file => file.endsWith('.metadata.json'));

    if (!metadataFile) {
      console.log('⚠️ No metadata found');
      return;
    }

    const metadataPath = path.join('GenerateTest', metadataFile);
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

  } catch (e) {
    console.error('❌ smartGoto error:', e);
  }
}