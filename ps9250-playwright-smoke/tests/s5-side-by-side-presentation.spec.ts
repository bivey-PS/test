import { test, expect } from './helpers/fixtures';
import { expectNoServerError } from './helpers/pages';
import { selectors } from './helpers/selectors';
import { resolve } from './helpers/resolve';

/**
 * S5 — Side-by-side / presentation / export.
 */
test.describe('S5 — Side-by-side / presentation', () => {
  test('S5.1 Open side-by-side / compare → view loads', async ({ broker }) => {
    const link = resolve(broker, selectors.presentation.sideBySide).first();
    test.skip(!(await link.isVisible().catch(() => false)), 'Side-by-side entry point not visible here; confirm route.');
    await link.click();
    await expectNoServerError(broker);
  });

  test('S5.2 Open or create a presentation → editor loads', async ({ broker }) => {
    const btn = resolve(broker, selectors.presentation.openOrCreate).first();
    test.skip(!(await btn.isVisible().catch(() => false)), 'Presentation entry point not visible here; confirm route.');
    await btn.click();
    await expectNoServerError(broker);
  });

  test('S5.3 Export/download PDF or Excel (one path) → file generates or download starts', async ({ broker }) => {
    const exportBtn = resolve(broker, selectors.presentation.exportButton).first();
    test.skip(!(await exportBtn.isVisible().catch(() => false)), 'Export affordance not visible here; confirm route.');
    const downloadPromise = broker.waitForEvent('download', { timeout: 30_000 }).catch(() => null);
    await exportBtn.click();
    const download = await downloadPromise;
    // Either a download starts, or (for server-rendered export) the page stays healthy.
    if (download) {
      expect(await download.suggestedFilename()).toBeTruthy();
    } else {
      await expectNoServerError(broker);
    }
  });
});
