import { Page, Locator } from '@playwright/test';
import { smartGoto } from '@utils/navigation-helper';

export class LoginPage {

  readonly page: Page;
  readonly accountInput: Locator;
  readonly pinInput: Locator;
  readonly loginButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.accountInput = page.getByLabel('Account Number');
    this.pinInput = page.getByLabel('PIN');
    this.loginButton = page.getByRole('button', { name: 'Login' });
  }

  async goto() {
  await smartGoto(this.page, 'GLOBAL');
}

  async login(account: string, pin: string) {
    await this.accountInput.fill(account);
    await this.pinInput.fill(pin);
    await this.loginButton.click();
  }
}
