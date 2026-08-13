const {
  ensureLoggedIn,
  verifyDashboard,
  navigateToEmployers,
  openEmployerGroup,
  startNewRfpBasicsTab,
  saveRfpBasicsAndContinue,
  saveBenefitTypesAndContinue,
  saveCommunityRatedPlansAndContinue,
  saveDocumentsForCarrierQuotingAndContinue,
  saveMedicalPlanDetailsAndContinue,
  selectMedicalFromDistributionListDropdown,
  clickBackToEmployerProfile,
  verifyRequestForProposalsRfpRow,
  isLoggedIn,
} = require('../lib/plansight-login');

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
    id: 'S2.2',
    name: 'Open an existing group → loads without error',
    run: runS22,
  },
  {
    id: 'S3.1',
    name: 'Start new RFP → Basics tab opens',
    run: runS31,
  },
  {
    id: 'S3.2',
    name: 'RFP Basics → Save & Continue',
    run: runS32,
  },
  {
    id: 'S3.3',
    name: 'Choose Benefit Types → Medical, Vision, Dental (Marketing) → Save & Continue',
    run: runS33,
  },
  {
    id: 'S3.3.1',
    name: 'Community Rated Plans → Save & Continue',
    run: runS331,
  },
  {
    id: 'S3.4',
    name: 'Documents for Carrier Quoting → Save & Continue',
    run: runS34,
  },
  {
    id: 'S3.5',
    name: 'Medical Plan Details → Save & go to Distribution',
    run: runS35,
  },
  {
    id: 'S3.6',
    name: 'Who Gets the RFP? → ellipsis menu → Medical → Quotes tab with Vision and Dental tabs',
    run: runS36,
  },
  {
    id: 'S3.7',
    name: 'Back to employer profile link → employer profile loads',
    run: runS37,
  },
  {
    id: 'S3.8',
    name: 'Request for Proposals → row for Ace Testing {current date}*',
    run: runS38,
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

async function runS22(page, _context, options) {
  const employer = await openEmployerGroup(page, options.employerName);

  return {
    employerName: employer.employerName,
    employerUrl: employer.employerUrl,
    screenshotPath: employer.screenshotPath,
  };
}

async function runS31(page) {
  const wizard = await startNewRfpBasicsTab(page);

  return {
    wizardUrl: wizard.wizardUrl,
    screenshotPath: wizard.screenshotPath,
  };
}

async function runS32(page) {
  const wizard = await saveRfpBasicsAndContinue(page);

  return {
    wizardUrl: wizard.wizardUrl,
    screenshotPath: wizard.screenshotPath,
  };
}

async function runS33(page) {
  const wizard = await saveBenefitTypesAndContinue(page);

  return {
    wizardUrl: wizard.wizardUrl,
    screenshotPath: wizard.screenshotPath,
  };
}

async function runS331(page) {
  const wizard = await saveCommunityRatedPlansAndContinue(page);

  return {
    wizardUrl: wizard.wizardUrl,
    screenshotPath: wizard.screenshotPath,
  };
}

async function runS34(page) {
  const wizard = await saveDocumentsForCarrierQuotingAndContinue(page);

  return {
    wizardUrl: wizard.wizardUrl,
    screenshotPath: wizard.screenshotPath,
  };
}

async function runS35(page) {
  const wizard = await saveMedicalPlanDetailsAndContinue(page);

  return {
    wizardUrl: wizard.wizardUrl,
    screenshotPath: wizard.screenshotPath,
  };
}

async function runS36(page) {
  const quotes = await selectMedicalFromDistributionListDropdown(page);

  return {
    quotesUrl: quotes.quotesUrl,
    screenshotPath: quotes.screenshotPath,
    verifiedTabs: quotes.verifiedTabs,
  };
}

async function runS37(page, _context, options) {
  const employer = await clickBackToEmployerProfile(page, options.employerName);

  return {
    employerName: employer.employerName,
    employerUrl: employer.employerUrl,
    screenshotPath: employer.screenshotPath,
  };
}

async function runS38(page, _context, options) {
  const rfpRow = await verifyRequestForProposalsRfpRow(page, options.employerName);

  return {
    expectedPrefix: rfpRow.expectedPrefix,
    matchedName: rfpRow.matchedName,
    screenshotPath: rfpRow.screenshotPath,
  };
}

module.exports = {
  SCENARIOS,
};
