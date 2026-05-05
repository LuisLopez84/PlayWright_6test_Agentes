// Risk 3: unión discriminada — cada variante declara exactamente los campos que necesita
export type PlaywrightLocator =
  | { type: 'role';        role: string;        name: string }
  | { type: 'text';        text: string }
  | { type: 'css';         selector: string }
  | { type: 'list-text';   text: string }   // Risk 5: asume un único [role="list"] visible en la página
  | { type: 'label';       label: string }
  | { type: 'placeholder'; placeholder: string }
  | { type: 'testId';      testId: string }
  | { type: 'altText';     altText: string }
  | { type: 'title';       title: string };

// Escapa backslashes y comillas simples para interpolación en strings JS — Risk 2
function esc(s: string): string {
  return String(s ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

// Risk 1 + 6: cubre los mismos 9 casos que selector-normalizer.ts puede parsear
export function buildPlaywrightSelector(locator: PlaywrightLocator | null | undefined): string {
  if (!locator) return '';

  switch (locator.type) {
    case 'role':
      return `page.getByRole('${esc(locator.role)}', { name: '${esc(locator.name)}' })`;

    case 'text':
      return `page.getByText('${esc(locator.text)}')`;

    case 'css':
      return `page.locator('${esc(locator.selector)}')`;

    case 'list-text':
      // Risk 5 (by design): funciona cuando hay un único [role="list"] en el DOM.
      // En páginas con múltiples listas el parser debe proveer un selector css más específico.
      return `page.getByRole('list').getByText('${esc(locator.text)}')`;

    case 'label':
      return `page.getByLabel('${esc(locator.label)}')`;

    case 'placeholder':
      return `page.getByPlaceholder('${esc(locator.placeholder)}')`;

    case 'testId':
      return `page.getByTestId('${esc(locator.testId)}')`;

    case 'altText':
      return `page.getByAltText('${esc(locator.altText)}')`;

    case 'title':
      return `page.getByTitle('${esc(locator.title)}')`;

    default: {
      // Risk 4: ya corregido — nunca silencioso
      const unknown = (locator as { type: string }).type;
      console.warn(`[selector-builder] Tipo de locator desconocido: "${unknown}"`);
      return '';
    }
  }
}
