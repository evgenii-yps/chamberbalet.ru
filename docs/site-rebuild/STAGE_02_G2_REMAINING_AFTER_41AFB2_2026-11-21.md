# CODEX — STAGE 02: REMAINING G2 VERIFICATION AND FINISHING PACKAGE

**Date:** 2026-11-21. **Status:** Stage 02 AUTHORIZED and active; G2 is NOT ready/accepted. No Stage 03 permission.
**Repo:** https://github.com/evgenii-yps/chamberbalet.ru (PUBLIC)
**Feature branch to continue:** `feat/site-v16-stage02-full-implementation`
**Last verified feature HEAD:** `41afb2bbadbd1fe116f35d931a48f9acdb91714c` — fetch/recheck current HEAD before writing, no resets or force-push.
**Main baseline:** `aff98db8fbe7865a96992b1f7288764f311075a6` — verify and preserve unchanged.
**Canonical visual/source authority:** original Sites v16 commit `329a00aec044a5bf10d96386f953efe1369f9bb1` (57 source files).
**Latest implementation report:** `docs/site-rebuild/STAGE_02_IMPLEMENTATION_CONTINUATION_2026-11-21.md`.
**Previous comprehensive task:** `docs/site-rebuild/STAGE_02_G2_FINAL_GAPS_2026-11-21.md`.
**Notion task:** https://app.notion.com/p/41eafb0a249f81a1ae10c7c271913273

## A. What is DONE and should not be repeated

The owner has viewed and APPROVED the present authentic visual site on Windows. Preserve layout, branding, 7 routes and interactions. Do not restart Stage 00/01, redesign or replace the site with another skeleton.

At commit `41afb2b...` source code now:
- Verifies original v16 commit and all 57 source hashes before private build.
- Initializes private `events.json` and `people.json` safely, preserving existing editorial files, rejecting incomplete pairs.
- Injects their `value` arrays into the verified original source renderers at build time, instead of leaving the normalized files unused.
- Preserves existing ID strings when an editor changes/reorders records in that private data file; tests reject duplicate IDs. **This does NOT solve matching changed records in a NEW upstream source revision.**
- Imports 266 historical source events (168 touring, 98 home) and 15 profiles (2 leaders, 14 photo references, one placeholder). Original ticket data: 265 event rows with a URL, 119 distinct event ticket URL strings, 1 row without URL; this is distinct from the previously recorded 120 unique external links across the entire site.
- Has a preliminary private 40-file media/font inventory with hashes, all unproven rights PENDING.
- Fixed `venues.html` underline regression after disabling contact links; Codex reports 0 changed pixels across five full-page viewport widths. This fix is DONE, avoid redoing it without regression evidence.
- Desktop/mobile afisha has a date filter. On 390/320px it wraps to another row (~33px extra page height); this is a documented design deviation, not a blanket reason to redesign.
- Uses an updated owner-only v2 Windows ZIP; old ZIP kept. The owner has verified Windows/manual `node server.mjs` in v1, but the corrected v2 `ОТКРЫТЬ.cmd` has NOT been personally tested on Windows. Do not falsely claim that it has.
- Reported passing counts are fixture 6/6, private 3/3, adapter+import 2/2 and editorial-preservation 1/1. Tests were reported by Codex; rerun in new candidate before concluding G2.

Do NOT re-issue completed items as open tasks. Differentiate observed/code-verified facts from prior Codex run logs. Do not publish protected original source, biographies, images, video or screenshots in public GitHub.

## B. P0 — Safe identity reconciliation across NEW upstream source revisions

The bootstrap event IDs are currently derived from content hash and duplicate occurrence; they change when the SOURCE record changes. Existing private edits retain stored IDs, but there is no controlled source refresh/reconciliation.

Implement a testable, versioned PRIVATE crosswalk workflow that:
1. Compares a NEW source snapshot with current private edited data using immutable existing IDs, source hashes and candidate relationships.
2. Produces deterministic status categories: UNCHANGED, CHANGED_REVIEW_REQUIRED, NEW, CANCELLED_OR_MISSING_REVIEW_REQUIRED, DUPLICATE_AMBIGUOUS, and EDIT_CONFLICT. Names may differ but meanings must be documented.
3. Does NOT silently change an existing ID, overwrite editorial values, erase history of ticket verification, infer a cancellation from absence, merge ambiguous duplicate shows or invent new source records.
4. Supports explicit human-reviewed reconciliation decisions recorded with provenance, review status, before/after mapping and an easy rollback. Fail closed on missing/ambiguous decisions.
5. Includes adversarial synthetic tests for changed title/date/venue/URL, reordered events, two identical records, duplicate insertion/deletion, cancellations, fresh sessions, out-of-order source updates, incompatible source hashes and interrupted/partial data files. Never pretend a genuine new Sites revision exists if only v16 is available; use clearly marked synthetic revisions.
6. Keeps source values and private editorial fields in ignored private directories, and tests the 266/15 unchanged-v16 baseline separately from genuinely added/deleted future source records.

G2 output: actual safe workflow and test evidence, not merely a proposal.

