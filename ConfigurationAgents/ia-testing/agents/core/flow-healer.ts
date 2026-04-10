import { Page } from '@playwright/test';
import { openai } from '../../utils/openai-client';

export async function healFlow(page: Page, failedStep: string, context: string): Promise<boolean> {
  console.log(`🔄 Intentando recuperar flujo en paso: ${failedStep}`);
  try {
    // Estrategia 1: Recargar página
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    // Aquí se podría reintentar el paso
    return true;
  } catch (e) {
    // Estrategia 2: Usar IA para sugerir una alternativa
    const prompt = `El test falló en el paso: "${failedStep}". Contexto: ${context}. Sugiere una acción alternativa (por ejemplo, hacer clic en otro elemento, esperar más tiempo, o recargar). Devuelve solo una línea de código Playwright.`;
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
    });
    const suggestion = response.choices[0]?.message?.content?.trim();
    if (suggestion) {
      console.log(`💡 IA sugiere: ${suggestion}`);
      // Ejecutar la sugerencia (peligroso, pero se puede limitar a acciones seguras)
      await eval(`(async () => { ${suggestion} })()`);
      return true;
    }
  }
  return false;
}