const fs = require('fs');
const path = require('path');
const config = require('./config');

const COUNTER_FILE = path.join(config.outputDir, 'ps-9250-run-counter.json');

function readCounter() {
  try {
    if (fs.existsSync(COUNTER_FILE)) {
      return JSON.parse(fs.readFileSync(COUNTER_FILE, 'utf8'));
    }
  } catch {
    // fall through to default
  }

  return { runNumber: 0 };
}

function getNextRunNumber() {
  fs.mkdirSync(config.outputDir, { recursive: true });
  const data = readCounter();
  const runNumber = (data.runNumber || 0) + 1;

  fs.writeFileSync(
    COUNTER_FILE,
    JSON.stringify(
      {
        runNumber,
        updatedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  );

  console.log(`PS-9250 run counter: ${runNumber} (saved to ${COUNTER_FILE})`);
  return runNumber;
}

module.exports = {
  COUNTER_FILE,
  getNextRunNumber,
  readCounter,
};
