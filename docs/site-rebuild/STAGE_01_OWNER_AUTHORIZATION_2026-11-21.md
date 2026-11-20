# CODEX — STAGE 01 AUTHORIZED: SITE ARCHITECTURE & PRIVATE FOUNDATION

Task ID: WEB-2026-01
Authorization date: 2026-11-21
Repo: https://github.com/evgenii-yps/chamberbalet.ru
Documentation/audit branch: docs/stage-00-audit
Stage 00 audit commit: 003a6413268a932882ff0cb9ce692038285d87dc
Approved Sites v16 source commit: 329a00aec044a5bf10d96386f953efe1369f9bb1
Historical main baseline: aff98db8fbe7865a96992b1f7288764f311075a6 (recheck before creating branch)
Notion task: https://app.notion.com/p/41eafb0a249f81a1ae10c7c271913273

## 1. Owner decision — limited G0 waiver, NOT public release clearance

The owner explicitly APPROVES Stage 01 ONLY.

For this nonpublic architecture/foundation stage, use the exact authorized Sites v16 Git commit and its per-file SHA-256 register as the technical reference. The owner WAIVES ONLY the prerequisite to obtain and independently verify the separately saved Sites v16 tar before beginning Stage 01. The saved tar's reported byte count and SHA-256 are still UNVERIFIED. This waiver does not prove tar identity, full pre-build authoring source or original-quality media masters, publication rights, current external booking links, legal texts, or REG.RU compatibility.

Do NOT rewrite prior Stage 00 evidence as unconditional GO. Record status as "G0 LIMITED WAIVER APPROVED FOR STAGE 01 ONLY"; other blockers carry forward into future acceptance gates.

## 2. Read before acting

Read the full handoff contract in the audit branch:
- AGENTS.md
- PROJECT_CONTRACT.md
- TASKS/STAGE_01_ARCHITECTURE_AND_FOUNDATION.md
- docs/site-rebuild/STAGE_00_REPORT.md
- docs/site-rebuild/SOURCE_PROVENANCE.md
- docs/site-rebuild/ROUTES_AND_STATES.csv
- docs/site-rebuild/SECTIONS_INVENTORY.csv
- docs/site-rebuild/ASSET_RIGHTS_REGISTER.csv
- docs/site-rebuild/GAP_MATRIX.csv
- docs/site-rebuild/BLOCKERS.md
- docs/site-rebuild/REG_RU_CONTRACT.md
- this authorization addendum.

Where older handoff text demands the original saved tar before Stage 01, this explicitly owner-approved LIMITED waiver supersedes only that requirement. All other restrictions remain in force.

## 3. Hard scope and branch safety

Execute STAGE 01 only: reproducible static architecture, file structure, content schemas, route foundations, safe asset references, preview tooling and tests.

Start a new isolated feature branch from freshly verified origin/main, suggested name feat/site-v16-stage01-foundation. Do NOT develop on main or merge into main. Do NOT overwrite or run the old builder in a way that destroys source material. Do NOT edit the live REG.RU server, DNS, public Sites project, or GitHub repository settings.

The original Sites source checkout and rights-pending media must remain private. The repository is PUBLIC: never push unapproved portraits, biographies, event records, video, PDFs, raw prototype export, unpublished personal/contact data or other unapproved copyrighted assets. Use test-only fixtures clearly marked as fictitious and excluded from release. Do not claim visual parity for placeholder content.

Do NOT start STAGE 02, generate an official release ZIP, advertise tickets, send emails, publish a staging URL publicly, or deploy the site.

## 4. Architecture decisions to implement

Build a lightweight, maintainable static site suitable for manual ZIP upload to REG.RU with no running production Node server, database, CMS, third-party APIs or tracking unless separately approved.

Reuse existing repository build tooling only after checking its behavior and suitability. The old README's generated one-page site is NOT the design authority. Use the approved Sites v16 Git files as read-only input for functional/visual mapping, not as evidence that upstream build source is available.

Preserve the target route contract:
- / (index.html)
- /afisha.html
- /repertoire.html
- /nutcracker.html
- /swan-lake.html
- /people.html
- /venues.html

Define shared header/footer/nav, CSS tokens, typography strategy, semantic page layout, reusable sections, accessible component contracts and explicit 404 behavior. Respect the audience hierarchy (spectators first, venue cooperation secondary). Do not redesign or invent new copy. Record exact intentional differences from the Sites v16 reference.

Create modular, testable schemas/data loaders for:
- performances and dated sessions, venues, cities, booking destinations, timezone-aware date filtering and sold-out/unavailable states;
- repertoire and performance detail pages;
- People biographies, roles and portrait references;
- media/licence/status metadata and documents;
- route metadata, SEO/social defaults, legal link states.

