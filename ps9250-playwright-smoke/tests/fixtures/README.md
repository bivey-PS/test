# Test fixtures

Place binary upload fixtures here.

## `sbc-sample.pdf`
Referenced by S3.13 / the Minimum Gate ("Doc - SBC Silver 5000 ValueCareTest.pdf").
Drop a small sample SBC PDF here named `sbc-sample.pdf`, or point `SBC_PDF_PATH`
in your `.env` at any PDF on disk.

If no fixture is present, the upload steps skip themselves with a clear message
rather than failing, so the rest of the suite can still run.
