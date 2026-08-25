const {
  ensureLoggedIn,
  verifyDashboard,
  navigateToEmployers,
  createEmployer,
  verifyEmployerInGroupList,
  openEmployerGroup,
  isLoggedIn,
} = require('../lib/plansight-login');
const { getNextRunNumber } = require('./run-counter');

let currentEmployerName = null;

const SCENARIOS = [
  {
    id: 'S1.2',
    name: 'Valid broker login → lands in app',
    run: runS12,
  },
  {
    id: 'S2.1',
    name: 'Group List loads',
    run: runS21,
  },
  {
    id: 'S2.3',
    name: 'Add Employer → fill form → save → employer profile loads',
    run: runS23,
  },
  {
    id: 'S2.4',
    name: 'Created employer appears in group list',
    run: runS24,
  },
  {
    id: 'S2.5',
    name: 'Re-open created employer → loads without error',
    run: runS25,
  },
];

async function runS12(page, context, options) {
  const loginResult = await ensureLoggedIn(page, context, options);

  if (!isLoggedIn(page.url())) {
    throw new Error('Login did not land in the Plansight app');
  }

  const dashboard = await verifyDashboard(page, options.baseUrl);

  return {
    reusedSession: loginResult.reusedSession,
    welcomeText: dashboard.welcomeText,
    dashboardUrl: dashboard.dashboardUrl,
    screenshotPath: dashboard.screenshotPath,
  };
}

async function runS21(page) {
  const employers = await navigateToEmployers(page);

  return {
    employersUrl: employers.employersUrl,
    screenshotPath: employers.screenshotPath,
  };
}

async function runS23(page, _context, options) {
  const runNumber = getNextRunNumber();
  const created = await createEmployer(page, {
    runNumber,
    employeeCount: options.employeeCount,
    state: options.employerState,
    primaryRenewal: options.primaryRenewal,
    screenshotPrefix: 'create-employer',
  });

  currentEmployerName = created.employerName;

  if (!page.url().includes('#groupUpdate')) {
    throw new Error(`Expected employer profile URL with #groupUpdate, got ${page.url()}`);
  }

  return {
    employerName: created.employerName,
    employerUrl: created.employerUrl,
    runNumber,
    screenshotPath: created.screenshotPath,
    formScreenshotPath: created.formScreenshotPath,
  };
}

async function runS24(page) {
  if (!currentEmployerName) {
    throw new Error('No employer name tracked from S2.3');
  }

  const verification = await verifyEmployerInGroupList(page, currentEmployerName);

  return {
    employerName: currentEmployerName,
    employersUrl: verification.employersUrl,
    screenshotPath: verification.screenshotPath,
  };
}

async function runS25(page) {
  if (!currentEmployerName) {
    throw new Error('No employer name tracked from S2.3');
  }

  const employer = await openEmployerGroup(page, currentEmployerName);

  return {
    employerName: employer.employerName,
    employerUrl: employer.employerUrl,
    screenshotPath: employer.screenshotPath,
  };
}

module.exports = {
  SCENARIOS,
  getCurrentEmployerName: () => currentEmployerName,
};
