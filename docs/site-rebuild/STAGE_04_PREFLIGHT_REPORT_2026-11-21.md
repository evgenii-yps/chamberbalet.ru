# Stage 04 technical preflight — 2026-11-21

**PARTIALLY BLOCKED. G3 NOT ACCEPTED; G4 NOT ACCEPTED; NOT DEPLOYED.**

## Source and candidate

- Stage 04 feature branch starts from accepted G2 `d533bf086eb1d5455fd9c383d22ffda22f148f30`. Preflight build implementation: `6e4bcd82a6311c8ecf466685ea4f70b7fad19cd8`; original Sites `329a00aec044a5bf10d96386f953efe1369f9bb1`. G2 v3 archive downloaded from its owner-only location, size 5,311,687, SHA-256 `083cd2bbef16f33135e2b9772752ae1654163f5357c1f17fb967d4d992bb0977`. The build checked the exact source commit and all 57 source sizes/SHA-256.
- The private local review candidate contains all 71 original G2 ZIP files byte-for-byte, plus a Russian Stage 04 README and manifest. Both venue PDFs remain included, but the accepted private server deliberately blocks PDF, ticket and contact actions; noindex, local preview protections and review restrictions remain. It is not a future-hosting build and must not be deployed. No ready production-mode output or host-specific configuration was generated.
- Two clean builds produced matching file manifests; 72 listed files verified. Local review ZIP: 5,317,120 bytes, SHA-256 `b0014246ca4f9e48746d8be2098fdb75f3c3e333f83d08880728985dbc89affb`. Locally extracted manifest verified, seven routes returned 200 and a missing route returned 404. Owner access to this new ZIP has NOT been demonstrated.
- Automated approval review rejected upload of the Stage 04 ZIP to the owner-only Drive folder, stating the available authorization was for Stage 02 and did not authorize Stage 04. The assignment explicitly requested that delivery, but the actual upload is blocked; no Drive link or downloaded-copy verification is claimed.

## Actual test evidence

- Full-page Chromium screenshots, fixed date and reduced motion: 7 routes × 5 widths against the accepted G2 archive, 70 HTTP 200 responses, no reported JS errors or horizontal overflow. 32/35 pixel-identical; differences: afisha 1024px 35,641 pixels, afisha 320px 10,873 pixels, people 1440px 476 pixels. Exact G2 files are byte-identical, but these screenshot differences were not attributed; no perfect visual parity claim is made. Image evidence stays private.
- Chromium interaction script: seven routes and mobile touch/Escape; 27 cities × 42 dates, reset and ordering; 15 biographies with content, focus trap/restoration and Escape; missing-photo and desktop backdrop; live reduced-motion, intro skip/replay; blocked PDF and 404. Separate failure test: portrait, font and video failure fallbacks passed. MP4 returned 206 for a 0–99 byte range. Seven internal targets and browser back/forward were tested. These are local tests, not REG.RU hosting evidence.
- Original 266 events and 15 profiles remain in the accepted private data and page scripts; no content was intentionally removed. Rights and factual accuracy are not established by these tests.

## Host and rollback

No authenticated REG.RU connector/account access was available. `HOST_ACCESS_NOT_AVAILABLE`; product, document roots, server, DNS/TLS, files, databases, backup, cache and configuration are NOT VERIFIED. Public read attempt returned proxy CONNECT 403; this is not a hosting diagnosis. `BACKUP_NOT_EXECUTED`: no genuine live-site backup or isolated restoration of that backup was performed. The [runbook](STAGE_04_HOSTING_RUNBOOK_2026-11-21.md) gives the read-only inspection, backup, restoration rehearsal, future cutover and rollback stop conditions and legal-document map. D01/D02/D04 remain deferred, not approved.

No `main`, REG.RU, DNS or published Sites changes; no official production release ZIP; no deployment. Stage 05/06 not authorized.
