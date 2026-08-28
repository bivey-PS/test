# Test fixtures

Place binary upload fixtures here.

## `sbc-sample.pdf`
Referenced by S3.13 / the Minimum Gate ("Doc - SBC Silver 5000 ValueCareTest.pdf").
Drop a small sample SBC PDF here named `sbc-sample.pdf`, or point `SBC_PDF_PATH`
in your `.env` at any PDF on disk.

The Minimum Gate **fails** (does not soft-skip) when this fixture is missing —
quote upload is required for a green gate. Non-gate smoke specs (e.g. S7) may
still skip upload steps when the fixture is absent.
