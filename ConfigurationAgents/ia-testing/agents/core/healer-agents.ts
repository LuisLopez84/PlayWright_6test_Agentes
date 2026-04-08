import { Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { openai } from '../../utils/openai-client';

const HEALER_DB = path.join('healer-db.json');

// 💾 Guardar healing
function saveHealing(original: string, healed: string) {
  let db: any = {};

  if (fs.existsSync(HEALER_DB)) {
    db = JSON.parse(fs.readFileSync(HEALER_DB, 'utf-8'));
  }

  db[original] = healed;

  fs.writeFileSync(HEALER_DB, JSON.stringify(db, null, 2));
}

// 🔎 Buscar healing previo
function getHealing(original: string): string | null {
  if (!fs.existsSync(HEALER_DB)) return null;

  const db = JSON.parse(fs.readFileSync(HEALER_DB, 'utf-8'));
  return db[original] || null;
}

// ✅ Validar selector
async function validateSelector(page: Page, selector: string): Promise<boolean> {
  try {
    const locator = page.locator(selector);
    const count = await locator.count();

    if (count > 0) {
      return await locator.first().isVisible();
    }

  } catch {
    return false;
  }

  return false;
}

// ⚡ Estrategias locales
async function tryLocalStrategies(page: Page, original: string): Promise<string | null> {

  try {

    // id
    if (original.includes('#')) {
      if (await page.locator(original).count() > 0) return original;
    }

    // name
    const nameMatch = original.match(/name=['"](.+?)['"]/);
    if (nameMatch) {
      const selector = `[name="${nameMatch[1]}"]`;
      if (await page.locator(selector).count() > 0) return selector;
    }

    // inputs similares
    const inputs = page.locator('input');
    const count = await inputs.count();

    for (let i = 0; i < count; i++) {
      const el = inputs.nth(i);
      const id = await el.getAttribute('id');

      if (id && original.includes(id)) {
        return `#${id}`;
      }
    }

  } catch {}

  return null;
}

// 🧠 IA pura (nuevo)
async function healSelectorWithAI(page: Page, original: string, action: string, value?: string): Promise<string | null> {

  if (!openai || !openai.chat) return null;

  try {

    const html = (await page.content()).substring(0, 4000);

    const prompt = `
You are an expert QA Automation Engineer.

The following selector FAILED in Playwright:

FAILED SELECTOR: ${original}
ACTION: ${action}
VALUE: ${value || 'N/A'}

Analyze the HTML and return a ROBUST selector.

Rules:
- Prefer #id
- Then data-testid
- Then getByRole
- Then stable CSS
- Avoid dynamic text
- Must work in Playwright

HTML:
${html}

Return ONLY the selector.
`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1
    });

    const healed = response.choices[0]?.message?.content?.trim();

    return healed || null;

  } catch (e) {
    console.log('❌ Error en IA healing');
    return null;
  }
}

// 🚀 HEALER PRINCIPAL
export async function healSelector(
  page: Page,
  originalSelector: string,
  action: string,
  value?: string
): Promise<string | null> {

  if (!page || page.isClosed()) return null;

  // 1️⃣ CACHE
  const cached = getHealing(originalSelector);
  if (cached && await validateSelector(page, cached)) {
    console.log(`♻️ Reusing healed: ${cached}`);
    return cached;
  }

  // 2️⃣ LOCAL
  const local = await tryLocalStrategies(page, originalSelector);
  if (local && await validateSelector(page, local)) {
    console.log(`⚡ Local healed: ${local}`);
    saveHealing(originalSelector, local);
    return local;
  }

  // 3️⃣ IA
  const aiSelector = await healSelectorWithAI(page, originalSelector, action, value);

  if (aiSelector && await validateSelector(page, aiSelector)) {
    console.log(`🧠 AI healed: ${aiSelector}`);
    saveHealing(originalSelector, aiSelector);
    return aiSelector;
  }

  // 4️⃣ fallback final
  try {
    const fallback = `text=${originalSelector}`;
    if (await validateSelector(page, fallback)) {
      return fallback;
    }
  } catch {}

  return null;
}
// ... (todo el código anterior hasta healSelector)

// Añade esta función al final del archivo
export async function getAvailableSelectOptions(page: Page, selector: string): Promise<string[]> {
  try {
    if (page.isClosed()) return [];
    // Esperar a que el selector esté disponible
    const locator = page.locator(selector);
    await locator.waitFor({ state: 'attached', timeout: 5000 }).catch(() => {});
    const options = await locator.locator('option').allTextContents();
    const values = await locator.locator('option').all();
    const result: string[] = [];
    for (let i = 0; i < options.length; i++) {
      const optionValue = await values[i].getAttribute('value');
      if (optionValue && optionValue.trim() !== '') {
        result.push(optionValue);
      } else if (options[i] && options[i].trim() !== '') {
        result.push(options[i]);
      }
    }
    console.log(`📋 Opciones disponibles para ${selector}: ${result.join(', ')}`);
    return result;
  } catch (e) {
    console.log(`⚠️ No se pudieron obtener opciones para ${selector}`);
    return [];
  }
}