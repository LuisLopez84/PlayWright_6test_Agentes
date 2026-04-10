import { Page, Locator, expect } from '@playwright/test';
import { healSelector, getAvailableSelectOptions, healOptionSelector } from '../../../ConfigurationAgents/ia-testing/agents/core/healer-agents';
import { resolveSmartValue } from './test-data-resolver';
import { waitForUIStability } from './smart-ui-detector';
import { closeAnyModal } from './modal-handler';
import { openai } from '../../../ConfigurationAgents/ia-testing/utils/openai-client';
import { learningStore } from '../../../ConfigurationAgents/ia-testing/agents/core/learning-store';

function isPageAlive(page: Page): boolean {
  return !page.isClosed();
}

function buildSmartLocator(page: Page, selector: string): Locator {
  if (!selector) throw new Error('Selector vacío');
  const clean = selector.trim();
  if (clean.startsWith('//')) return page.locator(clean);
  if (clean.startsWith('#') || clean.startsWith('.')) return page.locator(clean);
  return page.getByText(clean, { exact: false });
}

async function resolveLocator(page: Page, selector: string): Promise<Locator> {
  if (!isPageAlive(page)) {
    throw new Error(`🚨 Page cerrada antes de resolver selector: ${selector}`);
  }

  const strategies = [
    () => page.getByRole('button', { name: selector }),
    () => page.getByRole('link', { name: selector }),
    () => page.getByRole('textbox', { name: selector }),
    () => page.getByRole('combobox', { name: selector }),
    () => page.getByLabel(selector),
    () => page.getByPlaceholder(selector),
    () => page.getByText(selector, { exact: false }),
    () => page.getByTestId(selector),
    () => buildSmartLocator(page, selector)
  ];

  for (const fn of strategies) {
    try {
      const loc = fn();
      if (await loc.count() > 0) return loc.first();
    } catch {}
  }
  return buildSmartLocator(page, selector);
}

async function waitForVisible(locator: Locator, timeout = 15000): Promise<boolean> {
  try {
    await locator.waitFor({ state: 'attached', timeout });
    await expect(locator).toBeVisible({ timeout });
    return true;
  } catch {
    console.log(`⚠️ Elemento no visible después de ${timeout}ms`);
    return false;
  }
}

let modalHandled = false;

async function handleModalIfPresent(page: Page): Promise<boolean> {
  if (page.isClosed()) return false;
  const modal = page.locator('[role="dialog"], .modal, #modal-confirm');
  if (await modal.count() > 0) {
    const visible = await modal.first().isVisible().catch(() => false);
    if (visible) {
      const confirmBtn = modal.getByRole('button', { name: /confirmar|aceptar|ok/i });
      if (await confirmBtn.count() > 0) {
        console.log('🤖 Modal detectado → auto confirmación');
        await confirmBtn.first().click({ force: true });
        modalHandled = true;
        await modal.first().waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
        await page.waitForTimeout(500);
        return true;
      }
    }
  }
  return false;
}

async function waitForPageStability(page: Page, options: { waitForNetworkIdle?: boolean, waitForLoad?: boolean } = {}) {
  if (page.isClosed()) return;
  const waitForLoad = options.waitForLoad !== false;
  const waitForNetworkIdle = options.waitForNetworkIdle !== false;
  const promises: Promise<any>[] = [];
  if (waitForLoad) promises.push(page.waitForLoadState('load', { timeout: 15000 }).catch(() => {}));
  if (waitForNetworkIdle) promises.push(page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {}));
  await Promise.race(promises).catch(() => {});
  await page.waitForTimeout(500);
  await handleModalIfPresent(page);
  await closeAnyModal(page);
}

async function retryAction(page: Page, fn: () => Promise<void>, selector: string, retries = 2) {
  let lastError;
  for (let i = 0; i <= retries; i++) {
    try {
      if (page.isClosed()) throw new Error(`🚨 Page cerrada antes de ejecutar: ${selector}`);
      await fn();
      return;
    } catch (e) {
      lastError = e;
      console.log(`🔁 Retry ${i + 1} → ${selector}`);
      if (page.isClosed()) {
        console.log('🛑 Page cerrada → se detiene retry');
        throw lastError;
      }
      try {
        await page.waitForLoadState('domcontentloaded', { timeout: 3000 });
      } catch {}
      if (!page.isClosed()) await new Promise(res => setTimeout(res, 300));
    }
  }
  throw lastError;
}

async function waitForNavigationAfterClick(page: Page, selector: string) {
  const navigationKeywords = ['comprar', 'continuar', 'ingresar', 'login', 'submit', 'pagar', 'siguiente'];
  const shouldWait = navigationKeywords.some(keyword => selector.toLowerCase().includes(keyword));
  if (shouldWait) {
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1000);
  }
}

