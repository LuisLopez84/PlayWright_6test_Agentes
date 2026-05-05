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
import { learningStore } from './learning-store';

// ─────────────────────────────────────────────
// PERSISTENCIA
// ─────────────────────────────────────────────
const HEALER_DB    = path.join(process.cwd(), 'healer-db.json');
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 días — invalida entradas obsoletas
const MAX_ENTRIES  = 500;                        // evita crecimiento indefinido del archivo

interface HealerEntry { selector: string; savedAt: number; }
type RawDB = Record<string, HealerEntry | string>; // string = formato legacy

function loadDB(): Record<string, HealerEntry> {
  if (!fs.existsSync(HEALER_DB)) return {};
  try {
    const raw: RawDB = JSON.parse(fs.readFileSync(HEALER_DB, 'utf-8'));
    const now = Date.now();
    const result: Record<string, HealerEntry> = {};
    for (const [key, val] of Object.entries(raw)) {
      // Migrar entradas legacy (string) al nuevo formato con timestamp
      const entry: HealerEntry = typeof val === 'string'
        ? { selector: val, savedAt: now }
        : val;
      // Descartar entradas expiradas (TTL de 7 días)
      if (now - entry.savedAt < CACHE_TTL_MS) {
        result[key] = entry;
      }
    }
    return result;
  } catch {
    return {};
  }
}

function saveHealing(original: string, healed: string, page?: Page, action?: string): void {
  const db = loadDB();
  db[original] = { selector: healed, savedAt: Date.now() };

  // Limitar tamaño: conservar solo las MAX_ENTRIES más recientes
  const entries = Object.entries(db);
  const finalDB = entries.length > MAX_ENTRIES
    ? Object.fromEntries(
        entries
          .sort((a, b) => a[1].savedAt - b[1].savedAt)
          .slice(entries.length - MAX_ENTRIES)
      )
    : db;

  fs.writeFileSync(HEALER_DB, JSON.stringify(finalDB, null, 2));

  // Sincronizar con learning-db.json para que smart-actions también aprenda
  if (page && !page.isClosed() && action) {
    try {
      learningStore.recordSuccess(
        { url: page.url(), action, targetText: original },
        healed
      );
    } catch { /* no crítico — continuar sin sync */ }
  }
}

