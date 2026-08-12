const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '..', '..', 'automation-output');

const config = {
  jiraTicket: process.env.JIRA_TICKET || 'PS-9250',
  suiteName: 'PS-9250',
  suiteLabel: 'Minimum Gate',
  baseUrl: process.env.BASE_URL || 'https://www.test.plansight.com',
  loginUsername: process.env.LOGIN_USERNAME || process.env.LOGIN_EMAIL,
  loginPassword: process.env.LOGIN_PASSWORD,
  mfaCode: process.env.MFA_CODE,
  employerName: process.env.EMPLOYER_NAME || 'Ace Testing',
  outputDir: OUTPUT_DIR,
  reportPrefix: 'ps-9250-minimum-gate',
};

module.exports = config;
