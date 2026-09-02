import { Page, expect } from '@playwright/test';
import { selectors } from './selectors';
import { resolve } from './resolve';
import { env } from './env';

/**
 * Lightweight page objects. Each method maps to a PS-9250 smoke step.
 * Where the real DOM is unknown, methods use resilient locators from
 * selectors.ts and are marked with TODO for the reviewer to confirm.
 */

export class LoginPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/');
  }

  async expectLoginFormVisible() {
    // S1.1 — login page loads, no 500, email/identifier field visible
    await expect(resolve(this.page, selectors.login.email).first()).toBeVisible();
  }

  /**
   * Handles Plansight's email-first, two-step login:
   *   Email address -> Continue -> Password -> submit.
   * Also tolerates a single-page form (fills password if already present).
   */
  async login(email: string, password: string) {
    await resolve(this.page, selectors.login.email).first().fill(email);

    const passwordField = resolve(this.page, selectors.login.password).first();
    if (!(await passwordField.isVisible().catch(() => false))) {
      // Two-step: advance past the email step.
      await resolve(this.page, selectors.login.continueButton).first().click();
      await passwordField.waitFor({ state: 'visible', timeout: 20_000 });
    }

    await passwordField.fill(password);
    await resolve(this.page, selectors.login.submit).first().click();
    await this.page.waitForLoadState('networkidle');
  }
}

export class AppShell {
  constructor(private page: Page) {}

  async expectInApp() {
    // Landed in app when main navigation is present
    await expect(resolve(this.page, selectors.shell.mainNav).first()).toBeVisible();
  }

  async expectNavReachable() {
    await expect(resolve(this.page, selectors.shell.navGroups).first()).toBeVisible();
  }

  async gotoGroups() {
    await resolve(this.page, selectors.shell.navGroups).first().click();
    await this.page.waitForLoadState('networkidle');
  }

  async logout() {
    const userMenu = resolve(this.page, selectors.shell.userMenu).first();
    if (await userMenu.isVisible().catch(() => false)) {
      await userMenu.click();
    }
    await resolve(this.page, selectors.shell.logout).first().click();
    await this.page.waitForLoadState('networkidle');
  }
}

export class GroupsPage {
  constructor(private page: Page) {}

  async expectListLoaded() {
    await expect(resolve(this.page, selectors.groups.list).first()).toBeVisible();
  }

  /** Open a named group, or the first available row if name is empty (S2.2). */
  async openGroup(name: string) {
    if (name) {
      await resolve(this.page, selectors.groups.groupLinkByName(name)).first().click();
    } else {
      await resolve(this.page, selectors.groups.anyRow).first().click();
    }
    await this.page.waitForLoadState('networkidle');
  }

  async expectGroupHomeLoaded() {
    // Sane load: no obvious error page; a group landmark is visible.
    await expect(resolve(this.page, selectors.groups.groupHome).first()).toBeVisible();
  }
}

/**
 * PS-9410 — Create an Employer.
 * Reuses the shared resolver/selectors; locators are placeholders to confirm
 * live via `npm run codegen`.
 */
export class EmployerCreatePage {
  constructor(private page: Page) {}

  /** Open the create-employer form from the Groups/Employers area. */
  async gotoCreate() {
    await resolve(this.page, selectors.shell.navGroups).first().click();
    await this.page.waitForLoadState('networkidle');
    await resolve(this.page, selectors.employerCreate.createButton).first().click();
    await this.page.waitForLoadState('networkidle');
  }

  async expectFormVisible() {
    await expect(resolve(this.page, selectors.employerCreate.form).first()).toBeVisible();
  }

  /** Fill required fields. Optional fields are filled only if present/configured. */
  async fillRequired(name: string) {
    await resolve(this.page, selectors.employerCreate.nameInput).first().fill(name);

    const effective = resolve(this.page, selectors.employerCreate.effectiveDate).first();
    if (await effective.isVisible().catch(() => false)) {
      // TODO: confirm the date format/control the real form expects.
      await effective.fill('01/01/2027').catch(() => {});
    }

    const situs = resolve(this.page, selectors.employerCreate.situsState).first();
    if (await situs.isVisible().catch(() => false)) {
      await situs.fill(env.employer.situsState).catch(() => {});
    }

    const contactName = resolve(this.page, selectors.employerCreate.contactName).first();
    if (await contactName.isVisible().catch(() => false)) {
      await contactName.fill(env.employer.contactName).catch(() => {});
    }

    const contactEmail = resolve(this.page, selectors.employerCreate.contactEmail).first();
    if (await contactEmail.isVisible().catch(() => false)) {
      await contactEmail.fill(env.employer.contactEmail).catch(() => {});
    }
  }

  async save() {
    await resolve(this.page, selectors.employerCreate.save).first().click();
    await this.page.waitForLoadState('networkidle');
  }

  async submitEmpty() {
    await resolve(this.page, selectors.employerCreate.save).first().click();
  }

  validationError() {
    return resolve(this.page, selectors.employerCreate.validationError).first();
  }
}

/** Utility: assert the current page did not render a server error. */
export async function expectNoServerError(page: Page) {
  const body = (await page.locator('body').innerText().catch(() => '')) || '';
  expect(body).not.toMatch(/500 (internal )?server error|whoops, something went wrong/i);
}

/** Utility: collect hard JS console errors for stability checks (S10.1). */
export function trackConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(String(err)));
  return errors;
}

export const testRfpPrefix = env.testRfpPrefix;
