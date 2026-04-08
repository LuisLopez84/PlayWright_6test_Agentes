import { Page, Locator, expect } from '@playwright/test';
import { healSelector, getAvailableSelectOptions } from '../../../ConfigurationAgents/ia-testing/agents/core/healer-agents';
import { resolveSmartValue } from './test-data-resolver';
import { waitForUIStability } from './smart-ui-detector';
import { healSelector, getAvailableSelectOptions, healOptionSelector } from '../../../ConfigurationAgents/ia-testing/agents/core/healer-agents';

// 🔥 VALIDAR QUE LA PÁGINA SIGA VIVA
function isPageAlive(page: Page): boolean {
  return !page.isClosed();
}

// 🔥 Builder base inteligente
function buildSmartLocator(page: Page, selector: string): Locator {
  if (!selector) throw new Error('Selector vacío');
  const clean = selector.trim();
  if (clean.startsWith('//')) return page.locator(clean);
  if (clean.startsWith('#') || clean.startsWith('.')) return page.locator(clean);
  return page.getByText(clean, { exact: false });
}

// 🔥 Resolver universal con múltiples estrategias
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

// 🔥 Espera robusta REAL
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

// 🔥 MANEJO AUTOMÁTICO DE MODALES (mejorado)
let modalHandled = false; // Bandera para evitar repetir confirmación

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
        // Esperar a que el modal desaparezca
        await modal.first().waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
        await page.waitForTimeout(500);
        return true;
      }
    }
  }
  return false;
}

// 🔥 Espera de estabilidad de página
async function waitForPageStability(page: Page, options: { waitForNetworkIdle?: boolean, waitForLoad?: boolean } = {}) {
  if (page.isClosed()) return;

  const waitForLoad = options.waitForLoad !== false;
  const waitForNetworkIdle = options.waitForNetworkIdle !== false;

  const promises: Promise<any>[] = [];

  if (waitForLoad) {
    promises.push(page.waitForLoadState('load', { timeout: 15000 }).catch(() => {}));
  }
  if (waitForNetworkIdle) {
    promises.push(page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {}));
  }

  await Promise.race(promises).catch(() => {});
  await page.waitForTimeout(500);
  await handleModalIfPresent(page);
}

// 🔥 REINTENTO UNIVERSAL INTELIGENTE
async function retryAction(
  page: Page,
  fn: () => Promise<void>,
  selector: string,
  retries = 2
) {
  let lastError;
  for (let i = 0; i <= retries; i++) {
    try {
      if (page.isClosed()) {
        throw new Error(`🚨 Page cerrada antes de ejecutar: ${selector}`);
      }
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
      if (!page.isClosed()) {
        await new Promise(res => setTimeout(res, 300));
      }
    }
  }
  throw lastError;
}

// ✅ CLICK ULTRA ROBUSTO (con manejo especial para confirmaciones)
export async function smartClick(page: Page, selector: string) {
  await retryAction(page, async () => {
    await waitForUIStability(page);

    const isConfirm = selector.toLowerCase().includes('confirmar') ||
                      selector.toLowerCase().includes('confirm') ||
                      selector === 'Confirmar';

    // Si es un botón de confirmar y ya manejamos un modal, saltamos este clic
    if (isConfirm && modalHandled) {
      console.log('🤖 Confirmación ya manejada por modal, omitiendo clic redundante');
      modalHandled = false; // Reset para futuros flujos
      return;
    }

    // Intentar manejar modal antes del clic (por si acaso)
    const modalClicked = await handleModalIfPresent(page);
    if (modalClicked && isConfirm) {
      console.log('🤖 Confirmación manejada en pre-click, omitiendo clic normal');
      modalHandled = false;
      return;
    }

    // Comportamiento normal
    const locator = await resolveLocator(page, selector);
    const isVisible = await waitForVisible(locator, 10000);
    if (!isVisible) throw new Error(`Elemento no visible para click: ${selector}`);

    await locator.scrollIntoViewIfNeeded().catch(() => {});

    try {
      await locator.click({ force: true, timeout: 10000 });
    } catch (e) {
      console.log(`⚠️ Click falló → healing: ${selector}`);
	  // Si parece un selector de opción, intentar healing específico
if (selector.includes('option') || selector.includes('getByRole')) {
  const optionMatch = selector.match(/['"]([^'"]+)['"]/);
  const optionText = optionMatch ? optionMatch[1] : selector;
  const healedOption = await healOptionSelector(page, selector, optionText);
  if (healedOption) {
    const healedLocator = page.locator(healedOption);
    await waitForVisible(healedLocator);
    await healedLocator.click({ force: true });
    return;
  }
}
      const healed = await healSelector(page, selector, 'click');
      if (!healed) throw e;
      const healedLocator = page.locator(healed);
      await waitForVisible(healedLocator);
      await healedLocator.click({ force: true });


    }

    // Esperar estabilidad después del clic (importante para navegaciones)
    await waitForPageStability(page);

  }, selector);
}

