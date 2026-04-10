/**
 * smart-ui-detector.ts
 *
 * Detecta la estabilidad del DOM/UI antes de ejecutar acciones.
 * Diseñado para ser RÁPIDO: pausa mínima + domcontentloaded.
 * No bloquea con waits largos de animaciones o networkidle.
 */
import { Page } from '@playwright/test';

/**
 * Espera a que la UI esté mínimamente estable antes de interactuar.
 * Intencionalmente ligero para no acumular tiempo en tests largos.
 *
 * @param extraMs Pausa extra al final (default 150ms)
 */
export async function waitForUIStability(page: Page, extraMs = 150): Promise<void> {
  if (page.isClosed()) return;

  // Esperar que el DOM básico esté listo (suele resolverse inmediatamente en SPAs cargadas)
  try {
    await page.waitForLoadState('domcontentloaded', { timeout: 3000 });
  } catch {}

  // Pausa mínima configurable (sin animaciones ni networkidle para no acumular tiempo)
  if (!page.isClosed()) {
    await page.waitForTimeout(extraMs);
  }
}
