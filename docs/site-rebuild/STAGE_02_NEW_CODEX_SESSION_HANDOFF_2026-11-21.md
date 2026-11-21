# NEW CODEX SESSION — RESTORE CONTEXT AND CONTINUE CHAMBERBALET STAGE 02

**Owner authorization:** Stage 02 has already been explicitly approved. This is a NEW EXECUTOR SESSION with no assumed continuity of the previous sandbox. Reopen the work from GitHub + Notion; do not restart implementation. **ACTIVE STAGE = 02 ONLY; G2 = NO-GO / NOT ACCEPTED.** No Stage 03 authority.

**Owner-facing reports:** Russian. **Technical work and specs:** English. **Website copy:** original approved Russian only.

## 0. Exact repository and immutable anchors

- Public GitHub repo: https://github.com/evgenii-yps/chamberbalet.ru
- **Working branch to continue:** `feat/site-v16-stage02-full-implementation`
- **Last verified HEAD at handoff creation:** `a45673f730f752da236fc8363476e5f5947621b8` (documentation-only remediation update; REFRESH HEAD before any changes).
- **Last Stage 02 implementation checkpoint:** `8d2c376b0b815f861d578838aa2615c755d008cd`
- **Stage 01 G1 accepted code:** `3ce63e3902003d30700c6b48a66d343b3ac60094`, branch `feat/site-v16-stage01-foundation`
- **Stage 00 documentation branch:** `docs/stage-00-audit`; Stage 00 report `003a6413268a932882ff0cb9ce692038285d87dc`; Stage 02 authorization `64af9655686c6baeffaebf9a444d88b00ce61626`.
- **Legacy main (MUST remain untouched):** `aff98db8fbe7865a96992b1f7288764f311075a6` at handoff; refresh to verify.
- **Original authentic published Sites v16 Git source commit:** `329a00aec044a5bf10d96386f953efe1369f9bb1`.
- **Canonical visual reference:** https://chamberbalet-prototype-v01.cuppedhornbill2.chatgpt.site/
- **Notion single task/status page:** https://app.notion.com/p/41eafb0a249f81a1ae10c7c271913273
- **Project instructions:** https://app.notion.com/p/41dafb0a249f817e9ed7f580e8607f71

The owner already supplied the intended new mockup to an earlier Codex session, but its *separate attachment* was not found in the previous workspace. Do not pretend it is mounted now. Verify whether the new session can read it; otherwise the exact recovered **Sites v16 Git commit** remains the canonical verified reference. NEVER substitute the old October website or the incomplete v0.19 demo.

## 1. Mandatory rehydration steps for this fresh session

1. Read this ENTIRE document. Read current Notion task and project instructions FIRST, plus the latest status/decisions.
2. Fetch exact remote repository refs; confirm branch HEAD, ancestry and worktree state. Continue on `feat/site-v16-stage02-full-implementation` from the latest valid remote commit; do not reset/rebase/force-push, do not start another foundation branch, and do not change `main`.
3. Read in this branch:
   - `docs/site-rebuild/STAGE_02_G2_REMEDIATION_2026-11-21.md` (**full corrective task and limits**);
   - `docs/site-rebuild/STAGE_02_REPORT.md`, `STAGE_02_PARITY.csv`, `STAGE_02_SCREENSHOT_MANIFEST.json`;
   - `foundation/PRIVATE_PREVIEW.md`, `foundation/README.md`, `foundation/docs/ARCHITECTURE.md`;
   - `foundation/scripts/build-private.mjs`, `preview-private.mjs`, `foundation/src/private-safety.js`, `private-date-filter.js`;
   - `foundation/data/source-inventory.csv`, `data/asset-manifest.json`, source models, tests and `.gitignore`.
4. Read in `docs/stage-00-audit`: `AGENTS.md`, `PROJECT_CONTRACT.md`, `TASKS/STAGE_02_COMPLETE_IMPLEMENTATION.md`, `docs/site-rebuild/SOURCE_PROVENANCE.md`, `ASSET_RIGHTS_REGISTER.csv`, `BLOCKERS.md`, `REG_RU_CONTRACT.md`.
5. **Re-establish private source access in the NEW session.** Previously a read-only, authorized Sites source Git checkout at commit `329a...` existed in a temporary workspace. DO NOT assume its directory, credentials, .private/dist outputs, screenshots, browser process or source archive survived the session switch. Check for an authorized checkout first. If absent, use available authorized Sites source-repository access to recover the exact commit privately. No credential disclosure, no public Git import or write/push to Sites. Verify clean source and ALL 57 sizes/SHA-256 against `foundation/data/source-inventory.csv` before invoking private build. If access is unavailable, precisely report the missing authorization or transfer and continue only independently verifiable, public-safe code/docs work. Do not fabricate preview success.
6. Read the last reports before coding so successful work is not repeated; log checkpoint state in Notion with fact vs assumption.

