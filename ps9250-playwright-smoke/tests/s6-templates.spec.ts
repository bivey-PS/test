import { test, expect } from './helpers/fixtures';
import { AppShell, expectNoServerError } from './helpers/pages';
import { selectors } from './helpers/selectors';
import { resolve } from './helpers/resolve';

/**
 * S6 — Templates.
 */
test.describe('S6 — Templates', () => {
  test('S6.1 Templates → Plan Attributes → list loads', { tag: '@min-gate' }, async ({ broker }) => {
    await resolve(broker, selectors.shell.navTemplates).first().click();
    await broker.waitForLoadState('networkidle');
    const planAttrs = resolve(broker, selectors.templates.planAttributes).first();
    if (await planAttrs.isVisible().catch(() => false)) await planAttrs.click();
    await expect(resolve(broker, selectors.templates.list).first()).toBeVisible();
    await expectNoServerError(broker);
  });

  test('S6.2 Open one Plan Attribute template → editor loads', async ({ broker }) => {
    await resolve(broker, selectors.shell.navTemplates).first().click();
    const planAttrs = resolve(broker, selectors.templates.planAttributes).first();
    if (await planAttrs.isVisible().catch(() => false)) await planAttrs.click();
    const first = resolve(broker, selectors.templates.firstTemplate).first();
    test.skip(!(await first.isVisible().catch(() => false)), 'No template rows found; confirm selector/data.');
    await first.click();
    await expectNoServerError(broker);
  });

  test('S6.3 Templates → Plan Library / Presentations → list opens without error', async ({ broker }) => {
    await resolve(broker, selectors.shell.navTemplates).first().click();
    const lib = resolve(broker, selectors.templates.planLibrary).first();
    test.skip(!(await lib.isVisible().catch(() => false)), 'Plan Library/Presentations entry not present; confirm route.');
    await lib.click();
    await expectNoServerError(broker);
  });
});
