/**
 * healer-agents.ts
 *
 * Motor de auto-reparación de selectores.
 * Cadena: Cache → Variantes de texto → Estrategias locales → Scroll → IA (OpenAI)
 *
 * Transversal: funciona para cualquier grabación web, no depende de la app.
 */
import { Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { openai } from '../../utils/openai-client';

// ─────────────────────────────────────────────
// PERSISTENCIA
// ─────────────────────────────────────────────
const HEALER_DB = path.join(process.cwd(), 'healer-db.json');

function loadDB(): Record<string, string> {
  if (!fs.existsSync(HEALER_DB)) return {};
  try { return JSON.parse(fs.readFileSync(HEALER_DB, 'utf-8')); } catch { return {}; }
}

function saveHealing(original: string, healed: string): void {
  const db = loadDB();
  db[original] = healed;
  fs.writeFileSync(HEALER_DB, JSON.stringify(db, null, 2));
}

function getCachedHealing(original: string): string | null {
  const db = loadDB();
  return db[original] || null;
}

// ─────────────────────────────────────────────
// NORMALIZACIÓN DE TEXTO  ← NÚCLEO DEL HEALING
// ─────────────────────────────────────────────

/**
 * Genera todas las variantes posibles de un texto de selector.
 * Maneja: "¡Bienvenido! Inicio de sesión" → ["Inicio de sesión", "Bienvenido", "sesion", ...]
 * Exportado para uso en smart-actions.ts
 */
export function generateTextVariants(text: string): string[] {
  const variants = new Set<string>();
  if (!text || text.trim().length === 0) return [];

  // 1. Sin acentos (ó→o, é→e, ñ→n, ü→u, etc.)
  const noAccents = (t: string) =>
    t.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // 2. Sin puntuación invertida española (¡ ¿) y final (! ?)
  const noInvPunct = (t: string) => t.replace(/^[¡¿\s]+|[!?¡¿\s]+$/g, '').trim();

  // 3. Añadir variantes base
  const clean = noInvPunct(text);
  variants.add(clean);
  variants.add(noAccents(clean));
  variants.add(noAccents(text));

  // 4. Split por signos de exclamación/interrogación (caso: "¡Texto! Acción")
  const byExcl = text
    .split(/[¡!¿?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 2);
  byExcl.forEach(p => {
    variants.add(p);
    variants.add(noAccents(p));
    variants.add(noInvPunct(p));
  });

  // 5. Split por separadores comunes (|, ·, -, –, —, newlines, tabs)
  const bySep = text
    .split(/[|·\-–—\n\r\t]+/)
    .map(s => s.trim())
    .filter(s => s.length > 2);
  bySep.forEach(p => {
    variants.add(p);
    variants.add(noAccents(p));
  });

  // 6. Extraer palabras significativas (sin stopwords)
  const stopWords = new Set([
    'de', 'la', 'el', 'los', 'las', 'en', 'a', 'del', 'al',
    'con', 'por', 'para', 'que', 'se', 'su', 'un', 'una',
    'the', 'of', 'in', 'to', 'a', 'and', 'or', 'is',
  ]);
  const allWords = text
    .replace(/[¡!¿?¡|·\-–—]+/g, ' ')
    .split(/\s+/)
    .map(w => w.trim())
    .filter(w => w.length > 2 && !stopWords.has(w.toLowerCase()));

  if (allWords.length > 0) {
    variants.add(allWords.join(' '));
    variants.add(noAccents(allWords.join(' ')));
    if (allWords.length > 1) {
      variants.add(allWords.slice(-2).join(' '));
      variants.add(noAccents(allWords.slice(-2).join(' ')));
    }
    // Última palabra significativa (suele ser el verbo de acción)
    variants.add(allWords[allWords.length - 1]);
    variants.add(noAccents(allWords[allWords.length - 1]));
    // Primera palabra significativa
    variants.add(allWords[0]);
  }

  // 7. Versiones lowercase de todo
  const snapshot = [...variants];
  snapshot.forEach(v => variants.add(v.toLowerCase()));

  // Limpiar: quitar el original, vacíos y muy cortos
  variants.delete(text);
  return [...variants].filter(v => v.trim().length > 1);
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ─────────────────────────────────────────────
// VALIDACIÓN DE SELECTOR
// ─────────────────────────────────────────────
async function isLocatorValid(page: Page, selector: string): Promise<boolean> {
  if (!selector || page.isClosed()) return false;
  try {
    const loc = page.locator(selector);
    const count = await loc.count();
    if (count === 0) return false;
    return await loc.first().isVisible().catch(() => false);
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────
// ESTRATEGIA 1: CACHÉ
// ─────────────────────────────────────────────
async function tryCache(page: Page, original: string): Promise<string | null> {
  const cached = getCachedHealing(original);
  if (!cached) return null;
  if (await isLocatorValid(page, cached)) {
    console.log(`♻️ Selector recuperado del caché: ${cached}`);
    return cached;
  }
  return null;
}

// ─────────────────────────────────────────────
// ESTRATEGIA 2: VARIANTES DE TEXTO
// ─────────────────────────────────────────────
async function tryTextVariants(page: Page, original: string): Promise<string | null> {
  const variants = generateTextVariants(original);

  for (const variant of variants) {
    const escaped = escapeRegex(variant);

    // Por texto exacto/parcial
    const byText = `text=${variant}`;
    if (await isLocatorValid(page, byText)) return byText;

    // Por rol link
    try {
      const byLink = page.getByRole('link', { name: new RegExp(escaped, 'i') });
      if (await byLink.count() > 0 && await byLink.first().isVisible().catch(() => false)) {
        const sel = `:is(a):has-text("${variant}")`;
        return sel;
      }
    } catch {}

    // Por rol button
    try {
      const byBtn = page.getByRole('button', { name: new RegExp(escaped, 'i') });
      if (await byBtn.count() > 0 && await byBtn.first().isVisible().catch(() => false)) {
        return `button:has-text("${variant}")`;
      }
    } catch {}

    // Por navegación
    const navSel = `nav :text("${variant}")`;
    if (await isLocatorValid(page, navSel)) return navSel;

    // Por sidebar/menú lateral (dashboards, homebanking, apps SPA)
    const sidebarSelectors = [
      `.sidebar :text("${variant}")`,
      `.menu-item:has-text("${variant}")`,
      `.menu :text("${variant}")`,
      `[class*="sidebar"] :text("${variant}")`,
      `[class*="menu"] li:has-text("${variant}")`,
      `li:has-text("${variant}")`,
      `aside :text("${variant}")`,
    ];
    for (const sel of sidebarSelectors) {
      try {
        const loc = page.locator(sel);
        if (await loc.count() > 0 && await loc.first().isVisible({ timeout: 500 }).catch(() => false)) {
          return sel;
        }
      } catch {}
    }
  }
  return null;
}

// ─────────────────────────────────────────────
// ESTRATEGIA 3: ATRIBUTOS ESTRUCTURALES
// ─────────────────────────────────────────────
async function tryStructuralStrategies(page: Page, original: string): Promise<string | null> {
  // Por ID
  if (original.startsWith('#')) {
    if (await isLocatorValid(page, original)) return original;
  }

  // name="..."
  const nameMatch = original.match(/name=['"](.*?)['"]/);
  if (nameMatch) {
    const sel = `[name="${nameMatch[1]}"]`;
    if (await isLocatorValid(page, sel)) return sel;
  }

  // data-testid="..."
  const testIdMatch = original.match(/data-testid=['"](.*?)['"]/);
  if (testIdMatch) {
    const sel = `[data-testid="${testIdMatch[1]}"]`;
    if (await isLocatorValid(page, sel)) return sel;
  }

  // aria-label
  const ariaMatch = original.match(/aria-label=['"](.*?)['"]/);
  if (ariaMatch) {
    const sel = `[aria-label="${ariaMatch[1]}"]`;
    if (await isLocatorValid(page, sel)) return sel;
  }

  // Buscar inputs por ID parcial
  try {
    const inputs = page.locator('input:visible');
    const count = await inputs.count();
    for (let i = 0; i < Math.min(count, 20); i++) {
      const el = inputs.nth(i);
      const id = await el.getAttribute('id').catch(() => null);
      const placeholder = await el.getAttribute('placeholder').catch(() => null);
      const label = await el.getAttribute('aria-label').catch(() => null);
      const name = await el.getAttribute('name').catch(() => null);
      const attrs = [id, placeholder, label, name].filter(Boolean).join(' ').toLowerCase();
      if (attrs && original.toLowerCase().split(/\s+/).some(word => attrs.includes(word.toLowerCase()))) {
        const selector = id ? `#${id}` : name ? `[name="${name}"]` : placeholder ? `[placeholder="${placeholder}"]` : null;
        if (selector && await isLocatorValid(page, selector)) return selector;
      }
    }
  } catch {}

  return null;
}

// ─────────────────────────────────────────────
// ESTRATEGIA 4: SCROLL + REVEAL
// ─────────────────────────────────────────────
async function tryScrollAndReveal(page: Page, selector: string): Promise<string | null> {
  // Buscar el elemento aunque no esté visible y hacer scroll
  const variants = generateTextVariants(selector);
  const strategies = [
    `text=${selector}`,
    `:text-matches("${escapeRegex(selector)}", "i")`,
    // Contextos comunes en SPAs: sidebar, menú lateral, aside
    `.menu-item:has-text("${selector}")`,
    `.sidebar :text("${selector}")`,
    `aside :text("${selector}")`,
    `li:has-text("${selector}")`,
    ...variants.map(v => `text=${v}`),
    ...variants.map(v => `.menu-item:has-text("${v}")`),
    ...variants.map(v => `li:has-text("${v}")`),
  ];

  for (const sel of strategies) {
    try {
      const loc = page.locator(sel);
      if (await loc.count() === 0) continue;
      // Hacer scroll incluso si no está visible
      await loc.first().scrollIntoViewIfNeeded({ timeout: 3000 });
      // Esperar más para SPAs con animaciones de sidebar
      await page.waitForTimeout(600);
      const isNowVisible = await loc.first().isVisible().catch(() => false);
      if (isNowVisible) {
        console.log(`📜 Elemento revelado tras scroll: ${sel}`);
        return sel;
      }
    } catch {}
  }
  return null;
}

// ─────────────────────────────────────────────
// ESTRATEGIA 5: HEALING POR IA (OpenAI)
// ─────────────────────────────────────────────
async function extractRelevantHTML(page: Page, hint: string): Promise<string> {
  try {
    const fullHTML = await page.content();

    // Intentar extraer solo la sección relevante (menú nav, header, form, etc.)
    const hintLower = hint.toLowerCase();
    const isNav = hintLower.includes('menú') || hintLower.includes('menu') ||
      hintLower.includes('inicio') || hintLower.includes('sesión') ||
      hintLower.includes('login') || hintLower.includes('bienvenido');
    const isForm = hintLower.includes('usuario') || hintLower.includes('contraseña') ||
      hintLower.includes('email') || hintLower.includes('password') ||
      hintLower.includes('ingresar') || hintLower.includes('registrar');

    if (isNav) {
      // Extraer nav/header donde suelen estar los links de login
      const navMatch = fullHTML.match(/<(?:nav|header)[^>]*>[\s\S]{0,3000}?<\/(?:nav|header)>/i);
      if (navMatch) return navMatch[0].substring(0, 3000);
    }
    if (isForm) {
      const formMatch = fullHTML.match(/<form[^>]*>[\s\S]{0,3000}?<\/form>/i);
      if (formMatch) return formMatch[0].substring(0, 3000);
    }

    // Fallback: primeros 4000 caracteres del body
    const bodyMatch = fullHTML.match(/<body[^>]*>([\s\S]{0,4000})/i);
    if (bodyMatch) return bodyMatch[1];
    return fullHTML.substring(0, 4000);
  } catch {
    return '<error extracting HTML>';
  }
}

async function healSelectorWithAI(
  page: Page,
  original: string,
  action: string,
  value?: string,
): Promise<string | null> {
  if (!openai) return null;

  try {
    const html = await extractRelevantHTML(page, original);
    const title = await page.title().catch(() => '');
    const url = page.url();
    const visibleText = await page.evaluate(() =>
      document.body.innerText?.substring(0, 500) || ''
    ).catch(() => '');

    const prompt = `Eres un experto en QA Automation con Playwright.

CONTEXTO:
- URL actual: ${url}
- Título de página: ${title}
- Texto visible en la página (primeros 500 chars): ${visibleText}

PROBLEMA:
El selector "${original}" FALLÓ para la acción "${action}"${value ? ` con valor "${value}"` : ''}.

POSIBLES CAUSAS:
- El texto puede estar dividido en múltiples nodos del DOM
- Puede haber caracteres especiales (¡! ¿?) que dificultan el match
- El elemento puede necesitar scroll para ser visible
- El texto puede haber cambiado desde la grabación

HTML RELEVANTE (max 3000 chars):
${html}

INSTRUCCIONES:
1. Analiza el HTML y encuentra el elemento más probable para la acción "${action}" con target "${original}"
2. Devuelve UN SOLO selector compatible con page.locator() de Playwright
3. Prioriza: #id > [data-testid] > [aria-label] > CSS estable > text=
4. Si usas text=, usa una parte corta y única del texto
5. SOLO devuelve el selector, sin explicaciones ni código

EJEMPLOS VÁLIDOS:
- #login-btn
- [data-testid="submit"]
- text=Inicio de sesión
- .nav-link:has-text("Login")
- button:has-text("Ingresar")`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 150,
    });

    const result = response.choices[0]?.message?.content?.trim();
    // Limpiar posibles markdown code blocks
    const cleaned = result?.replace(/^```[a-z]*\n?|```$/gm, '').trim();
    return cleaned || null;
  } catch (e) {
    console.log('❌ Error en IA healing:', (e as Error).message);
    return null;
  }
}

// ─────────────────────────────────────────────
// HEALER PRINCIPAL (orquestador)
// ─────────────────────────────────────────────
export async function healSelector(
  page: Page,
  originalSelector: string,
  action: string,
  value?: string,
): Promise<string | null> {
  if (!page || page.isClosed()) return null;

  console.log(`🔧 Iniciando healing para: "${originalSelector}" [${action}]`);

  // 1️⃣ CACHÉ
  const cached = await tryCache(page, originalSelector);
  if (cached) return cached;

  // 2️⃣ VARIANTES DE TEXTO (el más importante para errores de texto compuesto)
  const textVariant = await tryTextVariants(page, originalSelector);
  if (textVariant) {
    console.log(`✏️ Healing por variante de texto: ${textVariant}`);
    saveHealing(originalSelector, textVariant);
    return textVariant;
  }

  // 3️⃣ ATRIBUTOS ESTRUCTURALES (ID, name, testid, aria-label)
  const structural = await tryStructuralStrategies(page, originalSelector);
  if (structural) {
    console.log(`🏗️ Healing estructural: ${structural}`);
    saveHealing(originalSelector, structural);
    return structural;
  }

  // 4️⃣ SCROLL + REVEAL
  const scrolled = await tryScrollAndReveal(page, originalSelector);
  if (scrolled) {
    console.log(`📜 Healing por scroll: ${scrolled}`);
    saveHealing(originalSelector, scrolled);
    return scrolled;
  }

  // 5️⃣ IA
  const aiSelector = await healSelectorWithAI(page, originalSelector, action, value);
  if (aiSelector && await isLocatorValid(page, aiSelector)) {
    console.log(`🧠 Healing por IA: ${aiSelector}`);
    saveHealing(originalSelector, aiSelector);
    return aiSelector;
  }

  // 6️⃣ Fallback genérico final
  const fallback = `text=${originalSelector}`;
  if (await isLocatorValid(page, fallback)) {
    return fallback;
  }

  console.log(`❌ Healing agotado para: "${originalSelector}"`);
  return null;
}

// ─────────────────────────────────────────────
// HELPERS PARA SELECTS
// ─────────────────────────────────────────────
export async function getAvailableSelectOptions(page: Page, selector: string): Promise<string[]> {
  if (page.isClosed()) return [];
  try {
    const locator = page.locator(selector);
    await locator.waitFor({ state: 'attached', timeout: 5000 }).catch(() => {});
    const options = await locator.locator('option').allTextContents();
    const values = await locator.locator('option').all();
    const result: string[] = [];
    for (let i = 0; i < options.length; i++) {
      const optValue = await values[i].getAttribute('value').catch(() => null);
      const text = options[i]?.trim();
      if (optValue && optValue.trim()) result.push(optValue);
      else if (text) result.push(text);
    }
    console.log(`📋 Opciones disponibles para "${selector}": ${result.join(', ')}`);
    return result;
  } catch {
    console.log(`⚠️ No se pudieron obtener opciones para "${selector}"`);
    return [];
  }
}

export async function healOptionSelector(
  page: Page,
  originalSelector: string,
  optionText: string,
): Promise<string | null> {
  // Exact role option
  const byRole = page.getByRole('option', { name: optionText });
  if (await byRole.count() > 0) return `[role="option"]:has-text("${optionText}")`;

  // Partial text
  const byText = page.getByText(optionText, { exact: false });
  if (await byText.count() > 0) return `text=${optionText}`;

  // Try variants
  for (const variant of generateTextVariants(optionText)) {
    const loc = page.getByRole('option', { name: new RegExp(escapeRegex(variant), 'i') });
    if (await loc.count() > 0) return `[role="option"]:has-text("${variant}")`;
  }

  return null;
}
