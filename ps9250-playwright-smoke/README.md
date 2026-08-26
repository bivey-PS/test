# PS-9250 Smoke Test Automation (Playwright)

Automated smoke suite for **www.test.plansight.com**, implementing the
[PS-9250](https://plansight.atlassian.net/browse/PS-9250) "Smoke Test Plan"
(Minimum Gate + Full Smoke S1–S10).

> **Note on placement:** This folder was authored to be dropped into the
> `plansight` repo. It is fully self-contained (its own `package.json`) so it can
> also run standalone. Move it wherever the `plansight` team prefers (e.g. a
> `smoke/` or `tests/e2e/` directory).

## Framework

- [Playwright Test](https://playwright.dev/) (TypeScript), Chromium.

## Layout

```
ps9250-playwright-smoke/
├── package.json
├── playwright.config.ts        # baseURL from BASE_URL (default test.plansight.com)
├── tsconfig.json
├── .env.example                # copy to .env and fill credentials
└── tests/
    ├── helpers/
    │   ├── env.ts              # env-driven config (creds, group names, fixture path)
    │   ├── selectors.ts        # CENTRAL selector map — confirm against real DOM
    │   ├── resolve.ts          # SelectorSpec -> Playwright Locator
    │   ├── pages.ts            # page objects (Login, Shell, Groups, ...)
    │   └── fixtures.ts         # `broker` / `carrier` authenticated fixtures
    ├── fixtures/               # binary upload fixtures (SBC PDF)
    ├── minimum-gate.spec.ts    # PS-9250 Minimum Gate (must pass) — @min-gate
    ├── s1-auth-shell.spec.ts
    ├── s2-employer-groups.spec.ts
    ├── s3-rfp-wizard.spec.ts
    ├── s4-plansights-quotes.spec.ts
    ├── s5-side-by-side-presentation.spec.ts
    ├── s6-templates.spec.ts
    ├── s7-documents-ai.spec.ts
    ├── s8-carrier-path.spec.ts   # optional; needs CARRIER creds
    ├── s9-admin-brokerage.spec.ts
    └── s10-stability.spec.ts
```

## Setup

```bash
cd ps9250-playwright-smoke
npm install
npm run install:browsers        # installs Chromium (+ OS deps)
cp .env.example .env            # then fill in BROKER_EMAIL / BROKER_PASSWORD, etc.
```

## Run

```bash
npm test                 # full suite
npm run test:min-gate    # only the Minimum Gate (tag @min-gate)
npm run test:headed      # headed (watch it drive the browser)
npm run test:ui          # Playwright UI mode
npm run report           # open the last HTML report
```

## Credentials & data

All environment-specific values are injected via `.env` (see `.env.example`):

- `BROKER_EMAIL` / `BROKER_PASSWORD` — required for authenticated flows.
- `CARRIER_EMAIL` / `CARRIER_PASSWORD` — optional; only S8.
- `EXISTING_GROUP_NAME` / `RFP_GROUP_NAME` — which employer group to open/use.
- `SBC_PDF_PATH` — the SBC upload fixture for S3.13 (defaults to
  `tests/fixtures/sbc-sample.pdf`).
- `ALLOW_RFP_SEND=1` — opt in to actually sending an RFP in S3.7. **Default is
  off** so the suite never emails carriers.

Tests requiring missing credentials/fixtures **skip** with a clear message rather
than failing, so the suite can be listed and partially run without secrets.

## IMPORTANT — confirm selectors before first real run

Because the live DOM of `test.plansight.com` was not available when this suite
was authored, the locators in `tests/helpers/selectors.ts` are **best-guess
placeholders** based on the PS-9250 plan and the app's stack (Laravel +
jQuery/DataTables). Before relying on results:

1. Run `npm run codegen` against `https://www.test.plansight.com` to capture the
   real locators for each step.
2. Update `tests/helpers/selectors.ts` (single source of truth) accordingly.
3. Prefer stable attributes (`data-test`, `id`) over text where possible.

Steps whose exact DOM couldn't be inferred are marked with `TODO` in the specs.

## Mapping to the PS-9250 plan

| Plan section | File |
| --- | --- |
| Minimum Gate (S1.2, S2.1–2.2, S3.1–3.16) | `minimum-gate.spec.ts` |
| S1 Auth / shell | `s1-auth-shell.spec.ts` |
| S2 Employer groups | `s2-employer-groups.spec.ts` |
| S3 RFP Wizard (core path) | `s3-rfp-wizard.spec.ts` |
| S4 Plansights / quotes | `s4-plansights-quotes.spec.ts` |
| S5 Side-by-side / presentation | `s5-side-by-side-presentation.spec.ts` |
| S6 Templates | `s6-templates.spec.ts` |
| S7 Documents / AI | `s7-documents-ai.spec.ts` |
| S8 Carrier path (optional) | `s8-carrier-path.spec.ts` |
| S9 Admin / brokerage settings | `s9-admin-brokerage.spec.ts` |
| S10 Stability checks | `s10-stability.spec.ts` |

`S10.2` (stage worker logs) is marked `fixme` — it needs out-of-band log access
and is not automatable from the browser.
