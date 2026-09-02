import { test, expect } from './helpers/fixtures';
import { env, uniqueEmployerName } from './helpers/env';
import { EmployerCreatePage, GroupsPage, expectNoServerError } from './helpers/pages';
import { selectors } from './helpers/selectors';
import { resolve } from './helpers/resolve';

/**
 * PS-9410 — Automation: Create an Employer.
 *
 * Separate from the PS-9250 smoke suite: own spec, `@create-employer` tag, own
 * page object (`EmployerCreatePage`) and selector namespace
 * (`selectors.employerCreate`). This flow WRITES data, so actual creation is
 * gated behind ALLOW_EMPLOYER_CREATE=1 and uses a unique, clearly-flagged name
 * (`ZZ-AUTO-EMPLOYER <timestamp>`).
 *
 * Selectors/field names are best-guess placeholders — confirm live with
 * `npm run codegen` against test.plansight.com before relying on results.
 */
test.describe('PS-9410 — Create an Employer', () => {
  test('A1 Create-employer form opens', { tag: '@create-employer' }, async ({ broker }) => {
    const page = new EmployerCreatePage(broker);
    await page.gotoCreate();
    await expectNoServerError(broker);
    await page.expectFormVisible();
  });

  test('B1 Submitting with a blank name shows validation and creates nothing', { tag: '@create-employer' }, async ({ broker }) => {
    const page = new EmployerCreatePage(broker);
    await page.gotoCreate();
    await page.submitEmpty();
    await expect(page.validationError()).toBeVisible();
    // TODO: also assert no new employer row was added to the list.
  });

  test('A2–A4 Create an employer, see it in the list, and open it', { tag: '@create-employer' }, async ({ broker }) => {
    test.skip(!env.allowEmployerCreate, 'Set ALLOW_EMPLOYER_CREATE=1 to create real data.');
    const name = uniqueEmployerName();
    const page = new EmployerCreatePage(broker);

    await test.step('A2 create', async () => {
      await page.gotoCreate();
      await page.fillRequired(name);
      await page.save();
      await expectNoServerError(broker);
    });

    await test.step('A3 appears in the Groups/Employers list', async () => {
      await resolve(broker, selectors.shell.navGroups).first().click();
      await broker.waitForLoadState('networkidle');
      await expect(resolve(broker, selectors.groups.groupLinkByName(name)).first()).toBeVisible();
    });

    await test.step('A4 open the new employer', async () => {
      await new GroupsPage(broker).openGroup(name);
      await expectNoServerError(broker);
      await new GroupsPage(broker).expectGroupHomeLoaded();
    });
  });

  test('C1 Created employer persists after reload', { tag: '@create-employer' }, async ({ broker }) => {
    test.skip(!env.allowEmployerCreate, 'Set ALLOW_EMPLOYER_CREATE=1 to create real data.');
    const name = uniqueEmployerName();
    const page = new EmployerCreatePage(broker);
    await page.gotoCreate();
    await page.fillRequired(name);
    await page.save();

    await broker.reload();
    await broker.waitForLoadState('networkidle');
    await expectNoServerError(broker);
    // TODO: assert the employer's entered values are still displayed after reload.
  });

  // F1 cleanup: created `ZZ-AUTO-EMPLOYER` records should be removed/archived.
  // Marked fixme until the delete/archive path (or a disposable env) is confirmed.
  test.fixme('F1 Teardown removes ZZ-AUTO-EMPLOYER test records', async () => {
    // TODO: implement delete/archive of employers created during the run.
  });
});
