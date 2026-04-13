/**
 * modal-handler.ts
 *
 * Cierra automáticamente modales, banners, overlays y popups comunes
 * que bloquean la interacción en cualquier webapp.
 * Transversal: cubre patrones en español e inglés.
 */
import { Page } from '@playwright/test';

interface ModalHandler {
  selector: string;
  label: string;
}

// ─── Patrones de botones para cerrar modales/banners ───
const DISMISS_PATTERNS: ModalHandler[] = [
  // Cookies / GDPR
  { selector: 'button:has-text("Aceptar cookies")', label: '🍪 Cookies aceptadas' },
  { selector: 'button:has-text("Accept cookies")', label: '🍪 Cookies accepted' },
  { selector: 'button:has-text("Aceptar todas")', label: '🍪 Todas las cookies aceptadas' },
  { selector: 'button:has-text("Accept all")', label: '🍪 All cookies accepted' },
  { selector: 'button:has-text("Aceptar")', label: '✅ Banner aceptado' },
  { selector: 'button:has-text("Accept")', label: '✅ Banner accepted' },
  { selector: 'button:has-text("Got it")', label: '✅ Banner dismissed' },
  { selector: 'button:has-text("Entendido")', label: '✅ Banner descartado' },
  { selector: '[id*="cookie"] button:has-text("OK")', label: '🍪 Cookie OK' },
  { selector: '[class*="cookie"] button', label: '🍪 Cookie banner' },
  { selector: '[class*="consent"] button[class*="accept"]', label: '🍪 Consent accepted' },

  // Ubicación / Location
  { selector: 'button:has-text("Más tarde")', label: '📍 Modal ubicación descartado' },
  { selector: 'button:has-text("Later")', label: '📍 Location modal dismissed' },
  { selector: 'button:has-text("No gracias")', label: '❌ Modal descartado' },
  { selector: 'button:has-text("No thanks")', label: '❌ Modal dismissed' },
  { selector: 'button:has-text("Agregar ubicación")', label: '📍 Modal ubicación (agregar)' },
  { selector: 'button:has-text("Skip")', label: '⏭️ Skipped' },
  { selector: 'button:has-text("Omitir")', label: '⏭️ Omitido' },
  { selector: 'button:has-text("Saltar")', label: '⏭️ Saltado' },

  // Cerrar (X)
  // NOTA: Solo cerrar modales de información/error, NO modales de confirmación de transacciones.
  // Los selectores genéricos como .modal-close, [role="dialog"] button.close, button.close
  // fueron ELIMINADOS porque en SPAs de homebanking/e-commerce son parte del flujo
  // de confirmación (Confirmar/Cancelar) y no deben ser descartados automáticamente.
  { selector: '[role="alertdialog"] button[aria-label="Cerrar"]', label: '❎ Alert dialog cerrado' },
  { selector: '[role="alertdialog"] button[aria-label="Close"]', label: '❎ Alert dialog closed' },

  // Notificaciones / Push notifications
  { selector: 'button:has-text("Ahora no")', label: '🔔 Notificación descartada' },
  { selector: 'button:has-text("Not now")', label: '🔔 Notification dismissed' },
  { selector: 'button:has-text("Bloquear")', label: '🔔 Bloquear notificaciones' },
  { selector: 'button:has-text("Block")', label: '🔔 Block notifications' },

  // Overlays genéricos
  { selector: '[class*="overlay"] button:has-text("OK")', label: '🪟 Overlay OK' },
  { selector: '[class*="popup"] button[class*="close"]', label: '🪟 Popup cerrado' },
  { selector: '[class*="banner"] button[class*="close"]', label: '🪟 Banner cerrado' },
  { selector: '[class*="toast"] button[class*="close"]', label: '🍞 Toast cerrado' },
];

/**
 * Cierra cualquier modal, banner, overlay o popup que esté bloqueando la interacción.
 * @returns true si se cerró algún elemento
 */
export async function closeAnyModal(page: Page): Promise<boolean> {
  if (page.isClosed()) return false;
  let closed = false;

  // ── Intentar cada patrón conocido ──
  for (const { selector, label } of DISMISS_PATTERNS) {
    try {
      const el = page.locator(selector);
      if (await el.count() > 0 && await el.first().isVisible({ timeout: 500 }).catch(() => false)) {
        await el.first().click({ force: true, timeout: 3000 });
        console.log(label);
        closed = true;
        await page.waitForTimeout(300);
      }
    } catch {}
  }

  // NOTA: El fallback genérico de Escape sobre [role="dialog"] fue ELIMINADO intencionalmente.
  // Razón: los modales de CONFIRMACIÓN DE TRANSACCIÓN (transferir, pagar, confirmar) son
  // [role="dialog"] legítimos que NO deben cerrarse automáticamente — deben ser
  // manejados por handleModalIfPresent() dentro de smartClick() cuando el selector
  // es una acción de confirmación explícita.
  // Solo cerrar modales que tienen botones de dismiss explícitos (DISMISS_PATTERNS).

  return closed;
}

/**
 * Detecta y descarta overlays de bloqueo no interactivos (loading spinners, etc.)
 */
export async function waitForOverlayToDisappear(page: Page, timeoutMs = 10000): Promise<void> {
  if (page.isClosed()) return;
  const overlaySelectors = [
    '.loading', '.loader', '[class*="loading"]', '[class*="spinner"]',
    '[aria-busy="true"]', '.overlay:not([role="dialog"])',
    // Skeleton loaders
    '[class*="skeleton"]', '[class*="shimmer"]', '[class*="placeholder"]:not(input):not(textarea)',
  ];
  for (const sel of overlaySelectors) {
    try {
      const el = page.locator(sel);
      if (await el.count() > 0 && await el.first().isVisible({ timeout: 500 }).catch(() => false)) {
        await el.first().waitFor({ state: 'hidden', timeout: timeoutMs }).catch(() => {});
      }
    } catch {}
  }
}

/**
 * Espera a que aparezca un toast/snackbar/notificación y devuelve su texto.
 * Útil para verificar mensajes de éxito/error post-operación.
 * @param expectedText - texto parcial esperado (opcional, solo para log)
 * @param timeout - tiempo máximo de espera en ms
 */
export async function waitForToastMessage(
  page: Page,
  expectedText?: string,
  timeout = 8000,
): Promise<string> {
  if (page.isClosed()) return '';

  const toastSelectors = [
    '[role="alert"]',
    '[class*="toast"]',
    '[class*="snackbar"]',
    '[class*="notification"]:not([class*="badge"])',
    '.Toastify__toast',
    '.swal2-popup',
    '.toast',
    '.toast-message',
  ];
  const combined = toastSelectors.join(', ');

  try {
    await page.waitForSelector(combined, { state: 'visible', timeout });
    const toastEl = page.locator(combined).first();
    const text = await toastEl.textContent().catch(() => '');
    const trimmed = text?.trim() || '';
    console.log(`🍞 Toast detectado: "${trimmed.substring(0, 80)}"`);
    if (expectedText && !trimmed.toLowerCase().includes(expectedText.toLowerCase())) {
      console.warn(`⚠️ Toast no contiene texto esperado: "${expectedText}"`);
    }
    return trimmed;
  } catch {
    if (expectedText) {
      try {
        await page.waitForSelector(`:text("${expectedText}")`, { state: 'visible', timeout: 3000 });
        return expectedText;
      } catch {}
    }
    return '';
  }
}
