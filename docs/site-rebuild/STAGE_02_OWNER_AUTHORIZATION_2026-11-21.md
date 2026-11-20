# CODEX TASK WEB-2026-02 — FULL REBUILD OF THE APPROVED CHAMBERBALET PROTOTYPE

**Authorization:** Owner explicitly accepted G1 and authorized **STAGE 02 ONLY** on 2026-11-21. Do not start Stage 03 or release/deploy.
**Owner communication language:** Russian. **Engineering specification/code language:** English. **Visible website copy:** Russian, only when sourced/approved.

## 0. Immutable references and state

Project: theatre website `chamberbalet.ru`.
GitHub: https://github.com/evgenii-yps/chamberbalet.ru (PUBLIC repository).
Stage 01 implementation branch: `feat/site-v16-stage01-foundation`, accepted baseline commit `3ce63e3902003d30700c6b48a66d343b3ac60094`.
Stage 00 documentation branch: `docs/stage-00-audit`, Stage 00 audit `003a6413268a932882ff0cb9ce692038285d87dc`; owner Stage 01 authorization/clarification `c3304c40af6b46e96c82648b128b84df884586d6`.
Original authorized ChatGPT Sites v16 source Git commit: `329a00aec044a5bf10d96386f953efe1369f9bb1` (57 files, 7 HTML, CSS/JS/fonts/video/assets). Canonical published reference: https://chamberbalet-prototype-v01.cuppedhornbill2.chatgpt.site/
Notion task: https://app.notion.com/p/41eafb0a249f81a1ae10c7c271913273
User-supplied NEW mockup: owner reports already provided to Codex; previous Codex workspace could not locate a separate attachment. Verify its exact identity, version and completeness before claiming to have checked it; use the independently verified Sites v16 Git source as authoritative in the meantime. Never use the obsolete October website or partial v0.19 as the design target.

G0's saved-tar identity check received a limited owner waiver to start nonpublic work; the reported saved tar SHA-256 and length remain unverified. G1 foundation has been **accepted for Stage 02 entry**, not as visual/design approval. Known remaining external blocker: 120 distinct external URLs could not be checked due to network proxy CONNECT 403. Recorded source content: 15 People profiles with 14 portraits and one photo placeholder; 266 show/session rows before date filtering (168 touring + 98 home), 26 tour cities. All records are source facts, NOT proof of current dates, ownership, legal rights or sellable ticket availability.

## 1. Owner intent — rebuild, not refurbish

Build the REAL complete website corresponding to the NEW approved mockup, not another skeleton. Replace the entire old site's product/design/structure; its content and legacy site mode-switch are not requirements. The old production is disposable AS A FUTURE PRODUCT, but is NOT authorized to be deleted or modified now.

Preserve the new approved source's visual identity, typographic hierarchy, colors, layout, images, animated intro, interactions, copy, navigation, full route structure and responsive behavior. When reproducing the original with source assets in a private environment, do not redesign, paraphrase, invent images, invent people, shorten the event roster or silently omit sections. Document every deviation.

Stage 02 deliverable = complete locally viewable private visual and functional implementation + evidence. NOT a public site/release.

## 2. Non-negotiable safety/privacy/repository contract

- Work ONLY on a new isolated Stage 02 feature branch created from accepted Stage 01 commit `3ce63e3902003d30700c6b48a66d343b3ac60094`, for example `feat/site-v16-stage02-full-implementation`. Confirm the actual parent SHA and preserve history. Never commit to main; do not merge or rewrite it.
- Public GitHub must NOT receive rights-pending portraits, copyrighted video/photos, unapproved biographies, unpublished contact information, unapproved PDFs, raw Sites export, credentials, cookies or protected screenshots. Keep original source/real media/data in an authorized private checkout outside Git tracking, protected by `.gitignore` and negative repo/commit scanning.
- This private source may be used to generate an authentic **localhost-only** preview if authorized. A shareable private preview artifact containing protected source/data requires verified access controls; never upload it to public GitHub or share it via a public preview URL.
- Reusable website code, layouts, generic CSS/JS, tests, schemas, asset IDs and **non-sensitive metadata** may be committed publicly. If full parity requires assets/content unavailable safely, implement robust private-local injection and report `PARITY_PENDING_PRIVATE_ASSETS` rather than putting them in public Git or presenting placeholders as completed parity.
- Disable/noindex preview; no analytics, cookie tracking, payments, collection forms or active customer transactions. Never claim HTTPS syntax is proof that a ticket URL is current/approved. Unknown or pending tickets must not become active calls-to-action in a public-mode build.
- Do not change REG.RU, live Sites, DNS, public repository settings or production `main`. No official release ZIP. Stage 03 is not authorized.
- Preserve a release gate that fails CLOSED by default, independent of a single environment flag, until rights/legal/link/hosting approvals from later stages are proven.

