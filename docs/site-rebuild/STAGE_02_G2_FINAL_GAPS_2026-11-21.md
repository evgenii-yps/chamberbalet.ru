# CODEX — STAGE 02 FINAL G2 CORRECTION PACKAGE (AFTER CHECKPOINT 4ebddace)

Date: 2026-11-21
Project: Chamberbalet v16 rebuild of chamberbalet.ru
Status: **STAGE 02 ACTIVE / G2 NOT ACCEPTED / STAGE 03 NOT AUTHORIZED**
Repository: https://github.com/evgenii-yps/chamberbalet.ru (PUBLIC)
Continue current feature branch: `feat/site-v16-stage02-full-implementation`
Last verified branch HEAD: `4ebddaceeaaed920d1b2e3f644da5e1b3672f68a` (fetch/recheck before editing).
Legacy main verified: `aff98db8fbe7865a96992b1f7288764f311075a6` (must remain unchanged).
Source of visual truth: Sites v16 Git commit `329a00aec044a5bf10d96386f953efe1369f9bb1`, 57 hash/size verified files.
Notion source of task decisions: https://app.notion.com/p/41eafb0a249f81a1ae10c7c271913273
Prior full assignment: `docs/site-rebuild/STAGE_02_G2_TECHNICAL_CLOSEOUT_2026-11-21.md`
Current factual checkpoint: `docs/site-rebuild/STAGE_02_TECHNICAL_PROGRESS_2026-11-21.md`
Private latest Windows review package: https://drive.google.com/file/d/16H0WFfOjC2cvr-JPXBarkRcvwQJfVyEv/view?usp=drivesdk (owner-only; v2; 3,692,225 bytes; reported SHA256 8cbbc159be306f1798cfaa79b54121b03cdfd68726fa06ec169b1242f2b24c82).

## 1. Preserve all accepted progress

The owner successfully viewed the real Sites v16 locally on Windows and approved the visual result with "Все ок давай делать дальше". Do NOT redesign any page, replace verified source content with placeholders, or re-run Stage 00/01. The owner approved the VISUAL preview, not legal publication or technical G2.

Existing Stage 02 progress documented in code and report:
- Private Sites import checks 57 hashes and imports 266 source show records (168 touring, 98 home) and 15 People (2 leaders, 14 portraits and one absent-photo placeholder).
- Per-link fields distinguish source_recorded, syntax_checked, live_checked, owner_approved, and default live/owner to false. Recorded tickets: **265 source records with a link, 119 distinct event ticket URL strings, 1 no link**. The historical Stage 00 count of **120 unique external URLs across the entire site** uses a different scope; do not conflate them.
- Full-page Chromium baseline on five sizes reports five pixel-identical routes (home, repertoire, nutcracker, swan-lake, people). Afisha and venues have deviations. No JS page errors or horizontal overflow were reported in that run.
- Six fixture tests, three private tests and one importer test passed per Codex logs; existing tests do not prove all requested interactions.
- Legacy root `scripts/build.mjs` now fails before writing/deleting files. This does NOT mean a production pipeline exists.
- Corrected Windows launcher packaged as ASCII/CRLF and tested with Linux mocking, not in real Windows.
- v2 review ZIP is in the **owner-only** Drive folder; do not delete or overwrite v1. No production upload.

Read the latest reports, full previous assignment, Notion decisions, project instruction and code before making changes. These facts are prior Codex claims checked against GitHub source/reports; rerun tests for the new final candidate rather than silently inheriting pass status.

## 2. P0 — Diagnose unexpected visual differences without redesign

Reproduce entire-page screenshot comparisons for `afisha.html` and `venues.html` at 1440, 1024, 768, 390, 320 against exact v16 (fixed clock, same fonts, media readiness and motion settings):
- **Afisha:** expected date selector is a deliberate approved preview change; quantify/attribute every other difference (especially 33 px extra height on phone) and explain whether affected layout behavior is intentional.
- **Venues:** previous run reports 308–312 changed pixels per viewport; this is NOT explained. Isolate DOM/layout/font/image/styling and timing differences. Do not dismiss as harmless until root cause known. Fix only verified unintended regressions; preserve approved visual baseline.
- Capture true full-page static and interaction states (plus screenshots metadata and diff stats), store protected screenshots in PRIVATE workspace only. Publish redacted/non-sensitive findings, not image/media bytes.
- Investigate when data/safety code causes differences, e.g., disabling links by removing href, but do not presuppose that mechanism is the cause.

## 3. P1 — Real stable data identity and working maintainable content pipeline

Current `foundation/scripts/import-private.mjs` produces IDs `event-<sha256(JSON record)>-<occurrence>`. This is deterministic but changes when show date/venue/text changes. The imported `foundation/.private/data/events.json` and `people.json` are NOT consumed by rendered pages; `build-private.mjs` still copies `show-schedule.js` and `people-module/theatre-people.js`.

