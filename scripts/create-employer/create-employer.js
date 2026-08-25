const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const { SCENARIOS, getCurrentEmployerName } = require('./scenarios');
const { buildScenarioResult, writeReport } = require('./report');
const { authStateMatchesBaseUrl, saveAuthState, saveRecording } = require('../lib/plansight-login');
const { requireLoginPassword } = require('../lib/plansight-credentials');

const RECORD_VIDEO = process.env.RECORD_VIDEO === '1';
const RECORDING_NAME =
  process.env.RECORDING_NAME || `${config.reportPrefix}${RECORD_VIDEO ? '-ui-demo' : ''}`;
const PAUSE_MS = Number(process.env.PAUSE_MS || (RECORD_VIDEO ? 1500 : 0));

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pauseStep(label) {
  if (PAUSE_MS <= 0) {
    return;
  }

  console.log(`\n=== ${label} ===`);
  await sleep(PAUSE_MS);
}

function requireCredentials() {
  requireLoginPassword(
    {
      username: config.loginUsername,
      password: config.loginPassword,
    },
    'npm run automate:create-employer',
  );
}

async function runCreateEmployerSuite() {
  requireCredentials();
  fs.mkdirSync(config.outputDir, { recursive: true });

  const authStatePath = config.authStatePath;
  const browser = await chromium.launch({
    headless: process.env.HEADED !== '1' && !RECORD_VIDEO,
    slowMo: process.env.HEADED === '1' || RECORD_VIDEO ? 400 : 0,
  });

  const contextOptions = {
    viewport: { width: 1400, height: 900 },
    recordVideo: RECORD_VIDEO
      ? { dir: config.outputDir, size: { width: 1400, height: 900 } }
      : undefined,
  };

  if (authStateMatchesBaseUrl(config.baseUrl, authStatePath)) {
    contextOptions.storageState = authStatePath;
    console.log(`Loading saved auth session for ${new URL(config.baseUrl).hostname}`);
  }

  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();
  const scenarioResults = [];
  let reusedSession = false;
  let finalUrl = null;
  let recordingPath = null;

  const loginOptions = {
    baseUrl: config.baseUrl,
    username: config.loginUsername,
    password: config.loginPassword,
    mfaCode: config.mfaCode,
    authStatePath,
    employeeCount: config.employeeCount,
    employerState: config.employerState,
    clientStatus: config.clientStatus,
    producerName: config.producerName,
    accountManagerName: config.accountManagerName,
    primaryRenewal: config.primaryRenewal,
  };

  try {
    console.log(
      `Running ${config.suiteLabel} on ${config.baseUrl} (${SCENARIOS.length} scenarios)`,
    );

    for (const scenario of SCENARIOS) {
      console.log(`\n--- ${scenario.id}: ${scenario.name} ---`);
      await pauseStep(`${scenario.id}: ${scenario.name}`);

      try {
        const result = await scenario.run(page, context, loginOptions);
        scenarioResults.push(buildScenarioResult(scenario, result));

        if (scenario.id === 'S1.2' && result?.reusedSession !== undefined) {
          reusedSession = result.reusedSession;
        }

        console.log(`${scenario.id} PASS`);
      } catch (error) {
        scenarioResults.push(buildScenarioResult(scenario, null, error));
        console.error(`${scenario.id} FAIL: ${error.message}`);

        const errorScreenshot = path.join(
          config.outputDir,
          `${config.reportPrefix}-${scenario.id.replace('.', '-')}-error.png`,
        );
        await page.screenshot({ path: errorScreenshot, fullPage: true }).catch(() => {});
        console.error(`Error screenshot saved: ${errorScreenshot}`);
        console.error(`Current URL: ${page.url()}`);

        if (RECORD_VIDEO) {
          await page.close().catch(() => {});
          recordingPath = await saveRecording(page, `${RECORDING_NAME}-error`).catch(() => null);
        }
        break;
      }
    }

    finalUrl = page.url();
    await saveAuthState(context, authStatePath).catch(() => {});

    const { report } = writeReport(config, scenarioResults, {
      finalUrl,
      reusedSession,
      authStatePath,
      createdEmployerName: getCurrentEmployerName(),
      recordingPath: null,
    });

    if (RECORD_VIDEO && !recordingPath) {
      await page.close();
      recordingPath = await saveRecording(page, RECORDING_NAME);
    }

    if (recordingPath) {
      report.recordingPath = recordingPath;

      const reportPath = path.join(config.outputDir, `${config.reportPrefix}-report.json`);
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`Updated report with recording: ${reportPath}`);
    }

    console.log(
      `\n${config.suiteLabel}: ${report.summary.passed}/${report.summary.total} PASS`,
    );

    if (!report.verified) {
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(`${config.suiteLabel} automation failed:`, error.message);
    if (RECORD_VIDEO && !recordingPath) {
      await page.close().catch(() => {});
      recordingPath = await saveRecording(page, `${RECORDING_NAME}-error`).catch(() => null);
    }
    writeReport(config, scenarioResults, {
      finalUrl: page.url(),
      reusedSession,
      authStatePath,
      createdEmployerName: getCurrentEmployerName(),
      fatalError: error.message,
    });
    process.exitCode = 1;
  } finally {
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}

module.exports = {
  runCreateEmployerSuite,
};

if (require.main === module) {
  runCreateEmployerSuite();
}
