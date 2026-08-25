const assert = require('assert');
const {
  isReasonablePlanText,
  overlapsCarrierColumn,
  verifyPlanInCarrierColumn,
} = require('./quotes-grid-match');

function testAggregatingAncestorTextIsRejected() {
  const planName = '1 - Silver 5000 ValueCare';
  const fragment = 'Silver 5000 ValueCare';

  assert.strictEqual(isReasonablePlanText(planName, planName, fragment), true);
  assert.strictEqual(isReasonablePlanText(fragment, planName, fragment), true);

  const gridDump =
    'Aetna National Other Carrier 2 - Gold 1000 1 - Silver 5000 ValueCare Vision Dental';
  assert.strictEqual(
    isReasonablePlanText(gridDump, planName, fragment),
    false,
    'whole-grid textContent must not count as a plan cell',
  );
}

function testWideWrapperDoesNotOverlapColumn() {
  const headerRect = { left: 100, right: 220, width: 120 };
  const leafCell = { left: 110, right: 210, width: 100 };
  const fullGridWrapper = { left: 0, right: 1000, width: 1000 };

  assert.strictEqual(overlapsCarrierColumn(leafCell, headerRect), true);
  assert.strictEqual(
    overlapsCarrierColumn(fullGridWrapper, headerRect),
    false,
    'full-width grid wrappers must not satisfy column overlap',
  );
}

function testFalsePassWhenPlanOnlyInOtherCarrierColumn() {
  const aetnaHeader = {
    text: 'Aetna National',
    left: 100,
    right: 220,
    top: 10,
    width: 120,
    height: 24,
  };
  const otherHeader = {
    text: 'Other Carrier',
    left: 400,
    right: 520,
    top: 10,
    width: 120,
    height: 24,
  };
  const planUnderOther = {
    text: '1 - Silver 5000 ValueCare',
    left: 410,
    right: 510,
    top: 80,
    width: 100,
    height: 20,
  };
  // Ancestor that concatenates every column — the pre-fix matcher treated this
  // as "in" the Aetna column because its box overlaps Aetna horizontally.
  const gridWrapper = {
    text: 'Aetna National Other Carrier 1 - Silver 5000 ValueCare',
    left: 0,
    right: 800,
    top: 0,
    width: 800,
    height: 400,
  };

  const result = verifyPlanInCarrierColumn(
    [aetnaHeader, otherHeader, planUnderOther, gridWrapper],
    {
      carrierName: 'Aetna National',
      planName: '1 - Silver 5000 ValueCare',
    },
  );

  assert.strictEqual(result.ok, false, 'plan under another carrier must not PASS for Aetna');
  assert.match(result.reason, /not found in the "Aetna National" column/);
}

function testTruePassWhenPlanIsInAetnaColumn() {
  const aetnaHeader = {
    text: 'Aetna National',
    left: 100,
    right: 220,
    top: 10,
    width: 120,
    height: 24,
  };
  const planUnderAetna = {
    text: '1 - Silver 5000 ValueCare',
    left: 110,
    right: 210,
    top: 80,
    width: 100,
    height: 20,
  };
  const gridWrapper = {
    text: 'Aetna National 1 - Silver 5000 ValueCare',
    left: 0,
    right: 800,
    top: 0,
    width: 800,
    height: 400,
  };

  const result = verifyPlanInCarrierColumn([aetnaHeader, planUnderAetna, gridWrapper], {
    carrierName: 'Aetna National',
    planName: '1 - Silver 5000 ValueCare',
  });

  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.planName, '1 - Silver 5000 ValueCare');
}

function testFragmentStillMatchesSlightlyTruncatedLeaf() {
  const aetnaHeader = {
    text: 'Aetna National',
    left: 100,
    right: 220,
    top: 10,
    width: 120,
    height: 24,
  };
  const truncatedLeaf = {
    text: 'Silver 5000 ValueCare',
    left: 115,
    right: 205,
    top: 80,
    width: 90,
    height: 18,
  };

  const result = verifyPlanInCarrierColumn([aetnaHeader, truncatedLeaf], {
    carrierName: 'Aetna National',
    planName: '1 - Silver 5000 ValueCare',
  });

  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.planName, 'Silver 5000 ValueCare');
}

function run() {
  testAggregatingAncestorTextIsRejected();
  testWideWrapperDoesNotOverlapColumn();
  testFalsePassWhenPlanOnlyInOtherCarrierColumn();
  testTruePassWhenPlanIsInAetnaColumn();
  testFragmentStillMatchesSlightlyTruncatedLeaf();
  console.log('quotes-grid-match.test.js: all assertions passed');
}

run();
