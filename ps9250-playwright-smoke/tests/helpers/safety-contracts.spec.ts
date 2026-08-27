import { test, expect } from '@playwright/test';
import { selectors } from './selectors';
import { GroupsPage } from './pages';

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
});
