import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'https://test.plansight.com';
const LOGIN_USERNAME =
  process.env.LOGIN_USERNAME ||
  process.env.LOGIN_EMAIL ||
  'ps.automation.broker.ca.admin@plansight.com';
const LOGIN_PASSWORD = process.env.LOGIN_PASSWORD || 'AutomationUser123';
const MFA_CODE = process.env.MFA_CODE;

const hasCredentials = Boolean(LOGIN_USERNAME && LOGIN_PASSWORD);

test.describe('Create Employer', () => {
  test.skip(!hasCredentials, 'Set LOGIN_USERNAME and LOGIN_PASSWORD to run Create Employer scenarios');

  test('S1.2 Valid broker login lands in app', async ({ page }) => {
    const login = require('../../scripts/lib/plansight-login');
    await login.login(page, {
      baseUrl: BASE_URL,
      username: LOGIN_USERNAME,
      password: LOGIN_PASSWORD,
      mfaCode: MFA_CODE,
    });

    const dashboard = await login.verifyDashboard(page, BASE_URL);
    expect(dashboard.welcomeText).toMatch(/Welcome .+/);
  });

  test('S2.1 Group List loads', async ({ page }) => {
    const login = require('../../scripts/lib/plansight-login');
    await login.login(page, {
      baseUrl: BASE_URL,
      username: LOGIN_USERNAME,
      password: LOGIN_PASSWORD,
      mfaCode: MFA_CODE,
    });

    const employers = await login.navigateToEmployers(page);
    expect(employers.employersUrl).toMatch(/#groupList/);
  });

  test('S2.3 Add Employer opens form and saves employer profile', async ({ page }) => {
    const login = require('../../scripts/lib/plansight-login');
    const { getNextRunNumber } = require('../../scripts/create-employer/run-counter');

    await login.login(page, {
      baseUrl: BASE_URL,
      username: LOGIN_USERNAME,
      password: LOGIN_PASSWORD,
      mfaCode: MFA_CODE,
    });

    await login.navigateToEmployers(page);
    const created = await login.createEmployer(page, {
      runNumber: getNextRunNumber(),
      screenshotPrefix: 'create-employer-spec',
    });

    expect(created.employerUrl).toMatch(/#groupUpdate/);
    expect(created.employerName).toMatch(/Automation Employer/);
  });
});
