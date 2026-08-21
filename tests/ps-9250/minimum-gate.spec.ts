import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'https://test.plansight.com';
const LOGIN_USERNAME =
  process.env.LOGIN_USERNAME ||
  process.env.LOGIN_EMAIL ||
  'ps.automation.broker.ca.admin@plansight.com';
const LOGIN_PASSWORD = process.env.LOGIN_PASSWORD || 'AutomationUser123';
const MFA_CODE = process.env.MFA_CODE;
const EMPLOYER_NAME = process.env.EMPLOYER_NAME || 'Ace Testing';

const hasCredentials = Boolean(LOGIN_USERNAME && LOGIN_PASSWORD);

test.describe('PS-9250 Minimum Gate', () => {
  test.skip(!hasCredentials, 'Set LOGIN_USERNAME and LOGIN_PASSWORD to run PS-9250 scenarios');

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

  test('S2.2 Open existing group loads without error', async ({ page }) => {
    const login = require('../../scripts/lib/plansight-login');
    await login.login(page, {
      baseUrl: BASE_URL,
      username: LOGIN_USERNAME,
      password: LOGIN_PASSWORD,
      mfaCode: MFA_CODE,
    });

    await login.navigateToEmployers(page);
    const employer = await login.openEmployerGroup(page, EMPLOYER_NAME);
    expect(employer.employerUrl).toMatch(/#groupUpdate/);
  });

  test('S3.1 Start Marketing Event opens Basics and continues', async ({ page }) => {
    const login = require('../../scripts/lib/plansight-login');
    await login.login(page, {
      baseUrl: BASE_URL,
      username: LOGIN_USERNAME,
      password: LOGIN_PASSWORD,
      mfaCode: MFA_CODE,
    });

    await login.navigateToEmployers(page);
    await login.openEmployerGroup(page, EMPLOYER_NAME);
    const basics = await login.startMarketingEventBasicsTab(page);
    expect(basics.wizardUrl).toContain('#rfpBuilderBasics');
  });
});
