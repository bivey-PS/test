const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '..', '..', 'automation-output');
const baseUrl = process.env.BASE_URL || 'https://test.plansight.com';
const loginUsername =
  process.env.LOGIN_USERNAME ||
  process.env.LOGIN_EMAIL ||
  'ps.automation.broker.ca.admin@plansight.com';
const loginPassword = process.env.LOGIN_PASSWORD || 'AutomationUser123';

function getAuthStatePath(baseUrlValue, username) {
  const hostname = new URL(baseUrlValue).hostname.replace(/\./g, '-');
  const userSlug = username.replace(/[@.]/g, '-');
  return path.join(OUTPUT_DIR, `auth-state-${hostname}-${userSlug}.json`);
}

const config = {
  jiraTicket: process.env.JIRA_TICKET || 'PS-9250',
  suiteName: 'create-employer',
  suiteLabel: 'Create Employer',
  baseUrl,
  loginUsername,
  loginPassword,
  mfaCode: process.env.MFA_CODE,
  authStatePath: getAuthStatePath(baseUrl, loginUsername),
  outputDir: OUTPUT_DIR,
  reportPrefix: 'create-employer',
  employeeCount: Number(process.env.EMPLOYER_EMPLOYEE_COUNT || 50),
  employerState: process.env.EMPLOYER_STATE || 'UT',
  primaryRenewal: process.env.EMPLOYER_PRIMARY_RENEWAL || 'January',
};

module.exports = config;
