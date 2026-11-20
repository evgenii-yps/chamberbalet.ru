# STAGE 02 — Full prototype implementation

**Task ID:** WEB-2026-02  
**Owner review required:** Yes  
**Activation:** Stage 02 requires explicit owner instruction (only Stage 00 is assigned by default).  
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

**Authorized now:** NO. Human owner must explicitly assign STAGE 02 after G1.

### Preconditions
Use G0 approved full original source, G1 architecture, inventory and approved exact visual target. Restore missing source before continuing; not from shortened v0.19 alone.

### Procedure
1. Implement ALL approved reference routes, not a subset: spectator homepage, season/hero video, afisha and tours, repertoire, performance details, theatre formats, People, venues/B2B and documents shell/footer.
2. Reproduce source-level behavior: header and mobile menu, hero introduction (mute/autoplay policy, playsinline, poster/fallback, no destructive navigation), scroll transitions, internal links, lists/tabs/filters/accordions when actually present. Preserve the exact semantics of navigation and animations; support reduced motion.
3. People: include every source record and existing portrait/placeholders. Whole portrait is the action target. Desktop `Биография` centered overlay without outline/rectangle, gentle darkening; mobile visible indication. Accessible modal with keyboard focus trap/restore, Escape, backdrop, close button; image navigation if present in source.
4. Bring full source event data with verified date, city, venue, time, ticketing URL and status; do not invent. Distinguish own theatre productions from other employers' performances. Normalize names only per authorized editorial correction.
5. Implement original fonts, logos, colors and responsive layout. Verify widths >= 1440, 1024, 768, 390, 320 px. Test the actual original images and videos; no unauthorized AI placeholders. Keep visual changes documented.
6. Static-friendly deep links: page reload and direct URLs work on Apache with appropriate 404 handling. Preserve SEO-relevant URLs or document redirects; do not blindly route all 404s to homepage.
7. No live ticket sale/collection, tracking, or unapproved PDF publication. For incomplete approved data, preserve explicitly marked preview-only state and raise blocker for public release.
8. Add automated route, interaction and data inventory tests; screenshot comparisons against the actual full prototype. Commit all changes to feature branch; post exact evidence to Notion.

### Required deliverables
Runnable preview, all original routes and sections, content inventory with per-route parity outcomes, media license checklist, automated Playwright equivalent integration tests, screen captures and full commit SHA.

### Acceptance / gate G2
No missing original approved routes or sections. All interactive behavior testable, route/data count reconciliation complete, known mismatches documented, and owner approves functional/visual implementation for QA. This does NOT authorize publication.


## Mandatory final-stage report

Provide in Russian: verified result and direct evidence; GitHub branch, full commit SHA, changed paths, exact checks and failures, Notion link/update status, source/approval blockers, next stage entry criteria. Explicitly state whether production was touched, whether a release ZIP exists and whether the next stage is authorized. **Never proceed to the following stage automatically.**