# Stage 03 — restricted publication-safety implementation

**Status:** restricted technical candidate implemented; G3 BLOCKED, not accepted. The candidate is severely reduced and is not suitable for public release. Stage 04 is not authorized.

## Baseline and implementation

- Accepted G2: `d533bf086eb1d5455fd9c383d22ffda22f148f30`. Stage 03 research baseline: `7cb79677c6598f16525965fee5878f424bd650d7`. Original Sites v16: `329a00aec044a5bf10d96386f953efe1369f9bb1`; all 57 sizes/hashes were checked before each build. Candidate implementation: `a66f158929a6656e66ffc577a259f91ffabc2d58`.
- A separate deterministic, private-only review build keeps the seven source page structures and internal navigation, using a deny-all policy for original images, video, fonts, PDFs, biographies, event records, ticket URLs and contact actions. It uses system fonts, neutral image blocks, an explicit video fallback and empty schedule/People states. Unsupported named choreographic attribution and venue ticket-sales language were removed from this restricted output. The 266 source records and 15 profiles remain in the private G2 source; none are promoted by the candidate. Original G2 package and source remain unchanged.
- This is not visual parity: the loss of approved imagery, portraits, video and fonts materially changes the appearance. Existing venue copy and artistic information are still subject to factual and legal review. No source asset is claimed legally cleared; excluded media rights remain PENDING. This output is not a production builder and must not be deployed.
- D01, D02 and D04 remain DEFERRED_BY_OWNER and are not approvals. Existing private owner-decision register was updated in place, preserving history. Legal drafts and PDFs are excluded; see `STAGE_03_LEGAL_IMPLEMENTATION_STATUS_2026-11-21.md`.

## Verification and private delivery

- `SITES_SOURCE=/workspace/site-v16-private python3 scripts/build-safety-review.py` and `SITES_SOURCE=/workspace/site-v16-private node --test tests/safety-review.test.mjs`: 2/2 tests passed on Linux/Node v24.22.3/Chromium. Two clean builds gave identical manifests. All seven routes at 320/390/768/1024/1440 returned 200; local links, mobile menu/Escape, no page errors, external requests, images, forms or horizontal overflow were checked. Empty date/city controls and video fallback were exercised at mobile width. No People cards exist in this candidate. The tests do not establish full keyboard accessibility or protection against arbitrary programmatic navigation.
- Output contains only seven HTML pages, 404, robots, sanitized CSS, local menu JS and manifest. Automated scan found no external URLs, PDF/font/image/video references, source profile names/biographies or recorded ticket URLs. `npm run check` passed 6/6 and `npm run test:private` passed 3/3; these latter tests concern the existing private implementation.
- A new versioned non-production review ZIP was delivered to the previously authorized owner-only Drive folder, not to public GitHub. Its size is 25,725 bytes and SHA-256 is `7f1f68ca2bc65947955922ece056b7a11ea7fd16042531facae28fef81f2bb17`. Drive reported owner-only and `shared=false`; downloaded bytes matched the hash, ZIP and extracted file manifest passed, and the extracted local server returned 200 for seven routes and 404 for a missing route. The Windows one-click launcher remains unverified; manual Node startup is available. This is not the official release ZIP.

## Remaining release blockers

1. The candidate contains no verified, authorized public schedule, portraits, biographies or source visual media; the reduced result is not an acceptable substitute for the approved design without further decisions and evidence.
2. Legal operator/processing and applicable publication obligations remain unresolved; legal texts and PDFs need appropriate review and approval. D01/D02/D04 remain deferred and must not be repeatedly raised in this cycle.
3. Factual/editorial, rights and age-classification checks and any authorized ticket arrangements remain incomplete. Hosting behavior and rollback are later-stage unknowns.

No G3 acceptance is claimed. Stage 04/05 are not authorized; no main, REG.RU, DNS or published Sites changes and no official release ZIP.