async function healWithAI(page: Page, originalSelector: string, action: string, value?: string): Promise<string | null> {
  if (!openai || !openai.chat) return null;
  try {
    const html = (await page.content()).substring(0, 4000);
    const prompt = `Eres un experto en automatización. El selector "${originalSelector}" falló para la acción "${action}" (valor: ${value || 'N/A'}).
Analiza el siguiente HTML y devuelve UN SOLO selector robusto (puede ser getByRole, getByTestId, getByText, CSS, etc.) que funcione en Playwright.
HTML: ${html}
Devuelve solo el selector, sin explicaciones.`;
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
    });
    return response.choices[0]?.message?.content?.trim() || null;
  } catch (e) {
    console.log('❌ Error en IA healing:', e);
    return null;
  }
}

export async function smartClick(page: Page, selector: string) {
  await retryAction(page, async () => {
    await waitForUIStability(page);
    const isConfirm = selector.toLowerCase().includes('confirmar') || selector.toLowerCase().includes('confirm') || selector === 'Confirmar';
    if (isConfirm && modalHandled) {
      console.log('🤖 Confirmación ya manejada por modal, omitiendo clic redundante');
      modalHandled = false;
      return;
    }
    const modalClicked = await handleModalIfPresent(page);
    if (modalClicked && isConfirm) {
      console.log('🤖 Confirmación manejada en pre-click, omitiendo clic normal');
      modalHandled = false;
      return;
    }

    const url = page.url();
    const signature = { url, action: 'click', targetText: selector };
    const learnedSelector = learningStore.getBestSelector(signature);
    if (learnedSelector) {
      const learnedLocator = page.locator(learnedSelector);
      if (await learnedLocator.count() > 0 && await learnedLocator.first().isVisible().catch(() => false)) {
        console.log(`📚 Usando selector aprendido: ${learnedSelector}`);
        await learnedLocator.first().click({ force: true });
        learningStore.recordSuccess(signature, learnedSelector);
        return;
      }
    }

    const locator = await resolveLocator(page, selector);
    const isVisible = await waitForVisible(locator, 10000);
    if (!isVisible) throw new Error(`Elemento no visible para click: ${selector}`);
    await locator.scrollIntoViewIfNeeded().catch(() => {});
    try {
      await locator.click({ force: true, timeout: 10000 });
      learningStore.recordSuccess(signature, selector);
    } catch (e) {
      console.log(`⚠️ Click falló → healing: ${selector}`);
      learningStore.recordFailure(signature, selector);

      // 1. Healing específico para opciones
      if (selector.includes('option') || selector.includes('getByRole')) {
        const optionMatch = selector.match(/['"]([^'"]+)['"]/);
        const optionText = optionMatch ? optionMatch[1] : selector;
        const healedOption = await healOptionSelector(page, selector, optionText);
        if (healedOption) {
          const healedLocator = page.locator(healedOption);
          await waitForVisible(healedLocator);
          await healedLocator.click({ force: true });
          learningStore.recordSuccess(signature, healedOption);
          return;
        }
      }
      // 2. Healing genérico
      const healed = await healSelector(page, selector, 'click');
      if (healed) {
        const healedLocator = page.locator(healed);
        await waitForVisible(healedLocator);
        await healedLocator.click({ force: true });
        learningStore.recordSuccess(signature, healed);
        return;
      }
      // 3. IA
      console.log(`🧠 Usando IA para healing de selector: ${selector}`);
      const aiSelector = await healWithAI(page, selector, 'click');
      if (aiSelector) {
        const healedLocator = page.locator(aiSelector);
        if (await healedLocator.count() > 0 && await healedLocator.first().isVisible().catch(() => false)) {
          await healedLocator.first().click({ force: true });
          learningStore.recordSuccess(signature, aiSelector);
          return;
        }
      }
      throw e;
    }
    await waitForPageStability(page);
    await waitForNavigationAfterClick(page, selector);
    await closeAnyModal(page);
  }, selector);
}

async function isComboboxOrAutocomplete(page: Page, locator: Locator): Promise<boolean> {
  const role = await locator.getAttribute('role');
  const ariaAutocomplete = await locator.getAttribute('aria-autocomplete');
  const type = await locator.getAttribute('type');
  return role === 'combobox' || ariaAutocomplete === 'list' || type === 'search';
}

async function waitForAutocompleteOptions(page: Page, timeout = 5000): Promise<void> {
  const optionSelector = '[role="option"], .suggestions, .autocomplete-results, .ui-menu-item';
  await page.waitForSelector(optionSelector, { timeout, state: 'visible' }).catch(() => {});
  await page.waitForTimeout(300);
}