The 266 recorded shows (168 touring + 98 home) and 15 People profiles are an audit baseline, NOT a licence to publish or assume schedule validity. Preserve the ability to migrate all approved records later without manual retyping, but do not inject rights-pending content into public git. Never activate purchase buttons for unverified destinations.

Create an asset manifest with expected filenames, hashes, dimensions where known, rights_status and optional_private_source without committing private bytes. Design fallbacks for absent media that are explicit in PREVIEW and cannot silently pass the release gate.

Create a deterministic build pipeline, development command, local preview, lint/check/test commands, build artifact manifest and safe dist output. Work toward ZIP-root deployability (index.html, assets/, other route files and only a host-tested .htaccess); STAGE 04 will actually create and validate the release ZIP. Avoid one-year immutable cache on unhashed assets and avoid 404 fallbacks that return homepage for missing files.

## 5. Stage 01 implementation steps

1. Confirm main, audit branch and Sites commit SHA. Record the exact baseline and source provenance.
2. Choose/document the minimal static architecture, migration mapping and risk controls. Explicitly compare "new framework" vs "small Node static builder" rather than assuming either.
3. Create feature branch and a clean reusable source structure without touching the recovered private original.
4. Implement seven route skeletons, shared navigation and footer, responsive baseline and accessible focus/keyboard scaffolding. Support original hero/video, schedule, production pages, People modal and venue cooperation via component contracts/stubs as appropriate; full fidelity implementation is Stage 02.
5. Add typed or validated content schemas, fixture-only schedule/people data, asset rights manifest and documentation for authorized content import in Stage 02.
6. Add build, preview and automated smoke testing for all seven routes, internal links, missing assets, simple mobile viewport, semantic landmarks, keyboard navigation and error responses.
7. Test clean checkout/setup, build determinism as feasible, local preview (no requirement to publish a live preview), the static-hosting output shape, and a no-secrets/no-unapproved-media scan.
8. Write complete evidence and a Stage 01 report in docs/site-rebuild, update the Notion task, and STOP.

## 6. Stage 01 acceptance gate G1

Provide evidence of:
- approved architecture decision and build commands;
- working reproducible local static build from clean inputs, including seven route skeletons;
- local preview and smoke tests, no broken local asset references or major horizontal overflow in representative desktop/mobile tests;
- asset rights manifest and explicit strategy to import the real source privately only after clearance;
- docs explaining data replacement/maintenance, route mapping, 404 and REG.RU assumptions;
- complete diff/commit SHA on isolated feature branch;
- explicit GAP table listing what still needs Stage 02;
- no public deployment, no main changes, no protected/media/legal leaks.

If dependencies cannot install, source cannot be accessed safely, or scope requires uploading protected files, mark BLOCKED with evidence instead of silently weakening requirements. G1 is NOT automatically accepted by tests: the owner must review preview and authorize Stage 02 separately.

## 7. Remaining project plan — context ONLY, NOT authorized

Stage 00 — source recovery/audit: completed to the extent documented; tar-provenance waiver applies only to the Stage 01 start. Open external-link, rights, host and master-source questions remain tracked.
Stage 01 — NOW AUTHORIZED: static architecture, route foundation, content/asset schemas, private preview and tests. Stop at G1 owner review.
Stage 02 — NOT AUTHORIZED: full page/UI/data/media/interaction migration from authentic source and visual parity; no public rights-pending asset pushes. Stop at G2 review.
Stage 03 — NOT AUTHORIZED: independent accessibility/visual/browser QA, factual ticket/schedule verification, rights and legal approvals. Stop at G3.
Stage 04 — NOT AUTHORIZED: verified release ZIP with files at archive root, checksums, deployment manifest and host/backup/rollback rehearsal. Stop at G4.
Stage 05 — NOT AUTHORIZED: owner-approved manual REG.RU deployment, live smoke tests and rollback, with an explicit release authorization. Stop at G5.
Stage 06 — NOT AUTHORIZED: maintenance by separately approved scoped tasks.

Publication must NOT occur while rights/legal approvals, current external booking links, real REG.RU configuration, complete remote backup or rollback verification remain open.

## 8. Mandatory report to owner — in Russian

State: exact files/architecture created, how to run/preview, changed branches and full SHAs, test commands and outputs, remaining uncertainty and G1 verdict, link to Notion update, known blockers and conditions to start Stage 02. Explicitly confirm: "main unchanged; REG.RU production unchanged; Stage 02 not started; release ZIP not generated."

DO NOT continue automatically after G1.
