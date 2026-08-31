import { test, expect } from './helpers/fixtures';
import { env, hasBrokerCreds } from './helpers/env';
import { LoginPage, AppShell, expectNoServerError } from './helpers/pages';
import { selectors } from './helpers/selectors';
import { resolve } from './helpers/resolve';

test.describe('S1 — Auth / shell', () => {
  test('S1.1 login page loads (no 500; form visible)', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await expectNoServerError(page);
    await login.expectLoginFormVisible();
  });

  test('S1.2 valid broker login lands in app', { tag: '@min-gate' }, async ({ broker }) => {
    await new AppShell(broker).expectInApp();
  });

  test('S1.3 main nav loads (Groups / RFPs / Templates reachable)', async ({ broker }) => {
    const shell = new AppShell(broker);
    await expect(resolve(broker, selectors.shell.navGroups).first()).toBeVisible();
    await expect(resolve(broker, selectors.shell.navRfps).first()).toBeVisible();
    await expect(resolve(broker, selectors.shell.navTemplates).first()).toBeVisible();
    await shell.expectNavReachable();
  });

  test('S1.4 logout / re-login clears and restores session', async ({ page }) => {
    test.skip(!hasBrokerCreds(), 'Set BROKER_EMAIL and BROKER_PASSWORD to run.');
    const login = new LoginPage(page);
    const shell = new AppShell(page);

    await login.goto();
    await login.login(env.broker.email, env.broker.password);
    await shell.expectInApp();

    await shell.logout();
    await login.expectLoginFormVisible();

    await login.login(env.broker.email, env.broker.password);
    await shell.expectInApp();
  });
});
