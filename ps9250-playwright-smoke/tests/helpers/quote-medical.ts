import * as path from 'path';
import { Page, expect } from '@playwright/test';
import { env } from './env';
import { selectors } from './selectors';
import { resolve } from './resolve';

/**
 * Helpers for Quote - Medical (S3.15) and the Medical quotes grid (S3.16).
 *
 * Clicking Save Changes alone is not enough: Save is visible before AI finishes,
 * the uploaded document must be selected to populate plan attributes, and the
 * quote view must be closed so assertions run on `#gridInit/medical` — not on
 * the create form, where carrier + filename text can false-PASS S3.16.
 */

/** True when the page is on the Medical quotes grid (post-close), not Quote create. */
export function isMedicalQuotesGridUrl(url: string): boolean {
  return /#gridInit\/medical\b/i.test(url);
}

/** Basename fragment used to pick the uploaded SBC in the document dropdown. */
export function quoteDocumentNameFragment(sbcPdfPath = env.sbcPdfPath): string {
  return path.basename(sbcPdfPath);
}

/**
 * Wait for Plansight AI processing, select the uploaded document, Save Changes,
 * and close back to the Medical quotes grid.
 */
export async function finishQuoteMedicalAndReturnToGrid(page: Page): Promise<void> {
  await page.getByText('Quote - Medical', { exact: true }).first().waitFor({
    state: 'visible',
    timeout: 60_000,
  });

  const completed = page.getByText(
    /Plansight processing completed\.?\s*Fill the quote using a source below\.?/i,
  );
  await completed.first().waitFor({ state: 'visible', timeout: 600_000 });

  const documentFragment = quoteDocumentNameFragment();
  const documentDropdown = resolve(page, selectors.quotes.documentDropdown).first();
  await documentDropdown.waitFor({ state: 'visible', timeout: 60_000 });
  await documentDropdown.scrollIntoViewIfNeeded();
  await documentDropdown.click();

  // Prefer an option match on the uploaded fixture basename.
  const option = page
    .locator('.select2-results__option')
    .filter({ hasText: documentFragment })
    .first();
  await option.waitFor({ state: 'visible', timeout: 30_000 });
  await option.click();

  await page.waitForFunction(
    (fragment) => {
      const selected = document
        .querySelector('#select2-documentSelect-container')
        ?.textContent?.trim();
      return Boolean(selected && selected.includes(fragment));
    },
    documentFragment,
    { timeout: 30_000 },
  );

  const fileNotFound = page.getByText('The selected file could not be found', { exact: true });
  if (await fileNotFound.isVisible().catch(() => false)) {
    throw new Error('Document preview failed: The selected file could not be found');
  }

  const save = resolve(page, selectors.quotes.saveChanges).first();
  await save.waitFor({ state: 'visible', timeout: 60_000 });
  await save.click();
  await page.waitForLoadState('networkidle').catch(() => {});

  await closeQuoteMedicalPage(page);

  await expect
    .poll(() => isMedicalQuotesGridUrl(page.url()), { timeout: 120_000 })
    .toBe(true);
}

async function closeQuoteMedicalPage(page: Page): Promise<void> {
  if (isMedicalQuotesGridUrl(page.url())) {
    return;
  }

  const quoteHeader = page.getByText('Quote - Medical', { exact: true }).first();
  const stillOpen = await quoteHeader.isVisible().catch(() => false);
  if (!stillOpen && isMedicalQuotesGridUrl(page.url())) {
    return;
  }

  const iconClose = page.locator('[data-icon="xmark"]:visible, [data-icon="times"]:visible').first();
  if ((await iconClose.count()) > 0) {
    const clickable = iconClose.locator('xpath=ancestor::button[1] | ancestor::a[1]').first();
    if ((await clickable.count()) > 0) {
      await clickable.click();
    } else {
      await iconClose.click({ force: true });
    }
  } else {
    const closeBtn = page
      .getByRole('button', { name: /close|×|✕/i })
      .or(page.locator('button.close, a.close'))
      .first();
    if (await closeBtn.isVisible().catch(() => false)) {
      await closeBtn.click();
    } else {
      throw new Error('Could not find close control on Quote - Medical after Save Changes');
    }
  }

  await page.waitForURL(/#gridInit\/medical/, { timeout: 120_000 });
}
