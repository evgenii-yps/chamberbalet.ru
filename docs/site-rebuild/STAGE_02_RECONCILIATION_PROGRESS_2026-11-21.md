# Stage 02 reconciliation progress — 2026-11-21

G2 is NOT READY; owner visual approval remains valid and Stage 03 is not authorized.

## Implemented and tested

- Added private baseline extraction, deterministic reconciliation plans and explicitly reviewed mapping application. Exact unique source records are identified despite reordering; ambiguous duplicates, missing records, changed records and editorial conflicts are marked for review. No working data are overwritten: outputs use exclusive creation under `.private`. Review decisions preserve IDs, prior editorial values and ticket history; a changed URL resets verification. Missing events require explicit retain/cancel plus evidence. Explicitly cancelled records are excluded from preview rendering.
- v16 source verified using existing 57-file check. On the actual baseline, plan reports 266 unchanged and zero missing. The only changed revisions used in tests are synthetic, not genuine Sites updates.
- `node --test tests/reconcile.test.mjs`: 2/2 tests pass; reordered, changed title/date/venue/URL, duplicate ambiguity, missing/cancelled, stale inputs, editorial conflict and wrong baseline tested. `npm run check`: 6/6; `npm run test:private`: 3/3; `SITES_SOURCE=… node --test tests/import-private.test.mjs tests/adapter-private.test.mjs tests/preservation-private.test.mjs tests/reconcile.test.mjs`: 5/5. Node v24.22.3, Linux/Chromium.
- Private HTTP server sends a CSP restricting outbound fetch and form submission. Chromium observed attempted external fetch blocked, no external request, and PDF request returned 404. This does not establish that all programmatic navigations are blocked. Existing review ZIP v2 was not rebuilt and does not contain this new server header.
- Existing inventory generator reproduced 40 media/font entries; route/alt/fallback provenance is not yet complete and rights remain PENDING. Windows `OPEN.cmd` is ASCII/CRLF; actual corrected launcher remains OWNER_WINDOWS_CHECK_PENDING, while owner previously verified manual v1 startup.

## Technical limitations and remaining G2 work

The new reconciliation prototype needs a version-ancestry/rollback protocol, full adversarial coverage (including duplicate insertion/deletion and out-of-order revisions), tested safe promotion and verification of a real source revision before it can be relied on as a complete workflow. Complete the per-route/alt/fallback inventory; comprehensive interaction and responsive regression matrix; full attribution of afisha screenshot differences; programmatic navigation safeguards and their tests; Windows launcher owner check. No claim of full legal rights clearance or live ticket validation is made. Venue parity and owner-approved appearance are preserved.

Stage 00 audited; Stage 01 G1 accepted; Stage 02 active; Stage 03 independent QA/legal requires G2 acceptance and separate authorization; Stage 04 release ZIP requires G3; Stage 05 production requires G4 and explicit approval; Stage 06 maintenance requires separate scope. Main, REG.RU, DNS and published Sites unchanged; no official release ZIP.
