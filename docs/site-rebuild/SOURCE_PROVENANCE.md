# Stage 00 source recovery — 2026-11-21

## CONFIRMED

The owner-supplied assignment files were read from `docs/stage-00-audit` at `c23cfe063abf0d1e473aa3cb52eb2eed5b9c4d00`. `git ls-remote` confirms `main` at `aff98db8fbe7865a96992b1f7288764f311075a6` and the audit branch at that handoff commit. Previous `STAGE-00-BLOCKED.md` is preserved as historical evidence; its missing-assignment blocker is superseded.

Sites project metadata identifies version 16, source commit `329a00aec044a5bf10d96386f953efe1369f9bb1`, with succeeded published deployment. The authorized Sites source-repository credential API (no publish-on-push requested or accepted) provided read access; a read-only clone reached the exact commit, whose Git tree lists 57 files. Source was checked out privately under workspace scratch; it was not pushed to the public GitHub repository. It consists of `.openai/hosting.json` and `dist/` files: seven HTML pages, scripts, CSS and assets. This is the exact saved Git tree, but whether editable pre-build source or externally hosted referenced resources exist beyond that tree is not established. No writes or pushes were made to the Sites repository.

`ASSET_RIGHTS_REGISTER.csv` inventories every file in that tree with byte size and SHA-256 computed on each actual checked-out file, with rights pending or needing review. `ROUTES_AND_STATES.csv` enumerates the seven HTML files and static headings; it is not a complete interactive, link or responsive-state inventory. The People module's embedded JSON contains 15 profiles, 2 marked leaders, 14 with one portrait and one without; this is source evidence, not a browser or rights check. Event counts have not been independently calculated.

## BLOCKED — saved archive identity

Sites version metadata reports tar `file_00000000e35c81f4845f039ea3b2a31c`, 57 files, 5,754,880 bytes and SHA-256 `0f55c215722661eda884ff831c4a4fbf72b83f70df3a31235372b29d948a9647`. The previous `download_file` call returned `file could not be authorized or resolved`. The connector exposes metadata and source Git access, but no archive export/download operation was found; this error does not distinguish a permissions problem from an unresolvable file. The Git checkout's 57 entries are an independent match of the count only; they do not verify the tar bytes, size, digest, archive membership or the provenance of any external resources. Do not create a new tar and claim its hash equals the saved tar.

Owner action: obtain the actual saved Sites version 16 source tar through an authorized Sites export/support channel, or attach that exact archive to this conversation using the account that owns the project. Include any source assets or external resources not contained in the 57-file tree. If the editor does not offer a download, request the saved version 16 archive by the file ID above from the Sites support/export channel; no specific export button or UI path has been verified. Transfer privately; do not publish rights-pending assets in GitHub. Once received, calculate SHA-256 and byte count, safely list file entries and compare their content with this Git tree and external dependencies.

## Assignment integrity

`sha256sum -c FILE_CHECKSUMS_SHA256.txt` returned exit 1: all 19 listed files differ from the listed digests. These are assignment-file hashes, not the prototype tar hash. Cause is unknown; request the original package or an authoritative corrected checksum manifest before relying on that manifest. Required files were nonetheless read from the specified, exact Git commit. No replacement of package checksums was attempted.

## Gate and roadmap

Stage 00 remains BLOCKED pending actual saved archive verification, source completeness and the remaining parity, browser, links, host and rights reviews. Stage 01 NO-GO until G0 review and explicit owner authorization. Subsequent phases: 01 architecture/foundation; 02 implementation; 03 QA/legal/rights; 04 release ZIP; 05 separately authorized owner deployment; 06 maintenance. No release ZIP has been created, production was not touched, and no stage beyond 00 was started.
