# Word download and procurement drafts

Updated 2026-10-25. This adds draft export behavior to the existing Preview; it is not a production cutover or approval of official legal documents.

## Using the forms

1. Save the proposal and company profile. In **จัดจ้าง**, choose the project and fill the separate contractor, WO/PO, budget, prices, dates, committees and each document reference/date. Save the procurement data.
2. Attach the supplied originals as a batch or attach one from its card. SHA-256 identifies the exact reviewed template. Unknown/changed originals or a file from a different card are rejected. The primary action opens the picker when the template is missing.
3. On any of the eleven DOCX cards, open **เตรียม Word ฉบับร่าง**. Common data is prefilled from the saved project. Unknown evidence, payment choices, guarantees, negotiation and inspection results remain explicit `[รอกรอก: …]` fields. Edit them in the draft panel or later in Word.
4. Acknowledge the draft notice and download. The UI shows dispatch to the browser, rather than claiming the file was saved. Retry downloads the same bytes; preview is optional.
5. Review all remaining contract clauses, monetary figures, signatures/authority and pagination in Microsoft Word before official use. No signing, sending, approval, award, acceptance or payment is performed by export.

For form 23, attach the reviewed Word conversion `23-supervision-template.docx`. This is a real DOCX saved from Microsoft Word, not a renamed DOC; the reference remained one page in Word after conversion. The old DOC remains downloadable unchanged. Its existing browser-storage key is preserved, while the converted DOCX has a separate key and hash. Attaching either variant first, or reattaching the old DOC later, retains both and keeps DOCX as the draft template. The counter distinguishes reference types attached from DOCX drafts available. A legacy-only attachment offers **แนบ DOCX เพื่อสร้างร่าง**.

## Privacy and data retention

- Source Word binaries stay in private browser IndexedDB, scoped to the exact origin. They are not included in Git, deployments, server uploads or JSON backups. Keep the originals separately.
- A valid selected original can be used in tab memory if IndexedDB persistence fails; the UI clearly asks for reattachment after reload. A corrupt cache entry does not hide other valid files. Source integrity is rechecked on generation.
- Central procurement records and internal review status retain their existing save/backup/conflict rules. Per-file wording edits in the draft panel are temporary and explicitly labelled as excluded from central data/backups. Closing an edited draft or leaving an open draft prompts about that local work.
- Source identities, project identifiers, old dates/prices and recorded approval/inspection outcomes are replaced in 221 reviewed own-text paragraph slots across eleven maps. The drafts retain source ZIP inventory, logos, tables, paragraph/run properties, relationships, geometry and untouched parts. Whole editable paragraph replacements can alter wrapping; no exact pagination promise is made.
- Original sample approval outcomes are changed to pending consideration; inspection, evidence and payment results are blank draft fields. Internal document review status never supplies approval or inspection results.

## Verification evidence and limits

- 73 unit/Postgres checks and 6 optimized HTTP checks pass (79 total), covering existing Auth/RLS/revisions/backups plus template cache isolation, original rejection, download dispatch/retry, all eleven maps/data fields and DOC/DOCX attachment order/fallback behavior. ESLint and the optimized Next.js build pass.
- Browser integration generated/downloaded the first ten DOCX outputs from exact originals with synthetic project data. The eleventh supervision draft also passed actual UI download, identical-byte retry and DOC/DOCX retention after reload. Private ZIP/XML comparisons confirmed unchanged original hashes, identical non-text document/header structure, unchanged preserve-only parts and absence of the source sample identities/identifiers checked across XML parts. The supervision output retained all 16 package parts and original line breaks; its actual handover, supervision findings and completion recommendation remain unresolved draft fields.
- Actual Solar memo/quotation downloads, identical-byte retry and attachment retention after reload passed. The procurement UI attached 11 references, opened its draft editor and downloaded a generated DOCX. Browser preview is content-only.
- Native renderer was attempted and failed because bundled LibreOffice is absent. Final Word pagination, review of applicable contract alternatives and final PDF issuance remain pending. No test output or original document is published in this repository.
- No database schema, original production deployment, Auth settings or production aliases change in this work. Git main deployment hold remains enabled.
