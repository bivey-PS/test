/**
 * Decide whether PS-9250 S3.1 (Basics wizard loaded) should PASS.
 *
 * Matching #rfpBuilderBasics alone is not enough — startNewRfpBasicsTab already
 * navigates there, so a URL-only check always passed when the form shell never
 * rendered (stuck Loading..., blank wizard, error overlay).
 */
function evaluateBasicsWizardLoaded({ url, visibleMarkerFound }) {
  const onBasicsUrl = typeof url === 'string' && url.includes('#rfpBuilderBasics');
  const hasVisibleMarker = Boolean(visibleMarkerFound);
  const pass = onBasicsUrl && hasVisibleMarker;

  return {
    pass,
    url: url || null,
    onBasicsUrl,
    visibleMarkerFound: hasVisibleMarker,
    failReason: !onBasicsUrl
      ? 'Basics wizard URL did not load after Start New RFP'
      : !hasVisibleMarker
        ? 'Basics tab or Basics wizard fields did not appear after Start New RFP'
        : null,
  };
}

module.exports = {
  evaluateBasicsWizardLoaded,
};