function getCachedHealing(original: string): string | null {
  const db = loadDB();
  return db[original]?.selector ?? null;
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

  // 3. Variantes de asterisco — campos requeridos (patrón web universal)
  // Playwright codegen graba "Last Name:" pero el HTML puede tener "* Last Name:"
  // y viceversa. Generamos ambas formas para que el healer siempre encuentre el campo.
  const withoutAsterisk = text.replace(/^\*+\s*/, '').trim();   // "* Last Name:" → "Last Name:"
  const withAsterisk    = `* ${withoutAsterisk}`;               // "Last Name:"   → "* Last Name:"
  if (withoutAsterisk !== text) variants.add(withoutAsterisk);  // tenía asterisco → añadir sin él
  variants.add(withAsterisk);                                    // siempre añadir con asterisco

  // 3b. Añadir variantes base
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
    const loc   = page.locator(selector);
    const count = await loc.count();
    if (count === 0) return false;
    const first = loc.first();
    if (!await first.isVisible().catch(() => false)) return false;
    // Verificar que el elemento sea interaccionable (no disabled)
    // Fallback true: algunos elementos (links, divs) no tienen concepto de "enabled"
    if (!await first.isEnabled().catch(() => true)) return false;
    return true;
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
  // Por ID directo
  if (original.startsWith('#')) {
    if (await isLocatorValid(page, original)) return original;
  }

  // data-testid (máxima prioridad para elementos etiquetados)
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

  // name="..."
  const nameMatch = original.match(/name=['"](.*?)['"]/);
  if (nameMatch) {
    const sel = `[name="${nameMatch[1]}"]`;
    if (await isLocatorValid(page, sel)) return sel;
  }

  // getByPlaceholder — muy útil para campos sin label
  try {
    const byPh = page.getByPlaceholder(original, { exact: false });
    if (await byPh.count() > 0 && await byPh.first().isVisible().catch(() => false)) {
      return `[placeholder="${original}"]`;
    }
  } catch {}

  // getByLabel — inputs asociados con <label> (usa HTML label-for, no aria-label)
  // Prueba también con/sin asterisco de campo requerido ("* Last Name:" ↔ "Last Name:")
  const labelCandidates = [
    original,
    original.replace(/^\*+\s*/, '').trim(),   // quita "* " del inicio
    `* ${original.replace(/^\*+\s*/, '').trim()}`, // añade "* " al inicio
  ].filter((v, i, arr) => v && arr.indexOf(v) === i); // únicos no vacíos

  try {
    let byLabel = page.getByLabel(labelCandidates[0], { exact: false });
    for (let ci = 1; ci < labelCandidates.length; ci++) {
      byLabel = byLabel.or(page.getByLabel(labelCandidates[ci], { exact: false }));
    }
    if (await byLabel.count() > 0 && await byLabel.first().isVisible().catch(() => false)) {
      // Extraer selector estable del elemento real encontrado (no devolver aria-label*)
      const id          = await byLabel.first().getAttribute('id').catch(() => null);
      if (id) return `#${id}`;
      const name        = await byLabel.first().getAttribute('name').catch(() => null);
      if (name) return `[name="${name}"]`;
      const inputType   = await byLabel.first().getAttribute('type').catch(() => null);
      const ariaLabel   = await byLabel.first().getAttribute('aria-label').catch(() => null);
      if (ariaLabel) return `[aria-label="${ariaLabel}"]`;
      if (inputType === 'password') return `input[type="password"]`;
      if (inputType) return `input[type="${inputType}"]`;
    }
  } catch {}

  // Buscar checkbox/radio por nombre
  try {
    const byCheckbox = page.getByRole('checkbox', { name: original });
    if (await byCheckbox.count() > 0) return `input[type="checkbox"][aria-label*="${original}"], input[type="checkbox"][name*="${original}"]`;

    const byRadio = page.getByRole('radio', { name: original });
    if (await byRadio.count() > 0) return `input[type="radio"][aria-label*="${original}"], input[type="radio"][name*="${original}"]`;
  } catch {}

  // Buscar inputs/textareas por atributos parciales
  try {
    const inputs = page.locator('input:visible, textarea:visible');
    const count = await inputs.count();
    for (let i = 0; i < Math.min(count, 20); i++) {
      const el = inputs.nth(i);
      const id          = await el.getAttribute('id').catch(() => null);
      const placeholder = await el.getAttribute('placeholder').catch(() => null);
      const label       = await el.getAttribute('aria-label').catch(() => null);
      const name        = await el.getAttribute('name').catch(() => null);
      const attrs = [id, placeholder, label, name].filter(Boolean).join(' ').toLowerCase();
      if (attrs && original.toLowerCase().split(/\s+/).some(w => w.length > 2 && attrs.includes(w.toLowerCase()))) {
        const selector = id          ? `#${id}`
                       : name        ? `[name="${name}"]`
                       : placeholder ? `[placeholder="${placeholder}"]`
                       : label       ? `[aria-label="${label}"]`
                       : null;
        if (selector && await isLocatorValid(page, selector)) return selector;
      }
    }
  } catch {}

  return null;
}

// ─────────────────────────────────────────────
// ESTRATEGIA 4: SCROLL + REVEAL + LAZY WAIT
// Maneja: elementos fuera del viewport, lazy rendering de SPAs,
// splash screens de login, formularios con animaciones CSS.
// ─────────────────────────────────────────────
async function tryScrollAndReveal(page: Page, selector: string): Promise<string | null> {
  const variants = generateTextVariants(selector);
  const strategies = [
    `text=${selector}`,
    `:text-matches("${escapeRegex(selector)}", "i")`,
    `.menu-item:has-text("${selector}")`,
    `.sidebar :text("${selector}")`,
    `aside :text("${selector}")`,
    `li:has-text("${selector}")`,
    // Inputs de login/form — crítico para "Usuario", "Contraseña", "Email"
    `input[aria-label*="${selector}"]`,
    `input[placeholder*="${selector}"]`,
    `input[name*="${selector.toLowerCase()}"]`,
    ...variants.map(v => `text=${v}`),
    ...variants.map(v => `.menu-item:has-text("${v}")`),
    ...variants.map(v => `li:has-text("${v}")`),
  ];

  for (const sel of strategies) {
    try {
      const loc = page.locator(sel);
      if (await loc.count() === 0) continue;
      await loc.first().scrollIntoViewIfNeeded({ timeout: 3000 });
      await page.waitForTimeout(600);
      const isNowVisible = await loc.first().isVisible().catch(() => false);
      if (isNowVisible) {
        console.log(`📜 Elemento revelado tras scroll: ${sel}`);
        return sel;
      }
    } catch {}
  }

  // ── 4b: Esperar lazy rendering (hasta 6s adicionales) ──────────────────────
  // SPAs con autenticación pueden tardar en montar el formulario de login
  try {
    const selectorEsc = escapeRegex(selector);
    await page.waitForFunction(
      (text) => {
        const byLabel = document.querySelector(`[aria-label*="${text}"], [placeholder*="${text}"], [name*="${text.toLowerCase()}"]`);
        if (byLabel) {
          const s = getComputedStyle(byLabel);
          return s.display !== 'none' && s.visibility !== 'hidden';
        }
        // También buscar por texto de botón/link
        const byText = Array.from(document.querySelectorAll('button, a, label')).find(
          el => el.textContent?.trim().toLowerCase().includes(text.toLowerCase())
        );
        return byText ? getComputedStyle(byText).display !== 'none' : false;
      },
      selector,
      { timeout: 3000 },
    );

    // Revisar de nuevo después del lazy rendering
    const byLabel = page.locator(
      `[aria-label*="${selector}"], [placeholder*="${selector}"], [name*="${selector.toLowerCase()}"]`
    );
    if (await byLabel.count() > 0 && await byLabel.first().isVisible().catch(() => false)) {
      const id = await byLabel.first().getAttribute('id').catch(() => null);
      const name = await byLabel.first().getAttribute('name').catch(() => null);
      const aria = await byLabel.first().getAttribute('aria-label').catch(() => null);
      const result = id ? `#${id}` : name ? `[name="${name}"]` : aria ? `[aria-label="${aria}"]` : null;
      if (result) {
        console.log(`⏳ Elemento revelado tras lazy-wait: ${result}`);
        return result;
      }
    }
  } catch {}

  // ── 4c: Scroll a top y volver a revisar (formularios de login ocultos) ──────
  try {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);
    // Buscar por role textbox/button con el nombre
    const textbox = page.getByRole('textbox', { name: selector });
    if (await textbox.count() > 0 && await textbox.first().isVisible().catch(() => false)) {
      console.log(`📜 Elemento visible tras scroll-to-top: textbox[name="${selector}"]`);
      return `input[aria-label="${selector}"]`; // selector estable
    }
    const button = page.getByRole('button', { name: selector });
    if (await button.count() > 0 && await button.first().isVisible().catch(() => false)) {
      console.log(`📜 Botón visible tras scroll-to-top: button[name="${selector}"]`);
      return `button:has-text("${selector}")`;
    }
  } catch {}

  return null;
}

// ─────────────────────────────────────────────
// ESTRATEGIA 5: HEALING POR IA (OpenAI)
// ─────────────────────────────────────────────
async function extractRelevantHTML(page: Page, hint: string): Promise<string> {
  try {
    const hintLower = hint.toLowerCase();
    const isNav  = hintLower.includes('menú')  || hintLower.includes('menu')     ||
                   hintLower.includes('inicio') || hintLower.includes('sesión')   ||
                   hintLower.includes('login')  || hintLower.includes('bienvenido');
    const isForm = hintLower.includes('usuario')    || hintLower.includes('contraseña') ||
                   hintLower.includes('email')       || hintLower.includes('password')   ||
                   hintLower.includes('ingresar')    || hintLower.includes('registrar');

    if (isNav) {
      // DOM query — maneja correctamente nav/header anidados sin regex
      const navHTML = await page.evaluate(() => {
        const el = document.querySelector('nav, header');
        return el ? el.outerHTML.substring(0, 3000) : null;
      }).catch(() => null);
      if (navHTML) return navHTML;
    }

    if (isForm) {
      // DOM query — maneja formularios anidados correctamente
      const formHTML = await page.evaluate(() => {
        const el = document.querySelector('form');
        return el ? el.outerHTML.substring(0, 3000) : null;
      }).catch(() => null);
      if (formHTML) return formHTML;
    }

    // Fallback: primeros 4000 caracteres del body vía DOM
    const bodyHTML = await page.evaluate(
      () => document.body ? document.body.innerHTML.substring(0, 4000) : ''
    ).catch(() => '');
    return bodyHTML || '<error extracting HTML>';
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
    saveHealing(originalSelector, textVariant, page, action);
    return textVariant;
  }

  // 3️⃣ ATRIBUTOS ESTRUCTURALES (ID, name, testid, aria-label)
  const structural = await tryStructuralStrategies(page, originalSelector);
  if (structural) {
    console.log(`🏗️ Healing estructural: ${structural}`);
    saveHealing(originalSelector, structural, page, action);
    return structural;
  }

  // 4️⃣ SCROLL + REVEAL
  const scrolled = await tryScrollAndReveal(page, originalSelector);
  if (scrolled) {
    console.log(`📜 Healing por scroll: ${scrolled}`);
    saveHealing(originalSelector, scrolled, page, action);
    return scrolled;
  }

  // 5️⃣ IA
  const aiSelector = await healSelectorWithAI(page, originalSelector, action, value);
  if (aiSelector && await isLocatorValid(page, aiSelector)) {
    console.log(`🧠 Healing por IA: ${aiSelector}`);
    saveHealing(originalSelector, aiSelector, page, action);
    return aiSelector;
  }

  // 6️⃣ Fallbacks genéricos finales
  // Para fill: omitir text= / :text() porque matchean labels no rellenables
  const fallbacks = action === 'fill'
    ? [
        `[placeholder*="${originalSelector}"]`,
        `[aria-label*="${originalSelector}"]`,
        `[name*="${originalSelector}"]`,
        `[id*="${originalSelector}"]`,
        `[title*="${originalSelector}"]`,
      ]
    : [
        `text=${originalSelector}`,
        `:text("${originalSelector}")`,
        `[placeholder*="${originalSelector}"]`,
        `[aria-label*="${originalSelector}"]`,
        `[name*="${originalSelector}"]`,
        `[id*="${originalSelector}"]`,
        `[title*="${originalSelector}"]`,
        `[alt*="${originalSelector}"]`,
      ];

  for (const fb of fallbacks) {
    try {
      if (await isLocatorValid(page, fb)) {
        console.log(`🔄 Fallback genérico exitoso: ${fb}`);
        saveHealing(originalSelector, fb, page, action);
        return fb;
      }
    } catch {}
  }

  // 7️⃣ Último recurso: texto visible — una sola llamada DOM (15 elementos visibles)
  try {
    type ElemData = { text: string; label: string; placeholder: string; id: string };
    const elements: ElemData[] = await page.evaluate(() => {
      const sel = 'button:not([disabled]), a, [role="button"], [role="link"], ' +
                  'input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]';
      return Array.from(document.querySelectorAll(sel))
        .filter(el => (el as HTMLElement).offsetParent !== null)
        .slice(0, 15)
        .map(el => ({
          text:        ((el as HTMLElement).innerText || el.textContent || '').trim().substring(0, 100),
          label:       el.getAttribute('aria-label')   || '',
          placeholder: el.getAttribute('placeholder')  || '',
          id:          el.getAttribute('id')            || '',
        }));
    }).catch(() => [] as ElemData[]);

    const originalLower = originalSelector.toLowerCase();
    const words = originalLower.split(/\s+/).filter(w => w.length > 2);

    for (const data of elements) {
      const combined = `${data.text} ${data.label} ${data.placeholder}`.toLowerCase();
      const matchCount = words.filter(w => combined.includes(w)).length;
      if (matchCount > 0 && matchCount >= Math.ceil(words.length * 0.6)) {
        const elSel = data.id ? `#${data.id}` : `text=${data.text.substring(0, 30)}`;
        if (elSel && await isLocatorValid(page, elSel)) {
          console.log(`🎯 Fallback por texto visible: ${elSel}`);
          saveHealing(originalSelector, elSel, page, action);
          return elSel;
        }
      }
    }
  } catch {}

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