## 2. Progress already achieved — do not discard or repeat

**Stage 00:** Confirmed 57-file Sites v16 Git tree and seven real HTML pages; source asset hashes; 15 People profiles (two leaders, 14 portrait references, one no-photo placeholder); 266 source performances before filtering (168 touring/98 home), 26 touring cities, 120 unverified external HTTP URLs. Older saved Sites tar (reported 5,754,880 bytes, SHA-256 `0f55c215722661eda884ff831c4a4fbf72b83f70df3a31235372b29d948a9647`) was NOT independently obtained/verified; owner granted **limited waiver for private development only**. Do not claim saved tar provenance or upstream authoring masters are proven.

**Stage 01 — G1 owner-accepted:** New separate `foundation/` Node standard-library static architecture, seven preview route skeletons, schemas, fixture tests, true 404, rights manifest, protected local preview and release guard. Old October root website remains historical baseline and can be fully replaced eventually, but NOT deleted from current REG.RU.

**Stage 02 checkpoint `8d2c...`:** Existing private builder verifies authorized source commit, clean checkout and 57 hashes; copies ORIGINAL `dist/` to ignored `foundation/.private/dist/`, adds private-safety link blocking, date filter on afisha, noindex, separate 404; serves on loopback `127.0.0.1:4181`. All seven authentic pages, video, imagery, People, schedule are available *only when private source is locally accessible*. Build is NOT a complete re-authored maintainable content system. Existing code/README/tests are in the Stage 02 feature branch. Public GitHub does NOT contain original assets/bios/videos/PDFs.

**Reported tests in previous session (must not be mistaken for newly rerun tests):** `npm run check` six tests, `npm run test:private` three, 35 page/viewport comparisons at 1440/1024/768/390/320, 15 People modal checks, movie skip/replay/error, deterministic builds; 103 static local link checks in Stage 00. Screenshot report only proves FIRST viewport pixel equality for six unaffected routes; afisha differs due to an added date filter. Owner still has NOT seen the implementation. Cloud Desktop tool returned environment exception `the gaas-browser node_repl sandbox cannot be disabled`; not a website defect.

**Main blockers:** user cannot access Codex's remote loopback preview; no verified private delivery to the owner; event records do not yet have stable IDs and per-ticket verification statuses; incomplete per-asset/per-route rights/alt provenance; incomplete full-page, mobile/touch and edge-state parity tests. Legal/media rights, 120 URLs, hosting backup and rollback remain later gates. G2 = NO-GO.

## 3. Current priority P0 — user must actually SEE the new site

Deliver a VERIFIED owner-accessible, *private* full seven-page interactive review, not merely a report or a localhost URL from the Codex remote workspace.

Inspect available legitimate delivery channels and recipient visibility first. Prefer an existing authorized access-controlled owner-only review environment. Alternatively create a portable OFFLINE Windows review package with original seven HTML pages and required CSS/JS/media/assets, a clear Russian README and an easy local launcher which does NOT require a private Sites checkout on the owner's PC. Verify package bytes/checksums, retrieval, extraction and all routes/media on a clean target environment. Never put unapproved images, portrait biographies, video, PDF, screenshots or private source archives on the PUBLIC GitHub repo, an unprotected URL or a Notion page without verified access controls. Do not assume a Notion page is private. Do not invent an export button, cloud service or access.

If access-controlled transfer is not possible from this fresh environment, precisely identify the ONE required owner action or authorization and preserve private full-page screenshot evidence for later secure transfer. State plainly that screenshot fallback is NOT interactive preview.

Note: loopback URL `http://127.0.0.1:4181/` works ONLY on the exact computer hosting the private preview. It is not a public/site URL and cannot be opened on the owner's computer unless that machine is the host.

## 4. P1 — finish independent maintainable source-derived content layer

- Losslessly import ALL 266 source schedule entries with stable deterministic IDs, original value/provenance hashes, duplicates/ordering and 168/98 reconciliation; do not hand-retype or shorten.
- Preserve 15 People records, two leaders, 14 portrait references and one placeholder; stable ID/crosswalk and private bio storage.
- For each booking URL distinguish `source_recorded`, `syntax_checked`, `live_checked`, `owner_approved`, with date/evidence. HTTPS syntax alone is not verified. 120 URLs remain `UNVERIFIED_NETWORK`, NOT broken, NOT cleared for selling.
- Complete per-route/asset use, hash, dimension, alt, rightsholder, rights state, approval evidence and missing-fallback inventory. Missing evidence means PENDING, not APPROVED.
- Maintain original source and content without duplicative copy-paste; document a sustainable update workflow for dates and People. Source protection applies to extracted private content too.
- Build-time fail-closed publication restrictions must not depend on RELEASE=1 alone.

