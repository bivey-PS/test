function evaluateQuotesAvailability(bodyText, url) {
  const noQuotesAvailable = /no quotes available/i.test(bodyText);
  const noPlanOptions = /no medical plan options found/i.test(bodyText);
  const hasQuoteSignals =
    /quote received|current plan|renewal plan/i.test(bodyText) ||
    (/carrier/i.test(bodyText) && /\$[\d,]+/.test(bodyText));

  // Require positive quote signals. Matching #gridInit/ alone is not enough —
  // openQuotesTab already navigates there, so a URL-only check always passed.
  const pass = !noQuotesAvailable && !noPlanOptions && hasQuoteSignals;

  return {
    pass,
    url,
    noQuotesAvailable,
    noPlanOptions,
    hasQuoteSignals,
    failReason: noQuotesAvailable
      ? 'Body contains "no quotes available"'
      : noPlanOptions
        ? 'No medical plan options / incomplete RFP builder state'
        : !hasQuoteSignals
          ? 'Quotes tab loaded but no carrier/quote content detected'
          : null,
  };
}

module.exports = {
  evaluateQuotesAvailability,
};
