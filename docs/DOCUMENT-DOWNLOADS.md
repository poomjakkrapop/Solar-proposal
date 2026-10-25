# Word download and procurement drafts

Updated 2026-10-25. This adds draft export behavior to the existing Preview; it is not a production cutover or approval of official legal documents.

## Using the forms

1. Save the proposal and company profile. In **จัดจ้าง**, choose the project and fill the separate contractor, WO/PO, budget, prices, dates, committees and each document reference/date. Save the procurement data.
2. Attach the supplied originals as a batch or attach one from its card. SHA-256 identifies the exact reviewed template. Unknown/changed originals or a file from a different card are rejected. The primary action opens the picker when the template is missing.
3. On any of the ten DOCX cards, open **เตรียม Word ฉบับร่าง**. Common data is prefilled from the saved project. Unknown evidence, payment choices, guarantees, negotiation and inspection results remain explicit `[รอกรอก: …]` fields. Edit them in the draft panel or later in Word.
4. Acknowledge the draft notice and download. The UI shows dispatch to the browser, rather than claiming the file was saved. Retry downloads the same bytes; preview is optional.
5. Review all remaining contract clauses, monetary figures, signatures/authority and pagination in Microsoft Word before official use. No signing, sending, approval, award, acceptance or payment is performed by export.

The legacy supervision DOC can be downloaded unchanged as a reference only. A separately converted and audited DOCX is required for its draft generation. The application does not rename a binary DOC to DOCX.

## Privacy and data retention

- Source Word binaries stay in private browser IndexedDB, scoped to the exact origin. They are not included in Git, deployments, server uploads or JSON backups. Keep the originals separately.
- A valid selected original can be used in tab memory if IndexedDB persistence fails; the UI clearly asks for reattachment after reload. A corrupt cache entry does not hide other valid files. Source integrity is rechecked on generation.
- Central procurement records and internal review status retain their existing save/backup/conflict rules. Per-file wording edits in the draft panel are temporary and explicitly labelled as excluded from central data/backups. Closing an edited draft or leaving an open draft prompts about that local work.
- Source identities, project identifiers, old dates/prices and recorded approval/inspection outcomes are replaced in 211 reviewed own-text paragraph slots. The ten drafts retain source ZIP inventory, logos, tables, paragraph/run properties, relationships, geometry and untouched parts. Whole editable paragraph replacements can alter wrapping; no exact pagination promise is made.
- Original sample approval outcomes are changed to pending consideration; inspection, evidence and payment results are blank draft fields. Internal document review status never supplies approval or inspection results.

## Verification evidence and limits

- 69 unit/Postgres checks and 6 optimized HTTP checks pass (75 total), covering existing Auth/RLS/revisions/backups plus template cache isolation, original rejection, download dispatch/retry and all ten procurement maps/data fields.
- Browser integration generated/downloaded ten DOCX outputs from exact originals with synthetic project data. Private ZIP/XML comparison confirmed unchanged original hashes, identical non-text document/header structure, unchanged preserve-only parts and absence of the source sample identities/identifiers checked across XML parts.
- Actual Solar memo/quotation downloads, identical-byte retry and attachment retention after reload passed. The procurement UI attached 11 references, opened its draft editor and downloaded a generated DOCX. Browser preview is content-only.
- Native renderer was attempted and failed because bundled LibreOffice is absent. Final Word pagination, review of applicable contract alternatives and final PDF issuance remain pending. No test output or original document is published in this repository.
- No database schema, original production deployment, Auth settings or production aliases change in this work. Git main deployment hold remains enabled.
