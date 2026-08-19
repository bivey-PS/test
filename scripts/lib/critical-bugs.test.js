const assert = require('assert');
const {
  extractRfpIdFromUrl,
  hrefMatchesRfpId,
  evaluateRequestForProposalsRfpRowMatch,
} = require('./rfp-row-match');

function testExtractRfpIdIgnoresNonePlaceholder() {
  assert.strictEqual(
    extractRfpIdFromUrl('https://test.plansight.com/app/group/ace/none#rfpBuilderBasics'),
    null,
  );
  assert.strictEqual(
    extractRfpIdFromUrl('https://test.plansight.com/app/group/ace/rfp-abc123#rfpBuilderPlanTypes'),
    'rfp-abc123',
  );
  assert.strictEqual(extractRfpIdFromUrl('https://test.plansight.com/app#dashboard'), null);
}

function testHrefMatchesRfpIdUsesPathBoundaries() {
  assert.strictEqual(
    hrefMatchesRfpId('https://test.plansight.com/app/group/ace/12#rfpBuilderBasics', '12'),
    true,
  );
  assert.strictEqual(
    hrefMatchesRfpId('https://test.plansight.com/app/group/ace/123#rfpBuilderBasics', '12'),
    false,
  );
  assert.strictEqual(
    hrefMatchesRfpId('https://test.plansight.com/app/group/ace/rfp-abc123?x=1', 'rfp-abc123'),
    true,
  );
}

function testS38WithRfpIdDoesNotFallBackToYesterdayName() {
  const todayPrefix = 'Ace Testing 2026-08-19';
  const result = evaluateRequestForProposalsRfpRowMatch({
    rfpNames: [
      'Ace Testing 2026-08-18 Medical Marketing',
      'Ace Testing 2026-08-19 Medical Marketing',
    ],
    expectedPrefix: todayPrefix,
    rfpId: 'rfp-today',
    rowHrefByName: {
      'Ace Testing 2026-08-18 Medical Marketing':
        'https://test.plansight.com/app/group/ace/rfp-yesterday#marketResponse',
      'Ace Testing 2026-08-19 Medical Marketing':
        'https://test.plansight.com/app/group/ace/rfp-other#marketResponse',
    },
  });

  assert.strictEqual(
    result.pass,
    false,
    'When rfpId is known, a today/yesterday name alone must not satisfy S3.8',
  );
  assert.strictEqual(result.matchedName, null);
  assert.ok(result.failReason.includes('rfp-today'));
}

function testS38WithRfpIdMatchesOnlyThatRow() {
  const todayPrefix = 'Ace Testing 2026-08-19';
  const result = evaluateRequestForProposalsRfpRowMatch({
    rfpNames: [
      'Ace Testing 2026-08-18 Medical Marketing',
      'Ace Testing 2026-08-19 Medical Marketing',
    ],
    expectedPrefix: todayPrefix,
    rfpId: 'rfp-today',
    rowHrefByName: {
      'Ace Testing 2026-08-18 Medical Marketing':
        'https://test.plansight.com/app/group/ace/rfp-yesterday#marketResponse',
      'Ace Testing 2026-08-19 Medical Marketing':
        'https://test.plansight.com/app/group/ace/rfp-today#marketResponse',
    },
  });

  assert.strictEqual(result.pass, true);
  assert.strictEqual(result.matchedName, 'Ace Testing 2026-08-19 Medical Marketing');
}

function testS38WithoutRfpIdRequiresTodayPrefixNotYesterday() {
  const todayPrefix = 'Ace Testing 2026-08-19';
  const yesterdayOnly = evaluateRequestForProposalsRfpRowMatch({
    rfpNames: [
      'Ace Testing 2026-08-18 Medical Marketing',
      'Shadybrook Lumber',
    ],
    expectedPrefix: todayPrefix,
  });

  assert.strictEqual(
    yesterdayOnly.pass,
    false,
    'Yesterday-dated RFP rows must not satisfy S3.8 for today when rfpId is unknown',
  );
  assert.strictEqual(yesterdayOnly.matchedName, null);

  const todayPresent = evaluateRequestForProposalsRfpRowMatch({
    rfpNames: [
      'Ace Testing 2026-08-18 Medical Marketing',
      'Ace Testing 2026-08-19 Medical Marketing',
    ],
    expectedPrefix: todayPrefix,
  });

  assert.strictEqual(todayPresent.pass, true);
  assert.strictEqual(todayPresent.matchedName, 'Ace Testing 2026-08-19 Medical Marketing');
}

function run() {
  testExtractRfpIdIgnoresNonePlaceholder();
  testHrefMatchesRfpIdUsesPathBoundaries();
  testS38WithRfpIdDoesNotFallBackToYesterdayName();
  testS38WithRfpIdMatchesOnlyThatRow();
  testS38WithoutRfpIdRequiresTodayPrefixNotYesterday();
  console.log('critical-bugs.test.js: all assertions passed');
}

run();
