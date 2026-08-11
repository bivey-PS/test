/**
 * Wizard mutates draft RFPs via Save & Continue. Keep it opt-in only.
 */
function shouldRunWizard(envValue) {
  return envValue === '1';
}

module.exports = {
  shouldRunWizard,
};
