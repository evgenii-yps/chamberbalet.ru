# STAGE 02 CONTINUATION — G2 REMEDIATION AND OWNER-ACCESSIBLE PRIVATE REVIEW

Date: 2026-11-21
Project: chamberbalet.ru rebuild
Language of Codex report to owner: Russian
ACTIVE STAGE: 02 ONLY — already authorized; this is a remediation task, not Stage 03.
Repository: https://github.com/evgenii-yps/chamberbalet.ru
Current Stage 02 branch: feat/site-v16-stage02-full-implementation
Stage 02 checkpoint: 8d2c376b0b815f861d578838aa2615c755d008cd
Accepted Stage 01 source: 3ce63e3902003d30700c6b48a66d343b3ac60094
Canonical Sites v16 source: 329a00aec044a5bf10d96386f953efe1369f9bb1
Notion task: https://app.notion.com/p/41eafb0a249f81a1ae10c7c271913273

## 1. Independent G2 review — evidence and findings

The owner has NOT accepted G2. The public branch and documented code show an authenticated, checksum-verified private adapter that copies the already-built Sites v16 dist directory, then adds noindex, link safety, an afisha date filter, and a local 404. This is a legitimate intermediate private preview, not yet a complete independently maintainable reconstruction.

Preserve the functioning seven-page visual preview and the exact original design. Do not restart the implementation, revert to the old October website, or replace the original with a generic placeholder skeleton.

At checkpoint, 57 source files and their file hashes were verified; records were counted as 15 People profiles and 266 shows (168 touring / 98 home). Reports describe 35 source-preview viewport comparisons; the pixel-equality claim applies only to FIRST viewport of six unchanged routes, not to full-page parity. These browser tests were reported by Codex; independent review of their screenshots has not been done by the assistant. The user has not inspected the preview.

The Cloud Desktop exception ("the gaas-browser node_repl sandbox cannot be disabled") is an environment/tooling issue, NOT evidence of a website runtime defect. Do not spend unlimited effort retrying that path.

## 2. P0 — Deliver a genuinely OWNER-ACCESSIBLE PRIVATE visual review

A URL on 127.0.0.1:4181 inside a Codex workspace is NOT accessible from the owner's computer. Do not present it as a usable user link. First inspect which private source/export paths, artifact delivery mechanisms and authorized recipients actually exist.

Provide ONE verified, practical owner-review path, in descending preference:
(A) Existing authorized, access-controlled owner-only preview/review environment with real browser navigation and media playback, if such an environment already exists and permits confidential data. Check access/recipient visibility BEFORE placing any media, people data or sensitive screenshots there. Do not deploy publicly or create a new hosted service without explicit owner permission.
(B) A self-contained, privately transferred OFFLINE REVIEW PACKAGE (source-derived seven HTML routes, necessary CSS/JS/assets/media, and a safe one-click Windows launcher for a loopback local server). The owner MUST be able to open the site on their own Windows PC without access to the Codex temporary workspace, without manually setting SITES_SOURCE and without requiring a Git clone of the protected Sites repository. If the launcher requires Node/Python or other runtime, detect it and provide explicit understandable install instructions or a tested alternative. Include README_RU, a file manifest and SHA-256, and test package extraction and browsing of all seven routes. Store/transmit only through an authorized truly PRIVATE mechanism with verified recipient access; never upload protected content to this PUBLIC GitHub repository or assume a normal Notion page is confidential. An owner-only artifact or private file handoff is not permission to publish.
(C) If neither is available securely, STOP on the access requirement and deliver full-page visual review evidence via an access-verified private channel, with route screenshots at desktop and mobile sizes plus representative modal, filter and video states. Report the precise owner action and transfer mechanism needed to make an interactive preview available.

Do not call a screenshot set an interactive preview. Do not claim any package exists until byte-verified and genuinely retrievable by the owner. Do not commit the package, private media, original texts, screenshots or biographies in public Git. Keep a public-safe SHA/list report only.

Do not remove or downgrade the existing loopback private preview; it remains the engineering verification tool.

## 3. P1 — Complete maintainable source-derived data mapping

Keep all raw values intact and maintain source-to-output traceability:
- Parse/import the 266 source schedule records losslessly into a maintainable private data representation. Record original raw values, source path and file digest, stable deterministic record IDs, source ordering and duplicate handling; never invent show data or retype a shortened subset.
- Preserve exact 168 touring / 98 home pre-filter counts and separate current/upcoming filtering. Treat date and ticket information as unverified; do not announce an event as currently bookable just because it is present in the source.
- Separate ticket states per URL: source_recorded, syntax_checked, live_checked and owner_approved, with evidence/time and target identity. A valid https URL alone must NEVER imply live_checked or owner_approved. 120 external source URLs are presently UNVERIFIED_NETWORK because of CONNECT 403 and must remain so. Render unavailable/disabled public-mode CTA unless independently cleared.
- Map 15 People profiles (two leaders, thirteen artists, fourteen source portrait references and one no-photo case) with stable IDs and correct source biographies, role labels and asset references. Keep protected actual content PRIVATE.
- Keep original JS as read-only provenance if needed, but establish a documented update workflow that does not require editing generated HTML or manually touching hundreds of rows.
- Build per-route/per-asset inventory: sourcePath/hash, type/dimensions, usedByRoutes, altText, source/owner, rightsStatus, approval evidence, missing/fallback state, private preview inclusion and release eligibility. Missing proof => PENDING, never auto-APPROVED.
- Keep source exports, sensitive records and all unapproved media only in private directories and private artifacts; allow public code and nonsensitive metadata only.

