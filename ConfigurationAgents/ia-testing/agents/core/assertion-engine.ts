import { openai, hasOpenAI } from '../../utils/openai-client';
import { Action } from '../../types/action.types';

// Risk 4: strip markdown fences that the model may wrap around the code block
function stripMarkdown(raw: string): string {
  return raw
    .replace(/^```(?:typescript|ts|javascript|js)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim();
}

/**
 * Generates Playwright expect() assertions for the given steps using gpt-4o-mini.
 *
 * Risk 2: exported and ready to be imported by ui-agent or generator-agent
 *         once the caller side is wired up.
 *
 * @returns Assertion code string (TypeScript), or '' when IA is unavailable.
 */
export async function generateAssertions(steps: Action[]): Promise<string> {
  // Risk 1: guard — devuelve string vacío si no hay cliente IA
  if (!hasOpenAI || !openai) {
    console.warn('[assertion-engine] OpenAI no disponible — assertions por IA omitidas.');
    return '';
  }

  // Risk 3: prompt bilingüe — acepta steps en español e inglés
  const prompt = `
Eres un experto en Playwright. Basándote en los siguientes pasos de un flujo de usuario,
genera ÚNICAMENTE assertions de Playwright usando expect().

Pasos del flujo (pueden estar en español o inglés):
${JSON.stringify(steps, null, 2)}

Reglas:
- Valida el estado final de la página tras el flujo.
- Usa expect(locator).toBeVisible() y expect(locator).toHaveText() preferentemente.
- Prefiere textos visibles sobre atributos internos.
- No incluyas import ni describe/test — solo las líneas de expect().
- Devuelve ÚNICAMENTE el código TypeScript, sin bloques markdown.
`;

  // Risk 5: try/catch para errores de red, timeout o rate limit de OpenAI
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
    });

    const raw = response.choices[0]?.message?.content ?? '';
    return stripMarkdown(raw); // Risk 4: limpiar markdown antes de retornar
  } catch (err: any) {
    console.error(`[assertion-engine] Error al llamar a OpenAI: ${err.message}`);
    return '';
  }
}
