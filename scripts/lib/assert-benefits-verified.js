/**
 * Fail closed when Cancer benefits Plan Group verification did not find every row.
 * Used by login automation (headed + headless) so a missing row cannot exit 0.
 */
function assertBenefitsVerified(benefit) {
  if (benefit?.verified) {
    return benefit;
  }

  const missing = Array.isArray(benefit?.missingRows)
    ? benefit.missingRows.join(', ')
    : 'unknown';

  throw new Error(`Benefits verification failed. Missing rows: ${missing}`);
}

module.exports = {
  assertBenefitsVerified,
};
