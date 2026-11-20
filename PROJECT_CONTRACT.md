# Project contract — immutable context for all Codex packages

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


## Site design behavior to preserve

- Primary audience is spectators: first meaningful interactions are performances, current events, ticket destinations and theatre people. Venue/B2B content has a separate dedicated page and a secondary homepage entry.
- Preserve the original Sites hero/video introduction, season presentation, header, navigation, event/tour information, repertoire, specific performance pages, two theatre formats, people, venue proposal and all approved document destinations.
- People cards: click/tap ANYWHERE on the photograph to open the correct biography. Desktop: centered large `Биография` label appears on hover/focus over slightly darkened photo **without a rectangle**. Mobile/touch: discoverable without hover. Full accessible dialog with correct portrait, biography, facts, Escape/close/backdrop dismissal and focus restoration.
- Full design tokens, correct brand, logos, typography and original images are mandatory. Don't replace a real video with a placeholder and call it complete. Avoid unapproved AI imagery.
- Responsive visual parity and accessibility: keyboard, semantic HTML, visible focus, touch, alt text, nonblocking animations, prefers-reduced-motion support, no horizontal overflow.
- No made-up ticket URLs or event dates. A link can be hidden or marked unavailable in a preview when verified data is missing; the final public site must not contain a broken or misleading purchase action.
- Privacy/legal: do not ship legal drafts or unapproved media; inspect actual tracking/cookies, data handling and consent requirements before public launch. No analytics, tracking, user registration, payment processing or external forms without separately authorized scope.
- Technology should be as small and robust as practical for a shared-hosting static deployment. Build tools may use Node.js; the deployed site must not silently require a running Node server.

## Explicit non-goals

- Redesigning the brand or inventing copy.
- Migrating to other hosting, adding a CMS/backend/database on speculation.
- Publishing, emailing people, signing contracts or uploading unpublished drafts.
- Cleaning up unrelated repository history or overwriting the live server without verified backup.
