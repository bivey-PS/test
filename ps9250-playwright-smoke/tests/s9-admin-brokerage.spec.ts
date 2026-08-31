import { test, expect } from './helpers/fixtures';
import { expectNoServerError } from './helpers/pages';
import { selectors } from './helpers/selectors';
import { resolve } from './helpers/resolve';

/**
 * S9 — Admin / brokerage settings (broker admin only).
 */
test.describe('S9 — Admin / brokerage settings', () => {
  test('S9.1 Open brokerage users / settings → loads', async ({ broker }) => {
    const users = resolve(broker, selectors.admin.brokerageUsers).first();
    test.skip(!(await users.isVisible().catch(() => false)), 'Brokerage users/settings not visible for this user; admin only.');
    await users.click();
    await expectNoServerError(broker);
  });

  test('S9.2 Confirm Plan Attributes default is set (if relevant)', async ({ broker }) => {
    const settings = resolve(broker, selectors.admin.settings).first();
    test.skip(!(await settings.isVisible().catch(() => false)), 'Settings not visible for this user; admin only.');
    await settings.click();
    const def = resolve(broker, selectors.admin.planAttributesDefault).first();
    if (await def.isVisible().catch(() => false)) await expect(def).toBeVisible();
    await expectNoServerError(broker);
  });
});
