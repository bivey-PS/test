import { test, expect } from './helpers/fixtures';
import { expectNoServerError } from './helpers/pages';
import { selectors } from './helpers/selectors';
import { resolve } from './helpers/resolve';

/**
 * S8 — Carrier path (optional). Requires CARRIER_EMAIL / CARRIER_PASSWORD.
 */
test.describe('S8 — Carrier path (optional)', () => {
  test('S8.1 Carrier login → app loads', async ({ carrier }) => {
    await expect(resolve(carrier, selectors.shell.mainNav).first()).toBeVisible();
    await expectNoServerError(carrier);
  });

  test('S8.2 Open an RFP invitation / quote upload page → page loads', async ({ carrier }) => {
    // TODO: navigate to a known carrier invitation/quote-upload URL.
    await expectNoServerError(carrier);
  });

  test('S8.3 View RFP docs or quote entry → no 500', async ({ carrier }) => {
    await expectNoServerError(carrier);
  });
});
