import { test, expect } from './helpers/fixtures';
import { AppShell, trackConsoleErrors, expectNoServerError } from './helpers/pages';
import { selectors } from './helpers/selectors';
import { resolve } from './helpers/resolve';

/**
 * S10 — Stability checks.
 */
test.describe('S10 — Stability checks', () => {
  test('S10.1 No flood of hard JS errors on main pages', async ({ broker }) => {
    const errors = trackConsoleErrors(broker);
    const shell = new AppShell(broker);
    await shell.gotoGroups();
    await broker.waitForLoadState('networkidle');
    await resolve(broker, selectors.shell.navTemplates).first().click().catch(() => {});
    await broker.waitForLoadState('networkidle');
    // Allow a small number of benign errors, fail on a flood.
    expect(errors.length, `Console errors:\n${errors.join('\n')}`).toBeLessThan(10);
  });

  // S10.2 requires stage worker log access, not reachable from the browser.
  test.fixme('S10.2 Stage worker logs show no new job crash for the test RFP', async () => {
    // Manual/out-of-band: inspect stage-worker logs after S3 send. Not automatable here.
  });

  test('S10.3 Deep links (refresh mid-flow) → no blank white screen', async ({ broker }) => {
    const shell = new AppShell(broker);
    await shell.gotoGroups();
    const url = broker.url();
    await broker.reload();
    await broker.waitForLoadState('networkidle');
    await expectNoServerError(broker);
    // A blank screen would have an effectively empty body.
    const text = (await broker.locator('body').innerText().catch(() => '')) || '';
    expect(text.trim().length, `Deep link ${url} rendered blank`).toBeGreaterThan(0);
  });
});