export async function smartFill(page: Page, selector: string, value: string) {
  const smartValue = await resolveSmartValue(selector, value); // ✅ await agregado
  await retryAction(page, async () => {
    await waitForUIStability(page);

    const url = page.url();
    const signature = { url, action: 'fill', targetText: selector };
    const learnedSelector = learningStore.getBestSelector(signature);
    if (learnedSelector) {
      const learnedLocator = page.locator(learnedSelector);
      if (await learnedLocator.count() > 0 && await learnedLocator.first().isVisible().catch(() => false)) {
        console.log(`📚 Usando selector aprendido para fill: ${learnedSelector}`);
        await learnedLocator.first().click({ force: true });
        await learnedLocator.first().fill('');
        await learnedLocator.first().type(smartValue, { delay: 30 });
        learningStore.recordSuccess(signature, learnedSelector);
        return;
      }
    }

    let locator = await resolveLocator(page, selector);
    const isVisible = await waitForVisible(locator);
    if (!isVisible) throw new Error(`Elemento no visible para fill: ${selector}`);
    try {
      await locator.click({ force: true });
      await locator.fill('');
      await locator.type(smartValue, { delay: 30 });
      if (await isComboboxOrAutocomplete(page, locator)) {
        await waitForAutocompleteOptions(page);
        console.log(`🔍 Combobox detectado. Opciones disponibles, esperando interacción del usuario.`);
      }
      learningStore.recordSuccess(signature, selector); // ✅ éxito solo al final del try
    } catch (e) {
      console.log(`⚠️ Fill falló → healing: ${selector}`);
      learningStore.recordFailure(signature, selector);
      const healed = await healSelector(page, selector, 'fill', smartValue);
      if (!healed) throw e;
      locator = page.locator(healed);
      await waitForVisible(locator);
      await locator.click({ force: true });
      await locator.fill('');
      await locator.type(smartValue, { delay: 30 });
      if (await isComboboxOrAutocomplete(page, locator)) {
        await waitForAutocompleteOptions(page);
      }
      learningStore.recordSuccess(signature, healed);
    }
    await waitForPageStability(page);
    await closeAnyModal(page);
  }, selector);
}

export async function smartSelect(page: Page, selector: string, value: string) {
  await retryAction(page, async () => {
    await waitForUIStability(page);

    const url = page.url();
    const signature = { url, action: 'select', targetText: selector };
    const learnedSelector = learningStore.getBestSelector(signature);
    if (learnedSelector) {
      const learnedLocator = page.locator(learnedSelector);
      if (await learnedLocator.count() > 0 && await learnedLocator.first().isVisible().catch(() => false)) {
        console.log(`📚 Usando selector aprendido para select: ${learnedSelector}`);
        await learnedLocator.first().selectOption({ value });
        learningStore.recordSuccess(signature, learnedSelector);
        return;
      }
    }

    let locator = await resolveLocator(page, selector);
    const isVisible = await waitForVisible(locator);
    if (!isVisible) throw new Error(`Elemento no visible para select: ${selector}`);
    try {
      const tagName = await locator.evaluate(el => el.tagName).catch(() => '');
      if (tagName === 'SELECT') {
        console.log(`🔽 Select nativo: ${selector} con valor ${value}`);
        await locator.selectOption({ value }).catch(async () => {
          console.log(`🔽 Fallback select por label: ${value}`);
          await locator.selectOption({ label: value });
        });
      } else {
        console.log(`🔽 Select personalizado: ${selector} con valor ${value}`);
        await locator.click();
        const option = page.getByText(value, { exact: false });
        await option.waitFor({ state: 'visible', timeout: 10000 });
        await option.click();
      }
      learningStore.recordSuccess(signature, selector);
    } catch (e) {
      console.log(`⚠️ Select falló → healing: ${selector} con valor ${value}`);
      learningStore.recordFailure(signature, selector);
      const options = await getAvailableSelectOptions(page, selector);
      if (options.length > 0) {
        const alternative = options.find(opt => opt !== value);
        if (alternative) {
          console.log(`🤖 Usando alternativa real del DOM: ${alternative}`);
          await locator.selectOption({ value: alternative }).catch(async () => {
            await locator.selectOption({ label: alternative });
          });
          learningStore.recordSuccess(signature, `${selector}[value=${alternative}]`);
          return;
        }
      }
      const healed = await healSelector(page, selector, 'select', value);
      if (healed) {
        const healedLocator = page.locator(healed);
        await waitForVisible(healedLocator);
        await healedLocator.selectOption({ value }).catch(async () => {
          await healedLocator.selectOption({ label: value });
        });
        learningStore.recordSuccess(signature, healed);
      } else {
        throw e;
      }
    }
    console.log(`⏳ Esperando estabilidad después de select en: ${selector}`);
    await waitForPageStability(page, { waitForLoad: true, waitForNetworkIdle: true });
    if (page.isClosed()) throw new Error(`🚨 Page cerrada después de select en ${selector}`);
    await page.waitForTimeout(500);
  }, selector);
}