/**
 * Detecta si un elemento es un combobox o input con autocompletado
 */
async function isComboboxOrAutocomplete(page: Page, locator: Locator): Promise<boolean> {
  const role = await locator.getAttribute('role');
  const ariaAutocomplete = await locator.getAttribute('aria-autocomplete');
  const type = await locator.getAttribute('type');
  return role === 'combobox' || ariaAutocomplete === 'list' || type === 'search';
}

/**
 * Espera a que aparezca el menú de opciones después de escribir en un combobox
 */
async function waitForAutocompleteOptions(page: Page, timeout = 5000): Promise<void> {
  // Esperar a que aparezca algún rol 'option' o elemento con clase de sugerencia
  const optionSelector = '[role="option"], .suggestions, .autocomplete-results, .ui-menu-item';
  await page.waitForSelector(optionSelector, { timeout, state: 'visible' }).catch(() => {});
  // Pequeña pausa para estabilizar
  await page.waitForTimeout(300);
}

// ✅ INPUT ROBUSTO
export async function smartFill(page: Page, selector: string, value: string) {
  const smartValue = resolveSmartValue(selector, value);
  await retryAction(page, async () => {
    await waitForUIStability(page);
    let locator = await resolveLocator(page, selector);
    const isVisible = await waitForVisible(locator);
    if (!isVisible) throw new Error(`Elemento no visible para fill: ${selector}`);

    try {
      await locator.click({ force: true });
      await locator.fill('');
      await locator.type(smartValue, { delay: 30 });

      // Si es combobox, esperar opciones pero NO presionar Enter
      if (await isComboboxOrAutocomplete(page, locator)) {
        await waitForAutocompleteOptions(page);
        console.log(`🔍 Combobox detectado. Opciones disponibles, esperando interacción del usuario.`);
      }
    } catch (e) {
      console.log(`⚠️ Fill falló → healing: ${selector}`);
      const healed = await healSelector(page, selector, 'fill', smartValue);
      if (!healed) throw e;
      locator = page.locator(healed);
      await waitForVisible(locator);
      await locator.click({ force: true });
      await locator.fill('');
      await locator.type(smartValue, { delay: 30 });
      if (await isComboboxOrAutocomplete(page, locator)) {
        await waitForAutocompleteOptions(page);
        // Tampoco presionamos Enter aquí
      }
    }
    await waitForPageStability(page);
  }, selector);
}

// ✅ SELECT UNIVERSAL
export async function smartSelect(page: Page, selector: string, value: string) {
  await retryAction(page, async () => {
    await waitForUIStability(page);

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
    } catch (e) {
      console.log(`⚠️ Select falló → healing: ${selector} con valor ${value}`);
      const options = await getAvailableSelectOptions(page, selector);
      if (options.length > 0) {
        const alternative = options.find(opt => opt !== value);
        if (alternative) {
          console.log(`🤖 Usando alternativa real del DOM: ${alternative}`);
          await locator.selectOption({ value: alternative }).catch(async () => {
            await locator.selectOption({ label: alternative });
          });
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
      } else {
        throw e;
      }
    }

    console.log(`⏳ Esperando estabilidad después de select en: ${selector}`);
    await waitForPageStability(page, { waitForLoad: true, waitForNetworkIdle: true });

    if (page.isClosed()) {
      throw new Error(`🚨 Page cerrada después de select en ${selector}`);
    }
    await page.waitForTimeout(500);
  }, selector);
}