Implement a private, reviewed identity registry or equivalent non-destructive crosswalk:
- Assign immutable stable event IDs retained across edits, keyed to source and a durable registry; distinguish genuine changes, reordered records, cancellations, repeated same-show sessions and duplicates. Fuzzy matches are proposals only and require explicit reviewed resolution; never silently merge/delete. Test edit/reorder/duplicate/cancel scenarios. Keep source-record SHA and source-position traceability as metadata (not as immutable identity).
- Preserve raw full 266 records and 168/98 counts BEFORE time filtering for this checked source revision; future source revisions must be reconciled explicitly, not forced back to historical counts.
- People: stable IDs/roles/biographies/portrait references with protected fields privately retained. Avoid public Git export of sensitive/protected content.
- Make the structured source-derived data layer actually drive the PREVIEW rendering or a demonstrably working, safe build-time adapter. Do NOT rely exclusively on the old JS literal arrays as the authoritative future authoring workflow. Keep exact original markup, cards, dates, filtering and visuals for the accepted revision. If compiled JS insertion is necessary, make it deterministic with robust contract checks, fail on changed source syntax and validate output parity. Do NOT report "maintainable" merely because the importer exports unused JSON.
- Implement an editing and validation workflow, rollback and source-to-output checks (record counts/IDs), including safe invalid input and missing record behavior.
- Keep ticket destination status per RECORD and URL in separate dimensions: source recorded, URL syntax, actual network checked with evidence/date, owner explicitly approved. HTTPS validity alone does not establish working links. Unknown/past/sold-out states remain safely disabled for publication.
- **Do not browse/activate/claim external links live** unless actually authorized and independently checked. The original 120 whole-site URLs are still UNVERIFIED_NETWORK due to prior proxy 403.

## 4. P2 — Complete the asset rights and interaction matrices

- For EVERY real local source asset and each place used on seven routes, create source path/hash, usage by route/component, image dimensions where relevant, alt/caption editorial state, rightsholder/license/documentation status, missing/fallback and release eligibility. Distinguish technical source hash verification from legal rights. Rights unknown => PENDING, not "approved". For dynamic image/video paths, inspect JS references and runtime usage, not only static HTML.
- Verify mobile + desktop for ALL 15 People cards: whole portrait click, centered `Биография` hover/focus overlay without rectangle, touch affordance, Escape/close button, desktop backdrop when available, focus trapping and restoration, scroll lock, no-photo case.
- Verify schedule city/date combination, reset/empty date, no-results, source records and timezone handling, active past/future/sold-out states, semantically correct count after filters.
- Video intro initial ready/autoplay restriction/skip/replay/error fallback and LIVE prefers-reduced-motion switch; responsive menu focus/Enter/Escape/touch, keyboard navigation, 404, missing assets and external/PDF/contact-action guards.
- Prevent unsafe public actions at BUILD/SERVER level where possible: current `private-safety.js` is client-side DOM href stripping and **not sufficient proof** that no programmatic outbound action can fire. Validate all generated pages and routes, fail closed on any unapproved destination and media rights. No default public build or public preview exposing unapproved source.

## 5. P3 — Verify the repaired Windows launcher and owner review package

Inspect the corrected ASCII/CRLF `OPEN.cmd` and generated package `ОТКРЫТЬ.cmd`; confirm the generator correctly copies/names the launcher module `review-launcher.mjs` as `launcher.mjs` and includes `server.mjs`. Test paths with Russian characters and spaces, nested extraction, Node 20/24, occupied port and browser startup. Run genuine Windows tests when a Windows environment is available; otherwise mark actual Windows launcher behavior **UNVERIFIED** and request a simple one-time owner check rather than claiming success. Owner's previous `node server.mjs` manual start is confirmed functional on Windows.

If generating v3, retain v1 and v2; upload only to previously authorized owner-only Drive folder `1vXTUEUElI97DMYo_m69EzWDLdoqwA3bT` AFTER verifying the folder and destination file permissions, size, SHA256 and ZIP integrity. Avoid needless new packages if v2 is valid. Do not make public sharing links; no changes to published Sites or REG.RU.

## 6. Evidence and gate

Provide a single comprehensive G2 evidence report with exact code commits, test commands/exit codes, source-to-rendering identity/count matrix, per-asset rights status, full-page screenshot diff causes, interaction matrix, Windows launcher evidence or explicit owner check needed, security/privacy scan and all residual blockers. Update Notion task and project source links. Keep original source, protected images/video/bios, screenshots and generated private data out of PUBLIC repo. Do not claim these later publication blockers solved by code tests: rights permissions, public legal PDFs, factual accuracy/live ticket links, actual REG.RU config, verified backup and rollback.

G2 may be recommended to the owner ONLY after a real maintainable data feed, source parity and interaction evidence are demonstrated, unexplained deviations are resolved and all material G2 requirements are reconciled. Owner already approved the visual baseline; ask only for owner-only final checks that truly require owner observation (e.g., corrected Windows launcher). **Do not self-accept G2. Stop and report in Russian.**

## 7. Full roadmap / no automatic stage transition

Stage 00 — DONE: source provenance/audit, original Sites Git v16 commit and 57 SHA256, limited saved-tar waiver for nonpublic work.
Stage 01 — DONE and G1 accepted: seven-route static foundation, schemas, tests, private preview scaffolding.
**Stage 02 — ACTIVE and ONLY AUTHORIZED:** finish P0–P3, close real G2 technical gaps, preserve approved design, submit G2 evidence for owner approval.
Stage 03 — NOT AUTHORIZED: independent browser/a11y/SEO/privacy QA, event/editorial current facts, real ticket-link ownership/availability, publication rights, legal PDF approvals; only with separate owner authorization after G2.
Stage 04 — NOT AUTHORIZED: reproducible REG.RU release ZIP with correct archive root, signed/hash manifest, actual hosting readiness, verified complete backup and rollback; only after G3 and owner authorization.
Stage 05 — NOT AUTHORIZED: owner-approved manual REG.RU deployment, new site replaces old only after verified backup/rollback; only after G4 and specific go-live authorization.
Stage 06 — NOT AUTHORIZED: maintenance and separately scoped release tasks after G5.

Hard rules: do not modify `main`, REG.RU production, DNS or published Sites. Do not create an official release ZIP. Do not expose rights-pending content in public Git, public preview, unrestricted Notion or unauthorized transfer channel. Communicate owner-facing results in Russian. State exact completion, remaining blockers and next approval requested.
