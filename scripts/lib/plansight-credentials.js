const DEFAULT_LOGIN_USERNAME = 'b.ivey@plansight.com';

function getLoginCredentials(overrides = {}) {
  const username =
    overrides.username ||
    process.env.LOGIN_USERNAME ||
    process.env.LOGIN_EMAIL ||
    DEFAULT_LOGIN_USERNAME;

  return {
    username,
    password: overrides.password || process.env.LOGIN_PASSWORD,
    mfaCode: overrides.mfaCode || process.env.MFA_CODE,
  };
}

function requireLoginPassword(credentials, usageExample) {
  if (!credentials.password) {
    console.error('Missing LOGIN_PASSWORD. Set environment variables before running:');
    console.error(`  ${usageExample}`);
    console.error('  MFA_CODE=123456 (required on first login or when saved session expires)');
    console.error(`  LOGIN_USERNAME=${DEFAULT_LOGIN_USERNAME} (default, override if needed)`);
    process.exit(1);
  }

  if (!credentials.username.includes('@')) {
    console.error('LOGIN_USERNAME must be a full email address (Auth0 rejects usernames without @).');
    console.error(`Received: ${credentials.username}`);
    process.exit(1);
  }
}

module.exports = {
  DEFAULT_LOGIN_USERNAME,
  getLoginCredentials,
  requireLoginPassword,
};
