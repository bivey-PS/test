/**
 * Pure helpers for PS-9250 S3.8 / S3.9 RFP row verification.
 *
 * When a wizard rfpId is known, only that id may satisfy the check.
 * Falling back to today-or-yesterday name prefixes lets a prior-day Minimum
 * Gate RFP false-PASS when today's row never appears (or when rfpId was
 * still "/none" at S3.1 and never refreshed after save).
 */

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractRfpIdFromUrl(url) {
  if (!url || typeof url !== 'string') {
    return null;
  }

  const match = url.match(/\/group\/[^/]+\/([^/#?]+)/);
  if (!match || match[1] === 'none') {
    return null;
  }

  return match[1];
}

function hrefMatchesRfpId(href, rfpId) {
  if (!href || !rfpId) {
    return false;
  }

  // Require a path segment boundary so id "12" does not match "/123".
  return new RegExp(`/${escapeRegExp(rfpId)}(?:[#/?]|$)`).test(href);
}

function evaluateRequestForProposalsRfpRowMatch({
  rfpNames,
  expectedPrefix,
  rfpId = null,
  rowHrefByName = null,
}) {
  const names = Array.isArray(rfpNames) ? rfpNames : [];
  const prefix = typeof expectedPrefix === 'string' ? expectedPrefix : '';

  if (rfpId) {
    const hrefMap = rowHrefByName && typeof rowHrefByName === 'object' ? rowHrefByName : {};
    const matchedName =
      names.find((name) => {
        const href = hrefMap[name];
        return hrefMatchesRfpId(href, rfpId);
      }) || null;

    return {
      pass: Boolean(matchedName),
      matchedName,
      expectedPrefix: prefix || null,
      rfpId,
      failReason: matchedName
        ? null
        : `No Request for Proposals row found for RFP id "${rfpId}". Found: ${
            names.slice(0, 5).join(' | ') || 'none'
          }`,
    };
  }

  const matchedName = prefix
    ? names.find((name) => typeof name === 'string' && name.startsWith(prefix)) || null
    : null;

  return {
    pass: Boolean(matchedName),
    matchedName,
    expectedPrefix: prefix || null,
    rfpId: null,
    failReason: matchedName
      ? null
      : `No Request for Proposals row found matching "${prefix || 'unknown'}*". Found: ${
          names.slice(0, 5).join(' | ') || 'none'
        }`,
  };
}

module.exports = {
  escapeRegExp,
  extractRfpIdFromUrl,
  hrefMatchesRfpId,
  evaluateRequestForProposalsRfpRowMatch,
};
