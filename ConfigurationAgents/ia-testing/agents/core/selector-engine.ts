import { Page, Locator } from '@playwright/test';

type RoleType =
| 'textbox'
| 'button'
| 'spinbutton'
| 'checkbox'
| 'link'
| 'combobox'
| 'option';

export class SelectorEngine {

static build(page: Page, label: string): Locator {

  const role = this.detectRole(label);

  // 🔥 PRIORIDAD 1: ROLE (si aplica)
  if (role) {
    return page
      .getByRole(role as any, { name: label })
      .or(page.getByLabel(label))
      .or(page.getByPlaceholder(label))
      .or(page.getByText(label))
      .first(); // 🔥 evita strict mode
  }

  // 🔥 PRIORIDAD 2: CONTEXT-AWARE (MENÚS, LINKS, BOTONES)
  return page
    .getByRole('button', { name: label })
    .or(page.getByRole('link', { name: label }))
    .or(page.locator(`nav >> text=${label}`)) // 🔥 CONTEXTO MENÚ
    .or(page.getByLabel(label))
    .or(page.getByPlaceholder(label))
    .or(page.getByText(label))
    .first(); // 🔥 CRÍTICO
}

  // 🧠 IA básica (puedes evolucionarla luego)
  private static detectRole(label: string): RoleType | null {

    const normalized = label.toLowerCase();

    // 🔥 INPUTS
    if (normalized.includes('usuario') ||
        normalized.includes('email') ||
        normalized.includes('contraseña') ||
        normalized.includes('password')) {
      return 'textbox';
    }

    // 🔥 BOTONES
    if (normalized.includes('ingresar') ||
        normalized.includes('login') ||
        normalized.includes('confirmar') ||
        normalized.includes('transferir') ||
        normalized.includes('salir')) {
      return 'button';
    }

    // 🔥 NUMÉRICOS
    if (normalized.includes('monto') ||
        normalized.includes('valor')) {
      return 'spinbutton';
    }

    // 🔥 CHECKBOX
    if (normalized.includes('recordarme')) {
      return 'checkbox';
    }

    return null;
  }
}