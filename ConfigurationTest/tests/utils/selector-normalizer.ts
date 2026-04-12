/**
 * selector-normalizer.ts
 *
 * Convierte cualquier selector generado por el parser (getByRole, getByLabel,
 * locator, etc.) en la "etiqueta de texto" que smart-actions puede usar para
 * localizar el elemento con sus estrategias internas.
 *
 * Transversal: soporta todos los patrones que Playwright Codegen puede generar.
 */
export function normalizeSelector(raw: string): string {
  if (!raw) return '';

  let selector = raw.trim();

  // 🔥 Eliminar prefijo "page."
  selector = selector.replace(/^page\./, '');

  // 🔥 CASO 1: getByText('xxx')
  const textMatch = selector.match(/getByText\(['"`](.*?)['"`]\)/);
  if (textMatch) return textMatch[1];

  // 🔥 CASO 2: getByRole(..., { name: 'xxx' }) → extrae el name
  const nameMatch = selector.match(/name:\s*['"`](.*?)['"`]/);
  if (nameMatch) return nameMatch[1];

  // 🔥 CASO 3: getByLabel('xxx')
  const labelMatch = selector.match(/getByLabel\(['"`](.*?)['"`]\)/);
  if (labelMatch) return labelMatch[1];

  // 🔥 CASO 4: getByPlaceholder('xxx')
  const placeholderMatch = selector.match(/getByPlaceholder\(['"`](.*?)['"`]\)/);
  if (placeholderMatch) return placeholderMatch[1];

  // 🔥 CASO 5: getByTestId('xxx')
  const testIdMatch = selector.match(/getByTestId\(['"`](.*?)['"`]\)/);
  if (testIdMatch) return testIdMatch[1];

  // 🔥 CASO 6: getByAltText('xxx')
  const altTextMatch = selector.match(/getByAltText\(['"`](.*?)['"`]\)/);
  if (altTextMatch) return altTextMatch[1];

  // 🔥 CASO 7: getByTitle('xxx')
  const titleMatch = selector.match(/getByTitle\(['"`](.*?)['"`]\)/);
  if (titleMatch) return titleMatch[1];

  // 🔥 CASO 8: locator('selector') — extrae el CSS selector interno
  // Ejemplos: locator('#permanentAddress'), locator('.rc-tree-switcher')
  // Preserva modificadores .first() / .nth(n) como sufijos separados
  const locatorMatch = selector.match(/^locator\(['"`](.*?)['"`]\)/);
  if (locatorMatch) return locatorMatch[1]; // devuelve el CSS puro

  // 🔥 CASO 9: CSS / XPath directo (empieza por #, ., //, [, o tag conocido)
  if (
    selector.startsWith('#') ||
    selector.startsWith('.') ||
    selector.startsWith('//') ||
    selector.startsWith('[') ||
    /^(input|textarea|select|button|a|div|span|form|table|ul|li|nav|header|section)\b/.test(selector)
  ) {
    return selector;
  }

  // 🔥 CASO 10: getByRole('list').getByText('xxx') → extrae el texto
  const listTextMatch = selector.match(/getByRole\(['"`]list['"`]\)\.getByText\(['"`](.*?)['"`]\)/);
  if (listTextMatch) return listTextMatch[1];

  // 🔥 CASO 11: getByRole('listitem').filter({ hasText: 'xxx' }) → extrae el texto
  const listitemFilterMatch = selector.match(/getByRole\(['"`]listitem['"`]\)\.filter\(\{\s*hasText:\s*['"`](.*?)['"`]\s*\}\)/);
  if (listitemFilterMatch) return listitemFilterMatch[1];

  // 🔥 CASO 12: .filter({ hasText: 'xxx' }) genérico → extrae el texto
  const filterHasTextMatch = selector.match(/\.filter\(\{\s*hasText:\s*['"`](.*?)['"`]\s*\}\)/);
  if (filterHasTextMatch) return filterHasTextMatch[1];

  // 🔥 Fallback: limpieza de basura residual
  return selector
    .replace(/getBy\w+\(/g, '')
    .replace(/\)/g, '')
    .replace(/['"`]/g, '')
    .trim();
}
