const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const { SCENARIOS } = require('./scenarios');
const { buildScenarioResult, writeReport } = require('./report');
const {
  getAuthStatePathForBaseUrl,
  authStateMatchesBaseUrl,
  saveAuthState,
} = require('../lib/plansight-login');
const { requireLoginPassword } = require('../lib/plansight-credentials');

function requireCredentials() {
  requireLoginPassword(
    {
      username: config.loginUsername,
      password: config.loginPassword,
    },
    'LOGIN_PASSWORD=yourpassword npm run automate:ps9250:minimum-gate',
  );
}

async function runMinimumGate() {
  requireCredentials();
  fs.mkdirSync(config.outputDir, { recursive: true });

  const authStatePath = getAuthStatePathForBaseUrl(config.baseUrl);
  const browser = await chromium.launch({
    headless: process.env.HEADED !== '1',
    slowMo: process.env.HEADED === '1' ? 400 : 0,
  });

  const contextOptions = {
    viewport: { width: 1400, height: 900 },
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

  const loginOptions = {
    baseUrl: config.baseUrl,
    username: config.loginUsername,
    password: config.loginPassword,
    mfaCode: config.mfaCode,
    authStatePath,
    employerName: config.employerName,
  };

  try {
    console.log(
      `Running ${config.jiraTicket} ${config.suiteLabel} on ${config.baseUrl} (${SCENARIOS.length} scenarios)`,
    );

    for (const scenario of SCENARIOS) {
      console.log(`\n--- ${scenario.id}: ${scenario.name} ---`);

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
        break;
      }
    }

    finalUrl = page.url();
    await saveAuthState(context, authStatePath).catch(() => {});

    const { report } = writeReport(config, scenarioResults, {
      finalUrl,
      reusedSession,
      authStatePath,
    });

    console.log(
      `\n${config.jiraTicket} ${config.suiteLabel}: ${report.summary.passed}/${report.summary.total} PASS`,
    );

    if (!report.verified) {
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(`${config.jiraTicket} automation failed:`, error.message);
    writeReport(config, scenarioResults, {
      finalUrl: page.url(),
      reusedSession,
      authStatePath,
      fatalError: error.message,
    });
    process.exitCode = 1;
  } finally {
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}

module.exports = {
  runMinimumGate,
};

if (require.main === module) {
  runMinimumGate();
}
