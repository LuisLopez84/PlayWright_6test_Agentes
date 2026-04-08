export function normalizeSelector(raw: string): string {

  if (!raw) return '';

  let selector = raw.trim();

  // 🔥 eliminar "page." basura
  selector = selector.replace(/page\./g, '');

  // 🔥 CASO 1: getByText('xxx')
  const textMatch = selector.match(/getByText\(['"`](.*?)['"`]\)/);
  if (textMatch) return textMatch[1];

  // 🔥 CASO 2: getByRole('button', { name: 'Ingresar' })
  const roleMatch = selector.match(/name:\s*['"`](.*?)['"`]/);
  if (roleMatch) return roleMatch[1];

  // 🔥 CASO 3: getByLabel
  const labelMatch = selector.match(/getByLabel\(['"`](.*?)['"`]\)/);
  if (labelMatch) return labelMatch[1];

  // 🔥 CASO 4: getByPlaceholder
  const placeholderMatch = selector.match(/getByPlaceholder\(['"`](.*?)['"`]\)/);
  if (placeholderMatch) return placeholderMatch[1];

  // 🔥 CASO 5: CSS / XPath
  if (
    selector.startsWith('#') ||
    selector.startsWith('.') ||
    selector.startsWith('//') ||
    selector.startsWith('[')
  ) {
    return selector;
  }

  // 🔥 limpiar basura restante
  return selector
    .replace(/getBy.*?\(/g, '')
    .replace(/\)/g, '')
    .replace(/['"`]/g, '')
    .trim();
}