export function buildPlaywrightSelector(locator: any): string {
  if (!locator) return '';

  switch (locator.type) {
    case 'role':
      return `page.getByRole('${locator.role}', { name: '${locator.name}' })`;

    case 'text':
      return `page.getByText('${locator.text}')`;

    case 'css':
      return `page.locator('${locator.selector}')`;

    // getByRole('list').getByText('...') — patrón de menú/sidebar en SPAs
    case 'list-text':
      return `page.getByRole('list').getByText('${locator.text}')`;

    default:
      return '';
  }
}
