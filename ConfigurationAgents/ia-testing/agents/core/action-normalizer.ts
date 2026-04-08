import { Action } from '../../types/action.types';

export function normalizeActions(rawActions: any[]): Action[] {

  return rawActions.map((a: any) => {

    // 🔥 Detectar selector desde múltiples fuentes
    const selector =
      a.selector ||
      a.locator ||
      (Array.isArray(a.selectors) ? a.selectors[0] : undefined) ||
      a.target ||
      '';

    return {
      type: a.type || a.action,
      target: a.target || a.name || 'elemento',
      value: a.value || a.text || '',
      selector: selector,
      raw: a
    };
  });
}