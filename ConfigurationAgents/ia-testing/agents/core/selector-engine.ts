/**
 * selector-engine.ts
 *
 * Construcción inteligente de locators a partir de etiquetas de texto.
 * Detecta el rol semántico del elemento y genera variantes de búsqueda.
 * Transversal: aplica para cualquier webapp en español/inglés.
 */
import { Page, Locator } from '@playwright/test';
import { generateTextVariants } from './healer-agents';

type RoleType = 'textbox' | 'button' | 'spinbutton' | 'checkbox' | 'link' | 'combobox' | 'option';

// Palabras clave para detección semántica de roles
const ROLE_KEYWORDS: Record<RoleType, string[]> = {
  textbox: [
    'usuario', 'user', 'email', 'correo', 'contraseña', 'password', 'pass',
    'nombre', 'name', 'apellido', 'last name', 'dirección', 'address',
    'teléfono', 'phone', 'móvil', 'celular', 'buscar', 'search', 'comentario',
    'descripción', 'texto', 'mensaje', 'message',
  ],
  button: [
    'ingresar', 'login', 'sign in', 'confirmar', 'confirm', 'aceptar', 'accept',
    'guardar', 'save', 'enviar', 'send', 'submit', 'continuar', 'continue',
    'siguiente', 'next', 'anterior', 'back', 'salir', 'logout', 'cerrar sesión',
    'registrar', 'register', 'crear', 'create', 'agregar', 'add', 'transferir',
    'pagar', 'pay', 'comprar', 'buy', 'ok', 'aplicar', 'apply',
  ],
  spinbutton: [
    'monto', 'valor', 'amount', 'precio', 'price', 'cantidad', 'quantity',
    'total', 'número', 'number', 'edad', 'age',
  ],
  checkbox: [
    'recordarme', 'remember', 'acepto', 'accept', 'términos', 'terms',
    'condiciones', 'conditions', 'activo', 'active', 'habilitado', 'enabled',
  ],
  link: [
    'inicio de sesión', 'iniciar sesión', 'log in', 'bienvenido',
    'olvidé', 'forgot', 'recuperar', 'recover', 'ver más', 'see more',
    'leer más', 'read more', 'aquí', 'here', 'haga clic', 'click here',
  ],
  combobox: [
    'selecciona', 'select', 'elige', 'choose', 'tipo', 'type', 'categoría',
    'category', 'estado', 'status', 'país', 'country', 'ciudad', 'city',
  ],
  option: [],
};

function detectRole(label: string): RoleType | null {
  const lower = label.toLowerCase();
  for (const [role, keywords] of Object.entries(ROLE_KEYWORDS)) {
    if (keywords.some(k => lower.includes(k))) {
      return role as RoleType;
    }
  }
  return null;
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export class SelectorEngine {

  /**
   * Construye un locator compuesto con múltiples estrategias y variantes de texto.
   * Usado por smart-actions como último fallback cuando los selectores primarios fallan.
   */
  static build(page: Page, label: string): Locator {
    const role = detectRole(label);
    const variants = generateTextVariants(label);

    // ── Estrategia base: por rol detectado ──
    if (role) {
      let loc = page.getByRole(role as any, { name: label })
        .or(page.getByRole(role as any, { name: new RegExp(escapeRegex(label), 'i') }))
        .or(page.getByLabel(label))
        .or(page.getByPlaceholder(label))
        .or(page.getByText(label, { exact: false }));

      // Añadir variantes
      for (const variant of variants.slice(0, 6)) {
        loc = loc
          .or(page.getByRole(role as any, { name: new RegExp(escapeRegex(variant), 'i') }))
          .or(page.getByText(variant, { exact: false }));
      }
      return loc.first();
    }

    // ── Estrategia genérica: todos los roles clickeables ──
    let loc = page.getByRole('button', { name: label })
      .or(page.getByRole('link', { name: label }))
      .or(page.locator(`nav >> text=${label}`))
      .or(page.getByLabel(label))
      .or(page.getByPlaceholder(label))
      .or(page.getByText(label, { exact: false }));

    // Añadir variantes de texto al OR chain
    for (const variant of variants.slice(0, 8)) {
      loc = loc
        .or(page.getByRole('link', { name: new RegExp(escapeRegex(variant), 'i') }))
        .or(page.getByRole('button', { name: new RegExp(escapeRegex(variant), 'i') }))
        .or(page.getByText(variant, { exact: false }));
    }

    return loc.first();
  }
}
