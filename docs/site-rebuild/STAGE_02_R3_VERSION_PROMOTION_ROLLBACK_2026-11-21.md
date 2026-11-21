# Codex — Stage 02 R3: source-reconciliation promotion, rollback and adversarial tests

**Date:** 2026-11-21
**Execute only this package.** Do not switch to Stage 03, asset/publication-rights clearance, production or a new website redesign.
**Repository:** `evgenii-yps/chamberbalet.ru`
**Branch:** `feat/site-v16-stage02-full-implementation`
**Verified starting code commit:** `e5dd1709453c761816688a7400d0b943b622cb1f` (fetch latest HEAD before editing; do not reset or overwrite newer work)
**Source of truth for approved visual v16:** `329a00aec044a5bf10d96386f953efe1369f9bb1`, original 57 source files verified by hashes.
**Notion:** https://app.notion.com/p/41eafb0a249f81a1ae10c7c271913273
**Read first:** `AGENTS.md`, `foundation/PRIVATE_PREVIEW.md`, `docs/site-rebuild/STAGE_02_RECONCILIATION_PROGRESS_2026-11-21.md`, `docs/site-rebuild/STAGE_02_G2_REMAINING_AFTER_41AFB2_2026-11-21.md`, full current code and relevant Notion history.

## 1. Accepted progress; do not re-do

- Stage 00: original Sites source audited; Git v16 + 57 files validated; limited saved-tar waiver for *private development only*.
- Stage 01: site foundation and G1 accepted.
- Stage 02 active: exact owner-approved seven-page visuals, verified 266 source events (168 tour, 98 home), 15 People (two leaders, 14 portraits + one placeholder); private editable JSON now feeds verified original JS renderers, preserving IDs across edits/reorder.
- Working reconciliation prototype (`foundation/src/reconcile.mjs`, `scripts/reconcile-private.mjs`, `scripts/reconcile-baseline-private.mjs`) creates deterministic plans and exclusively written review outputs; no overwrite of editor files. It tracks provenance, requires reviewed mappings/missing decisions, preserves IDs/ticket history and clears link approval on URL changes. On identical v16 snapshot it reports 266 unchanged; altered source revisions tested only synthetically. Current tests in Codex report: fixture 6/6, private 3/3, reconciliation/import/adapter/preservation 5/5. Rerun for final tree; don't portray previous runs as new runs.
- The venues underline parity defect is fixed; original owner visual approval remains. Afisha's added date filter is approved but not fully screenshot-attributed.
- Local server CSP now restricts outbound fetch and forms; previous owner-only ZIP v2 was built before that header, so don't treat the ZIP as a current server test.
- Windows v2 one-click launcher owner check is explicitly **deferred**; owner previously confirmed manual `node server.mjs` on Windows.
- Rights for 40 inventoried media/font assets remain PENDING; legal authorization and real ticket checks belong to later Stage 03, not this package.

## 2. ASSIGNED P0 — immutable revision ancestry and safe approval protocol

Implement an executable PRIVATE revision ledger and strict ancestry validation for each reviewed source update. Include the currently active source snapshot hash, immutable revision identifier, parent/source hash, current editor data snapshot hash, plan hash, reviewed decisions, reviewer identity, review timestamp and resulting dataset/baseline hashes. The revision identifier must be bound to exact bytes, not merely a user-supplied string. A plan made against an old active editor snapshot must fail on promotion rather than clobber fresh edits.

- Reject stale plans, repeated/replayed revisions, parent mismatch, out-of-order updates and divergent concurrent editor state.
- Require an explicit reviewed decision for every ambiguous mapping and missing record. The evidence for duplicate/cancellation decisions must identify what was decided; do not silently infer a cancellation from absence.
- Preserve existing stable IDs, editorial changes, original source links and ticket-verification history; on source/actual destination URL change, invalidate the relevant approvals conservatively and retain prior status in audit history.
- Clarify semantics of `keep_editorial` vs `use_incoming`: newly recorded source URL and displayed/editorial URL are different fields when necessary, and neither should be silently treated as approved.
- Test cancellation AND subsequent reappearance/reactivation: a previously `cancelled` record must not remain invisibly excluded after an explicit accepted reactivation. Current code copies `reconciliation.status='cancelled'` into the reused record, so this is a concrete case to handle and regress-test.
- Do not claim successful application of a genuinely new Sites source revision unless a real authorized new revision exists. Use clearly labeled synthetic change sets for adversarial cases.

## 3. ASSIGNED P1 — atomic promotion, recovery and rollback

Current `applyReviewed` produces a new `{records,baseline,audit}` file. This is not yet an active-state promotion/rollback workflow. Provide a well-defined, testable CLI or equivalent transaction mechanism:

