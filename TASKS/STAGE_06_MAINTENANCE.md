# STAGE 06 — Controlled maintenance and subsequent releases

**Task ID:** WEB-2026-06  
**Owner review required:** Yes  
**Activation:** Stage 06 requires explicit owner instruction (only Stage 00 is assigned by default).  
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

**Authorized now:** NO. This is a future operational policy, not permission for recurring autonomous deployments.

### Preconditions
Stage 05 live release confirmed and a new owner-requested change package defined. No unrelated refactor by default.

### Procedure
1. Start each future request by reading Notion release log, GitHub main/release tag and the current live site state. Record baseline and the new precise change scope before coding.
2. Make a feature branch and tests covering the requested fix/feature while preserving all current approved interactions, routes, legal/privacy and media.
3. Review relevant screenshots, accessibility and responsive behavior; validate content/date/ticketing updates against authoritative sources. Never infer publicity from internal drafts.
4. Document changes, regressions and rollback; obtain design and release approval before preparing a new tagged immutable ZIP.
5. Build a new release package and use the same manual REG.RU procedure. Old ZIP and SHA remain stored for rollback. Do not rely on remote CDN or local-only paths.
6. Update Notion with stage reports, release history, exact branch/commit/tag, what was deployed, verified and not verified; preserve source-of-truth links. No scheduled monitoring unless specifically authorized.

### Required deliverables
Scoped change report, tested code PR, release ZIP (only if separately authorized), version/changelog, exact live verification and Notion record.

### Acceptance
The requested change is correct, independently verified and approved; future work is not silently started. Repository, release history and Notion remain consistent.


## Mandatory final-stage report

Provide in Russian: verified result and direct evidence; GitHub branch, full commit SHA, changed paths, exact checks and failures, Notion link/update status, source/approval blockers, next stage entry criteria. Explicitly state whether production was touched, whether a release ZIP exists and whether the next stage is authorized. **Never proceed to the following stage automatically.**