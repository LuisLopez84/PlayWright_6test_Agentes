/**
 * smart-ui-detector.ts
 *
 * Detecta la estabilidad del DOM/UI antes de ejecutar acciones.
 * Diseñado para ser RÁPIDO: no bloquea con waits largos.
 * El wait de networkidle se delega a waitForPageStability (en smart-actions).
 */
import { Page } from '@playwright/test';

/**
 * Espera a que la UI esté mínimamente estable antes de interactuar.
 * Intencionalmente ligero: solo domcontentloaded + animaciones cortas + pausa.
 * NO incluye networkidle (lo hace waitForPageStability para no duplicar).
 *
 * @param extraMs Pausa extra al final (default 200ms)
 */
export async function waitForUIStability(page: Page, extraMs = 200): Promise<void> {
  if (page.isClosed()) return;

  // Esperar que el DOM básico esté listo (suele resolverse inmediatamente en SPAs)
  try {
    await page.waitForLoadState('domcontentloaded', { timeout: 5000 });
  } catch {}

  // Esperar a que las animaciones CSS cortas terminen (máx 1s para no bloquear)
  try {
    await page.waitForFunction(
      () => {
        const elements = document.querySelectorAll('*');
        for (const el of elements) {
          const style = window.getComputedStyle(el);
          if (parseFloat(style.animationDuration || '0') > 0.5) return false;
          if (parseFloat(style.transitionDuration || '0') > 0.5) return false;
        }
        return true;
      },
      { timeout: 1000 },
    ).catch(() => {});
  } catch {}

  // Pausa mínima configurable
  if (!page.isClosed()) {
    await page.waitForTimeout(extraMs);
  }

  // Loguear modales activos (no los cierra — eso lo hace modal-handler)
  if (!page.isClosed()) {
    try {
      const modal = page.locator('[role="dialog"], .modal, #modal-confirm, [aria-modal="true"]');
      if (await modal.count() > 0 && await modal.first().isVisible().catch(() => false)) {
        console.log('ℹ️ Modal/dialog detectado en espera de estabilidad');
      }
    } catch {}
  }
}
