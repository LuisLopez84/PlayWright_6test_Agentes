import { Action } from '../../types/action.types';

// Risk 2: order of preference for selectors — most robust strategies first
// data-testid > role > label > placeholder > css locator > text > raw target
const SELECTOR_PRIORITY = [
  'testid', 'data-testid',
  'role',
  'label',
  'placeholder',
  'text',
  'css',
];

function pickBestSelector(selectors: string[]): string {
  if (!selectors.length) return '';
  // Try to find the highest-priority strategy in the list
  for (const strategy of SELECTOR_PRIORITY) {
    const match = selectors.find(s => s.toLowerCase().includes(strategy));
    if (match) return match;
  }
  return selectors[0]; // fallback: first in list
}

export function normalizeActions(rawActions: any[]): Action[] {
  return rawActions.map((a: any) => {
    // Risk 2: pick the most robust selector instead of blindly taking selectors[0]
    const selector =
      a.selector ||
      a.locator ||
      (Array.isArray(a.selectors) && a.selectors.length ? pickBestSelector(a.selectors) : undefined) ||
      a.target ||
      '';

    // Risk 1: fallback to 'unknown' when neither type nor action is present,
    // so downstream agents always receive a non-undefined action string
    const action = a.action || a.type || 'unknown';
    if (action === 'unknown') {
      console.warn('[action-normalizer] Acción sin tipo detectada — se asigna "unknown". Raw:', a);
    }

    return {
      action,
      target:   a.target   || a.name || 'elemento',
      value:    a.value    || a.text || '',
      selector,
      raw: typeof a === 'object' && a !== null ? { ...a } : a, // Risk 3: shallow copy
    } satisfies Action;
  });
}