## 5. P2 — full visual + interactive G2 evidence

- Recompare FULL-PAGE desktop/mobile views for all seven routes at 1440/1024/768/390/320, including interactive states; source = true v16, not October code. Keep private screenshots private.
- Afisha city/date combination, reset, no-results, month grouping, expired states and deterministic timezone handling; source 266 counts unfiltered.
- People whole-photo activation, centered БИОГРАФИЯ hover/focus with slight darkening and no rectangle, touch discoverability, all 15 modal bodies, Escape, backdrop (desktop only where clickable), focus trap/return, scroll lock, missing image.
- Intro video skip/replay, mobile restrictions, failure fallback, saved and live prefers-reduced-motion; header mobile/desktop keyboard/touch/focus and navigation.
- All seven routes, direct reload, missing asset and real 404, actual asset availability, font loading, motion, no horizontal overflow and no JS page errors; privacy/no external transaction.
- Full route/section/content/interaction/rightsholder parity matrix with exact deviations, not only one-line per route. Record test evidence and what still cannot be verified.

## 6. Required deliverables & stopping rules

- An owner-accessible, genuinely private review **verified** (or exact blocker + precise owner action), preferably with a tested portable handoff.
- Durable implementation in the existing Stage 02 feature branch, full SHA/changed paths; no protected media committed publicly.
- Stage 02 data import IDs, event/People crosswalk, rights and link verification register, full-screen parity and automated/manual test evidence.
- Updated `docs/site-rebuild/STAGE_02_REPORT.md`, parity matrix, links to PUBLIC-SAFE reports; private original/media/screenshots remain outside public Git.
- Update Notion task with outcomes, evidence, exact commit, limitations and G2 status. Review preserved user decisions; do not overwrite older history.
- Respond to owner in Russian with clear instructions to view real site, not just a technical status.
- **STOP at G2 and request owner's actual visual review. DO NOT self-approve G2 or start Stage 03.**
- No REG.RU changes, no DNS, no Sites publishing, no `main` merges/rewrites, no official release ZIP, no unapproved ticket purchase actions.

## 7. FULL STAGE ROADMAP — context and transition gates

**00 — Audit and recovery: ALREADY PERFORMED.** Original v16 Git source and 57 hashes confirmed; historical tar unverified, limited nonpublic waiver documented. No repeat from scratch.

**01 — Foundation: ALREADY COMPLETED, G1 OWNER-ACCEPTED.** Architecture/route skeletons/testing `3ce63e...`. Do not rebuild this stage.

**02 — FULL implementation and private review: ACTIVE / AUTHORIZED ONLY.** Finish P0 owner-accessible preview, P1 maintainable data/rights and P2 complete parity. G2 requires owner inspection and acceptance of exact layout/interactions, source parity and documented gaps. Stop for approval.

**03 — QA/legal/rights, NOT AUTHORIZED.** Independent accessibility, cross-browser, dates/tickets, factual editorial, privacy and rights clearance. Only after owner explicitly accepts G2 and approves Stage 03.

**04 — Release ZIP and REG.RU readiness, NOT AUTHORIZED.** Reproducible root-content ZIP, hash manifest, host settings, backup/rollback rehearsal. Only after G3 and explicit owner authorization.

**05 — Production deployment, NOT AUTHORIZED.** Owner-authorized manual REG.RU replacement after verified complete server backup including hidden files and rollback, then live smoke tests. Only after G4.

**06 — Maintenance, NOT AUTHORIZED.** Follow-on scoped releases under separate owner instruction after G5.

## 8. First action / checkpoint report

Before making substantial modifications, report in Russian:
- Which Git branch and SHA you fetched, and whether `main` still matches the known baseline;
- Which required documents you read;
- Whether the original private Sites checkout IS or IS NOT accessible in THIS fresh session and which hash/commit checks succeeded;
- Whether owner-only delivery is feasible and the chosen mechanism;
- The concrete next Stage 02 task (P0 first), without reopening Stage 00/01.

Then execute as much of the authorized Stage 02 as is safely possible, recording verifiable evidence. Do not ask the owner to repeat information already documented in GitHub/Notion.

**Final mandatory confirmation:** main unchanged; REG.RU production unchanged; live Sites unchanged; Stage 03 not started; official release ZIP not created.

