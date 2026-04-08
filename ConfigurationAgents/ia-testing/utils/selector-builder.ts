export function buildPlaywrightSelector(locator: any): string {

  if (!locator) return '';

  switch (locator.type) {

    case 'role':
      return `page.getByRole('${locator.role}', { name: '${locator.name}' })`;

    case 'text':
      return `page.getByText('${locator.text}')`;

    case 'css':
      return `page.locator('${locator.selector}')`;

    default:
      return '';
  }
}