const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  cookieDomainMatchesHost,
  authStateMatchesBaseUrl,
} = require('./plansight-login');
const { evaluateQuotesAvailability } = require('./quotes-availability');

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
    'Quotes tab loaded but no carrier/quote content detected',
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

function run() {
  testCookieDomainExactHostOnly();
  testAuthStateRejectsSiblingEnvParentCookies();
  testQuotesAvailabilityRequiresPositiveSignals();
  console.log('critical-bugs.test.js: all assertions passed');
}

run();
