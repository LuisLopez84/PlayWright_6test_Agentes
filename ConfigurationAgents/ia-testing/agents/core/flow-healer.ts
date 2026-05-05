import { Page } from '@playwright/test';
import { openai, hasOpenAI } from '../../utils/openai-client';

// ─── Ejecutor seguro con whitelist (reemplaza eval()) ─────────────────────────
// Solo se permiten acciones Playwright conocidas. Cualquier otro código sugerido
// por la IA se descarta sin ejecutar.
async function executeSafeAction(page: Page, suggestion: string): Promise<boolean> {
  type SafePattern = { re: RegExp; exec: (m: RegExpMatchArray) => Promise<unknown> };

  const SAFE_PATTERNS: SafePattern[] = [
    {
      re: /page\.click\(['"`]([^'"`]+)['"`]\)/,
      exec: ([, sel]) => page.click(sel, { timeout: 10_000 }),
    },
    {
      re: /page\.fill\(['"`]([^'"`]+)['"`],\s*['"`]([^'"`]*)['"`]\)/,
      exec: ([, sel, val]) => page.fill(sel, val, { timeout: 10_000 }),
    },
    {
      re: /page\.goto\(['"`](https?:\/\/[^'"`]+)['"`]\)/,
      exec: ([, url]) => page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 }),
    },
    {
      // Limita el timeout máximo a 5 s para no bloquear el test
      re: /page\.waitForTimeout\((\d+)\)/,
      exec: ([, ms]) => page.waitForTimeout(Math.min(parseInt(ms, 10), 5_000)),
    },
    {
      re: /page\.waitForSelector\(['"`]([^'"`]+)['"`]\)/,
      exec: ([, sel]) => page.waitForSelector(sel, { timeout: 10_000 }),
    },
    {
      re: /page\.reload\(\)/,
      exec: () => page.reload({ waitUntil: 'networkidle', timeout: 30_000 }),
    },
  ];

  for (const { re, exec } of SAFE_PATTERNS) {
    const match = suggestion.match(re);
    if (match) {
      await exec(match);
      return true;
    }
  }

  console.warn(`⚠️ [flow-healer] Sugerencia IA no coincide con ningún patrón seguro — omitida: "${suggestion}"`);
  return false;
}

// ─── Punto de entrada público ─────────────────────────────────────────────────

export async function healFlow(page: Page, failedStep: string, context: string): Promise<boolean> {
  console.log(`🔄 Intentando recuperar flujo en paso: ${failedStep}`);

  // ── Estrategia 1: Recargar página ──────────────────────────────────────────
  // No retorna true aquí porque el paso fallido aún no se reintentó.
  // Cae en la estrategia 2 para que la IA sugiera la acción de recuperación.
  let reloaded = false;
  try {
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(2_000);
    reloaded = true;
    console.log('🔄 Página recargada — consultando IA para acción de recuperación');
  } catch (reloadErr) {
    console.warn('⚠️ [flow-healer] Reload falló:', reloadErr);
  }

  // Guard: sin cliente IA disponible
  if (!hasOpenAI || !openai) {
    console.log('⚠️ [flow-healer] Sin OPENAI_API_KEY — healing por IA omitido');
    return reloaded;
  }

  // ── Estrategia 2: Pedir acción alternativa a IA con timeout de 10 s ────────
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);

  try {
    const prompt = `Eres un asistente de recuperación de tests Playwright. El test falló y necesitas sugerir UNA acción de recuperación.

Paso fallido: "${failedStep}"
URL actual: "${context}"
Página recargada: ${reloaded}

Responde con UNA SOLA línea de código Playwright válido (sin explicación, sin bloque de código markdown).
Solo se aceptan estas acciones: page.click(), page.fill(), page.goto(), page.waitForTimeout(), page.waitForSelector(), page.reload()
Ejemplo válido: page.click('[data-testid="retry-btn"]')`;

    const response = await openai.chat.completions.create(
      {
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0,
        max_tokens: 100,
      },
      { signal: controller.signal }
    );

    clearTimeout(timeoutId);

    const suggestion = response.choices[0]?.message?.content?.trim();
    if (suggestion) {
      console.log(`💡 IA sugiere: ${suggestion}`);
      return await executeSafeAction(page, suggestion);
    }
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err?.name === 'AbortError' || err?.message?.includes('aborted')) {
      console.warn('⚠️ [flow-healer] Timeout en llamada OpenAI (10 s) — omitiendo sugerencia IA');
    } else {
      console.error('⚠️ [flow-healer] Error en healing por IA:', err);
    }
  }

  // Si al menos se recargó la página, el caller puede reintentar el paso
  return reloaded;
}
