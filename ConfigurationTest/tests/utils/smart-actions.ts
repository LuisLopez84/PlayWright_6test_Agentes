/**
 * smart-actions.ts
 *
 * Acciones inteligentes de Playwright con auto-healing de 5 capas:
 *
 * 1. LearningStore   — selector con mayor tasa de éxito histórico (por URL+acción)
 * 2. ResolveLocator  — 12 estrategias primarias + variantes de texto + CSS directo
 * 3. ScrollReveal    — scroll para revelar elementos fuera del viewport
 * 4. HealSelector    — cadena: caché → variantes → estructural → scroll → IA
 * 5. AI directo      — OpenAI analiza el DOM y propone selector
 *
 * Transversal: aplica para cualquier webapp en cualquier idioma.
 * Nuevas acciones: smartCheck, smartDblClick, smartUpload.
 */
import path from 'path';
import fs from 'fs';
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

/** Determina si el selector parece un CSS/XPath directo (no texto legible). */
function isCSSSelector(selector: string): boolean {
  return (
    selector.startsWith('#') ||
    selector.startsWith('.') ||
    selector.startsWith('[') ||
    selector.startsWith('//') ||
    /^(input|textarea|select|button|a|div|span|form|table|ul|li|nav|header|section)\b/.test(selector)
  );
}

/**
 * Construye un locator de fallback usando SelectorEngine con variantes de texto.
 */
function buildSmartLocator(page: Page, selector: string): Locator {
  return SelectorEngine.build(page, selector);
}

/**
 * Resuelve el mejor locator para el selector dado.
 * Soporta: CSS selectores directos, nombres de rol, texto, labels, placeholders, testIds.
 */
