import { Page, Locator } from '@playwright/test';

export class HeaderComponent {

  readonly page: Page;
  readonly logoutBtn: Locator;

  constructor(page: Page) {
    this.page = page;
    this.logoutBtn = page.getByRole('button', { name: 'Logout' });
  }

  async logout() {
    await this.logoutBtn.click();
  }
}
