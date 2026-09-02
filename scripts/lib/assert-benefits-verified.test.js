const assert = require('assert');
const { assertBenefitsVerified } = require('./assert-benefits-verified');

function testVerifiedBenefitPassesThrough() {
  const benefit = {
    verified: true,
    missingRows: [],
    summary: { total: 7, found: 7, missing: 0 },
  };

  assert.strictEqual(assertBenefitsVerified(benefit), benefit);
}

function testMissingRowsThrow() {
  const benefit = {
    verified: false,
    missingRows: ['Lodging', 'Ambulance'],
    summary: { total: 7, found: 5, missing: 2 },
  };

  assert.throws(
    () => assertBenefitsVerified(benefit),
    (error) =>
      error instanceof Error &&
      error.message === 'Benefits verification failed. Missing rows: Lodging, Ambulance',
  );
}

function testUndefinedBenefitThrows() {
  assert.throws(
    () => assertBenefitsVerified(undefined),
    (error) =>
      error instanceof Error &&
      error.message === 'Benefits verification failed. Missing rows: unknown',
  );
}

testVerifiedBenefitPassesThrough();
testMissingRowsThrow();
testUndefinedBenefitThrows();

console.log('assert-benefits-verified.test.js: all assertions passed');