## 4. P2 — Complete full-state visual and interaction parity

- Extend screenshots beyond first viewport to FULL-PAGE desktop, tablet and mobile. Capture at least 1440, 1024, 768, 390 and 320 px (and component interaction states) against exact Sites v16 origin and updated private build. Record expected date-filter deviation separately. Keep image BYTES PRIVATE; metadata and redacted findings in Git.
- Exercise all seven routes; header and mobile menu (mouse, touch, keyboard, Escape, navigation), no horizontal overflow, actual fonts/images/video, blank/missing-resource fallbacks and true 404.
- Test introductory video autoplay restrictions, playsinline, skip, replay, error fallback, saved reduced-motion and LIVE prefers-reduced-motion transition (previous immediate sampling was inconclusive).
- Test date+city filters together across rerenders, reset/empty/no-results states, month hiding, chronological sorting, 266 source records before filtering, and expired events.
- For all 15 People profiles, exercise whole-portrait activation; large centered БИОГРАФИЯ hover/focus overlay with no rectangular shape; all modal information and images; Escape/close, desktop backdrop click, focus trap and focus return, scroll lock; mobile modal fills viewport so backdrop click is NOT expected when there is no clickable backdrop area. Check touch and narrower screen bounds.
- Validate external contact, booking and PDF protections at BUILD/SERVER level where feasible, not solely via delayed client-side href removal, and ensure no accidental external navigation while reviewing. Keep deliberate differences documented instead of reporting perfect parity.
- Add tests, fixture/mock-free private import checks, immutable source hash validation, deterministic output, and public Git diff scan for protected bytes/secrets. Explicitly distinguish manual observations from automated results.

## 5. Engineering concerns / acceptance

Ensure ONE clearly documented canonical PRIVATE build and a separate future production build contract. The old repository root builder MUST NOT silently produce the future release. The current .private/dist is the actual private preview, NOT a public releasable artifact. Maintain fail-closed release controls regardless of a single environment variable. No public release ZIP or staging publication in this stage.

If rebuilding the full source with a maintainable data importer is not possible from the recovered dist, document the exact limitation and propose a non-destructive migration path. Do not claim authoring source or original-quality masters exist beyond the verified 57-file tree.

Keep media rights, approval of biographies, legal PDF drafts, live external URLs, final REG.RU configuration, remote backup and rollback explicitly UNRESOLVED for later release gates. They must not be falsely marked passed merely because preview is local.

## 6. Required output and evidence

1. Owner-accessible private visual artifact/path OR a clearly documented access blocker plus private full-page screenshot/recording evidence. Demonstrate actual retrieval and seven-route access, not just localhost in Codex.
2. Complete Stage 02 implementation on an isolated feature branch, exact commit SHA.
3. Private schedule/People importers with stable IDs and source crosswalk; record-level ticket status register.
4. Full route/section/behavior/content/asset/rights parity and test matrix.
5. Screenshot evidence inventory clearly distinguishing first viewport from full page and known deviations.
6. Test commands, exit statuses and browser states.
7. Public-safe documentation update plus Notion task update (don't paste protected media/text to public project pages).
8. Written G2 readiness report in Russian with unresolved issues and one clear owner visual review action.

Do not mark G2 ACCEPTED yourself. Stop and request owner's visual/functional review when evidence is available.

## 7. Complete roadmap and gates — execute ONLY Stage 02

STAGE 00 — Completed partial source/audit with Sites v16 verified Git source, saved tar provenance waived ONLY for nonpublic work. Other issues remain.
STAGE 01 — Completed; G1 accepted by owner. Static foundation is the implementation baseline.
STAGE 02 — CURRENT, AUTHORIZED. Finish complete authentic visual and functional private implementation, stable data mapping, owner-accessible private review and G2 evidence. STOP for owner G2 decision.
STAGE 03 — NOT AUTHORIZED. Independent browser/a11y/SEO, editorial and current show/ticket verification, legal, privacy and media-rights clearance. Enter only after owner accepts G2 and explicitly authorizes Stage 03.
STAGE 04 — NOT AUTHORIZED. Genuine reproducible release ZIP, verified file manifest, actual REG.RU host/staging and backup/rollback plan. Enter only after G3 approval.
STAGE 05 — NOT AUTHORIZED. Explicitly owner-approved manual replacement of the old REG.RU site, live smoke checks and rollback capability. Enter only after G4 approval and production backup.
STAGE 06 — NOT AUTHORIZED. Scoped maintenance only after G5 and separate work authorization.

Mandatory final confirmation: GitHub main unchanged; REG.RU production unchanged; published Sites unchanged; Stage 03 NOT started; official release ZIP NOT created.