## 3. Implementation — every approved source route

Implement ALL seven actual Routes (relative URL and direct reload supported):
1. `/` / `index.html`: actual branded spectator-first homepage, intro video (muted/playsinline/skip/replay and correct fallback/reduced motion/session behavior), hero/poster, upcoming performances, repertoire/productions, chamber/large-format distinction, People leadership preview and secondary link to venue cooperation.
2. `/afisha.html`: complete schedule with tour/home listings, city filter, deterministic timezone-aware date filtering, grouping, source data ordering, empty/past/near-future/sold-out/unknown-ticket states, exact source counts before filtering and sensible content maintenance.
3. `/repertoire.html`: approved full repertoire hierarchy and individual production navigation, no synthetic invented shows.
4. `/nutcracker.html`: approved story, gallery, formats and upcoming shows with source layout and imagery in PRIVATE preview.
5. `/swan-lake.html`: approved story, galleries/formats/showtimes if present, related production links.
6. `/people.html`: exactly 15 original source profiles, 2 leaders and 13 artists, 14 portrait references + one clear photo placeholder; homepage preview matches source; responsive card grid. Every portrait is clickable/tappable (whole photo), not only label. Desktop hover/focus slightly darkens photo and shows a large centered `Биография` caption with **NO rectangular button**; touch must provide visible affordance. Correct modal bio, photo/facts and available image navigation. Accessibility: close button, backdrop, Escape, focus trap, restore focus, body scroll management, reduced-motion.
7. `/venues.html`: original venue-partner/B2B content, forms of cooperation, format information, contact flow and document links ONLY where approved. Do not silently publish draft contract PDFs/contacts.

Implement real shared header/menu/nav/footer, logo/brand, fonts, imagery/layout, site motion/scroll and semantics. Respect actual source's interactivity rather than inventing UX. Preserve exact artist roles/experience boundaries and the original visual design, including existing mobile behavior. Avoid nonapproved AI imagery.

## 4. Data, media and provenance

- Use the recovered Sites v16 Git tree as a read-only input in private workspace. Before import, recheck its source commit and `ASSET_RIGHTS_REGISTER.csv` / `foundation/data/source-inventory.csv` per-file hashes (57). Source is a deployed `dist/` tree; upstream authoring sources and masters were not proven. Do not claim otherwise.
- Create a documented private source adapter/importer that can ingest all approved content and local media WITHOUT needing to retype 266 rows/15 bios manually. Preserve original source record IDs and correlate them with final route/display states. Derived content/asset bytes must remain untracked until publication rights are explicitly cleared.
- Preserve the 168 touring + 98 home source counts before date filtering; report any transformed/skipped/duplicate records with source path, hash and rationale. Dates range over future/past and must not be assumed current. Preserve full source values without offering incorrect tickets; keep booking targets as `source_recorded` / `syntax_checked` / `live_checked` / `owner_approved` separate fields, and keep incomplete destinations inactive outside closed preview.
- Keep authoritative content in one maintainable data layer; future shows should be updated by editing data, not changing page markup. Handle timezones/date offsets, empty states and expired events.
- Asset register must track IDs/path/hash/type, source, use-by-route, alt text, responsive/fallback, rights owner/approval state. Preserve actual fonts/licence notices and movie image/portrait files only inside private preview, not public repo. Do not ship unapproved PDFs even in a release candidate.
- Preserve source-to-output mapping and clear approval state for every route, content record, external URL, asset and interaction.

## 5. Build, migration and technical quality

