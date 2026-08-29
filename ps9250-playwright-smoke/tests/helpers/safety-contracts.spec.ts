import { test, expect } from '@playwright/test';
import { selectors } from './selectors';
import { GroupsPage } from './pages';
import { anyPlanInCarrierColumn } from './quotes-grid-match';
import {
  isMedicalQuotesGridUrl,
  quoteDocumentNameFragment,
} from './quote-medical';

/**
 * Offline contracts that lock in false-PASS / wrong-record fixes without
 * hitting test.plansight.com.
 */
test.describe('smoke safety contracts', () => {
  test('group and RFP name selectors require exact match', () => {
    expect(selectors.groups.groupLinkByName('Automation 1')).toMatchObject({
      role: 'link',
      name: 'Automation 1',
      exact: true,
    });
    expect(selectors.rfpList.nameLink('Automation 1')).toMatchObject({
      role: 'link',
      name: 'Automation 1',
      exact: true,
    });
    expect(selectors.rfpList.rowByName('Automation 1')).toMatchObject({
      role: 'row',
      name: 'Automation 1',
      exact: true,
    });
  });

  test('GroupsPage.openGroup refuses empty name (no first-row fallback)', async () => {
    const page = {} as any;
    const groups = new GroupsPage(page);
    await expect(groups.openGroup('')).rejects.toThrow(/EXISTING_GROUP_NAME|RFP_GROUP_NAME/);
    await expect(groups.openGroup('   ')).rejects.toThrow(/EXISTING_GROUP_NAME|RFP_GROUP_NAME/);
  });

  test('submitQuote selector does not match bare Save (avoids page-level Save via .first())', () => {
    const spec = selectors.quotes.submitQuote as { name: RegExp };
    expect(spec.name.test('Save')).toBe(false);
    expect(spec.name.test('Save Changes')).toBe(false);
    expect(spec.name.test('Submit')).toBe(true);
    expect(spec.name.test('Create Quote')).toBe(true);
  });

  test('S3.16 column match rejects plan under a different carrier header', () => {
    const aetnaHeader = { x: 100, width: 120 }; // 100–220
    const planUnderAetna = { x: 130, width: 80 }; // center 170
    const planUnderOther = { x: 400, width: 80 }; // center 440

    expect(anyPlanInCarrierColumn(aetnaHeader, [planUnderAetna])).toBe(true);
    expect(anyPlanInCarrierColumn(aetnaHeader, [planUnderOther])).toBe(false);
    expect(anyPlanInCarrierColumn(aetnaHeader, [planUnderOther, planUnderAetna])).toBe(true);
  });

  test('S3.16 requires Medical quotes grid URL (not Quote create)', () => {
    expect(
      isMedicalQuotesGridUrl(
        'https://test.plansight.com/app/group/ace/none#planGroupQuoteCreate/medical',
      ),
    ).toBe(false);
    expect(
      isMedicalQuotesGridUrl('https://test.plansight.com/app/group/ace/abc#gridInit/medical'),
    ).toBe(true);
    expect(
      isMedicalQuotesGridUrl('https://test.plansight.com/app/group/ace/abc#gridInit/dental'),
    ).toBe(false);
  });

  test('document dropdown selector targets Plansight select2 container', () => {
    expect(selectors.quotes.documentDropdown).toMatchObject({
      css: '#select2-documentSelect-container',
    });
    expect(quoteDocumentNameFragment('/tmp/fixtures/sbc-sample.pdf')).toBe('sbc-sample.pdf');
  });
});