- Create immutable private snapshots of BOTH datasets and their baseline/ledger, validate hashes, schema, unique IDs, source mappings, ticket statuses and renderer compatibility BEFORE promotion.
- Switch the active version with a single recoverable atomic mechanism (e.g. validated immutable version directory + atomically updated active pointer/manifest), so a process crash can never leave a new `events.json` paired with an old `baseline.json` or old `people.json`. Do not mutate protected existing editor files in place or overwrite user revisions.
- Ensure the actual `build-private.mjs` consumes the active verified snapshot after promotion, while maintaining backward compatibility with the current ignored private files and owner-approved appearance.
- Provide a deterministic rollback to a previously validated snapshot, with a non-destructive audit trail. Test rollback following an approved cancellation, changed URL, reordered events and editor conflict.
- Test crash/fault injection at prepare, write, validate, promote, and restart/readback stages; old state or complete new state must be observable, never a half-applied state.
- Constrain all private reads/writes to verified ignored private paths, reject symlink/path escapes and avoid output filenames that can accidentally overwrite a prior artifact. Preserve private data outside PUBLIC GitHub.
- Document the exact manual/CLI steps to import, prepare, inspect, review, promote, preview, inspect history, rollback and recover. Commands must be copyable and tested.

## 4. ASSIGNED P2 — high-value adversarial test matrix

Create independent automated tests with fixtures covering:
- 266 unchanged v16 source records, unchanged ID count and full 15-People parity;
- A → B → C revision chain and out-of-order B replay after C;
- changed title/date/venue/city/booking URL, source reorder, duplicates with same title/date, duplicate insertion and deletion (including identical rows), missing vs explicitly cancelled, reappearance/reactivation;
- simultaneous editorial and source edit conflicts; malicious or incomplete review record; wrong parent revision; replayed plan; expired/stale editorial snapshot; two concurrent promotions; crash/partial write and rollback after interruption;
- ticket approval invalidation only when appropriate, with previous evidence retained;
- bad/duplicate IDs, invalid data, missing media reference and render build validation;
- zero unauthorized changes in PUBLIC repo to source content or private data, and unchanged visual rendering for the unchanged v16 snapshot.

No need to fabricate a new real public Sites version. Prefer executable negative cases with verified exit codes over prose-only promises. For each test clearly state expected status and actual outcome.

## 5. Deliverable / stop condition

Commit public-safe implementation/tests/docs to the *existing Stage 02 feature branch* only. Write one evidence file such as `docs/site-rebuild/STAGE_02_R3_TRANSACTION_REPORT_2026-11-21.md` with exact tested revision chain, commands, exits, crash test observations, hashes/expected-vs-actual, code SHA and remaining limitations. Record result, source and next step in Notion, including a direct commit/report link.

Do NOT falsely claim that tests on synthetic versions validate actual future upstream imports. Do NOT claim G2 accepted. Stop after this R3 package and report Russian status. Do not create another planning-only deliverable instead of implementation. Owner has already accepted visual appearance.

### Stage 02 work intentionally remaining AFTER R3 (not authorized within THIS package)

- Complete 40-item per-route/per-asset usage + alt/fallback, source/rightsholder/provenance and PENDING-rights inventory.
- Finish full video/touch/keyboard/focus-trap/filter/missing-asset/interaction matrix for all 7 pages, explain remaining afisha pixel differences.
- Verify build/server-level safeguards against programmatic navigation and unapproved contact/transaction/PDF operations, not only CSP fetch.
- Corrected Windows one-click launcher: owner check deferred; keep `OWNER_WINDOWS_CHECK_PENDING`. No new preview ZIP unless technically needed and owner-only Drive ACL verified.
- Prepare integrated G2 evidence and seek explicit owner G2 acceptance when technical requirements are truly complete.

### Complete roadmap / transition gates

**Stage 00 DONE**: source audit; private provenance waiver only.
**Stage 01 DONE; G1 accepted**: foundation and preview.
**Stage 02 CURRENT**: execute R3 ONLY in this session; afterwards remaining Stage 02 tasks still require a new explicit assignment, then G2 technical acceptance by owner.
**Stage 03 NOT AUTHORIZED**: independent accessibility, editorial, privacy, rights/legal PDF and real-ticket validation — only after accepted G2 and separate owner instruction.
**Stage 04 NOT AUTHORIZED**: verified production/reg.ru ZIP, actual server constraints, backup/rollback — only after G3 and explicit instruction.
**Stage 05 NOT AUTHORIZED**: production replacement and post-deploy smoke check — only after G4, complete backup and explicit go-live authorization.
**Stage 06 NOT AUTHORIZED**: separately authorized maintenance following G5.

**Absolute restrictions:** do not touch `main`, REG.RU, DNS or published Sites. Do not publish original media, bios or screenshots in public GitHub/Notion/Drive outside the owner-approved private location. No official release ZIP. No Stage 03. Respond to the owner in Russian with verified facts, exact commit, tested scenarios and open blockers.