- Extend or replace the Stage 01 `foundation/` static builder as needed while keeping the result maintainable, rebuildable and independently testable. No running Node/database/backend on REG.RU. Document precisely ONE canonical build command and ONE deployable output directory; the legacy root builder must never be used by mistake in any future release.
- Keep legacy October source untouched unless a separately justified, reversible change is made within the Stage 02 branch; do not delete old live content on server.
- Implement real error page/HTTP 404 semantics for local preview and an Apache-compatible future plan (actual REG.RU still unverified). Avoid blanket `ErrorDocument 404 /index.html` that hides missing resources. Do not configure long immutable caching for unhashed assets.
- Protect against HTML injection in source copy, unsafe external URL protocols, missing image/video, navigation regressions, inaccessible dialogs, invalid data and failed build inputs. Show no runtime error in normal local preview.
- The preview must be visually useful for owner review, not a fixture-only scaffold; if private assets cannot be delivered in a safe local preview, report exact blocker and include a separate public-safe structural view, clearly labeled incomplete.

## 6. Stage 02 verification and evidence

1. Local build and route tests for all seven pages and direct deep links; internal static references/anchors and all required assets.
2. Browser at 1440, 1024, 768, 390 and 320px, desktop/touch states, viewport overflow, visual snapshots. Compare actual PRIVATE screenshots with the authentic Sites v16 source reference, not an older theme. Keep protected screenshots PRIVATE and record only safe findings/hashes in public docs.
3. Test source video intro skip/replay/reduced-motion/error fallback; menu desktop/mobile+Escape; afisha filters/chronology/cities; performance CTA states; all 15 People bios (whole-card activation, backdrop, Escape, keyboard, focus restoration, portrait placeholder), across viewport classes.
4. Assert all seven routes, all 15 People records and source 266 shows before date filtering; report 168/98 distinction. Validate missing/unapproved media and broken links fail safely.
5. Treat 120 unverified external URLs as `UNVERIFIED_NETWORK`, NOT broken or live. No real-ticket claim without a per-link network+ownership check in authorized environment.
6. `npm ci`, build, test/check, reproducibility where feasible and security/repository scan. Verify production build cannot release rights-pending data or artifacts by default.
7. Create `docs/site-rebuild/STAGE_02_REPORT.md`, route/section/behavior/asset parity matrix, screenshot-check manifest (metadata only), test results, unresolved deviations, source hashes and `G2` readiness assessment. Update Notion and include exact branch/commit SHA and any permission blockers.

**G2 acceptance is NOT automatic:** complete authentic local preview and documented source parity with zero unexplained missing routes/approved sections; functional interactions and counts match; owner personally reviews the visual result; legal/content/rights gaps remain separately tracked, not silently considered approved.

## 7. Mandatory full roadmap (transition conditions)

STAGE 00 — completed evidence audit: exact Sites v16 Git source recovered; saved tar provenance waiver only for nonpublic implementation; unresolved original tar, media masters, 120 external links, rights and REG.RU remain recorded.
STAGE 01 — completed/accepted G1: seven-route static foundation, schemas, local preview and smoke checks, commit `3ce63e3902003d30700c6b48a66d343b3ac60094`.
**STAGE 02 — ACTIVE, AUTHORIZED ONLY NOW:** implement the complete approved new site from the genuine reference and create private visual/functional parity evidence. Stop at G2; request owner review.
STAGE 03 — NOT AUTHORIZED: independent cross-browser/accessibility/editorial QA, rights/legal and ticket/date verification; requires separately approved G2 transition.
STAGE 04 — NOT AUTHORIZED: validated reproducible REG.RU ZIP at archive root, hashes, Apache/hosting configuration and backup/rollback rehearsal; only after G3 approval and needed rights/release permissions.
STAGE 05 — NOT AUTHORIZED: owner-authorized manual REG.RU deployment of the NEW site (old site can be replaced only after verified full backup and rollback); live checks, only after G4.
STAGE 06 — NOT AUTHORIZED: maintenance through separately assigned scoped updates and releases.

## 8. Final answer from Codex, in Russian

Provide: what is REALLY implemented; link/instructions for LOCAL/PRIVATE visual preview; 7-route side-by-side parity summary; counts and interactions tested; exact tests/exit codes; what is still mock/blocked; media/data rights and external-link concerns; independent-proof boundaries; branch + full commit SHA; Notion update URL; G2 verdict and necessary owner approvals.

**Explicitly confirm that `main`, REG.RU production and live Sites are unchanged; Stage 03 not started; release ZIP not created. Stop after Stage 02.**
