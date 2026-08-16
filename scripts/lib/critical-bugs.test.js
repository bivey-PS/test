const assert = require('assert');
const {
  evaluateRequestForProposalsRfpRowMatch,
} = require('./rfp-row-match');

function testS38RequiresTodayDenverPrefixNotYesterday() {
  const todayPrefix = 'Ace Testing 2026-08-16';
  const yesterdayOnly = evaluateRequestForProposalsRfpRowMatch({
    rfpNames: [
      'Ace Testing 2026-08-15 Medical Marketing',
      'Shadybrook Lumber',
    ],
    expectedPrefix: todayPrefix,
  });

  assert.strictEqual(
    yesterdayOnly.pass,
    false,
    'Yesterday-dated RFP rows must not satisfy S3.8 for today',
  );
  assert.strictEqual(yesterdayOnly.matchedName, null);
  assert.ok(yesterdayOnly.failReason.includes(todayPrefix));

  const todayPresent = evaluateRequestForProposalsRfpRowMatch({
    rfpNames: [
      'Ace Testing 2026-08-15 Medical Marketing',
      'Ace Testing 2026-08-16 Medical Marketing',
    ],
    expectedPrefix: todayPrefix,
  });

  assert.strictEqual(todayPresent.pass, true);
  assert.strictEqual(todayPresent.matchedName, 'Ace Testing 2026-08-16 Medical Marketing');
  assert.strictEqual(todayPresent.failReason, null);
}

function run() {
  testS38RequiresTodayDenverPrefixNotYesterday();
  console.log('critical-bugs.test.js: all assertions passed');
}

run();
