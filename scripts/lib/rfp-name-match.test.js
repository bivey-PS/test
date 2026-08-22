const assert = require('assert');
const {
  exactRfpNamePattern,
  findExactRfpName,
  substringRfpNameMatches,
} = require('./rfp-name-match');

function testSubstringHasTextWouldPickWrongAutomationRun() {
  const names = [
    'Ace Testing 2026-08-22 Automation 10',
    'Ace Testing 2026-08-22 Automation 1',
    'Ace Testing 2026-08-22 Automation 11',
  ];
  const expected = 'Ace Testing 2026-08-22 Automation 1';

  const substringHits = substringRfpNameMatches(names, expected);
  assert.deepStrictEqual(
    substringHits,
    [
      'Ace Testing 2026-08-22 Automation 10',
      'Ace Testing 2026-08-22 Automation 1',
      'Ace Testing 2026-08-22 Automation 11',
    ],
    'string hasText semantics must collide Automation 1 with 10/11',
  );
  assert.strictEqual(
    substringHits[0],
    'Ace Testing 2026-08-22 Automation 10',
    'newest-first / first-match would open Automation 10 instead of 1',
  );

  assert.strictEqual(findExactRfpName(names, expected), expected);
  assert.strictEqual(findExactRfpName(names, 'Ace Testing 2026-08-22 Automation 99'), null);
}

function testExactPatternAnchorsFullName() {
  const pattern = exactRfpNamePattern('Ace Testing 2026-08-22 Automation 1');
  assert.strictEqual(pattern.test('Ace Testing 2026-08-22 Automation 1'), true);
  assert.strictEqual(pattern.test('Ace Testing 2026-08-22 Automation 10'), false);
  assert.strictEqual(pattern.test('Ace Testing 2026-08-22 Automation 11'), false);
  assert.strictEqual(pattern.test('prefix Ace Testing 2026-08-22 Automation 1'), false);
}

function run() {
  testSubstringHasTextWouldPickWrongAutomationRun();
  testExactPatternAnchorsFullName();
  console.log('rfp-name-match.test.js: all assertions passed');
}

run();
