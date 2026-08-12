const path = require('path');
const { getLoginCredentials } = require('../lib/plansight-credentials');

const OUTPUT_DIR = path.join(__dirname, '..', '..', 'automation-output');
const credentials = getLoginCredentials();

const config = {
  jiraTicket: process.env.JIRA_TICKET || 'PS-9250',
  suiteName: 'PS-9250',
  suiteLabel: 'Minimum Gate',
  baseUrl: process.env.BASE_URL || 'https://www.test.plansight.com',
  loginUsername: credentials.username,
  loginPassword: credentials.password,
  mfaCode: credentials.mfaCode,
  employerName: process.env.EMPLOYER_NAME || 'Ace Testing',
  outputDir: OUTPUT_DIR,
  reportPrefix: 'ps-9250-minimum-gate',
};

module.exports = config;
