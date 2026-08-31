import { test as base, Page } from '@playwright/test';
import { env, hasBrokerCreds, hasCarrierCreds } from './env';
import { LoginPage, AppShell } from './pages';

/**
 * Custom fixtures.
 *
 * `broker` / `carrier` yield an authenticated page. When credentials are not
 * configured, the dependent test is skipped (rather than failing) so the suite
 * can be listed and partially run without secrets.
 */
type Fixtures = {
  broker: Page;
  carrier: Page;
};

export const test = base.extend<Fixtures>({
  broker: async ({ page }, use) => {
    test.skip(!hasBrokerCreds(), 'Set BROKER_EMAIL and BROKER_PASSWORD to run broker flows.');
    const login = new LoginPage(page);
    await login.goto();
    await login.login(env.broker.email, env.broker.password);
    await new AppShell(page).expectInApp();
    await use(page);
  },

  carrier: async ({ page }, use) => {
    test.skip(!hasCarrierCreds(), 'Set CARRIER_EMAIL and CARRIER_PASSWORD to run carrier flows.');
    const login = new LoginPage(page);
    await login.goto();
    await login.login(env.carrier.email, env.carrier.password);
    await use(page);
  },
});

export { expect } from '@playwright/test';
