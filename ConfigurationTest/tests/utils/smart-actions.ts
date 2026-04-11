/**
 * smart-actions.ts
 *
 * Acciones inteligentes de Playwright con auto-healing de 5 capas:
 *
 * 1. LearningStore   — selector con mayor tasa de éxito histórico (por URL+acción)
 * 2. ResolveLocator  — 9 estrategias primarias + variantes de texto
 * 3. ScrollReveal    — scroll para revelar elementos fuera del viewport
 * 4. HealSelector    — cadena de healing: caché → variantes → estructural → scroll → IA
 * 5. AI directo      — OpenAI analiza el DOM y propone selector
 *
 * Transversal: aplica para cualquier webapp en cualquier idioma.
 */
import { Page, Locator, expect } from '@playwright/test';
import {
  healSelector,
  getAvailableSelectOptions,
  healOptionSelector,
  generateTextVariants,
} from '../../../ConfigurationAgents/ia-testing/agents/core/healer-agents';
import { SelectorEngine } from '../../../ConfigurationAgents/ia-testing/agents/core/selector-engine';
import { resolveSmartValue } from './test-data-resolver';
import { waitForUIStability } from './smart-ui-detector';
import { closeAnyModal, waitForOverlayToDisappear } from './modal-handler';
import { openai } from '../../../ConfigurationAgents/ia-testing/utils/openai-client';
import { learningStore } from '../../../ConfigurationAgents/ia-testing/agents/core/learning-store';

// ─────────────────────────────────────────────
// HELPERS INTERNOS
// ─────────────────────────────────────────────

function isPageAlive(page: Page): boolean {
  return !page.isClosed();
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Construye un locator de fallback usando SelectorEngine con variantes de texto.
 */
function buildSmartLocator(page: Page, selector: string): Locator {
  return SelectorEngine.build(page, selector);
}

/**
 * Resuelve el mejor locator para el selector dado.
 * Intenta estrategias primarias y luego variantes de texto.
 */
async function resolveLocator(page: Page, selector: string): Promise<Locator> {
  if (!isPageAlive(page)) {
    throw new Error(`🚨 Page cerrada antes de resolver selector: ${selector}`);
  }

  // ── Estrategias primarias (selector exacto) ──
  const primaryStrategies: Array<() => Locator> = [
    () => page.getByRole('button', { name: selector }),
    () => page.getByRole('link', { name: selector }),
    () => page.getByRole('textbox', { name: selector }),
    () => page.getByRole('combobox', { name: selector }),
    () => page.getByLabel(selector),
    () => page.getByPlaceholder(selector),
    () => page.getByText(selector, { exact: false }),
    () => page.getByTestId(selector),
    // Elementos de lista (ul/ol con role=list) — patrón común en sidebars/navs de SPAs
    () => page.getByRole('list').getByText(selector, { exact: false }),
    () => page.getByRole('listitem').filter({ hasText: selector }),
    () => page.locator('ul').getByText(selector, { exact: false }),
    () => page.locator('nav ul').getByText(selector, { exact: false }),
  ];

  for (const fn of primaryStrategies) {
    try {
      const loc = fn();
      const count = await loc.count();
      if (count > 0) {
        const isVis = await loc.first().isVisible().catch(() => false);
        if (isVis) return loc.first();
        if (count === 1) return loc.first(); // único aunque no visible, se resolverá después
      }
    } catch {}
  }

  // ── Estrategias con variantes de texto ──
  const variants = generateTextVariants(selector);
  for (const variant of variants) {
    const escaped = escapeRegex(variant);
    try {
      // Texto parcial
      const byText = page.getByText(variant, { exact: false });
      if (await byText.count() > 0) {
        const isVis = await byText.first().isVisible().catch(() => false);
        if (isVis) return byText.first();
      }

      // Link con regex
      const byLink = page.getByRole('link', { name: new RegExp(escaped, 'i') });
      if (await byLink.count() > 0 && await byLink.first().isVisible().catch(() => false)) {
        return byLink.first();
      }

      // Button con regex
      const byBtn = page.getByRole('button', { name: new RegExp(escaped, 'i') });
      if (await byBtn.count() > 0 && await byBtn.first().isVisible().catch(() => false)) {
        return byBtn.first();
      }

      // Dentro de nav
      const inNav = page.locator(`nav :text("${variant}")`);
      if (await inNav.count() > 0 && await inNav.first().isVisible().catch(() => false)) {
        return inNav.first();
      }

      // Dentro de sidebar/menú lateral (homebanking, dashboards, etc.)
      const inSidebar = page.locator(`.sidebar :text("${variant}"), .menu :text("${variant}"), .menu-item:has-text("${variant}"), [class*="sidebar"] :text("${variant}"), [class*="menu"] li:has-text("${variant}")`);
      if (await inSidebar.count() > 0 && await inSidebar.first().isVisible().catch(() => false)) {
        return inSidebar.first();
      }
    } catch {}
  }

  // ── Fallback: SelectorEngine con OR chain completo ──
  return buildSmartLocator(page, selector);
}

/**
 * Espera a que un locator sea visible, intentando scroll si es necesario.
 * @returns true si es visible, false si agotó el tiempo
 */
async function waitForVisible(locator: Locator, timeout = 10000): Promise<boolean> {
  try {
    await locator.waitFor({ state: 'attached', timeout: Math.min(timeout, 5000) });
    // Intentar scroll antes de verificar visibilidad
    await locator.first().scrollIntoViewIfNeeded({ timeout: 2000 }).catch(() => {});
    await expect(locator.first()).toBeVisible({ timeout: Math.min(timeout, 5000) });
    return true;
  } catch {
    console.log(`⚠️ Elemento no visible tras ${timeout}ms (con scroll)`);
    return false;
  }
}

/**
 * Motor de reintentos: ejecuta fn hasta maxRetries veces.
 * Espera recuperación de la página entre intentos.
 */
async function retryAction(
  page: Page,
  fn: () => Promise<void>,
  selector: string,
  maxRetries = 2,
): Promise<void> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (!isPageAlive(page)) throw new Error(`🚨 Page cerrada antes de ejecutar: ${selector}`);
      await fn();
      return;
    } catch (e) {
      lastError = e;
      if (!isPageAlive(page)) throw lastError;
      console.log(`🔁 Reintento ${attempt + 1}/${maxRetries} → ${selector}`);
      try {
        await page.waitForLoadState('domcontentloaded', { timeout: 3000 });
      } catch {}
      await page.waitForTimeout(500);
    }
  }
  throw lastError;
}

