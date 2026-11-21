# CODEX — STAGE 02 R3.1: TRUSTED SOURCE REVISION + EDITOR CONCURRENCY CONTRACT

**Date:** 2026-11-21
**Authorized scope:** Stage 02, R3.1 ONLY. Do not start any other package automatically.
**Repository:** `evgenii-yps/chamberbalet.ru` (PUBLIC)
**Work on existing branch:** `feat/site-v16-stage02-full-implementation`
**Last reviewed implementation SHA:** `766b20bb408f2de14861c549897b66817904b5d8` (fetch actual branch HEAD before editing; no resets, no force-push).
**Unchanged main baseline:** `aff98db8fbe7865a96992b1f7288764f311075a6`.
**Canonical visual/source reference:** private Sites v16 exact Git commit `329a00aec044a5bf10d96386f953efe1369f9bb1`.
**Notion project task:** https://app.notion.com/p/41eafb0a249f81a1ae10c7c271913273
**Previous source/report:** `docs/site-rebuild/STAGE_02_R3_TRANSACTION_REPORT_2026-11-21.md`; previous assignment `docs/site-rebuild/STAGE_02_R3_VERSION_PROMOTION_ROLLBACK_2026-11-21.md`.

## 1. Reuse R3, do NOT rebuild

The owner approved the entire seven-page v16 VISUAL website. Preserve every route and existing authentic media/People/afisha content. R3 already contains:
- private atomic `ACTIVE` pointer to hash-checked immutable snapshots holding events, People, source-aligned baseline and journal;
- a lock excluding concurrent writers USING THAT STORE; recovery of a dead lock where safe; versioned rollback appending audit history;
- explicit reconciliation review, conserved event IDs and ticket-check history, reset of invalid approvals on URL changes, evidenced cancellation/reactivation;
- code/test coverage for synthetic A→B→C, retries, duplicates, cancellation/reactivation, crash points and the initial 266 events/15 People.

Per the Codex evidence: fixture 6/6, private 3/3 and 12/12 import/transaction tests passed on Linux/Node v24. The assistant independently reviewed implementation and test source but did NOT rerun these tests. Preserve the working R3 functionality; do not make a second store.

## 2. Two exact unresolved R3 trust boundaries

**A. Source authenticity/ancestry.** Current `sourceRevision=digest(incoming JSON)` is only content identity. `planUpdate(root,incoming,parent)` compares a caller-supplied parent to the current store value. Neither proves that an incoming payload comes from the authorized Sites Git repository and belongs to a real descendant commit. It also rejects a legitimate new published revision whose content is byte-identical to a previous one.

**B. External editor race.** `store-private.mjs` calls `guardEditorialFiles` before a transaction, but uncooperative software can write those legacy JSON files after the check without acquiring the store lock. Current code must NOT claim serialization with arbitrary external editors. The active version-store and the legacy editor JSON need one explicit supported authoring/migration contract.

## 3. Assigned P0 — trusted source-refresh protocol (private only)

Implement an executable, testable *provenance-bound* private source import / proposal flow:

1. Accept a known, explicitly authorized source Git repository identity and a FULL commit SHA (not floating branch names or user-supplied string labels), and a current trusted source Git commit from the store provenance ledger. Verify the checkout is clean, correct repository identity/allowlisted remote and commit, expected source files/paths, content digest, and Git ancestry using a real local Git graph. Reject dirty or wrong-repository checkouts, unrelated commits, missing commits, stale/replayed approvals, inconsistent source record extraction and changed source script contracts. New sources must not be limited forever to the original v16 57-file byte hashes; instead verify each new reviewed revision's own pinned tree/manifests and preserve v16 baseline evidence.
2. Bind every plan, review and active snapshot to `repo identity + source commit SHA + extracted dataset digest + parent commit + exact active snapshot hash`. Prevent the caller from substituting an arbitrary JSON array as a "real source revision" in production-path reconciliation.
3. Preserve a completely separate `SYNTHETIC_TEST_ONLY` workflow for test fixtures. Label its data/evidence so it cannot be mistaken for authentic Sites revisions or promoted into a real owner production-preview history by accident.
4. Handle genuine Git commits whose extracted schedule is unchanged: create the right provenance audit event if approved without fabricating an event change; do not rely on content hash as the entire revision ID. Test A→B→A-content with a valid descendant Git graph, and reject B replay after C. If a fully trusted future repository cannot be accessed here, make the LIVE path fail closed and exercise all cases in a temporary locally constructed Git fixture with explicit test provenance.
5. A raw Git hash/URL does not on its own prove who authored content; specify the trusted allowlist/owner attestation boundary, and never claim cryptographic signature verification unless actually performed. Owner's original v16 approved checkout remains the only presently real source.