async function resolveLocator(page: Page, selector: string): Promise<Locator> {
  if (!isPageAlive(page)) {
    throw new Error(`🚨 Page cerrada antes de resolver selector: ${selector}`);
  }

  // ── Estrategia 0: CSS/XPath directo (más eficiente, sin probar roles) ──
  if (isCSSSelector(selector)) {
    const directLoc = page.locator(selector);
    try {
      const count = await directLoc.count();
      if (count > 0) {
        const isVis = await directLoc.first().isVisible().catch(() => false);
        if (isVis) return directLoc.first();
        if (count === 1) return directLoc.first();
        // Múltiples → devolver el primero visible
        for (let i = 0; i < Math.min(count, 5); i++) {
          if (await directLoc.nth(i).isVisible().catch(() => false)) return directLoc.nth(i);
        }
        return directLoc.first();
      }
    } catch {}
    // count=0 ahora (React lazy rendering) — devolver el locator igualmente.
    // waitForVisible esperará con waitFor({ state: 'attached' }) hasta 5s.
    return directLoc.first();
  }

  // ── Helper interno: buscar dentro de diálogos/modales abiertos ──
  const tryInOpenDialog = async (): Promise<Locator | null> => {
    try {
      const dialogLoc = page.locator('[role="dialog"]:visible, .modal.show, .modal[style*="display: block"]');
      if (await dialogLoc.count() > 0) {
        const inBtn = dialogLoc.first().getByRole('button', { name: selector });
        if (await inBtn.count() > 0 && await inBtn.first().isVisible().catch(() => false)) return inBtn.first();
        const inLink = dialogLoc.first().getByRole('link', { name: selector });
        if (await inLink.count() > 0 && await inLink.first().isVisible().catch(() => false)) return inLink.first();
        // Sin verificar visibilidad — el botón puede estar recién animando
        if (await inBtn.count() > 0) return inBtn.first();
      }
    } catch {}
    return null;
  };

  // ── Estrategia -1: buscar dentro de diálogos/modales abiertos (primera pasada) ──
  const dialogResult = await tryInOpenDialog();
  if (dialogResult) return dialogResult;

  // ── Estrategias primarias (selector como nombre/texto) ──
  const primaryStrategies: Array<() => Locator> = [
    // Roles de formulario primero (mayor precisión)
    () => page.getByRole('checkbox', { name: selector }),
    () => page.getByRole('radio', { name: selector }),
    () => page.getByRole('textbox', { name: selector }),
    () => page.getByRole('combobox', { name: selector }),
    () => page.getByRole('spinbutton', { name: selector }),
    () => page.getByRole('button', { name: selector }),
    () => page.getByRole('link', { name: selector }),
    () => page.getByLabel(selector),
    () => page.getByLabel(selector, { exact: false }),  // fuzzy match para labels con trailing spaces/special chars
    () => page.getByPlaceholder(selector),
    () => page.getByPlaceholder(selector, { exact: false }),
    () => page.getByText(selector, { exact: false }),
    () => page.getByTestId(selector),
    () => page.getByAltText(selector),
    () => page.getByTitle(selector),
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
        if (count === 1) return loc.first();
      }
    } catch {}
  }

  // ── Estrategias con variantes de texto ──
  const variants = generateTextVariants(selector);
  for (const variant of variants) {
    const escaped = escapeRegex(variant);
    try {
      const byText = page.getByText(variant, { exact: false });
      if (await byText.count() > 0) {
        const isVis = await byText.first().isVisible().catch(() => false);
        if (isVis) return byText.first();
      }

      const byLink = page.getByRole('link', { name: new RegExp(escaped, 'i') });
      if (await byLink.count() > 0 && await byLink.first().isVisible().catch(() => false)) {
        return byLink.first();
      }

      const byBtn = page.getByRole('button', { name: new RegExp(escaped, 'i') });
      if (await byBtn.count() > 0 && await byBtn.first().isVisible().catch(() => false)) {
        return byBtn.first();
      }

      const inNav = page.locator(`nav :text("${variant}")`);
      if (await inNav.count() > 0 && await inNav.first().isVisible().catch(() => false)) {
        return inNav.first();
      }

      const inSidebar = page.locator(
        `.sidebar :text("${variant}"), .menu :text("${variant}"), .menu-item:has-text("${variant}"), [class*="sidebar"] :text("${variant}"), [class*="menu"] li:has-text("${variant}")`
      );
      if (await inSidebar.count() > 0 && await inSidebar.first().isVisible().catch(() => false)) {
        return inSidebar.first();
      }
    } catch {}
  }

  // ── Delayed rendering retry: esperar animaciones CSS / renderizado diferido ──
  // Solo se llega aquí si ninguna estrategia encontró el elemento aún.
  // 600ms cubre animaciones Bootstrap (300ms) y lazy rendering de SPAs.
  await page.waitForTimeout(600);

  // Retry estrategias dentro de diálogos después de esperar la animación
  const dialogRetry = await tryInOpenDialog();
  if (dialogRetry) return dialogRetry;

  // Retry estrategias primarias
  for (const fn of primaryStrategies) {
    try {
      const loc = fn();
      const count = await loc.count();
      if (count > 0) {
        const isVis = await loc.first().isVisible().catch(() => false);
        if (isVis) return loc.first();
        if (count === 1) return loc.first();
      }
    } catch {}
  }

  // ── Fallback: SelectorEngine con OR chain completo ──
  return buildSmartLocator(page, selector);
}

/**
 * Espera a que un locator sea visible, intentando scroll si es necesario.
 */
async function waitForVisible(locator: Locator, timeout = 10000): Promise<boolean> {
  try {
    // Usar .first() siempre para evitar strict-mode violation cuando el locator matchea múltiples
    await locator.first().waitFor({ state: 'attached', timeout: Math.min(timeout, 5000) });
    await locator.first().scrollIntoViewIfNeeded({ timeout: 2000 }).catch(() => {});
    // Usar el timeout completo para toBeVisible — cubre elementos con CSS transitions largas
    // (ej. Bootstrap modal 300ms fade, DemoQA "Visible After 5 Seconds" button)
    await expect(locator.first()).toBeVisible({ timeout });
    return true;
  } catch {
    return false;
  }
}

