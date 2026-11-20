# Stage 01 architecture decision

Status: proposed for G1 owner review. Baseline: GitHub main `aff98db8fbe7865a96992b1f7288764f311075a6`; Stage 00 findings and owner approval at `c3304c40af6b46e96c82648b128b84df884586d6`. Approved technical reference: private Sites v16 Git `329a00aec044a5bf10d96386f953efe1369f9bb1`; 57 per-file hashes in `data/source-inventory.csv`, separate source asset metadata in `data/asset-manifest.json`. Previous stage records remain in audit branch. Original tar provenance remains waived only for Stage 01; byte count/hash not verified.

## Choice

A small Node standard-library static builder was chosen over a new web framework: the reference is seven static HTML pages with local JS/CSS; the deployment contract calls for files that run without Node or an API. A framework could add useful routing and components later, but currently adds dependency and build complexity without a demonstrated server need. The builder, typed-by-validation records and fixture inputs are intentionally small; Node runs locally, never on REG.RU. Build output is deterministic from current inputs and the old site root and builder are not invoked. Stage 02 should replace skeletons with the approved design using appropriate authoring templates and shared components, without copying unapproved media or content into public Git.

## Route and component contract

| v16 source | Stage 01 output | Later migration |
|---|---|---|
| dist/index.html | index.html | header, intro video, poster, afisha, productions, formats, people, venues |
| dist/afisha.html | afisha.html | time-zone aware listings, city filter, empty states |
| dist/repertoire.html | repertoire.html | production cards and extended repertoire |
| dist/nutcracker.html | nutcracker.html | story, gallery, formats, sessions |
| dist/swan-lake.html | swan-lake.html | story, formats, sessions |
| dist/people.html | people.html | 15 profiles, modal, focus trap/restore, Escape, backdrop |
| dist/venues.html | venues.html | conditions, formats, approved contact and document |

The preview intentionally uses generic titles, placeholder sections, system fonts, no original brand/visuals, no biography dialog, schedule renderer, video or ticket controls. It is structural scaffolding, not a visual claim. Shared semantic main/header/nav/footer, visible focus and mobile toggle are present. English field keys and Russian UI stub labels are used, not speculative real text. 404 is a distinct file and local preview returns 404; actual Apache behavior is unverified and no `.htaccess` is shipped.

## Content and asset contracts

`src/model.mjs` defines route records; production (id/title/route), venue (id/name/city/timezone), person (id/name/role/biography/portraitAssetId), document (id/title/approvalStatus), media (id/path/hash/rights) and session (id/productionId/venueId/city/timezone/ISO-offset startsAt/booking status). Invalid offsets, timezones and unverified booking URLs are rejected. `upcomingSessions` uses timestamps, stable chronological ordering and takes an injectable clock. The intentionally fictional `data/fixture.json` is never a substitute for the 266 source events or 15 people; real content should be imported privately and validated against the 57-file v16 source inventory without retyping. Enforce referential integrity, record-level authorizations, output escaping, alt text, verified ticket ownership, legal clearance, and parity checks during Stage 02/03: current checks are a foundation, not complete domain validation.

Asset manifest entries provide source path, byte size, SHA-256, raster dimensions when readable, rights pending, alt text needing editorial review and null optional private source. Source inventory and manifest contain metadata only. File absence is explicitly shown in preview; blocked release and the rights checks are not a complete release system. Full release must fail closed unless every referenced media item and legal document is approved, local, valid and complete. No new analytics, remote assets, forms, CMS or payment system.

## Hosting / security

Build result `foundation/dist/` is a preview, not a release ZIP; paths are structured for future root upload. It includes no webserver rewrite, immutable caching or Apache rules. A future host contract must verify web root, real 404s, MIME/range support, redirects, HTTPS, caching, existing files, backup and restore. A real production deployment requires separate Stage 04/05 approval. No raw media, biographies, event records or contact details are committed. Treat public metadata as identifiers, not rights clearance.
