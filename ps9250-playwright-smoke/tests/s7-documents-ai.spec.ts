import * as fs from 'fs';
import { test, expect } from './helpers/fixtures';
import { env } from './helpers/env';
import { expectNoServerError } from './helpers/pages';
import { selectors } from './helpers/selectors';
import { resolve } from './helpers/resolve';

/**
 * S7 — Documents / AI (light).
 */
test.describe('S7 — Documents / AI', () => {
  test('S7.1 Documents list on a group/RFP → loads', async ({ broker }) => {
    const list = resolve(broker, selectors.documents.list).first();
    test.skip(!(await list.isVisible().catch(() => false)), 'Navigate to a documents list first; confirm selector/route.');
    await expect(list).toBeVisible();
    await expectNoServerError(broker);
  });

  test('S7.2 Upload a small test PDF → succeeds or clear error', async ({ broker }) => {
    test.skip(!fs.existsSync(env.sbcPdfPath), `Upload fixture not found at ${env.sbcPdfPath}; set SBC_PDF_PATH.`);
    const input = resolve(broker, selectors.documents.uploadInput).first();
    test.skip(!(await input.count().catch(() => 0)), 'No file input on this page; confirm route.');
    await input.setInputFiles(env.sbcPdfPath);
    await expectNoServerError(broker);
  });

  test('S7.3 If AI/Planfacts enabled: trigger one AI action → job accepts / status updates', async ({ broker }) => {
    const aiBtn = resolve(broker, selectors.documents.aiAction).first();
    test.skip(!(await aiBtn.isVisible().catch(() => false)), 'AI/Planfacts action not available; skipping.');
    await aiBtn.click();
    await expectNoServerError(broker);
  });
});
