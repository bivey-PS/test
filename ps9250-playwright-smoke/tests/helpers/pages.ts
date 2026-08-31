import { Page, expect } from '@playwright/test';
import { selectors } from './selectors';
import { resolve } from './resolve';
import { env } from './env';

/**
 * Lightweight page objects. Each method maps to a PS-9250 smoke step.
 * Where the real DOM is unknown, methods use resilient locators from
 * selectors.ts and are marked with TODO for the reviewer to confirm.
 */

function appHostname(): string {
  try {
    return new URL(env.baseUrl).hostname.toLowerCase();
  } catch {
    return 'test.plansight.com';
  }
}

/** True when the page is on the configured Plansight app host (not Auth0). */
export function isOnAppHost(page: Page): boolean {
  try {
    return new URL(page.url()).hostname.toLowerCase() === appHostname();
  } catch {
    return false;
  }
}

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
   * Does not complete MFA; callers must assert app landing via AppShell.expectInApp.
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
    // Prefer returning to the app host over networkidle alone (Auth0 can sit
    // idle on MFA / error pages that still satisfy networkidle).
    await this.page
      .waitForURL((url) => url.hostname.toLowerCase() === appHostname(), {
        timeout: 45_000,
      })
      .catch(() => {});
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }
}

export class AppShell {
  constructor(private page: Page) {}

  async expectInApp() {
    // Fail closed: bare `nav` can appear on Auth0 / intermediate pages.
    // Require the configured app host + a Plansight shell landmark (Groups).
    await expect
      .poll(() => isOnAppHost(this.page), { timeout: 45_000 })
      .toBe(true);
    await expect(resolve(this.page, selectors.shell.navGroups).first()).toBeVisible({
      timeout: 45_000,
    });
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

  /**
   * Open a named employer group (S2.2).
   * Requires a non-empty name — opening "first row" silently mutates / verifies
   * the wrong employer when EXISTING_GROUP_NAME / RFP_GROUP_NAME are unset.
   */
  async openGroup(name: string) {
    const trimmed = (name || '').trim();
    if (!trimmed) {
      throw new Error(
        'EXISTING_GROUP_NAME / RFP_GROUP_NAME must be set to an exact employer name; refusing to open the first list row.',
      );
    }
    await resolve(this.page, selectors.groups.groupLinkByName(trimmed)).first().click();
    await this.page.waitForLoadState('networkidle');
  }

  async expectGroupHomeLoaded() {
    // Sane load: no obvious error page; a group landmark is visible.
    await expect(resolve(this.page, selectors.groups.groupHome).first()).toBeVisible();
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
