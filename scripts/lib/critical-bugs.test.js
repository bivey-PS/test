const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  cookieDomainMatchesHost,
  authStateMatchesBaseUrl,
  isLoggedIn,
  isPlansightAppHost,
  isPostPasswordAuthDestination,
} = require('./plansight-login');
const { evaluateQuotesAvailability } = require('./quotes-availability');
const { shouldRunWizard } = require('./run-wizard');

function testCookieDomainExactHostOnly() {
  assert.strictEqual(
    cookieDomainMatchesHost('jeff.plansight.com', 'jeff.plansight.com'),
    true,
  );
  assert.strictEqual(
    cookieDomainMatchesHost('.jeff.plansight.com', 'jeff.plansight.com'),
    true,
  );
  assert.strictEqual(
    cookieDomainMatchesHost('.plansight.com', 'jeff.plansight.com'),
    false,
    'parent-domain cookies must not authorize sibling env reuse',
  );
  assert.strictEqual(
    cookieDomainMatchesHost('test.plansight.com', 'jeff.plansight.com'),
    false,
  );
  assert.strictEqual(cookieDomainMatchesHost('.com', 'jeff.plansight.com'), false);
  assert.strictEqual(cookieDomainMatchesHost(undefined, 'jeff.plansight.com'), false);
}

function testAuthStateRejectsSiblingEnvParentCookies() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'auth-state-'));
  const authPath = path.join(dir, 'auth-state.json');

  fs.writeFileSync(
    authPath,
    JSON.stringify({
      origins: [],
      cookies: [
        {
          name: 'session',
          value: 'abc',
          domain: '.plansight.com',
          path: '/',
        },
      ],
    }),
  );

  assert.strictEqual(
    authStateMatchesBaseUrl('https://jeff.plansight.com', authPath),
    false,
    'auth state from parent-domain cookies must not match jeff',
  );

  fs.writeFileSync(
    authPath,
    JSON.stringify({
      origins: [],
      cookies: [
        {
          name: 'session',
          value: 'abc',
          domain: 'jeff.plansight.com',
          path: '/',
        },
      ],
    }),
  );

  assert.strictEqual(
    authStateMatchesBaseUrl('https://jeff.plansight.com', authPath),
    true,
  );

  fs.writeFileSync(
    authPath,
    JSON.stringify({
      origins: [{ origin: 'https://jeff.plansight.com', localStorage: [] }],
      cookies: [],
    }),
  );

  assert.strictEqual(
    authStateMatchesBaseUrl('https://jeff.plansight.com', authPath),
    true,
  );

  fs.rmSync(dir, { recursive: true, force: true });
}

function testQuotesAvailabilityRequiresPositiveSignals() {
  const emptyGrid = evaluateQuotesAvailability(
    'Quotes Medical Dental Loading...',
    'https://jeff.plansight.com/group/abc/def#gridInit/medical',
  );
  assert.strictEqual(
    emptyGrid.pass,
    false,
    'URL #gridInit/ alone must not pass without quote content',
  );
  assert.strictEqual(
    emptyGrid.failReason,
    'Quotes tab loaded but no quote content detected',
  );

  const chromeOnly = evaluateQuotesAvailability(
    'Quotes Carrier Plan Premium $0 Medical Dental',
    'https://jeff.plansight.com/group/abc/def#gridInit/medical',
  );
  assert.strictEqual(
    chromeOnly.pass,
    false,
    'Carrier column + $ amounts must not pass without quote rows',
  );

  const explicitEmpty = evaluateQuotesAvailability(
    'No quotes available for this RFP',
    'https://jeff.plansight.com/group/abc/def#gridInit/medical',
  );
  assert.strictEqual(explicitEmpty.pass, false);
  assert.strictEqual(explicitEmpty.noQuotesAvailable, true);

  const withQuotes = evaluateQuotesAvailability(
    'Quote Received Current Plan Carrier Acme $1,234',
    'https://jeff.plansight.com/group/abc/def#gridInit/medical',
  );
  assert.strictEqual(withQuotes.pass, true);
  assert.strictEqual(withQuotes.failReason, null);
}

function testWizardIsOptInOnly() {
  assert.strictEqual(shouldRunWizard(undefined), false);
  assert.strictEqual(shouldRunWizard(''), false);
  assert.strictEqual(shouldRunWizard('0'), false);
  assert.strictEqual(shouldRunWizard('false'), false);
  assert.strictEqual(shouldRunWizard('1'), true);
}

function testIsLoggedInRequiresRealPlansightHost() {
  assert.strictEqual(isLoggedIn('https://jeff.plansight.com/app#dashboard'), true);
  assert.strictEqual(isLoggedIn('https://test.plansight.com/app#dashboard'), true);
  assert.strictEqual(isLoggedIn('https://plansight.com/'), true);
  assert.strictEqual(isLoggedIn('https://devauth.plansight.com/u/login/password'), false);
  assert.strictEqual(
    isPlansightAppHost('notplansight.com'),
    false,
    'substring hosts must not count as logged in',
  );
  assert.strictEqual(isLoggedIn('https://notplansight.com/'), false);
  assert.strictEqual(isLoggedIn('https://plansight.com.evil.com/'), false);
  assert.strictEqual(isLoggedIn('https://jeff.plansight.com.evil.com/'), false);
  assert.strictEqual(isLoggedIn('https://myplansight.com/'), false);
}

function testPostPasswordWaitDoesNotMatchPasswordPage() {
  const passwordUrl = 'https://devauth.plansight.com/u/login/password';
  const legacyPattern = /\/u\/(mfa-sms-challenge|login\/)/;

  assert.strictEqual(
    legacyPattern.test(passwordUrl),
    true,
    'precondition: legacy pattern matched the password URL (the bug)',
  );
  assert.strictEqual(
    isPostPasswordAuthDestination(passwordUrl),
    false,
    'still on password page must keep waiting',
  );
  assert.strictEqual(
    isPostPasswordAuthDestination('https://devauth.plansight.com/u/mfa-sms-challenge'),
    true,
  );
  assert.strictEqual(
    isPostPasswordAuthDestination('https://jeff.plansight.com/app#dashboard'),
    true,
  );
  assert.strictEqual(
    isPostPasswordAuthDestination('https://devauth.plansight.com/u/login/identifier'),
    false,
  );
}

function run() {
  testCookieDomainExactHostOnly();
  testAuthStateRejectsSiblingEnvParentCookies();
  testQuotesAvailabilityRequiresPositiveSignals();
  testWizardIsOptInOnly();
  testIsLoggedInRequiresRealPlansightHost();
  testPostPasswordWaitDoesNotMatchPasswordPage();
  console.log('critical-bugs.test.js: all assertions passed');
}

run();
