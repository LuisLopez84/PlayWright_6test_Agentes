
import { test, expect } from '@playwright/test';
import { smartGoto } from '../../../../ConfigurationTest/tests/utils/navigation-helper';
import { smartClick, smartFill, smartWaitForText, smartUpload } from '../../../../ConfigurationTest/tests/utils/smart-actions';

test('DemoQA_Elements_DownloadUpload', async ({ page }) => {
  await smartGoto(page, 'DemoQA_Elements_DownloadUpload');

  await smartClick(page, `Book Store Application`);
  await smartClick(page, `Elements`);
  await smartClick(page, `Upload and Download`);
  await smartClick(page, `Choose File`);
  // Upload de archivo — asegúrate de que el fichero existe en el entorno de test
  try {
    await smartUpload(page, `Choose File`, 'cloude001.png');
  } catch (e) {
    console.warn('⚠️ Upload omitido (archivo no encontrado):', 'cloude001.png');
  }
  // Verificar mensaje de resultado (texto asíncrono — puede ser toast transitorio)
  await smartWaitForText(page, `C:\\fakepath\\cloude001.png`, 15000);
});
