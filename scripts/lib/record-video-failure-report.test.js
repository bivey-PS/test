/**
 * Regression: RECORD_VIDEO failure must still persist a FAIL report instead of
 * throwing on page.url() after the page is closed to finalize the video.
 */
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { buildScenarioResult, writeReport } = require('../ps-9250/report');
const { readPageUrl } = require('./read-page-url');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ps9250-record-video-fail-'));

const closedPage = {
  isClosed: () => true,
  url: () => {
    throw new Error('Target page, context or browser has been closed');
  },
};

const scenario = {
  id: 'S3.15',
  name: 'Quote - Medical → Save Changes → close',
};
const scenarioResults = [
  buildScenarioResult({ id: 'S1.2', name: 'login' }, { ok: true }),
  buildScenarioResult(scenario, null, new Error('AI processing timed out')),
];

const capturedUrl = 'https://test.plansight.com/app/group/x/y#planGroupQuoteCreate/medical';
const finalUrl = readPageUrl(closedPage, capturedUrl);

assert.strictEqual(finalUrl, capturedUrl, 'closed page must not wipe captured URL');

const config = {
  jiraTicket: 'PS-9250',
  suiteName: 'PS-9250',
  suiteLabel: 'Minimum Gate',
  baseUrl: 'https://test.plansight.com',
  employerName: 'Ace Testing',
  outputDir: tmpDir,
  reportPrefix: 'ps-9250-minimum-gate',
};

const { report, jsonPath } = writeReport(config, scenarioResults, {
  finalUrl,
  recordingPath: path.join(tmpDir, 'ui-demo-error.mp4'),
});

assert.strictEqual(report.verified, false);
assert.strictEqual(report.summary.failed, 1);
assert.strictEqual(report.success, false);
assert.strictEqual(report.finalUrl, capturedUrl);

const persisted = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
assert.strictEqual(persisted.scenarios.at(-1).status, 'FAIL');
assert.strictEqual(persisted.verified, false);

fs.rmSync(tmpDir, { recursive: true, force: true });
console.log('record-video-failure-report.test.js: all assertions passed');
