import { test, expect } from './helpers/fixtures';
import { env } from './helpers/env';
import { AppShell, GroupsPage, expectNoServerError } from './helpers/pages';
import { selectors } from './helpers/selectors';
import { resolve } from './helpers/resolve';

test.describe('S2 — Employer groups', () => {
  test('S2.1 Group List loads', { tag: '@min-gate' }, async ({ broker }) => {
    const shell = new AppShell(broker);
    const groups = new GroupsPage(broker);
    await shell.gotoGroups();
    await expectNoServerError(broker);
    await groups.expectListLoaded();
  });

  test('S2.2 Open an existing group without error', { tag: '@min-gate' }, async ({ broker }) => {
    const shell = new AppShell(broker);
    const groups = new GroupsPage(broker);
    await shell.gotoGroups();
    await groups.openGroup(env.existingGroupName);
    await expectNoServerError(broker);
    await groups.expectGroupHomeLoaded();
  });

  // S2.3 can create/modify data; kept behind a visible "create" affordance and
  // non-destructive (opens the create form and asserts it renders). Fill in the
  // save flow once selectors are confirmed for test.plansight.com.
  test('S2.3 Create/edit a group (smoke: create form opens)', async ({ broker }) => {
    const shell = new AppShell(broker);
    await shell.gotoGroups();
    const createBtn = resolve(broker, selectors.groups.createGroupButton).first();
    test.skip(!(await createBtn.isVisible().catch(() => false)), 'Create Group affordance not found; confirm selector.');
    await createBtn.click();
    await expect(broker.locator('form').first()).toBeVisible();
    // TODO: fill required fields and Save; then assert group opens.
  });
});
