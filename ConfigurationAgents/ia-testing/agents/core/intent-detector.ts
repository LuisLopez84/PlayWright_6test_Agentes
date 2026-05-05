import { Action } from '../../types/action.types';

export function detectIntent(action: Action | any): string {
  const label = (action.target || '').toLowerCase();
  const type  = (action.action || '').toLowerCase();

  // ── 1. SELECT ─────────────────────────────────────────────────────────────────
  if (type === 'select' || type === 'select_option' ||
      action.action === 'selectOption' || action.action === 'select') {
    return 'select_option';
  }

  // ── 2. CLICK — antes de cualquier check de label para evitar falsos positivos ─
  // Un botón con texto "login" es click_button, no input_user
  if (type === 'click' || action.action === 'click') {
    return 'click_button';
  }

  // ── 3. NAVEGACIÓN ─────────────────────────────────────────────────────────────
  if (type === 'goto' || type === 'page_load' ||
      action.action === 'goto' || action.action === 'page_load' ||
      isRealUrl(action.target)) {
    return 'navigate';
  }

  // ── 4. INPUTS con clasificación semántica ─────────────────────────────────────
  // Solo se evalúa label para acciones de escritura (fill / input / type)
  if (type === 'fill' || type === 'input' || type === 'type') {
    if (matchesWord(label, PASSWORD_KEYWORDS)) return 'input_password';
    if (matchesWord(label, USER_KEYWORDS))     return 'input_user';
    return 'input_text';
  }

  // ── 5. CHECKBOX / RADIO ───────────────────────────────────────────────────────
  if (type === 'check'   || action.action === 'check')   return 'check_checkbox';
  if (type === 'uncheck' || action.action === 'uncheck') return 'uncheck_checkbox';
  if (type === 'radio'   || action.action === 'radio')   return 'check_checkbox';

  // ── 6. UPLOAD ─────────────────────────────────────────────────────────────────
  if (type === 'upload' || action.action === 'upload' ||
      action.action === 'setInputFiles') {
    return 'upload_file';
  }

  // ── 7. HOVER ──────────────────────────────────────────────────────────────────
  if (type === 'hover' || action.action === 'hover') return 'hover_element';

  return 'generic';
}

// ─── Keywords ─────────────────────────────────────────────────────────────────

// Etiquetas de campos de contraseña — ES / EN / PT / FR
const PASSWORD_KEYWORDS = [
  'password', 'contraseña', 'pass', 'pwd',
  'senha', 'clave',                          // Português / ES alternativo
  'mot de passe', 'motdepasse',              // Français
];

// Etiquetas de campos de usuario — SE excluye "login" (es ambiguo: puede ser botón)
const USER_KEYWORDS = [
  'user', 'usuario', 'username', 'email', 'correo',
  'utilizador', 'nome', 'nombre',            // Português
  'utilisateur', 'identifiant',              // Français
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Verifica si algún keyword aparece como palabra completa en el label.
 * Usa word boundary para evitar falsos positivos ("compass" ≠ "pass").
 */
function matchesWord(label: string, keywords: string[]): boolean {
  return keywords.some(k => {
    const escaped = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(?:^|[^a-záéíóúàâãêôõüñ])${escaped}(?:[^a-záéíóúàâãêôõüñ]|$)`, 'i').test(label);
  });
}

/**
 * Detecta si el target es una URL real (incluye TLDs comunes de LATAM, EU y genéricos).
 */
function isRealUrl(target: string = ''): boolean {
  if (!target) return false;
  if (target.startsWith('http') || target.startsWith('/')) return true;
  if (target.includes('localhost')) return true;
  const TLDs = [
    '.com', '.net', '.org', '.io', '.co',
    '.ar', '.mx', '.es', '.pe', '.cl', '.br', '.uy', '.bo', '.ec',
    '.gov', '.edu', '.info', '.biz',
  ];
  return TLDs.some(tld => target.includes(tld));
}
