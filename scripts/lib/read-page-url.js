/**
 * Read page.url() without throwing when the page/context is already closed.
 * Used after RECORD_VIDEO flows that must close the page to finalize the video.
 */
function readPageUrl(page, fallback = null) {
  if (!page) {
    return fallback;
  }

  try {
    if (typeof page.isClosed === 'function' && page.isClosed()) {
      return fallback;
    }

    return page.url();
  } catch {
    return fallback;
  }
}

module.exports = {
  readPageUrl,
};
