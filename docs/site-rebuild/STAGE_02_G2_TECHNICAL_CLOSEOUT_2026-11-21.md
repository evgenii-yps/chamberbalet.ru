# CODEX — STAGE 02 FINALIZATION AFTER OWNER VISUAL APPROVAL (G2 TECHNICAL CLOSEOUT)

**Date:** 2026-11-21
**Project:** Chamberbalet website, https://github.com/evgenii-yps/chamberbalet.ru
**Authorized stage:** Stage 02 ONLY. Stage 03 remains NOT AUTHORIZED.
**Current implementation branch:** `feat/site-v16-stage02-full-implementation`
**Last checked branch HEAD:** `1714a4f3ede977385dd6c82ffc3409bd96621ecb` (refresh before changes; do NOT reset).
**Stage 02 implementation commit:** `8d2c376b0b815f861d578838aa2615c755d008cd`
**Canonical approved visual/source:** Sites v16 Git commit `329a00aec044a5bf10d96386f953efe1369f9bb1`.
**Owner Notion record:** https://app.notion.com/p/41eafb0a249f81a1ae10c7c271913273
**Previous corrective spec:** `docs/site-rebuild/STAGE_02_G2_REMEDIATION_2026-11-21.md`
**Fresh-session handoff:** `docs/site-rebuild/STAGE_02_NEW_CODEX_SESSION_HANDOFF_2026-11-21.md`
**Latest recovery report:** `docs/site-rebuild/STAGE_02_SESSION_RECOVERY_2026-11-21.md`

## 1. New OWNER DECISION — visual design accepted

After the owner successfully opened the real 7-page private preview on a Windows computer, the owner said: "Все ок давай делать дальше" ("Everything is fine; let's move on"). Treat this as **approval of the presented local visual design without requested redesign**. Do not discard the accepted mockup, re-create a skeleton, change visual branding, or begin a design iteration without a demonstrated defect. Keep the Sites v16 source and all approved content behavior as the reference.

**This is NOT technical G2 acceptance or authorization of public release.** Existing G2 conditions about data mapping, provenance, automated/full-page parity and launcher usability remain. Don't claim any PDF, portrait/video rights or ticket link has become publication-approved.

## 2. Read and restore first

Read Notion task and project instructions, `AGENTS.md`, original Stage 02 task, the three previous Stage 02 reports/specs listed above, `foundation/` code, full source inventory and rights register. Confirm branch HEAD SHA and main untouched; continue the current feature branch, preserving all history.

If the recovered original private Sites checkout or `foundation/.private/dist/` is gone in the executor workspace, do not assume it survived. Recover the exact Sites v16 Git commit through authorized private read-only access; verify clean tree and all 57 source SHA-256/byte-size entries. Original saved tar remains unverified; this is not a Stage 02 blocker under existing limited private-use waiver.

## 3. P0 — fix Windows launcher and prove normal usability

The owner reported TWO concrete Windows observations:
- Opening the downloaded `ОТКРЫТЬ.cmd` produced `'js' is not recognized` and `'ию' is not recognized`, suggesting an incorrectly parsed batch file (encoding/batch syntax remains to be diagnosed).
- Node.js works: `node -v` = `v24.13.1`. A separate `MODULE_NOT_FOUND C:\\server.mjs` occurred ONLY because the manual command initially ran from `C:\\>`; after extracting the ZIP and running `node server.mjs` in the correct folder the owner confirmed "Все работает". Thus Node installation and site startup are proven functional, but the original one-click launcher is NOT proven fixed.

Inspect the original `ОТКРЫТЬ.cmd` in the private candidate package. Repair it in the package generator/source: use robust Windows batch syntax, ASCII-only command content if practical, CRLF, correct escaping and quoted paths, `cd /d "%~dp0"`, `where node`, a user-readable diagnostic when missing, explicit nonzero exit on errors, stable `server.mjs` path, safe browser opening only when the server is ready, and keep the console visible if a startup failure occurs. Ensure the extraction instructions refer to the correct nested folder, not the ZIP virtual view. Test within a real Windows environment if available and document observed evidence; otherwise do NOT claim Windows compatibility is independently tested. Preserve the already-working manual `node server.mjs` fallback.

If a corrected private review package is needed, generate a VERSIONED package with hashes, keep the original package intact, and deliver only through the owner's previously authorized owner-only Drive folder `1vXTUEUElI97DMYo_m69EzWDLdoqwA3bT`. Before/after upload confirm permissions: only owner `ekbwork52@gmail.com`, `shared=false`, no anyone/domain/group links. Never upload protected content to public GitHub. Do not silently replace the existing owner-approved visual preview.

## 4. P1 — normalize real content without changing approved appearance

