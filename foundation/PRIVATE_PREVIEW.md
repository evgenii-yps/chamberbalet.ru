# Private v16 source preview

This path uses the verified original, including rights-pending material. Keep it local, untracked and private. It is not a release, and this repository does not contain the original source. From `foundation` with Node >=20:

```
npm ci
SITES_SOURCE=/absolute/path/to/authorized/sites-v16-git-checkout npm run build:private
npm run test:private
npm run preview:private
```

On that same computer open `http://127.0.0.1:4181/`. The checkout must be clean at exact commit `329a00aec044a5bf10d96386f953efe1369f9bb1`; all 57 tracked bytes are checked against `data/source-inventory.csv`. Output is `.private/dist/`, ignored by Git and served only on loopback. External links, mail/telephone actions and PDF access are disabled for review. A date filter is deliberately added to afisha; all other original content is directly inherited. If source is unavailable or changed, build fails closed. Do not publish this preview, its data, screenshot bytes or any generated artifact to a public repository. Full provenance, differences and unresolved G2 issues: `../docs/site-rebuild/STAGE_02_REPORT.md`.

For source-derived working data, run `SITES_SOURCE=/absolute/path node scripts/import-private.mjs` and `SITES_SOURCE=/absolute/path node --test tests/import-private.test.mjs`. The importer verifies the complete source tree before writing `.private/data/events.json` and `people.json`; neither file may be committed or published. These files are a crosswalk, not yet the website's content source. Event IDs derive from the complete expanded source value and an occurrence number: they are deterministic for identical source values but will change if a value changes or an identical duplicate is inserted before another. Persistent identity across editorial changes requires an explicit reviewed migration/crosswalk; do not silently treat this as solved. People IDs use the source IDs. Original source code remains authoritative and is not edited by this importer. Ticket syntax checks do not establish live availability or approval.

For the versioned offline review package, `scripts/OPEN.cmd` is ASCII/CRLF and invokes `launcher.mjs` (copied from `scripts/review-launcher.mjs`); it opens a browser after the local server reports readiness. Extract the archive fully before launching. If Windows launch fails, open a terminal in the extracted package folder and run `node server.mjs`, then open `http://127.0.0.1:4181/` on that same computer. The corrected launcher has not yet been independently run on Windows.
