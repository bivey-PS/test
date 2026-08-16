/**
 * Decide whether PS-9250 S3.8 found the RFP created for the current Denver day.
 *
 * Matching yesterday's dated row is not enough — after a prior-day Minimum Gate
 * run those rows remain in the table, so a today-or-yesterday prefix list could
 * PASS even when today's RFP never appeared.
 */
function evaluateRequestForProposalsRfpRowMatch({ rfpNames, expectedPrefix }) {
  const names = Array.isArray(rfpNames) ? rfpNames : [];
  const prefix = typeof expectedPrefix === 'string' ? expectedPrefix : '';
  const matchedName = prefix
    ? names.find((name) => typeof name === 'string' && name.startsWith(prefix)) || null
    : null;

  return {
    pass: Boolean(matchedName),
    matchedName,
    expectedPrefix: prefix || null,
    failReason: matchedName
      ? null
      : `No Request for Proposals row found matching "${prefix || 'unknown'}*". Found: ${
          names.slice(0, 5).join(' | ') || 'none'
        }`,
  };
}

module.exports = {
  evaluateRequestForProposalsRfpRowMatch,
};