## 4. Assigned P1 — one authoritative editorial write path, no lost edits

1. Declare the version store authoritative *after initialization*. The old `.private/data/events.json`, `people.json`, `baseline-v16.json` are bootstrap material only; they must never be silently considered authoritative, clobbered or overwritten.
2. Implement a clear `begin-edit / validate / commit-edit` or equivalent reviewable version-aware workflow for BOTH event and People changes. Stage edits in a private working copy, bind to the current `ACTIVE` ref, require compare-and-swap validation when committing, append an audit event with editor/source evidence and preserve previous snapshot for rollback.
3. For direct edits via external software that does NOT participate in the store lock, explicitly detect drift and **fail closed rather than silently importing, losing or overwriting**. Test an external mutation between initial validation and promotion via deterministic fault injection. If a fully uncooperative external writer can still race after the last check, document this inherent limit; ensure the store never writes over their unmanaged file and its authoritative snapshot remains valid. Offer a safe, explicit reviewed import/reconciliation procedure for those edits, not a claim of impossible global locking.
4. Preserve existing source-event identity, ticket status history, source-vs-editorial URL separation and 266/15 baseline on unchanged v16. Treat changed booking URL, uncertain rights and missing/cancelled records conservatively.
5. Audit crash and rollback on both editorial and source revisions. Add tests for two simultaneous editorial sessions with stale ACTIVE, source promotion racing editorial edit, rollback while edit pending, malformed editor JSON, symlinked private inputs and incomplete legacy data pair. Fail without corrupting an active snapshot.
6. Keep the private store data entirely Git-ignored. Do not publish source photos, videos, biographies, schedule records, snapshots, review proofs containing personal data or screenshot images to the public repository.

## 5. Assigned P2 — verification + technical evidence

- Re-run all current suite commands on the FINAL tree: fixture, private preview, import, adapters, reconcile and store. Run new adversarial and synthetic Git-lineage tests; report commands, pass counts, exit codes and observed failures.
- Verify hash-pinned original Sites v16 + initial 266 events/15 People, source-to-renderer identity and byte-equivalent output after reviewed rollback. Clearly label which tests used synthetic Git fixtures.
- Document no-op git commit, legitimate later commit, wrong repository, branch rewind, corrupt manifest, concurrent editor, stale proposal, interrupted commit, rollback and source-URL approval invalidation in a concise matrix.
- State explicitly which confidence is NOT obtained: no actual new authorized Sites version; no full Windows filesystem/power loss test; owner's corrected one-click Windows launcher remains `OWNER_WINDOWS_CHECK_PENDING`. The existing verified manual Windows start is not invalidated.
- Preserve all already fixed visual layout (venues underline, date filter), and do not create a new owner ZIP unless functionally necessary; if created, only use the previously owner-authorized private Drive folder with permissions independently rechecked.
- Write one implementation/evidence report: `docs/site-rebuild/STAGE_02_R3_1_TRUST_BOUNDARY_REPORT_2026-11-21.md`. Update Notion task and instruction references, attach full commit SHA, tested limitations and exact next step. Do not replace previous reports or misstate resolved blockers.
- STOP at R3.1 evidence review; R3.1 completion does NOT accept full G2. Do not silently start asset/interaction G2 packages.

## 6. Roadmap and hard gates — all phases

**Stage 00 — DONE:** original source audit, v16 source commit/57 files; saved tar not independently recovered, waived only for private work.
**Stage 01 — DONE, G1 owner accepted:** seven-page foundation.
**Stage 02 — CURRENT/ONLY AUTHORIZED:** execute R3.1 P0–P2 and STOP. Further Stage 02 tasks remain: 40 asset route/alt/fallback/provenance inventory, full media/video/afisha/People/touch/focus/interactions, programmatic navigation guard and integrated G2 signoff. G2 has NOT been accepted.
**Stage 03 — NOT AUTHORIZED:** independent browser/accessibility/privacy/SEO, editorial facts, publishing rights, legal PDFs and real booking URL checks; only after owner's explicit G2 acceptance and separate authorization.
**Stage 04 — NOT AUTHORIZED:** release ZIP for actual REG.RU, hosting config, backup/rollback rehearsal; only after G3 and explicit authorization.
**Stage 05 — NOT AUTHORIZED:** live REG.RU replacement after complete backup with owner launch approval; only after G4 and explicit go-live.
**Stage 06 — NOT AUTHORIZED:** separately scoped postlaunch maintenance.

**Absolute restrictions:** do not modify main, published Sites, REG.RU or DNS. Do not generate an official release ZIP. No unauthorized outside network checking/transactions or public disclosure of confidential assets. Respond in Russian with actual implementation, tests, exact commit, the unresolved matters and whether R3.1 is ready for owner review. No automatic G2 acceptance.
