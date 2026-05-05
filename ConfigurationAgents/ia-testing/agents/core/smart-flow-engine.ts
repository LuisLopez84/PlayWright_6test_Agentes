import { Action } from '../../types/action.types';

// ─── Types (Risk 8) ───────────────────────────────────────────────────────────

export interface EnhancedStep {
  action: string;
  target?: string;
  value?: string;
  url?: string;
  [key: string]: unknown;
}

// ─── Keywords / Sets ──────────────────────────────────────────────────────────

// Risk 3: keywords multilingüe ES / EN / PT / FR / DE
const CONFIRMATION_KEYWORDS = [
  'confirmar', 'confirm',
  'aceptar', 'accept',
  'ok',
  'submit', 'enviar', 'send',
  'yes', 'sí', 'si',
  'confirmer', 'bestätigen',   // FR / DE
  'confirmar', 'sim',          // PT
];

// Risk 4: etiquetas que son botones de acción, no ítems de menú
const BUTTON_LABELS = new Set([
  'ingresar', 'login', 'sign in',
  'confirmar', 'confirm', 'aceptar', 'accept', 'ok',
  'guardar', 'save', 'enviar', 'send', 'submit',
  'continuar', 'continue', 'siguiente', 'next',
  'anterior', 'back', 'salir', 'logout', 'cerrar sesión',
  'registrar', 'register', 'crear', 'create',
  'agregar', 'add', 'pagar', 'pay', 'comprar', 'buy',
  'aplicar', 'apply',
]);

// Risk 6: conjunto completo de acciones de formulario según Playwright recorder
const FORM_ACTIONS = new Set([
  'input', 'select', 'fill', 'type', 'check', 'upload', 'setInputFiles',
]);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isNavigationStep(step: Action, prev: Action | undefined): boolean {
  const a = step.action ?? '';
  return a === 'page_load' || a === 'goto' ||
    (!prev && a === 'click');
}

function isConfirmation(step: Action): boolean {
  const target = (step.target ?? '').toLowerCase();
  return CONFIRMATION_KEYWORDS.some(k => target.includes(k));
}

// Risk 4: reemplaza heurística length < 30 por conteo de palabras + exclusión de botones
function isMenuClick(step: Action): boolean {
  const a = step.action ?? '';
  if (a !== 'click') return false;
  if (!step.target) return false;
  const lower = step.target.toLowerCase().trim();
  if (BUTTON_LABELS.has(lower)) return false;
  if (isConfirmation(step)) return false;
  // Ítems de menú: etiqueta corta (1-4 palabras), sin estructura de oración
  const wordCount = lower.split(/\s+/).length;
  return wordCount >= 1 && wordCount <= 4;
}

function isFormStep(step: Action): boolean {
  const a = step.action ?? '';
  return FORM_ACTIONS.has(a);
}

// ─── Export ───────────────────────────────────────────────────────────────────

/**
 * Enriquece los pasos parseados con semántica de flujo:
 * context_change | confirm | navigate_section | form fields | fallback.
 *
 * Risk 1 & 5: cadena if/else if/else garantiza exactamente UNA entrada por step.
 */
export function enhanceFlow(steps: Action[]): EnhancedStep[] {
  const result: EnhancedStep[] = [];

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const prev = steps[i - 1];

    if (isNavigationStep(step, prev)) {
      result.push({
        action: 'context_change',
        target: step.target ?? step.url,
      });
    } else if (isConfirmation(step)) {
      result.push({
        action: 'confirm',
        target: step.target,
      });
    } else if (isMenuClick(step)) {
      result.push({
        action: 'navigate_section',
        target: step.target,
      });
    } else if (isFormStep(step)) {
      result.push({
        action: step.action ?? '',
        target: step.target,
        value:  step.value,
      });
    } else {
      result.push({ ...step } as EnhancedStep);
    }
  }

  return result;
}
