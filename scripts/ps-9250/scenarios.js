const {
  ensureLoggedIn,
  verifyDashboard,
  navigateToEmployers,
  openEmployerGroup,
  startMarketingEventBasicsTab,
  saveRfpBasicsAndContinue,
  saveBenefitTypesAndContinue,
  saveCommunityRatedPlansAndContinue,
  saveDocumentsForCarrierQuotingAndContinue,
  saveMedicalPlanDetailsAndContinue,
  selectMedicalFromDistributionListDropdown,
  clickBackToEmployerProfile,
  verifyRequestForProposalsRfpRow,
  openRfpFromMarketingTableByName,
  selectMedicalFromRfpBasicsEllipsis,
  clickAddQuoteButton,
  selectCarrierInCreateNewQuoteModal,
  uploadQuoteDocumentInCreateNewQuoteModal,
  submitCreateNewQuoteModal,
  waitForQuoteProcessingComplete,
  selectUploadedQuoteDocumentSource,
  saveQuoteChanges,
  waitForQuoteProcessingAndSaveChanges,
  isLoggedIn,
} = require('../lib/plansight-login');
const { getNextRunNumber } = require('./run-counter');

let currentRfpId = null;
let currentMatchedRfpName = null;
let currentRfpName = null;

function trackRfpFromUrl(url) {
  const { extractRfpIdFromUrl } = require('../lib/plansight-login');
  const rfpId = extractRfpIdFromUrl(url);
  if (rfpId) {
    currentRfpId = rfpId;
  }
  return currentRfpId;
}

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
    name: 'Start Marketing Event → set RFP Name → Save & Continue',
    run: runS31,
  },
  {
    id: 'S3.3',
    name: 'Choose Benefit Types → Medical, Vision, Dental (Marketing) → Save & Continue',
    run: runS33,
  },
  {
    id: 'S3.3.1',
    name: 'Community Rated Plans → answer No on both questions → skip census → Save & Continue',
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
    name: 'Request for Proposals → row for created RFP name',
    run: runS38,
  },
  {
    id: 'S3.9',
    name: 'Request for Proposals → click Name link to open RFP',
    run: runS39,
  },
  {
    id: 'S3.10',
    name: 'RFP Basics → ellipsis menu → Medical row',
    run: runS310,
  },
  {
    id: 'S3.11',
    name: 'Medical Quotes → click Add Quote + button',
    run: runS311,
  },
  {
    id: 'S3.12',
    name: 'Create New Quote → Carrier dropdown → type "a" → Enter',
    run: runS312,
  },
  {
    id: 'S3.13',
    name: 'Create New Quote → Click to upload → select Doc - SBC Silver 5000 ValueCareTest.pdf',
    run: runS313,
  },
  {
    id: 'S3.14',
    name: 'Create New Quote → submit → Quote - Medical opens',
    run: runS314,
  },
  {
    id: 'S3.15',
    name: 'Quote - Medical → wait for AI processing → select document → Save Changes',
    run: runS315,
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

async function runS31(page, _context, options) {
  const runNumber = getNextRunNumber();
  const basics = await startMarketingEventBasicsTab(page);

  const wizard = await saveRfpBasicsAndContinue(page, options.employerName, runNumber);
  currentRfpName = wizard.rfpName;
  trackRfpFromUrl(wizard.wizardUrl);
  trackRfpFromUrl(page.url());

  return {
    wizardUrl: wizard.wizardUrl,
    rfpId: currentRfpId,
    rfpName: wizard.rfpName,
    runNumber: wizard.runNumber,
    basicsScreenshotPath: basics.screenshotPath,
    screenshotPath: wizard.screenshotPath,
  };
}

async function runS33(page) {
  const wizard = await saveBenefitTypesAndContinue(page);
  trackRfpFromUrl(wizard.wizardUrl);

  return {
    wizardUrl: wizard.wizardUrl,
    rfpId: currentRfpId,
    screenshotPath: wizard.screenshotPath,
  };
}

async function runS331(page) {
  const wizard = await saveCommunityRatedPlansAndContinue(page);
  trackRfpFromUrl(wizard.wizardUrl);

  return {
    wizardUrl: wizard.wizardUrl,
    rfpId: currentRfpId,
    screenshotPath: wizard.screenshotPath,
  };
}

async function runS34(page) {
  const wizard = await saveDocumentsForCarrierQuotingAndContinue(page);
  trackRfpFromUrl(wizard.wizardUrl);

  return {
    wizardUrl: wizard.wizardUrl,
    rfpId: currentRfpId,
    screenshotPath: wizard.screenshotPath,
  };
}

async function runS35(page) {
  const wizard = await saveMedicalPlanDetailsAndContinue(page);
  trackRfpFromUrl(wizard.wizardUrl);

  return {
    wizardUrl: wizard.wizardUrl,
    rfpId: currentRfpId,
    screenshotPath: wizard.screenshotPath,
  };
}

async function runS36(page) {
  const quotes = await selectMedicalFromDistributionListDropdown(page);
  trackRfpFromUrl(quotes.quotesUrl);

  return {
    quotesUrl: quotes.quotesUrl,
    rfpId: currentRfpId,
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
  if (!currentRfpName) {
    throw new Error('Created RFP name was not captured from S3.1');
  }

  const rfpRow = await verifyRequestForProposalsRfpRow(
    page,
    options.employerName,
    new Date(),
    currentRfpId,
    currentRfpName,
  );
  currentMatchedRfpName = rfpRow.matchedName;

  return {
    expectedPrefix: rfpRow.expectedPrefix,
    expectedRfpName: currentRfpName,
    matchedName: rfpRow.matchedName,
    rfpId: rfpRow.rfpId || currentRfpId,
    screenshotPath: rfpRow.screenshotPath,
  };
}

async function runS39(page) {
  const opened = await openRfpFromMarketingTableByName(page, {
    matchedName: currentMatchedRfpName,
    rfpId: currentRfpId,
  });

  return {
    matchedName: opened.matchedName,
    rfpId: opened.rfpId,
    rfpUrl: opened.rfpUrl,
    screenshotPath: opened.screenshotPath,
  };
}

async function runS310(page) {
  const medical = await selectMedicalFromRfpBasicsEllipsis(page);

  return {
    medicalUrl: medical.medicalUrl,
    screenshotPath: medical.screenshotPath,
  };
}

async function runS311(page) {
  const addQuote = await clickAddQuoteButton(page);

  return {
    quotesUrl: addQuote.quotesUrl,
    screenshotPath: addQuote.screenshotPath,
  };
}

async function runS312(page) {
  const carrier = await selectCarrierInCreateNewQuoteModal(page, 'a');

  return {
    carrierId: carrier.carrierId,
    carrierName: carrier.carrierName,
    screenshotPath: carrier.screenshotPath,
  };
}

async function runS313(page) {
  const upload = await uploadQuoteDocumentInCreateNewQuoteModal(page);

  return {
    fileName: upload.fileName,
    fixturePath: upload.fixturePath,
    screenshotPath: upload.screenshotPath,
  };
}

async function runS314(page) {
  const quote = await submitCreateNewQuoteModal(page);

  return {
    quoteUrl: quote.quoteUrl,
    submitScreenshotPath: quote.screenshotPath,
    screenshotPath: quote.screenshotPath,
  };
}

async function runS315(page) {
  const processing = await waitForQuoteProcessingComplete(page);
  const document = await selectUploadedQuoteDocumentSource(page);
  const saved = await saveQuoteChanges(page);

  return {
    quoteUrl: saved.quoteUrl,
    sawProcessing: processing.sawProcessing,
    documentLabel: document.documentLabel,
    screenshotPath: saved.screenshotPath,
  };
}

module.exports = {
  SCENARIOS,
};