/**
 * Motor de reintentos: ejecuta fn hasta maxRetries veces.
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
      try { await page.waitForLoadState('domcontentloaded', { timeout: 3000 }); } catch {}
      await page.waitForTimeout(500);
    }
  }
  throw lastError;
}

const NAVIGATION_TRIGGERS = [
  'comprar', 'continuar', 'ingresar', 'login', 'submit', 'pagar',
  'siguiente', 'transferir', 'confirmar', 'sign in', 'register',
  'sesion', 'sesión', 'bienvenido', 'welcome', 'inicio', 'acceder',
  'entrar', 'logout', 'cerrar sesion', 'sign out',
];

async function waitForNavigationAfterClick(page: Page, selector: string): Promise<void> {
  const normalized = selector.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (NAVIGATION_TRIGGERS.some(kw => normalized.includes(kw))) {
    await page.waitForLoadState('networkidle', { timeout: 4000 }).catch(() => {});
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
  _opts: { waitForNetworkIdle?: boolean; waitForLoad?: boolean } = {},
): Promise<void> {
  if (!isPageAlive(page)) return;
  await page.waitForTimeout(300);
  await closeAnyModal(page);
}

// ─────────────────────────────────────────────
// HEALING POR IA (en contexto de acción)
// ─────────────────────────────────────────────

/**
 * Llama a la IA SOLO cuando el selector es ambiguo (texto) y no un selector
 * estructural muy específico (#id, [data-testid], etc.) para evitar costo innecesario.
 */
