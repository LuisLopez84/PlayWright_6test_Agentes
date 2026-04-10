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
  { selector: '[role="dialog"] button[aria-label="Cerrar"]', label: '❎ Dialog cerrado (aria)' },
  { selector: '[role="dialog"] button[aria-label="Close"]', label: '❎ Dialog closed (aria)' },
  { selector: '[role="dialog"] button:has-text("Cerrar")', label: '❎ Dialog cerrado' },
  { selector: '[role="dialog"] button:has-text("Close")', label: '❎ Dialog closed' },
  { selector: '[role="dialog"] button:has-text("×")', label: '❎ Dialog X' },
  { selector: '.modal button:has-text("Cerrar")', label: '❎ Modal cerrado' },
  { selector: '.modal button:has-text("Close")', label: '❎ Modal closed' },
  { selector: '.modal-close', label: '❎ Modal close button' },
  { selector: '[aria-label="Close"]', label: '❎ Aria close' },
  { selector: '[aria-label="Cerrar"]', label: '❎ Aria cerrar' },
  { selector: 'button.close', label: '❎ Bootstrap close' },
  { selector: '.modal__close', label: '❎ Modal close' },

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

  // ── Dialog/modal genérico: clic fuera para cerrar ──
  if (!closed) {
    try {
      const modalDialog = page.locator('[role="dialog"]:visible, [aria-modal="true"]:visible');
      if (await modalDialog.count() > 0) {
        // Intentar ESC primero (más seguro que clic fuera)
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
        // Si sigue visible, clic en esquina
        const stillVisible = await modalDialog.first().isVisible().catch(() => false);
        if (stillVisible) {
          await page.mouse.click(10, 10);
          console.log('🤖 Modal/overlay cerrado con Escape + clic fuera');
        } else {
          console.log('🤖 Modal/overlay cerrado con Escape');
        }
        closed = true;
      }
    } catch {}
  }

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
