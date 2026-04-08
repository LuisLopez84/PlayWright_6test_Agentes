export function detectIntent(action: any): string {

  const label = (action.target || '').toLowerCase();
  const type = (action.type || '').toLowerCase();

  // 🔥 SELECT - PRIORIDAD ALTA
  if (type === 'select' || action.action === 'selectOption' || action.action === 'select') {
    return 'select_option';
  }

  // 🔥 LOGIN
  if (matches(label, ['user', 'usuario', 'email', 'login'])) return 'input_user';
  if (matches(label, ['password', 'contraseña', 'pass'])) return 'input_password';

  // 🔥 SUBMIT LOGIN
  if (matches(label, ['login', 'ingresar', 'sign in'])) return 'click_button';

  // 🔥 INPUTS
  if (action.type === 'fill' || action.type === 'input') return 'input_text';

  // 🔥 CLICK SIEMPRE ES CLICK
  if (action.type === 'click' || action.action === 'click') {
    return 'click_button';
  }

  // 🔥 SOLO ES NAVIGATE SI ES URL REAL
  if (
    action.action === 'goto' ||
    action.action === 'page_load' ||
    isRealUrl(action.target)
  ) {
    return 'navigate';
  }

  return 'generic';
}

// =========================
// HELPERS
// =========================

function matches(label: string, keywords: string[]): boolean {
  return keywords.some(k => label.includes(k));
}

function isRealUrl(target: string = ''): boolean {
  return (
    target.startsWith('http') ||
    target.startsWith('/') ||
    target.includes('.com') ||
    target.includes('localhost')
  );
}