function shouldSkipAIHealing(selector: string): boolean {
  // Selectores estructurales muy específicos → no necesitan IA
  return (
    selector.startsWith('#') ||
    selector.includes('[data-testid=') ||
    selector.includes('[aria-label=') ||
    /^page\.(getByTestId|getByRole)\(/.test(selector)
  );
}

async function healWithAI(
  page: Page,
  originalSelector: string,
  action: string,
  value?: string,
): Promise<string | null> {
  if (!openai) return null;
  if (shouldSkipAIHealing(originalSelector)) return null;

  try {
    const url = page.url();
    const title = await page.title().catch(() => '');
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
  if (isResultTextRuntime(selector)) {
    console.log(`🔍 Selector "${selector}" detectado como texto de resultado → usando smartWaitForText`);
    await smartWaitForText(page, selector);
    return;
  }

  await retryAction(page, async () => {
    await waitForUIStability(page);
    await waitForOverlayToDisappear(page, 2000);

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

    const url = page.url();
    const sig = { url, action: 'click', targetText: selector };

    // ── [1] LearningStore ──
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

    // ── [2] Resolver locator ──
    let locator = await resolveLocator(page, selector);
    let isVisible = await waitForVisible(locator, 10000);

    // ── [3] Healing si no es visible ──
    if (!isVisible) {
      console.log(`🔧 Elemento no visible → iniciando healing: "${selector}"`);
      learningStore.recordFailure(sig, selector);

      const healed = await healSelector(page, selector, 'click');
      if (healed) {
        locator = page.locator(healed);
        isVisible = await waitForVisible(locator, 6000);
        if (isVisible) {
          console.log(`✅ Healing exitoso: ${healed}`);
          learningStore.recordSuccess(sig, healed);
        }
      }

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

    // ── [4] Ejecutar click ──
    await locator.scrollIntoViewIfNeeded().catch(() => {});
    try {
      // Primer intento SIN force — necesario para React Router / SPA navigation links.
      // { force: true } bypasses real mouse simulation, breaking client-side navigation.
      try {
        await locator.click({ timeout: 5000 });
      } catch {
        // Fallback con force — para elementos detrás de overlays o con visibilidad parcial
        await locator.click({ force: true, timeout: 10000 });
      }
      learningStore.recordSuccess(sig, selector);
    } catch (clickError) {
      console.log(`⚠️ Click directo falló → healing de click: "${selector}"`);
      learningStore.recordFailure(sig, selector);

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

      const healedOnClick = await healSelector(page, selector, 'click');
      if (healedOnClick) {
        const healedLoc = page.locator(healedOnClick);
        await waitForVisible(healedLoc);
        await healedLoc.click({ force: true });
        learningStore.recordSuccess(sig, healedOnClick);
        await waitForPageStability(page);
        return;
      }

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
      // Intentar fill nativo; algunos custom inputs no soportan fill() → pressSequentially
      try {
        await locator.fill('');
        await locator.fill(smartValue);
      } catch {
        await locator.pressSequentially(smartValue, { delay: 30 });
      }

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
      const healedVisible = await waitForVisible(healedLoc);
      if (!healedVisible) throw fillError;
      await healedLoc.scrollIntoViewIfNeeded().catch(() => {});
      await healedLoc.click({ force: true });
      // Mismo patrón: fill() con fallback a pressSequentially
      try {
        await healedLoc.fill('');
        await healedLoc.fill(smartValue);
      } catch {
        await healedLoc.pressSequentially(smartValue, { delay: 30 });
      }
      learningStore.recordSuccess(sig, healed);
    }

    await waitForPageStability(page);
    await closeAnyModal(page);
  }, selector);
}

// ─────────────────────────────────────────────
// SMART CHECK  (radio / checkbox)
// ─────────────────────────────────────────────
export async function smartCheck(page: Page, selector: string, checked = true): Promise<void> {
  await retryAction(page, async () => {
    await waitForUIStability(page);

    const url = page.url();
    const sig = { url, action: 'check', targetText: selector };

    // ── [1] LearningStore ──
    const learned = learningStore.getBestSelector(sig);
    if (learned) {
      try {
        const learnedLoc = page.locator(learned);
        if (await learnedLoc.count() > 0 && await learnedLoc.first().isVisible().catch(() => false)) {
          await learnedLoc.first().scrollIntoViewIfNeeded().catch(() => {});
          checked ? await learnedLoc.first().check({ force: true }) : await learnedLoc.first().uncheck({ force: true });
          learningStore.recordSuccess(sig, learned);
          await waitForPageStability(page);
          return;
        }
      } catch {}
    }

    // ── [2] Resolver locator ──
    let locator = await resolveLocator(page, selector);
    let isVisible = await waitForVisible(locator, 10000);

    // ── [3] Healing ──
    if (!isVisible) {
      console.log(`🔧 Checkbox/radio no visible → healing: "${selector}"`);
      learningStore.recordFailure(sig, selector);

      const healed = await healSelector(page, selector, 'check');
      if (healed) {
        locator = page.locator(healed);
        isVisible = await waitForVisible(locator, 6000);
        if (isVisible) learningStore.recordSuccess(sig, healed);
      }

      if (!isVisible) {
        const aiSel = await healWithAI(page, selector, 'check');
        if (aiSel) {
          locator = page.locator(aiSel);
          isVisible = await waitForVisible(locator, 5000);
          if (isVisible) learningStore.recordSuccess(sig, aiSel);
        }
      }

      if (!isVisible) throw new Error(`Elemento no visible para check: ${selector}`);
    }

    // ── [4] Ejecutar check ──
    await locator.scrollIntoViewIfNeeded().catch(() => {});
    try {
      if (checked) {
        await locator.check({ force: true });
      } else {
        await locator.uncheck({ force: true });
      }
      learningStore.recordSuccess(sig, selector);
    } catch {
      // Fallback: click (algunos checkboxes no soportan .check() directamente)
      await locator.click({ force: true });
      learningStore.recordSuccess(sig, selector);
    }

    await waitForPageStability(page);
  }, selector);
}

// ─────────────────────────────────────────────
// SMART DBLCLICK
// ─────────────────────────────────────────────
export async function smartDblClick(page: Page, selector: string): Promise<void> {
  await retryAction(page, async () => {
    await waitForUIStability(page);

    const url = page.url();
    const sig = { url, action: 'dblclick', targetText: selector };

    let locator = await resolveLocator(page, selector);
    let isVisible = await waitForVisible(locator, 10000);

    if (!isVisible) {
      console.log(`🔧 Elemento no visible para dblclick → healing: "${selector}"`);
      learningStore.recordFailure(sig, selector);

      const healed = await healSelector(page, selector, 'dblclick');
      if (healed) {
        locator = page.locator(healed);
        isVisible = await waitForVisible(locator, 6000);
        if (isVisible) learningStore.recordSuccess(sig, healed);
      }

      if (!isVisible) throw new Error(`Elemento no visible para dblclick: ${selector}`);
    }

    await locator.scrollIntoViewIfNeeded().catch(() => {});
    await locator.dblclick({ force: true, timeout: 10000 });
    learningStore.recordSuccess(sig, selector);

    await waitForPageStability(page);
  }, selector);
}

// ─────────────────────────────────────────────
// SMART UPLOAD  (setInputFiles)
// ─────────────────────────────────────────────
export async function smartUpload(page: Page, selector: string, filePath: string): Promise<void> {
  await retryAction(page, async () => {
    await waitForUIStability(page);

    // Intentar resolver el path del archivo (relativo o absoluto)
    let resolvedPath = filePath;
    if (!path.isAbsolute(filePath)) {
      // Probar en el directorio de trabajo actual y en fixtures/
      const candidates = [
        path.resolve(filePath),
        path.resolve('fixtures', filePath),
        path.resolve('ConfigurationTest', 'fixtures', filePath),
      ];
      for (const c of candidates) {
        if (fs.existsSync(c)) { resolvedPath = c; break; }
      }
    }

    const fileExists = fs.existsSync(resolvedPath);
    if (!fileExists) {
      console.warn(`⚠️ Archivo de upload no encontrado: "${resolvedPath}" — se omite el upload`);
      return; // No lanzar error, el test puede continuar
    }

    // Buscar el input[type="file"] más probable
    const fileInputStrategies = [
      () => page.locator('input[type="file"]'),
      () => page.locator('[type="file"]'),
    ];

    // Si el selector original ya era el input, intentarlo primero
    if (selector && !['file-input', 'Choose File', 'choose file'].includes(selector)) {
      try {
        const selectorLoc = await resolveLocator(page, selector);
        await selectorLoc.setInputFiles(resolvedPath);
        return;
      } catch {}
    }

    for (const fn of fileInputStrategies) {
      try {
        const fi = fn();
        if (await fi.count() > 0) {
          await fi.first().setInputFiles(resolvedPath);
          return;
        }
      } catch {}
    }

    console.warn(`⚠️ No se encontró input de archivo para selector: "${selector}"`);
  }, selector);
}

// ─────────────────────────────────────────────
// SMART WAIT FOR TEXT  (verificación de resultado)
// ─────────────────────────────────────────────

const RESULT_TEXT_PATTERNS_RUNTIME: RegExp[] = [
  /transferencia\s+realizada/i,
  /operaci[oó]n\s+(exitosa|completada|realizada|aprobada)/i,
  /pago\s+(exitoso|realizado|confirmado|aprobado|finalizado)/i,
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
  /[✓✅☑]/,
  /\byou\s+have\b/i,
  /fakepath/i,
  /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s*:/,
];

function isResultTextRuntime(text: string): boolean {
  if (text.trim().length < 5) return false;
  // CSS selectors and XPath are never result texts
  if (isCSSSelector(text.trim())) return false;
  const isAction = /^(transferir|confirmar|aceptar|cancelar|volver|siguiente|anterior|cerrar|salir|ingresar|login|submit|ok|sí|si|no|yes|guardar|enviar|buscar|filtrar|limpiar|nuevo|agregar|editar|eliminar|ver|detalles)$/i.test(text.trim());
  if (isAction) return false;
  const wordCount = text.trim().split(/\s+/).length;
  if (text.trim().length >= 40 && wordCount >= 5) return true;
  return RESULT_TEXT_PATTERNS_RUNTIME.some(p => p.test(text));
}

export async function smartWaitForText(
  page: Page,
  text: string,
  timeout = 15000,
): Promise<void> {
  if (!isPageAlive(page)) return;
  console.log(`🔍 Esperando texto resultado: "${text}" (timeout: ${timeout}ms)`);

  // ── Estrategia 1: :text() nativo ──
  try {
    await page.waitForSelector(`:text("${text}")`, { state: 'visible', timeout });
    // Usar .first() para evitar error cuando múltiples elementos coinciden
    await expect(page.getByText(text, { exact: false }).first()).toBeVisible({ timeout: 5000 });
    console.log(`✅ Texto resultado encontrado: "${text}"`);
    return;
  } catch {}

  // ── Estrategia 2: getByText parcial (con .first() para múltiples matches) ──
  try {
    const loc = page.getByText(text, { exact: false });
    await loc.first().waitFor({ state: 'visible', timeout: Math.min(timeout, 8000) });
    console.log(`✅ Texto resultado encontrado (parcial): "${text}"`);
    return;
  } catch {}

  // ── Estrategia 3: palabras clave en reversa (evitar falsos positivos en nav) ──
  // Incluye también palabras cortas (≥ 2 chars) para cubrir textos como "Yes", "No", "OK"
  const words = text.split(/\s+/).filter(w => w.length >= 2).reverse();
  for (const word of words) {
    try {
      const loc = page.getByText(word, { exact: false });
      if (await loc.count() > 0) {
        await loc.first().waitFor({ state: 'visible', timeout: 5000 });
        const tag = await loc.first().evaluate((el: Element) => {
          const parent = el.closest('nav, [role="navigation"], header, aside, .sidebar, .menu');
          return parent ? 'nav-element' : el.tagName.toLowerCase();
        }).catch(() => 'unknown');
        if (tag === 'nav-element') {
          console.log(`⚠️ Keyword "${word}" encontrada en navegación — omitiendo`);
          continue;
        }
        console.log(`✅ Texto resultado por keyword "${word}": "${text}"`);
        return;
      }
    } catch {}
  }

  // ── Estrategia 4: IA ──
  if (openai) {
    try {
      const html = await page.evaluate(() => document.body?.innerHTML?.substring(0, 4000) || '').catch(() => '');

      const prompt = `Eres QA experto en Playwright. El test espera ver el mensaje "${text}" tras una operación exitosa.
URL actual: ${page.url()}
HTML del body (4000 chars):
${html}

¿Hay algún mensaje de confirmación/éxito visible? Si sí, devuelve el selector Playwright exacto (solo page.locator() arg).
Si NO existe en el HTML actual, responde: NOT_FOUND.
Solo el selector o NOT_FOUND, sin explicación.`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0,
        max_tokens: 120,
      });
      const aiRaw = (response.choices[0]?.message?.content?.trim() || '').replace(/```/g, '').trim();

      if (aiRaw && !aiRaw.includes('NOT_FOUND')) {
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

    // ── [3] Healing ──
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
        await locator.click();
        const option = page.getByText(value, { exact: false });
        await option.waitFor({ state: 'visible', timeout: 8000 });
        await option.click();
      }
      learningStore.recordSuccess(sig, selector);
    } catch (selectError) {
      console.log(`⚠️ Select falló → healing: "${selector}" valor: "${value}"`);
      learningStore.recordFailure(sig, selector);

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
