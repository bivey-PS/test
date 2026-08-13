const assert = require('assert');
const { evaluateBasicsWizardLoaded } = require('./basics-wizard');

function testBasicsWizardRequiresVisibleMarkerNotJustUrl() {
  const urlOnly = evaluateBasicsWizardLoaded({
    url: 'https://test.plansight.com/group/abc/def#rfpBuilderBasics',
    visibleMarkerFound: false,
  });
  assert.strictEqual(
    urlOnly.pass,
    false,
    'URL #rfpBuilderBasics alone must not pass without a visible Basics marker',
  );
  assert.strictEqual(urlOnly.onBasicsUrl, true);
  assert.strictEqual(urlOnly.visibleMarkerFound, false);
  assert.strictEqual(
    urlOnly.failReason,
    'Basics tab or Basics wizard fields did not appear after Start New RFP',
  );

  const wrongUrl = evaluateBasicsWizardLoaded({
    url: 'https://test.plansight.com/group/abc/def#groupUpdate',
    visibleMarkerFound: true,
  });
  assert.strictEqual(wrongUrl.pass, false);
  assert.strictEqual(
    wrongUrl.failReason,
    'Basics wizard URL did not load after Start New RFP',
  );

  const loaded = evaluateBasicsWizardLoaded({
    url: 'https://test.plansight.com/group/abc/def#rfpBuilderBasics',
    visibleMarkerFound: true,
  });
  assert.strictEqual(loaded.pass, true);
  assert.strictEqual(loaded.failReason, null);
}

function run() {
  testBasicsWizardRequiresVisibleMarkerNotJustUrl();
  console.log('critical-bugs.test.js: all assertions passed');
}

run();