- Implement a reproducible PRIVATE data import/crosswalk for all **266 sessions** (168 touring / 98 home) with stable deterministic IDs, original source mapping/hash, dates/timezones, exact original value and duplicates/ordering evidence. Assert source count before date filtering. Never invent show details or shorten the roster.
- Map exactly **15 People** (2 leaders; 14 portraits + one placeholder) with persistent IDs, source module/portrait provenance and private biography content, without publishing unapproved biographies publicly.
- Track booking URL status by distinct criteria: `source_recorded`, `syntax_checked`, `live_checked`, `owner_approved`, with evidence and timestamp per record. HTTPS alone is NOT a live check. Preserve 120 blocked-by-proxy URLs as `UNVERIFIED_NETWORK` rather than "dead" or "approved". Keep transactional buttons disabled in preview and prevent unsafe publication.
- Add per-route/per-asset use/ownership/hash/dimensions/alt/fallback/rights and approval-evidence mapping. All unknown rights default `PENDING`; no inference from possession or successful rendering.
- Make the future date/People updates maintainable and deterministic, not requiring hand-editing generated HTML or manually retyping records. You may preserve source JS as byte-verified provenance while building an adapter; keep the owner's viewed visual result unchanged.
- Do not include the protected original source/data/media into the public Git repo, documentation or unrestricted CI artifacts.

## 5. P2 — exhaustive Stage 02 parity and checks

- Verify all 7 exact routes on 1440, 1024, 768, 390 and 320px. Include **FULL PAGE** screenshot comparison with authenticated original v16, not first viewport only; keep screenshot bytes and confidential content privately stored. Document the known deliberate afisha date-filter deviation.
- Verify genuine interactions: home video autoplay, skip, replay, failure fallback and changes to reduced-motion preference; city/date filter combinations, no results, chronology, count preservation, controls reset; desktop/mobile menu keyboard/touch; all 15 People whole-photo click/hover/tap, "Биография" centered label without rectangle, modal keyboard/focus trap/Escape/backdrop where accessible, scroll lock, close/focus restoration and missing photo behavior; internal links, error routes and 404s, all referenced media.
- Fix verified defects only; preserve visual sign-off otherwise. Distinguish automation from manually observed behavior and attach explicit logs/results.
- Ensure secure preview: no live external transactions, no public PDF publishing, no accidental external-link navigation, no public preview exposing protected source; release must fail closed by default independently of a single environment flag.
- Verify one canonical future production output pipeline, not the inherited old root builder; do not generate a release ZIP now.
- Test code/package on clean inputs and recompute hashes; explicitly show differences from source and closed/open G2 criteria.

## 6. Deliverables and G2 stopping conditions

Commit only PUBLIC-SAFE implementation code and reports to existing Stage 02 feature branch. Update `docs/site-rebuild/STAGE_02_REPORT.md`, structured event/People/asset/link parity reports, browser/interaction evidence, package launcher instructions, and Notion task. State exact commands, exit codes, full branch SHA and what was *actually* independently tested. Do not claim screenshots/Windows tests if not run. Do not change `main`, REG.RU production, published Sites or DNS.

The owner has approved the VISUAL PREVIEW. Treat the visual sign-off as confirmed, not as an excuse to re-request it unnecessarily. **G2 remains pending the above technical closeout**. At the end, report whether G2 can be recommended for owner acceptance and enumerate open items. Stop; do NOT start Stage 03 until explicitly authorized by the owner after technical review.

## 7. Complete project roadmap / hard transition gates

**Stage 00 — AUDIT: DONE** with confirmed private Sites v16 Git source, 57 files; missing original saved tar has a limited NONPUBLIC development waiver; preserve unresolved publication and hosting blockers.

**Stage 01 — FOUNDATION: DONE and owner-accepted at G1.** Branch `feat/site-v16-stage01-foundation`, commit `3ce63e3902003d30700c6b48a66d343b3ac60094`.

**Stage 02 — CURRENT and authorized ONLY:** preserve owner-approved v16 design; finish launcher, maintainable source data/asset mapping, full parity and test evidence; prepare G2 recommendation and STOP. Current feature branch identified above.

**Stage 03 — NOT AUTHORIZED:** independent QA/accessibility/privacy/editorial verification, media/publication rights, legal PDFs and actual booking/show information; requires an explicit G2 acceptance and new owner authorization.

**Stage 04 — NOT AUTHORIZED:** reproducible verified root-content REG.RU release ZIP, checksums, verified actual hosting configuration, backup/rollback rehearsal; requires G3 acceptance and explicit authorization.

**Stage 05 — NOT AUTHORIZED:** manual owner-approved REG.RU live deployment replacing the old product, after complete verified backup of files/config and tested rollback; requires G4 acceptance and explicit launch authorization.

**Stage 06 — NOT AUTHORIZED:** ongoing maintenance after G5, each package separately scoped and approved.

**Response language: Russian; explain simply. Required final confirmation: main unchanged, REG.RU unchanged, published Sites unchanged, Stage 03 not started, production ZIP not generated.**

