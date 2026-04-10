import { Page } from '@playwright/test';
import axios from 'axios';

export async function solveRecaptcha(page: Page, siteKey: string, pageUrl: string): Promise<string | null> {
  const apiKey = process.env.TWO_CAPTCHA_API_KEY;
  if (!apiKey) {
    console.log('⚠️ TWO_CAPTCHA_API_KEY no configurada, no se puede resolver captcha');
    return null;
  }
  try {
    // Enviar tarea a 2Captcha
    const taskRes = await axios.post('https://2captcha.com/in.php', null, {
      params: { key: apiKey, method: 'userrecaptcha', googlekey: siteKey, pageurl: pageUrl, json: 1 }
    });
    if (taskRes.data.status !== 1) return null;
    const requestId = taskRes.data.request;
    // Esperar resultado
    for (let i = 0; i < 30; i++) {
      await new Promise(res => setTimeout(res, 2000));
      const resultRes = await axios.get('https://2captcha.com/res.php', {
        params: { key: apiKey, action: 'get', id: requestId, json: 1 }
      });
      if (resultRes.data.status === 1) {
        return resultRes.data.request;
      }
    }
    return null;
  } catch (e) {
    console.log('❌ Error resolviendo captcha:', e);
    return null;
  }
}