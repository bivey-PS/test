const fs = require('fs');
const path = require('path');

function buildScenarioResult(scenario, result, error = null) {
  return {
    id: scenario.id,
    name: scenario.name,
    status: error ? 'FAIL' : 'PASS',
    error: error ? error.message : null,
    details: result || null,
  };
}

function writeReport(config, scenarioResults, meta = {}) {
  const passed = scenarioResults.filter((scenario) => scenario.status === 'PASS').length;
  const failed = scenarioResults.length - passed;
  const verified = failed === 0;
  const createdEmployerName =
    meta.createdEmployerName ||
    scenarioResults.find((scenario) => scenario.details?.employerName)?.details?.employerName ||
    null;

  const report = {
    jiraTicket: config.jiraTicket,
    suiteName: config.suiteName,
    suiteLabel: config.suiteLabel,
    baseUrl: config.baseUrl,
    createdEmployerName,
    timestamp: new Date().toISOString(),
    summary: {
      total: scenarioResults.length,
      passed,
      failed,
    },
    verified,
    success: verified,
    scenarios: scenarioResults,
    ...meta,
  };

  fs.mkdirSync(config.outputDir, { recursive: true });

  const jsonPath = path.join(config.outputDir, `${config.reportPrefix}-report.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  console.log(`Saved report: ${jsonPath}`);

  const markdownPath = path.join(config.outputDir, `${config.reportPrefix}-report.md`);
  fs.writeFileSync(markdownPath, buildMarkdownReport(report));
  console.log(`Saved report: ${markdownPath}`);

  return {
    report,
    jsonPath,
    markdownPath,
  };
}

function buildMarkdownReport(report) {
  const lines = [
    `# ${report.jiraTicket} — ${report.suiteLabel}`,
    '',
    `- **Environment:** ${report.baseUrl}`,
    `- **Created Employer:** ${report.createdEmployerName || 'n/a'}`,
    `- **Timestamp:** ${report.timestamp}`,
    `- **Result:** ${report.verified ? 'PASS' : 'FAIL'}`,
    `- **Summary:** ${report.summary.passed}/${report.summary.total} scenarios passed`,
    '',
    '| Scenario | Description | Status |',
    '| --- | --- | --- |',
  ];

  for (const scenario of report.scenarios) {
    lines.push(`| ${scenario.id} | ${scenario.name} | ${scenario.status} |`);
  }

  const failures = report.scenarios.filter((scenario) => scenario.status === 'FAIL');
  if (failures.length > 0) {
    lines.push('', '## Failures', '');
    for (const scenario of failures) {
      lines.push(`- **${scenario.id}:** ${scenario.error}`);
    }
  }

  return `${lines.join('\n')}\n`;
}

module.exports = {
  buildScenarioResult,
  writeReport,
};
