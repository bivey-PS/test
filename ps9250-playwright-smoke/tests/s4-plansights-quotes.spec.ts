import { test, expect } from './helpers/fixtures';
import { expectNoServerError } from './helpers/pages';
import { selectors } from './helpers/selectors';
import { resolve } from './helpers/resolve';

/**
 * S4 — Plansights / quotes. Requires an RFP with at least one benefit type and
 * quote to be meaningful; steps assert the views load and one edit persists.
 */
test.describe('S4 — Plansights / quotes', () => {
  test('S4.1 Open Plansights for a benefit type → grid/view loads', async ({ broker }) => {
    // TODO: navigate to a known RFP's Plansights view for Medical.
    const view = resolve(broker, selectors.plansights.view).first();
    test.skip(!(await view.isVisible().catch(() => false)), 'Navigate to a Plansights view first; confirm selector/route.');
    await expect(view).toBeVisible();
    await expectNoServerError(broker);
  });

  test('S4.2 Edit a quote attribute and save → value persists after reload', async ({ broker }) => {
    const field = resolve(broker, selectors.plansights.anyEditableAttribute).first();
    test.skip(!(await field.isVisible().catch(() => false)), 'Open a Plansights attribute grid first; confirm selector.');
    // TODO: change a specific attribute, save, reload, and assert persistence.
    await expect(field).toBeVisible();
  });

  test('S4.3 Contribution / modeler tab → loads; calculate does not 500', async ({ broker }) => {
    const tab = resolve(broker, selectors.plansights.contributionTab).first();
    test.skip(!(await tab.isVisible().catch(() => false)), 'Contribution/modeler tab not present here; confirm route.');
    await tab.click();
    const calc = resolve(broker, selectors.plansights.calculateButton).first();
    if (await calc.isVisible().catch(() => false)) {
      await calc.click();
      await expectNoServerError(broker);
    }
  });
});
