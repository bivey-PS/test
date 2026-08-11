import { type Page, type Locator } from '@playwright/test';

export class PlaywrightHomePage {
  readonly page: Page;
  readonly getStartedLink: Locator;
  readonly docsLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.getStartedLink = page.getByRole('link', { name: 'Get started' });
    this.docsLink = page.getByRole('link', { name: 'Docs' }).first();
  }

  async goto() {
    await this.page.goto('/');
  }

  async openDocs() {
    await this.docsLink.click();
  }
}
