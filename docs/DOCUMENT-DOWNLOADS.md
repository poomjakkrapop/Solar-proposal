# Word download and procurement drafts

Updated 2026-10-26. All 13 forms now load reviewed templates from the private central library and share a review/acknowledgement/download dialog. Users do not attach originals again. See [private-template access and current verification](PRIVATE-TEMPLATES.md) and [Solar form correctness, UX and performance review](FORM-REVIEW-UX.md). This updates the existing Preview; it is not a production cutover or approval of official legal documents.

## Using the forms

1. Sign in with a confirmed account and active SolarDesk membership, then save the proposal and company profile. In **จัดจ้าง**, choose the project and fill the separate contractor, WO/PO, budget, prices, dates, committees and each document reference/date. Save the procurement data.
2. The two Solar and eleven procurement templates load automatically through the private endpoint. Each response is matched to the registered SHA-256. Resolve any missing-data checklist. On a connection failure use retry; a 401 requires sign-in and a 403 indicates missing permission. No file picker or attachment is required.
3. On the selected form, open **เตรียม Word ฉบับร่าง**. Common data is prefilled from the saved project. Unknown evidence, payment choices, guarantees, negotiation and inspection results remain explicit `[รอกรอก: …]` fields. Edit them in the draft panel or later in Word.
4. Acknowledge the draft notice and download. The UI shows dispatch to the browser, rather than claiming the file was saved. Retry downloads the same bytes; preview is optional.
5. Review all remaining contract clauses, monetary figures, signatures/authority and pagination in Microsoft Word before official use. No signing, sending, approval, award, acceptance or payment is performed by export.

Form 23 now uses the centrally provisioned, reviewed DOCX conversion of the supervision reference. Existing DOC/DOCX originals and their separate browser-storage keys are retained for compatibility, but do not participate in default template loading. The earlier Microsoft Word conversion and attached-original checks are recorded below as historical evidence.

## Privacy and data retention

- Original Word references stay on the user's machine. The reviewed reusable versions are stored in an isolated private database table and delivered only after verified identity and active SolarDesk membership. They are excluded from Git, public assets, deployment packages and JSON backups. Keep the originals separately.
- Default loading ignores old IndexedDB templates and never deletes them. The server and browser verify the registered digest; browser requests use same-origin credentials and `no-store`. Verified in-memory buffers are copied for callers; a failed request can retry independently without reattachment or storage reset.
- Central procurement records and internal review status retain their existing save/backup/conflict rules. Per-file wording edits in the draft panel are temporary and explicitly labelled as excluded from central data/backups. Closing an edited draft or leaving an open draft prompts about that local work.
- Source identities, project identifiers, old dates/prices and recorded approval/inspection outcomes are replaced through 303 reviewed text slots: 82 for the two Solar forms and 221 for the eleven procurement forms. The engine preserves non-text structure and reviewed template parts. Whole editable paragraph replacements can alter wrapping; no exact pagination promise is made.
- Original sample approval outcomes are changed to pending consideration; inspection, evidence and payment results are blank draft fields. Internal document review status never supplies approval or inspection results.

## Verification evidence and limits

Current private-library baseline: 101 unit/integration/PGlite tests and 8 optimized HTTP checks pass, with ESLint/build passing and zero production dependency advisories. A fresh test origin produced actual download events for all 13 forms with zero upload inputs. The hosted private table has 13 versions with bytes/digests checked against the catalog. These checks do not complete the hosted authenticated browser-download flow; final output content/privacy and render checks are tracked in [PRIVATE-TEMPLATES.md](PRIVATE-TEMPLATES.md). Existing production aliases and the main deployment hold remain unchanged.

### Earlier attached-original verification

The following results describe the preceding attachment-based implementation. They do not establish authenticated browser access to the new private central endpoint.

- 82 unit/Postgres checks and 6 optimized HTTP checks pass (88 total), covering existing Auth/RLS/revisions/backups plus template cache isolation, original rejection, download dispatch/retry, all eleven maps/data fields, DOC/DOCX attachment order/fallback, Solar amount/whitespace/large-import readiness and indexed customer-summary parity. ESLint and the optimized Next.js build pass.
- Browser integration generated/downloaded the first ten DOCX outputs from exact originals with synthetic project data. The eleventh supervision draft also passed actual UI download, identical-byte retry and DOC/DOCX retention after reload. Private ZIP/XML comparisons confirmed unchanged original hashes, identical non-text document/header structure, unchanged preserve-only parts and absence of the source sample identities/identifiers checked across XML parts. The supervision output retained all 16 package parts and original line breaks; its actual handover, supervision findings and completion recommendation remain unresolved draft fields.
- Actual Solar memo/quotation downloads, identical-byte retry and attachment retention after reload passed. The procurement UI attached 11 references, opened its draft editor and downloaded a generated DOCX. Browser preview is content-only.
- Native renderer was attempted and failed because bundled LibreOffice is absent. Final Word pagination, review of applicable contract alternatives and final PDF issuance remain pending. No test output or original document is published in this repository.
- No database schema, original production deployment, Auth settings or production aliases change in this work. Git main deployment hold remains enabled.
