# Stage 02 implementation continuation — 2026-11-21

G2 remains NOT READY. Owner visual approval is preserved; this update does not authorize Stage 03 or publication.

## Implemented

- Private build verifies all 57 original bytes, reads the existing private events and people files and inserts their value arrays into the exact source renderers after checking source syntax anchors. An edited title and profile name and reordered events were checked in generated scripts. IDs are retained when existing private records are edited or reordered. Import now initializes only when both files are absent, preserves existing editorial files and rejects an incomplete pair. The private source, biographies and generated files remain Git-ignored. Reconciliation of new source revisions, cancellation/duplicate handling and persistent registry governance still need implementation and evidence; content-derived original IDs do not independently match changed upstream records.
- Inventory script verifies the full source and creates a private list of 40 media/font files with hashes, known dimensions, potential textual references and explicit pending rights. It does not establish complete route usage, alt text, fallback behavior or ownership; null/unknown fields are not approvals.
- Venue difference traced to removing `href` from contact links, which removed default underlines. Private safety now preserves pre-removal underlining while disabling links. Fixed-clock full-page Chromium comparison of venue at 1440/1024/768/390/320: 0 changed pixels at each width. Afisha remains intentionally different due to the date field: source and preview filter heights at 1440 are both 44px; at 390 and 320 they are 44px and 76.78px respectively because the date field wraps, producing a 33px full-page height difference. At 1440/1024/768 changed pixel counts were 3443/3198/3181. These measurements do not prove every changed pixel has been attributed. Screenshots remain private.
- Mobile Chromium automation: 15 profiles opened/closed with Escape and focus returned; menu opened/Escape closed; no-results date and reset checked. This is not the complete interaction matrix. Node fixture checks 6/6, private checks 3/3, editable adapter and import tests 2/2, importer preservation test 1/1. Tests do not validate real ticket links or rights.
- Corrected Windows launcher still needs real Windows verification; owner chose to check later. Previous manual Node startup was owner-confirmed. No new review package was generated.

## Open G2 items

Complete and prove ID reconciliation for upstream changes/duplicates/cancellations and a safe editorial workflow with validation; complete per-route asset and rights inventory; all requested video, touch, focus-trap, filtering, missing asset and external-action tests; build/server safeguards beyond client-side link stripping; explain all remaining screenshot differences; real Windows launcher check. Do not recommend G2 until material gaps are resolved. Rights, legal publication, live tickets, hosting and rollback require later separately authorized work.

Stage 00 audit and Stage 01 G1 completed; Stage 02 active; Stage 03 independent QA/legal, Stage 04 production ZIP, Stage 05 production deployment and Stage 06 maintenance require their respective explicit approval gates. No main, REG.RU, DNS or published Sites changes; no official release ZIP.
