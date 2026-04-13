
import { test, expect } from '@playwright/test';
import { smartGoto } from '../../../../ConfigurationTest/tests/utils/navigation-helper';
import { smartClick, smartFill } from '../../../../ConfigurationTest/tests/utils/smart-actions';

test('DemoQA_Elements_Alerts005', async ({ page }) => {
  await smartGoto(page, 'DemoQA_Elements_Alerts005');

  // ── Manejador global de diálogos nativos (alert / confirm / prompt) ──
  // Cola ordenada: cada diálogo consume una entrada; el resto se acepta por defecto.
  const _dialogQueue: Array<{ action: 'accept' | 'dismiss'; value?: string }> = [
  { action: 'accept' },
  { action: 'accept' },
  { action: 'accept' },
  { action: 'accept' },
  ];
  let _dialogIdx = 0;
  page.on('dialog', async dialog => {
    const cfg = _dialogQueue[_dialogIdx++] ?? { action: 'accept' };
    try {
      if (cfg.action === 'dismiss') {
        await dialog.dismiss();
      } else {
        await dialog.accept(cfg.value);
      }
    } catch {
      // Diálogo ya manejado (race condition prevenida)
    }
  });

  await smartClick(page, `Book Store Application`);
  await smartClick(page, `div:nth-child(3) > .group-header > .header-wrapper > .header-right`);
  await smartClick(page, `Alerts`);
  await smartClick(page, `#alertButton`);
  await smartClick(page, `#timerAlertButton`);
  await smartClick(page, `#confirmButton`);
  await smartClick(page, `#promtButton`);
});
