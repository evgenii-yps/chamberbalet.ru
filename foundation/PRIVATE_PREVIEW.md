# Private v16 source preview

This path uses the verified original, including rights-pending material. Keep it local, untracked and private. It is not a release, and this repository does not contain the original source. From `foundation` with Node >=20:

```
npm ci
SITES_SOURCE=/absolute/path/to/authorized/sites-v16-git-checkout npm run build:private
npm run test:private
npm run preview:private
```

On that same computer open `http://127.0.0.1:4181/`. The checkout must be clean at exact commit `329a00aec044a5bf10d96386f953efe1369f9bb1`; all 57 tracked bytes are checked against `data/source-inventory.csv`. Output is `.private/dist/`, ignored by Git and served only on loopback. External links, mail/telephone actions and PDF access are disabled for review. A date filter is deliberately added to afisha; all other original content is directly inherited. If source is unavailable or changed, build fails closed. Do not publish this preview, its data, screenshot bytes or any generated artifact to a public repository. Full provenance, differences and unresolved G2 issues: `../docs/site-rebuild/STAGE_02_REPORT.md`.

For source-derived working data, run `SITES_SOURCE=/absolute/path node scripts/import-private.mjs` and `SITES_SOURCE=/absolute/path node --test tests/import-private.test.mjs`. The importer verifies the complete source tree before writing `.private/data/events.json` and `people.json`; neither file may be committed or published. These files now also feed the private preview rendering as described below. Event IDs derive from the complete expanded source value and an occurrence number: they are deterministic for identical source values but will change if a value changes or an identical duplicate is inserted before another. Persistent identity across editorial changes requires an explicit reviewed migration/crosswalk; do not silently treat this as solved. People IDs use the source IDs. Original source code remains authoritative and is not edited by this importer. Ticket syntax checks do not establish live availability or approval.

For the versioned offline review package, `scripts/OPEN.cmd` is ASCII/CRLF and invokes `launcher.mjs` (copied from `scripts/review-launcher.mjs`); it opens a browser after the local server reports readiness. Extract the archive fully before launching. If Windows launch fails, open a terminal in the extracted package folder and run `node server.mjs`, then open `http://127.0.0.1:4181/` on that same computer. The corrected launcher has not yet been independently run on Windows.

### Editable preview data (Stage 02)

`build:private` now consumes the private `events.json` and `people.json` records, inserting their `value` objects into the original verified v16 renderers. Keep each existing event `id` unchanged when editing its `value` or reordering the array. Rebuilding never overwrites existing private data. Back up both data files before editing and restore both to roll back. The importer initializes missing data only when neither file exists; it refuses an incomplete pair. Newly imported source revisions and ambiguous duplicates are not automatically reconciled: explicitly review and preserve IDs in a crosswalk before adopting a changed source. This implementation has not yet established a complete reviewed migration or cancellation workflow. All data and backups remain private.

### Experimental reviewed reconciliation

Create the initial private v16 baseline once with `SITES_SOURCE=/absolute/path node scripts/reconcile-baseline-private.mjs`. To inspect a private incoming JSON array, run `node scripts/reconcile-private.mjs plan .private/data/events.json .private/data/baseline-v16.json /private/incoming.json REVISION - .private/data/plan.json`. This writes a new plan without modifying data; unchanged exact matches are candidates, not automatic application. A reviewer must prepare a private JSON review with `planHash`, `reviewer`, `reviewedAt`, `mappings` (one `{index,id,action}` per incoming record; action `new`, `keep_editorial` or `use_incoming`) and `missing` (one `{id,action,evidence}` per omitted existing record; action `retain` or `cancelled`). Then use `node scripts/reconcile-private.mjs apply .private/data/events.json .private/data/baseline-v16.json /private/incoming.json REVISION /private/review.json .private/data/reviewed-result.json`. Output is a new private bundle containing records, aligned baseline and audit; no working file is replaced. Back up and verify before any manual promotion. Changed URLs reset approval and retain prior ticket state in history. Changed inputs invalidate the review. This prototype does not enforce a source-revision ancestry chain or fully automate promotion/rollback; do not consider it complete upstream reconciliation.
