# PS-9250 smoke suite — packaged for the `plansight` repo

This folder contains the PS-9250 Playwright smoke suite packaged so it can be
moved into the `plansight` repo without access to this VM. Pick whichever format
you prefer.

Source branch: `cursor/ps-9250-playwright-smoke-10ba` (PR #17 on `bivey-PS/test`).

## Option A — Tarball (simplest)

`ps9250-playwright-smoke.tar.gz` contains the whole self-contained project
(no `node_modules`).

```bash
# from the root of your plansight checkout, on a new branch
git checkout -b cursor/ps-9250-playwright-smoke
tar xzf /path/to/ps9250-playwright-smoke.tar.gz     # creates ./ps9250-playwright-smoke/
git add ps9250-playwright-smoke
git commit -m "Add PS-9250 Playwright smoke suite"
git push -u origin cursor/ps-9250-playwright-smoke
```

## Option B — Patch series (preserves the two commits + messages)

`patches/0001-*.patch` and `patches/0002-*.patch` are a `git format-patch`
series scoped to the `ps9250-playwright-smoke/` folder.

```bash
# from the root of your plansight checkout, on a new branch
git checkout -b cursor/ps-9250-playwright-smoke
git am /path/to/patches/0001-*.patch /path/to/patches/0002-*.patch
git push -u origin cursor/ps-9250-playwright-smoke
```

If `git am` complains, use the squashed diff instead:

```bash
git apply /path/to/ps9250-playwright-smoke.squashed.diff
git add ps9250-playwright-smoke && git commit -m "Add PS-9250 Playwright smoke suite"
```

## After importing (either option)

```bash
cd ps9250-playwright-smoke
npm install
npm run install:browsers
cp .env.example .env         # fill BROKER_EMAIL / BROKER_PASSWORD, group names, SBC_PDF_PATH
npm run test:min-gate        # or: npm test
```

Notes:
- Target defaults to `https://test.plansight.com`; auth is Auth0 (identifier-first,
  redirects to `devauth.plansight.com`). Runners need egress to both hosts.
- Login selectors are confirmed live; other selectors are placeholders — confirm
  with `npm run codegen` and update `tests/helpers/selectors.ts`.