// Nivel de página al que navegar después de ciertos clicks
const NAVIGATION_TRIGGERS = [
  'comprar', 'continuar', 'ingresar', 'login', 'submit', 'pagar',
  'siguiente', 'transferir', 'confirmar', 'sign in', 'register',
  // Triggers de sesión/autenticación (español e inglés)
  'sesion', 'sesión', 'bienvenido', 'welcome', 'inicio', 'acceder',
  'entrar', 'logout', 'cerrar sesion', 'sign out',
];

async function waitForNavigationAfterClick(page: Page, selector: string): Promise<void> {
  // Normalizar: quitar acentos para la comparación
  const normalized = selector.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (NAVIGATION_TRIGGERS.some(kw => normalized.includes(kw))) {
    // Esperar que la red se calme (timeout corto para no bloquear SPAs con polling)
    await page.waitForLoadState('networkidle', { timeout: 3000 }).catch(() => {});
    // Pausa mínima para que SPAs rendericen el nuevo estado (sidebar, menú, etc.)
    await page.waitForTimeout(800);
  }
}

// ─── Manejo de modales de confirmación ───
let modalHandled = false;

async function handleModalIfPresent(page: Page): Promise<boolean> {
  if (!isPageAlive(page)) return false;
  const modal = page.locator('[role="dialog"]:visible, .modal:visible, #modal-confirm:visible');
  if (await modal.count() === 0) return false;
  const visible = await modal.first().isVisible().catch(() => false);
  if (!visible) return false;

  // Incluir también textos de botones de confirmación de transacciones financieras
  // (el app puede etiquetar el botón del modal como "TRANSFERIR", "Enviar", "Pagar", etc.)
  const confirmBtn = modal.getByRole('button', {
    name: /confirmar|confirm|aceptar|accept|ok|continuar|continue|transferir|transfer|enviar|send|pagar|pay|procesar|process|ejecutar|execute/i,
  });
  if (await confirmBtn.count() > 0) {
    console.log('🤖 Modal de confirmación detectado → auto-confirmar');
    await confirmBtn.first().click({ force: true });
    modalHandled = true;
    await modal.first().waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(500);
    return true;
  }
  return false;
}

