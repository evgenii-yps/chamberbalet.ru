# Private v16 source preview

This path uses the verified original, including rights-pending material. Keep it local, untracked and private. It is not a release, and this repository does not contain the original source. From `foundation` with Node >=20:

```
npm ci
SITES_SOURCE=/absolute/path/to/authorized/sites-v16-git-checkout npm run build:private
npm run test:private
npm run preview:private
```

On that same computer open `http://127.0.0.1:4181/`. The checkout must be clean at exact commit `329a00aec044a5bf10d96386f953efe1369f9bb1`; all 57 tracked bytes are checked against `data/source-inventory.csv`. Output is `.private/dist/`, ignored by Git and served only on loopback. External links, mail/telephone actions and PDF access are disabled for review. A date filter is deliberately added to afisha; all other original content is directly inherited. If source is unavailable or changed, build fails closed. Do not publish this preview, its data, screenshot bytes or any generated artifact to a public repository. Full provenance, differences and unresolved G2 issues: `../docs/site-rebuild/STAGE_02_REPORT.md`.