## C. P1 — Complete asset usage and rights PROVENANCE, not rights approval

Extend the existing 40-file private inventory:
- For each actual media/font asset: exact original sourcePath + SHA256/size, dimensions/technical type if known, all route/component use sites (including JS-created elements and CSS backgrounds), display alt/caption, fallback behavior for missing media, source/attribution, rightsholder if independently known, usage right/license evidence, current rights status.
- Distinguish technically verified bytes from legal permission. Unknown owner/rights must remain PENDING; no inference from file possession or successful playback. No unverified legal PDF publication.
- Test that routes referencing an asset are mapped, that missing assets degrade visibly/safely and that no false APPROVED statuses are created.
- Output a non-sensitive metadata summary to the public branch; keep original assets, personal biographies, screenshots and sensitive reference copies PRIVATE.
- Do not use absence of legal approval to block documenting the inventory; rights acquisition and legal clearance are **Stage 03**, not a technical Stage 02 pass condition.

## D. P2 — Finish exact interaction and visual-difference evidence

Complete an explicit per-route/per-state matrix of source v16 vs private build for 7 routes at 1440, 1024, 768, 390 and 320px. Test: video initial readiness/autoplay failure/skip/replay/reduced motion (including LIVE preference change); header and mobile menu touch/focus/Escape; 15 People profiles (whole-portrait hit area, centered no-rectangle `Биография`, touch affordance, focus trap/restore, backdrop when present, scroll lock, no-photo); afisha city+date combined, empty, reset, old/new dates/timezone and ordering; internal links, missing assets/404, keyboard navigation.

Afisha: precisely attribute all remaining screenshot differences to the intentional date filter, its responsive wrap and predictable derived layout/style; fix only deviations NOT attributable to approved additions. Do not rework the owner-approved site appearance merely to make a screenshot identical to the version without a date picker. The five source-identical routes and venues fix should be kept/regression-tested, not redone.

Add build/server-side fail-closed checks for unapproved external URLs, contact/payment actions and PDF access, rather than relying solely on client-side `removeAttribute('href')`. Exercise programmatically triggered navigation/click and inspect actual requests. Preview must remain local/noindex and non-transactional; public release disabled by default. No actual external booking network checks or transactions are authorized by this package.

## E. P3 — Windows launcher deferred user check

Do not block all independent Stage 02 code work on the owner's deferred v2 Windows test. Validate the launcher/package statically and in any Windows VM/runner actually available; document exact evidence, and preserve owner-proven manual `node server.mjs` fallback. Clearly mark the corrected one-click Windows launcher `OWNER_WINDOWS_CHECK_PENDING` until it is actually run on Windows. Do not invent a Windows test outcome or force new downloads before necessary.

## F. Strict acceptance report

Provide a single durable G2 evidence bundle with:
- exact feature branch, full SHA, changed paths, tested Node/browser environments and commands/exit codes;
- v16 baseline 266/15 reconciled, and separate synthetic upstream-revision reconciliation matrix with no silent ID changes;
- event-to-rendering and People-to-rendering evidence;
- exact asset-to-route coverage and counts of PENDING/verified rights;
- full interaction matrix and quantified explanation of ALL remaining afisha pixel differences, while preserving approved appearance;
- privacy/security/build block test evidence;
- Windows launcher state explicitly labeled independent test passed / owner check pending;
- updated Notion task and clearly separated **G2 technical** vs **Stage 03 legal/editorial/publication** blockers.

Recommend G2 to owner ONLY when relevant technical G2 requirements are met, not on future intentions. If blocked, identify the smallest exact missing evidence and stop, rather than manufacturing more planning-only reports. No automatic G2 acceptance; the owner decides.

## G. Complete project roadmap — execute ONLY Stage 02

**Stage 00 — audited and complete for private work.** Verified original v16 Git tree, 57 source hashes; saved tar provenance not independently verified and waived only for private development.
**Stage 01 — foundation completed; G1 owner accepted.** Static architecture, seven routes, local preview and core tests.
**Stage 02 — ACTIVE / AUTHORIZED NOW.** Finish P0–P3, preserve owner-approved design, deliver definitive G2 technical evidence and STOP for owner review.
**Stage 03 — NOT AUTHORIZED.** Independent accessibility/browser/SEO/privacy, factual current shows and booking URL validation, rights/legal PDF approval. Requires owner G2 acceptance and separate explicit authorization.
**Stage 04 — NOT AUTHORIZED.** Reproducible verified REG.RU release ZIP, target server configuration, backup/rollback plan. Requires G3 acceptance and explicit authorization.
**Stage 05 — NOT AUTHORIZED.** Owner-authorized live REG.RU replacement of old site, after verified backup and rollback. Requires G4 acceptance and specific go-live authorization.
**Stage 06 — NOT AUTHORIZED.** Maintenance by separately scoped, approved changes after G5.

**Hard restrictions:** `main` unchanged, REG.RU and DNS untouched, published Sites untouched, no official release ZIP, no Stage 03, no public upload of source media/biographies/data/screenshots. Report to owner in Russian with direct links/evidence.
