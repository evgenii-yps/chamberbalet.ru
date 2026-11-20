# STAGE 00 — Audit, source recovery and constraints

**Task ID:** WEB-2026-00  
**Owner review required:** Yes  
**Activation:** Stage 00 requires explicit owner instruction (only Stage 00 is assigned by default).  
**Status at handoff:** NOT STARTED.

## Shared execution contract (applies to every stage)

- Respond to the owner in **Russian**; technical files, engineering specifications and code comments should be **English** unless a content field requires Russian.
- Project truth: Notion tracks decisions/status; GitHub tracks code; actual server and live site are established by separate inspection. Do not equate a Codex report with independent verification.
- The FULL original ChatGPT Sites prototype is the visual/content authority. The older GitHub website is a technical baseline ONLY. The available standalone v0.19 HTML and v0.18 People HTML are **partial secondary references**; never substitute them for the real live prototype.
- Do not add invented names, dates, ticket prices, events, partners, copyright permissions, analytics, legal identity, or business terms. Distinguish theatre-produced performances from artists' work for third parties.
- Record `CONFIRMED / ASSUMED / BLOCKED / NEEDS_APPROVAL` with source for all consequential statements; never claim a test or publish occurred without evidence.
- Code only on an isolated GitHub feature branch; preserve main and the currently hosted website until explicit owner approval. No production deploy, DNS changes, destructive cleanup, credential collection, or external messages without authorization.
- Store meaningful stage status, evidence, decisions and open questions in Notion on the task page; never replace existing unrelated history. Update docs with source links, branch, full commit SHA, exact tests, and remaining work.
- Deploy contract: manual REG.RU upload of a **verified ZIP** whose root contains the deployable files (`index.html`, `assets/`, `.htaccess` if validated), NOT a nested `dist/` directory. Node build tooling runs before upload, not on shared hosting unless checked and authorized.
- All stage transitions require explicit owner approval. **Execute ONLY the specific stage named in this task file when the owner selects it.** Never run later stages because their instructions are present in the archive.
- When original source/media is inaccessible: document exactly what is missing, use available sources only as evidence, and STOP on any full-fidelity implementation claims.
- Windows project path: `C:\Users\Женя\OneDrive\Рабочий стол\Театр Не Камерного балета`. This path is not mounted in the current ChatGPT execution environment; verify its availability independently.

### Verified / recorded references

- Approved target: https://chamberbalet-prototype-v01.cuppedhornbill2.chatgpt.site/
- Current production repository: https://github.com/evgenii-yps/chamberbalet.ru
- Repository main HEAD at handoff creation: `aff98db8fbe7865a96992b1f7288764f311075a6` (2026-10-29); MUST recheck live HEAD.
- Site history: https://app.notion.com/p/3c0afb0a249f812fbe2feda4cc8919be
- Task and status page: https://app.notion.com/p/41eafb0a249f81a1ae10c7c271913273
- Brand v0.7 and later naming resolution: https://app.notion.com/p/3f0afb0a249f815db51dd7233cc293de
- Legal PDF draft status: https://app.notion.com/p/41eafb0a249f8155b28ce554d4c7ec59
- Actual site file export has NOT been obtained in this handoff; the ChatGPT Sites host was inaccessible to the composing environment.
- Notion records a 2026-11-21 Sites update with 15 people (2 leaders, 13 performers), 14 photos, one Ivan Azanov placeholder. The recorded commit `329a00aec044a5bf10d96386f953efe1369f9bb1` belongs to the Sites work history; its source and GitHub association were not independently verified.
- Older notes mention 168 touring + 98 home event records. **VERIFY** from the original prototype; do not presume them current.
- The three legal PDFs are visually formatted but have unfilled fields and are **NOT approved for public publication**.
- Media distribution/publication rights remain to be confirmed.


## Complete roadmap and transition rules (mandatory context)

```text
00 Audit, source recovery, baseline and hosting assessment -> G0: actual source/export + gap map verified, or BLOCKED with precise request.
01 Site architecture and foundation -> G1: approved technical approach, all routes and asset plumbing, preview build + tests.
02 Full UI/content/interaction implementation -> G2: complete reference parity register with no missing approved components.
03 Independent QA, accessibility, privacy and editorial clearance -> G3: critical defects zero and publication approvals documented.
04 Reproducible ZIP release preparation -> G4: validated archive, checksums, backup and rollback documentation, owner approval.
05 REG.RU launch and smoke verification -> G5: explicitly authorized owner deployment, live tests and rollback plan confirmed.
06 Maintenance and subsequent releases -> each release uses its own scoped task and approval.
```

## Assigned package details (execute ONLY if this stage is active)

**Authorized now:** YES. **Mutation limit:** documentation-only feature branch. **Stop condition:** no access to the complete approved original source/export.

### Procedure
1. Check repository `evgenii-yps/chamberbalet.ru`: default branch/HEAD, package scripts, README, src, media manifest, Apache `.htaccess`, build outputs, current CI (if any). Treat 2026-10-29 `aff98db...` as a historical reference and recheck.
2. Inspect the real prototype URL with authorized browser access. Determine whether it is public, password-protected, tool-inaccessible, or exportable. Obtain exact authorized source, assets, data, logo and video from the original Sites project. NEVER represent another file as its complete export.
3. Inventory all real routes, sections, interactions and media: home, video hero, calendar/afisha, touring data, performance detail pages, People, venues/B2B, documents, footer and error handling. Capture desktop and mobile states and active internal/external links. Verify recorded 15 People / 14 portraits and historical 168/98 events only from source, not memory.
4. Produce a screenshot/asset/behavior parity matrix with fields `route`, `section_id`, `source_path_or_url`, `content_hash`, `media`, `behavior`, `approval`, `state`, `evidence`.
5. Compare GitHub's old production implementation to the new prototype. Explicitly separate reusable build tooling from outdated copy/design; identify gaps and recommended static-site architecture.
6. Define REG.RU audit questions and deployment assumptions: web root, Apache, `.htaccess`, HTTPS, www redirects, 404s, route refresh, mime, caches (particularly non-hashed names), deployment size, hidden files. Do not assume backend/DB support.
7. Define safe rollback: snapshot server including hidden files, hashes/manifest, owner-access backup, optional staging and restore steps. Don't attempt remote server changes.
8. Document legal/media clearance blockers. No release of PDFs with unfilled fields or portraits without approval.
9. Documentation-only commit in a new isolated branch; update Notion with evidence, blocker matrix, source acquisition instructions and GO/NO-GO for Stage 01.

### Required deliverables
`docs/site-rebuild/STAGE_00_REPORT.md`, `SOURCE_PROVENANCE.md`, `ROUTES_AND_STATES.csv`, `ASSET_RIGHTS_REGISTER.csv`, `GAP_MATRIX.csv`, `REG_RU_CONTRACT.md`, `BLOCKERS.md`, documented GitHub full commit SHA and Notion entry.

### Acceptance / gate G0
Every required source is either acquired and hash/inventory verified, or explicitly marked MISSING/BLOCKED with exact recovery action. No false parity claims. Existing production untouched. Stage 01 may begin only after original prototype source + core media are accessible, migration scope agreed and owner explicitly approves it.


## Mandatory final-stage report

Provide in Russian: verified result and direct evidence; GitHub branch, full commit SHA, changed paths, exact checks and failures, Notion link/update status, source/approval blockers, next stage entry criteria. Explicitly state whether production was touched, whether a release ZIP exists and whether the next stage is authorized. **Never proceed to the following stage automatically.**
