import * as path from 'path';

/**
 * Centralized, env-driven configuration for the PS-9250 smoke suite.
 * All environment-specific values live here so specs stay portable when this
 * folder is dropped into the `plansight` repo.
 */
export const env = {
  baseUrl: process.env.BASE_URL ?? 'https://test.plansight.com',

  broker: {
    email: process.env.BROKER_EMAIL ?? '',
    password: process.env.BROKER_PASSWORD ?? '',
  },
  carrier: {
    email: process.env.CARRIER_EMAIL ?? '',
    password: process.env.CARRIER_PASSWORD ?? '',
  },

  existingGroupName: process.env.EXISTING_GROUP_NAME ?? '',
  rfpGroupName: process.env.RFP_GROUP_NAME ?? process.env.EXISTING_GROUP_NAME ?? '',

  testRfpPrefix: process.env.TEST_RFP_PREFIX ?? 'ZZ-SMOKE-DO-NOT-SEND',

  sbcPdfPath:
    process.env.SBC_PDF_PATH ??
    path.join(__dirname, '..', 'fixtures', 'sbc-sample.pdf'),

  allowRfpSend: process.env.ALLOW_RFP_SEND === '1',
};

export function hasBrokerCreds(): boolean {
  return Boolean(env.broker.email && env.broker.password);
}

export function hasCarrierCreds(): boolean {
  return Boolean(env.carrier.email && env.carrier.password);
}

/** Unique, clearly-flagged RFP name so smoke runs never collide or look real. */
export function uniqueRfpName(): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `${env.testRfpPrefix} ${stamp}`;
}