async function waitForPageStability(
  page: Page,
  opts: { waitForNetworkIdle?: boolean; waitForLoad?: boolean } = {},
): Promise<void> {
  if (!isPageAlive(page)) return;
  // Pausa corta fija — waitForLoadState ya se hace en waitForNavigationAfterClick
  // para evitar acumular hasta 15s de timeout por networkidle en cada acción
  await page.waitForTimeout(300);
  // handleModalIfPresent se llama SOLO desde smartClick cuando isConfirm=true
  await closeAnyModal(page);
}

// ─────────────────────────────────────────────
// HEALING POR IA (en contexto de acción)
// ─────────────────────────────────────────────
async function healWithAI(
  page: Page,
  originalSelector: string,
  action: string,
  value?: string,
): Promise<string | null> {
  if (!openai) return null;
  try {
    const url = page.url();
    const title = await page.title().catch(() => '');
    // Extraer HTML relevante (primeros 4000 chars del body)
    const html = await page.evaluate(() =>
      document.body?.innerHTML?.substring(0, 4000) || document.documentElement.innerHTML.substring(0, 4000)
    ).catch(async () => {
      const content = await page.content();
      return content.substring(0, 4000);
    });

    const prompt = `Eres un experto QA Automation. El selector "${originalSelector}" falló en Playwright.
URL: ${url}
Título: ${title}
Acción: ${action}${value ? ` | Valor: ${value}` : ''}

HTML (4000 chars):
${html}

Devuelve UN SOLO selector válido para page.locator(). Prioriza #id, [data-testid], [aria-label], button:has-text(), text=.
Solo el selector, sin código ni explicación.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 100,
    });
    const raw = response.choices[0]?.message?.content?.trim() || '';
    return raw.replace(/^```[a-z]*\n?|```$/gm, '').trim() || null;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────
// SMART CLICK
// ─────────────────────────────────────────────
export async function smartClick(page: Page, selector: string): Promise<void> {
  // ── Safety net: si el selector es un texto de resultado asíncrono,
  //    redirigir a smartWaitForText en lugar de intentar un click ──
  if (isResultTextRuntime(selector)) {
    console.log(`🔍 Selector "${selector}" detectado como texto de resultado → usando smartWaitForText`);
    await smartWaitForText(page, selector);
    return;
  }

  await retryAction(page, async () => {
    await waitForUIStability(page);
    await waitForOverlayToDisappear(page, 2000);

    // ── [1] Auto-confirmar modales SOLO cuando el selector es una acción de confirmación ──
    // No auto-confirmar en acciones genéricas (click en inputs, links de nav, etc.)
    // para evitar que modales de ayuda/documentación disrumpan el flujo del test.
    const isConfirm = /^(confirmar|confirm|aceptar|accept|ok|continuar|continue)$/i.test(selector.trim());
    if (isConfirm) {
      if (modalHandled) {
        console.log('🤖 Confirmación ya manejada por modal — omitiendo click redundante');
        modalHandled = false;
        return;
      }
      const modalClicked = await handleModalIfPresent(page);
      if (modalClicked) {
        modalHandled = false;
        return;
      }
    }

    // ── [2] LearningStore ──
    const url = page.url();
    const sig = { url, action: 'click', targetText: selector };
    const learned = learningStore.getBestSelector(sig);
    if (learned) {
      try {
        const learnedLoc = page.locator(learned);
        if (await learnedLoc.count() > 0 && await learnedLoc.first().isVisible().catch(() => false)) {
          await learnedLoc.first().scrollIntoViewIfNeeded().catch(() => {});
          await learnedLoc.first().click({ force: true });
          learningStore.recordSuccess(sig, learned);
          await waitForPageStability(page);
          return;
        }
      } catch {}
    }

    // ── [3] Resolver locator con estrategias primarias + variantes ──
    let locator = await resolveLocator(page, selector);

    // ── [4] Verificar visibilidad (con scroll) ──
    let isVisible = await waitForVisible(locator, 10000);

    // ── [5] Si no es visible → healing proactivo ANTES de tirar error ──
    if (!isVisible) {
      console.log(`🔧 Elemento no visible → iniciando healing: "${selector}"`);
      learningStore.recordFailure(sig, selector);

      // 5a. healSelector (caché → variantes → estructural → scroll → IA)
      const healed = await healSelector(page, selector, 'click');
      if (healed) {
        locator = page.locator(healed);
        isVisible = await waitForVisible(locator, 6000);
        if (isVisible) {
          console.log(`✅ Healing exitoso: ${healed}`);
          learningStore.recordSuccess(sig, healed);
        }
      }

      // 5b. Si healSelector falló → IA directa con contexto completo
      if (!isVisible) {
        const aiSelector = await healWithAI(page, selector, 'click');
        if (aiSelector) {
          const aiLoc = page.locator(aiSelector);
          isVisible = await waitForVisible(aiLoc, 5000);
          if (isVisible) {
            console.log(`🧠 Healing IA exitoso: ${aiSelector}`);
            locator = aiLoc;
            learningStore.recordSuccess(sig, aiSelector);
          }
        }
      }

      if (!isVisible) {
        throw new Error(`Elemento no visible para click: ${selector}`);
      }
    }

    // ── [6] Ejecutar click ──
    await locator.scrollIntoViewIfNeeded().catch(() => {});
    try {
      await locator.click({ force: true, timeout: 10000 });
      learningStore.recordSuccess(sig, selector);
    } catch (clickError) {
      console.log(`⚠️ Click directo falló → healing de click: "${selector}"`);
      learningStore.recordFailure(sig, selector);

      // Healing específico de opciones de select
      if (/option|getByRole/i.test(selector)) {
        const optMatch = selector.match(/['"]([^'"]+)['"]/);
        const optText = optMatch ? optMatch[1] : selector;
        const healedOpt = await healOptionSelector(page, selector, optText);
        if (healedOpt) {
          const optLoc = page.locator(healedOpt);
          await waitForVisible(optLoc);
          await optLoc.click({ force: true });
          learningStore.recordSuccess(sig, healedOpt);
          await waitForPageStability(page);
          return;
        }
      }

      // Healing genérico
      const healedOnClick = await healSelector(page, selector, 'click');
      if (healedOnClick) {
        const healedLoc = page.locator(healedOnClick);
        await waitForVisible(healedLoc);
        await healedLoc.click({ force: true });
        learningStore.recordSuccess(sig, healedOnClick);
        await waitForPageStability(page);
        return;
      }

      // IA como último recurso de click
      const aiSel = await healWithAI(page, selector, 'click');
      if (aiSel) {
        const aiLoc = page.locator(aiSel);
        if (await aiLoc.count() > 0) {
          await aiLoc.first().scrollIntoViewIfNeeded().catch(() => {});
          await aiLoc.first().click({ force: true });
          learningStore.recordSuccess(sig, aiSel);
          await waitForPageStability(page);
          return;
        }
      }
      throw clickError;
    }

    await waitForPageStability(page);
    await waitForNavigationAfterClick(page, selector);
    await closeAnyModal(page);
  }, selector);
}

// ─────────────────────────────────────────────
// SMART FILL
// ─────────────────────────────────────────────
export async function smartFill(page: Page, selector: string, value: string): Promise<void> {
  const smartValue = await resolveSmartValue(selector, value);

  await retryAction(page, async () => {
    await waitForUIStability(page);
    await waitForOverlayToDisappear(page, 3000);

    const url = page.url();
    const sig = { url, action: 'fill', targetText: selector };

    // ── [1] LearningStore ──
    const learned = learningStore.getBestSelector(sig);
    if (learned) {
      try {
        const learnedLoc = page.locator(learned);
        if (await learnedLoc.count() > 0 && await learnedLoc.first().isVisible().catch(() => false)) {
          await learnedLoc.first().scrollIntoViewIfNeeded().catch(() => {});
          await learnedLoc.first().fill('');
          await learnedLoc.first().type(smartValue, { delay: 30 });
          learningStore.recordSuccess(sig, learned);
          return;
        }
      } catch {}
    }

    // ── [2] Resolver locator ──
    let locator = await resolveLocator(page, selector);
    let isVisible = await waitForVisible(locator, 10000);

    // ── [3] Healing si no es visible ──
    if (!isVisible) {
      console.log(`🔧 Campo no visible → healing: "${selector}"`);
      learningStore.recordFailure(sig, selector);

      const healed = await healSelector(page, selector, 'fill', smartValue);
      if (healed) {
        locator = page.locator(healed);
        isVisible = await waitForVisible(locator, 6000);
        if (isVisible) learningStore.recordSuccess(sig, healed);
      }

      if (!isVisible) {
        const aiSel = await healWithAI(page, selector, 'fill', smartValue);
        if (aiSel) {
          locator = page.locator(aiSel);
          isVisible = await waitForVisible(locator, 5000);
          if (isVisible) learningStore.recordSuccess(sig, aiSel);
        }
      }

      if (!isVisible) throw new Error(`Elemento no visible para fill: ${selector}`);
    }

    // ── [4] Ejecutar fill ──
    try {
      await locator.scrollIntoViewIfNeeded().catch(() => {});
      await locator.click({ force: true });
      await locator.fill('');
      await locator.type(smartValue, { delay: 30 });

      // Detectar autocompletado/combobox
      const role = await locator.getAttribute('role').catch(() => null);
      const isCombo = role === 'combobox' ||
        (await locator.getAttribute('aria-autocomplete').catch(() => null)) === 'list';
      if (isCombo) {
        await page.waitForSelector(
          '[role="option"], .suggestions, .autocomplete-results, .ui-menu-item',
          { timeout: 4000, state: 'visible' },
        ).catch(() => {});
        await page.waitForTimeout(300);
      }
      learningStore.recordSuccess(sig, selector);
    } catch (fillError) {
      console.log(`⚠️ Fill falló → healing: "${selector}"`);
      learningStore.recordFailure(sig, selector);

      const healed = await healSelector(page, selector, 'fill', smartValue);
      if (!healed) throw fillError;

      const healedLoc = page.locator(healed);
      await waitForVisible(healedLoc);
      await healedLoc.scrollIntoViewIfNeeded().catch(() => {});
      await healedLoc.fill('');
      await healedLoc.type(smartValue, { delay: 30 });
      learningStore.recordSuccess(sig, healed);
    }

    await waitForPageStability(page);
    await closeAnyModal(page);
  }, selector);
}

// ─────────────────────────────────────────────
// SMART WAIT FOR TEXT  (verificación de resultado asíncrono)
// ─────────────────────────────────────────────

/**
 * Patrones de texto que son mensajes de resultado/confirmación asíncronos.
 * Cuando el recorder graba un click sobre este tipo de texto, en realidad
 * el tester estaba verificando que el mensaje apareció — no haciendo click.
 * Sincronizado con recorder-parser-agent.ts::isResultText().
 */
const RESULT_TEXT_PATTERNS_RUNTIME: RegExp[] = [
  /transferencia\s+realizada/i,
  /operaci[oó]n\s+(exitosa|completada|realizada|aprobada)/i,
  /pago\s+(exitoso|realizado|confirmado|aprobado)/i,
  /\bexitosa?\b/i,
  /\bcompletad[ao]\b/i,
  /\bconfirmad[ao]\b/i,
  /\bprocesad[ao]\b/i,
  /\baprobad[ao]\b/i,
  /\bguardad[ao]\b/i,
  /\benviad[ao]\b/i,
  /\b[eé]xito\b/i,
  /\bcorrect[ao]\b/i,
  /\bfinalizado\b/i,
  /\bregistrad[ao]\b/i,
  /\bsuccess(ful)?\b/i,
  /\bcompleted?\b/i,
  /\bconfirmed?\b/i,
  /\bapproved?\b/i,
  /\bprocessed?\b/i,
  /\bsaved?\b/i,
  /\bsubmitted?\b/i,
  /\bdone\b/i,
  /transaction\s+complete/i,
  /payment\s+(successful|confirmed|processed)/i,
  /✓|✅|☑/,
];

function isResultTextRuntime(text: string): boolean {
  if (text.trim().length < 5) return false;
  const isAction = /^(transferir|confirmar|aceptar|cancelar|volver|siguiente|anterior|cerrar|salir|ingresar|login|submit|ok|sí|si|no|yes|guardar|enviar|buscar|filtrar|limpiar|nuevo|agregar|editar|eliminar|ver|detalles)$/i.test(text.trim());
  if (isAction) return false;
  return RESULT_TEXT_PATTERNS_RUNTIME.some(p => p.test(text));
}

/**
 * Espera a que un texto de resultado/confirmación sea visible en el DOM.
 * Usa 4 estrategias en cascada: waitForSelector → getByText → palabras clave → IA.
 * Timeout largo (15s por defecto) para cubrir respuestas lentas del servidor.
 *
 * Transversal: aplica para cualquier webapp en cualquier idioma.
 */
export async function smartWaitForText(
  page: Page,
  text: string,
  timeout = 15000,
): Promise<void> {
  if (!isPageAlive(page)) return;
  console.log(`🔍 Esperando texto resultado: "${text}" (timeout: ${timeout}ms)`);

  // ── Estrategia 1: :text() selector nativo de Playwright ──
  try {
    await page.waitForSelector(`:text("${text}")`, { state: 'visible', timeout });
    await expect(page.getByText(text, { exact: false })).toBeVisible({ timeout: 5000 });
    console.log(`✅ Texto resultado encontrado: "${text}"`);
    return;
  } catch {}

  // ── Estrategia 2: getByText parcial ──
  try {
    const loc = page.getByText(text, { exact: false });
    await loc.waitFor({ state: 'visible', timeout: Math.min(timeout, 8000) });
    console.log(`✅ Texto resultado encontrado (parcial): "${text}"`);
    return;
  } catch {}

  // ── Estrategia 3: palabras clave del texto — de ÚLTIMA a PRIMERA (más específica primero) ──
  // Importante: iterar en reversa para evitar falsos positivos.
  // Ej: "Transferencia realizada" → probar "realizada" ANTES que "Transferencia"
  // porque "Transferencia" también está en el nav "Transferencias" (falso positivo).
  const words = text.split(/\s+/).filter(w => w.length > 5).reverse();
  for (const word of words) {
    try {
      const loc = page.getByText(word, { exact: false });
      if (await loc.count() > 0) {
        await loc.first().waitFor({ state: 'visible', timeout: 5000 });
        // Verificar que el elemento encontrado realmente contiene texto de resultado
        // y no es un elemento de navegación (nav, sidebar, breadcrumb)
        const tag = await loc.first().evaluate((el: Element) => {
          const parent = el.closest('nav, [role="navigation"], header, aside, .sidebar, .menu');
          return parent ? 'nav-element' : el.tagName.toLowerCase();
        }).catch(() => 'unknown');
        if (tag === 'nav-element') {
          console.log(`⚠️ Keyword "${word}" encontrada en elemento de navegación — omitiendo`);
          continue;
        }
        console.log(`✅ Texto resultado encontrado por palabra clave "${word}": "${text}"`);
        return;
      }
    } catch {}
  }

  // ── Estrategia 4: IA — detectar mensaje de éxito en el DOM actual ──
  if (openai) {
    try {
      const html = await page.evaluate(
        () => document.body?.innerHTML?.substring(0, 4000) || ''
      ).catch(() => '');

      const prompt = `Eres QA experto en Playwright. El test espera ver el mensaje de confirmación "${text}" tras una operación exitosa.
URL actual: ${page.url()}
HTML del body (4000 chars):
${html}

¿Hay algún mensaje de confirmación/éxito visible en el HTML? Si sí, devuelve el selector Playwright exacto para localizarlo (solo el argumento de page.locator(), ejemplo: '.alert-success', ':text("Transferencia")', '[data-testid="success"]').
Si el mensaje NO existe en el HTML actual, responde: NOT_FOUND.
Solo el selector o NOT_FOUND, sin explicación ni código extra.`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0,
        max_tokens: 120,
      });
      const aiRaw = (response.choices[0]?.message?.content?.trim() || '').replace(/```/g, '').trim();

      if (aiRaw && !aiRaw.includes('NOT_FOUND')) {
        // Limpiar prefijos tipo page.locator('...') si los hay
        const cleanSel = aiRaw
          .replace(/^page\.locator\(['"`]/, '')
          .replace(/['"`]\)$/, '')
          .replace(/^['"`]|['"`]$/g, '');
        try {
          const aiLoc = page.locator(cleanSel);
          if (await aiLoc.count() > 0) {
            await aiLoc.first().waitFor({ state: 'visible', timeout: 5000 });
            console.log(`🧠 IA encontró mensaje de confirmación: ${cleanSel}`);
            return;
          }
        } catch {}
      }
    } catch {}
  }

  throw new Error(`⏱️ Texto de resultado no apareció tras ${timeout}ms: "${text}"`);
}

// ─────────────────────────────────────────────
// SMART SELECT
// ─────────────────────────────────────────────
export async function smartSelect(page: Page, selector: string, value: string): Promise<void> {
  await retryAction(page, async () => {
    await waitForUIStability(page);

    const url = page.url();
    const sig = { url, action: 'select', targetText: selector };

    // ── [1] LearningStore ──
    const learned = learningStore.getBestSelector(sig);
    if (learned) {
      try {
        const learnedLoc = page.locator(learned);
        if (await learnedLoc.count() > 0 && await learnedLoc.first().isVisible().catch(() => false)) {
          await learnedLoc.first().selectOption({ value });
          learningStore.recordSuccess(sig, learned);
          return;
        }
      } catch {}
    }

    // ── [2] Resolver locator ──
    let locator = await resolveLocator(page, selector);
    let isVisible = await waitForVisible(locator, 10000);

    // ── [3] Healing si no es visible ──
    if (!isVisible) {
      console.log(`🔧 Select no visible → healing: "${selector}"`);
      learningStore.recordFailure(sig, selector);

      const healed = await healSelector(page, selector, 'select', value);
      if (healed) {
        locator = page.locator(healed);
        isVisible = await waitForVisible(locator, 6000);
        if (isVisible) learningStore.recordSuccess(sig, healed);
      }

      if (!isVisible) throw new Error(`Elemento no visible para select: ${selector}`);
    }

    // ── [4] Ejecutar select ──
    try {
      await locator.scrollIntoViewIfNeeded().catch(() => {});
      const tagName = await locator.evaluate((el: Element) => el.tagName).catch(() => '');

      if (tagName === 'SELECT') {
        await locator.selectOption({ value }).catch(async () => {
          await locator.selectOption({ label: value });
        });
      } else {
        // Select personalizado: click + buscar opción
        await locator.click();
        const option = page.getByText(value, { exact: false });
        await option.waitFor({ state: 'visible', timeout: 8000 });
        await option.click();
      }
      learningStore.recordSuccess(sig, selector);
    } catch (selectError) {
      console.log(`⚠️ Select falló → healing: "${selector}" valor: "${value}"`);
      learningStore.recordFailure(sig, selector);

      // Intentar con opciones reales del DOM
      const domOptions = await getAvailableSelectOptions(page, selector);
      if (domOptions.length > 0) {
        const alt = domOptions.find(o => o !== value);
        if (alt) {
          await locator.selectOption({ value: alt }).catch(async () => {
            await locator.selectOption({ label: alt });
          });
          learningStore.recordSuccess(sig, `${selector}[value=${alt}]`);
          await waitForPageStability(page, { waitForLoad: true, waitForNetworkIdle: true });
          return;
        }
      }

      // Healing genérico
      const healed = await healSelector(page, selector, 'select', value);
      if (healed) {
        const healedLoc = page.locator(healed);
        await waitForVisible(healedLoc);
        await healedLoc.selectOption({ value }).catch(async () => {
          await healedLoc.selectOption({ label: value });
        });
        learningStore.recordSuccess(sig, healed);
      } else {
        throw selectError;
      }
    }

    await waitForPageStability(page, { waitForLoad: true, waitForNetworkIdle: true });
    if (!isPageAlive(page)) throw new Error(`🚨 Page cerrada después de select en "${selector}"`);
    await page.waitForTimeout(500);
  }, selector);
}
