/**
 * Helpers for exact RFP Name matching in the Marketing / Request for Proposals table.
 *
 * Playwright's string `hasText` is a case-insensitive substring match, so locating
 * "Ace Testing 2026-08-22 Automation 1" also matches "... Automation 10" and
 * "... Automation 11". After the run counter resets (or a fresh checkout without
 * the counter file) while older numbered RFPs remain on the employer, S3.9 can
 * open the wrong draft and mutate it in later quote steps.
 */

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function exactRfpNamePattern(name) {
  return new RegExp(`^${escapeRegExp(name)}$`);
}

function findExactRfpName(rfpNames, expectedName) {
  if (!expectedName || !Array.isArray(rfpNames)) {
    return null;
  }

  return rfpNames.find((name) => name === expectedName) || null;
}

function substringRfpNameMatches(rfpNames, expectedName) {
  if (!expectedName || !Array.isArray(rfpNames)) {
    return [];
  }

  const needle = expectedName.toLowerCase();
  return rfpNames.filter(
    (name) => typeof name === 'string' && name.toLowerCase().includes(needle),
  );
}

module.exports = {
  escapeRegExp,
  exactRfpNamePattern,
  findExactRfpName,
  substringRfpNameMatches,
};
