# Stage 00 — preliminary audit, BLOCKED

Date: 2026-11-21 (Europe/Moscow). Scope: documentation only; no deployment or Stage 01.

## Evidence and source access

- The required assignment attachment was not present in /workspace: START_HERE_CODEX.md, AGENTS.md, PROJECT_CONTRACT.md and REFERENCE/REFERENCE_MANIFEST.md were not found. Its instructions and exact acceptance criteria remain unverified. A related Notion task provides context, but is not a substitute for the package.
- GitHub origin: https://github.com/evgenii-yps/chamberbalet.ru; `git ls-remote origin HEAD refs/heads/main` returned aff98db8fbe7865a96992b1f7288764f311075a6 for both. Local baseline `work` was clean and at the same commit.
- Authoritative URL https://chamberbalet-prototype-v01.cuppedhornbill2.chatgpt.site/ matches the Sites project. Sites reports version 16, published deployment succeeded, source commit 329a00aec044a5bf10d96386f953efe1369f9bb1. Version metadata reports a 57-file tar, 5,754,880 bytes, SHA-256 0f55c215722661eda884ff831c4a4fbf72b83f70df3a31235372b29d948a9647. The file download attempt returned `file could not be authorized or resolved`; the archive bytes, hash and completeness are not independently verified. Direct curl failed with `CONNECT tunnel failed, response 403`. Do not substitute v0.19.
- Obtain the actual version 16 source archive and all associated assets from the authorized Sites editor/export, then verify the checksum, inventory and any external dependencies. The precise file-service authorization failure needs resolution. The Windows/OneDrive folder is not mounted in this workspace.

## Repository facts and gaps

- The README describes a prior single-page static Node build, source `src/content.js`, rendering/build scripts in `scripts/`, output `dist/`, and self-hosted Prata/Golos fonts. README marks SPEC.md and the old handoff obsolete. It is not the verified Sites source.
- package.json offers `npm run build`, `npm run check`, and local serve. `media/media.json` is `{}`; `npm run check` passed, warning of placeholder producer phone, email and Telegram. Existing test results do not establish prototype parity.
- No `.github` directory exists in the checked-out baseline. Root `.htaccess` has HTTPS/www redirects, optional compression and MIME directives, `DirectoryIndex index.html`, `Options -Indexes`, long immutable caching by extension, and `ErrorDocument 404 /index.html`.
- A complete source-to-target route, section, interaction, content and per-file asset/rights register is BLOCKED. People counts (15 profiles, 14 photos) and historic 168/98 event counts appear in the Notion task but are UNVERIFIED against the source. Routes, exact destinations, responsive states, videos, legal files, licences and links: UNKNOWN. All media publication rights require confirmation; three legal PDFs are described as unapproved drafts in the Notion task.

## Provisional REG.RU deployment contract — verify host before use

Working proposal only: build static files off-host; deliver a reproducible ZIP with the contents of dist at its root, including validated hidden .htaccess, no Node runtime on hosting, source or secrets. The README states to upload contents of dist; actual hosting type, document root, existing files, DNS, server modules and settings are UNKNOWN. Before any release, owner must inventory and back up all remote files including dotfiles, verify restore and retain previous release; rehearse locally/staging, upload manually only on separate authorization, smoke-test HTTPS, routes, assets, MIME, links, 404 and indexing, and document rollback. Do not delete old files by default.

Audit existing Apache rules on the actual host before reuse: extension-wide immutable caching also covers any unhashed images or media; `ErrorDocument 404 /index.html` may show homepage content on missing resources and must be tested for status/content and routing requirements. Verify redirects, canonical host, compression, MIME, cache invalidation and true 404 behavior. No claim is made about current production configuration.

## Gate

STAGE 00 BLOCKED; STAGE 01 NO-GO until the complete assignment is read, full authoritative source/assets acquired and verified, inventories and gaps completed and reviewed, critical access/rights/host unknowns assigned, and the user separately authorizes Stage 01. Production was not changed or deployed.
