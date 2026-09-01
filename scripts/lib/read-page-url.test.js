const assert = require('assert');
const { readPageUrl } = require('./read-page-url');

function testOpenPageReturnsUrl() {
  const page = {
    isClosed: () => false,
    url: () => 'https://test.plansight.com/app#dashboard',
  };

  assert.strictEqual(
    readPageUrl(page, 'fallback'),
    'https://test.plansight.com/app#dashboard',
  );
}

function testClosedPageReturnsFallback() {
  const page = {
    isClosed: () => true,
    url: () => {
      throw new Error('should not be called');
    },
  };

  assert.strictEqual(readPageUrl(page, 'https://captured.example/before-close'), 'https://captured.example/before-close');
  assert.strictEqual(readPageUrl(page), null);
}

function testUrlThrowReturnsFallback() {
  const page = {
    isClosed: () => false,
    url: () => {
      throw new Error('Target page, context or browser has been closed');
    },
  };

  assert.strictEqual(readPageUrl(page, 'stale-safe'), 'stale-safe');
}

function testNullPageReturnsFallback() {
  assert.strictEqual(readPageUrl(null, 'none'), 'none');
  assert.strictEqual(readPageUrl(undefined, 'none'), 'none');
}

testOpenPageReturnsUrl();
testClosedPageReturnsFallback();
testUrlThrowReturnsFallback();
testNullPageReturnsFallback();

console.log('read-page-url.test.js: all assertions passed');
