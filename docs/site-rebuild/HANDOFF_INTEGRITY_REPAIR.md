# Stage 00 — handoff integrity repair (2026-11-21)

## Context

The Codex audit at commit `b8f9e5fd7f9b34c5b6e7551aea35a402e0027d73` correctly reported 19 failed `sha256sum -c FILE_CHECKSUMS_SHA256.txt` comparisons. The failure was introduced while transferring the original handoff package into GitHub at commit `c23cfe063abf0d1e473aa3cb52eb2eed5b9c4d00`. This does not indicate a problem with the Sites v16 source archive.

## Root cause independently reproduced

- 18 text files had their final newline lost during a file-reading/copy operation.
- `TEMPLATES/CONTENT_PARITY_INVENTORY.csv` was incorrectly replaced by a source-preview placeholder instead of the original 720-byte CSV (including BOM and CRLF line endings).
- The original ZIP `CHAMBERBALET_CODEX_ALL_TZ_2026-11-21.zip` contains 20 files; its SHA-256 is `55b54a4b4bf5e03cddbf36f74b85084b7cf012525dc4b544dab4a32259eacd0e`.
- The ZIP was opened locally: its 20 entries exactly match the stored source files, and all 19 `FILE_CHECKSUMS_SHA256.txt` entries pass against the ZIP's own bytes.

## Repair and verification

The document-only branch `docs/stage-00-audit` was corrected in three commits:

- `56960afcd1e912f7469302112e36d919c09997ba` — restore bytes, part 1.
- `2ec69c1d167074d0bfc4a591e23720ae00c64137` — restore bytes, part 2.
- `1ab7f4bac92c29bb4be1c807aa6475159a6d3785` — restore bytes, part 3 including the actual CSV.

All 20 GitHub file blob SHA-1 identifiers were independently compared against Git blob SHA-1 values computed from the actual original local files; all match. This is verification of exact Git-tracked file bytes, not merely a visual comparison.

**Codex follow-up:** check out this branch at or after commit `1ab7f4bac92c29bb4be1c807aa6475159a6d3785`, run `sha256sum -c FILE_CHECKSUMS_SHA256.txt` from the repository root, and record the exit code. The assistant has not independently executed this command inside the Codex workspace.

## Scope / remaining status

This repair changes only task documentation and templates on the isolated documentation branch. It does not change `main`, runtime, published Sites, or the REG.RU production deployment.

The separate Sites version 16 saved tar remains unavailable. Its reported metadata (57 files, 5,754,880 bytes, SHA-256 `0f55c215722661eda884ff831c4a4fbf72b83f70df3a31235372b29d948a9647`) is unverified against saved archive bytes. The source Git tree at `329a00aec044a5bf10d96386f953efe1369f9bb1` is available for content, route, asset, and browser audits, but does not prove the saved tar's identity.

Stage 00 is still in progress / BLOCKED on archive provenance and incomplete audit outputs; Stage 01 is NOT authorized.
