# Private central document templates

Updated 2026-10-26. The current implementation loads all 13 document templates from an authenticated SolarDesk endpoint. Users no longer attach the Word originals in each browser. This change does not authorize production cutover or certify the generated drafts for official issuance.

## Using the forms

1. Open the audit Preview and sign in with an existing account. The account needs a confirmed email and an active owner, editor or viewer membership in at least one SolarDesk workspace.
2. Save the proposal and official company profile. The approval memo requires Turnkey cost details and the configured approval roles/limit; the expense notification requires its reference, addresses and equipment details. Resolve the checklist shown for the selected form.
3. Open **เทมเพลต** for the two Solar forms, or **จัดจ้าง** for the eleven procurement forms. Choose the saved project. Procurement also uses its saved contractor, WO/PO, prices, dates and document references, separately from customer sales data.
4. Wait for the private template to load, then open **เตรียม Word ฉบับร่าง**. The application fills mapped variables from the saved proposal/company/procurement data. Review editable draft wording and unresolved `[รอกรอก: …]` fields, acknowledge the notice and download.
5. If the connection fails, retry loading the template. A 401 asks for sign-in; a 403 identifies missing access. Reattaching originals or clearing browser data is not part of this workflow.

Viewer access permits reading templates and exporting a draft from accessible saved data; it does not grant permission to save changes to shared records. A browser running only the unconfigured local/demo mode cannot retrieve these private templates. It must use the configured authenticated Preview instead.

## Storage and access

The reusable DOCX files were derived from the supplied references with mapped sample values removed. The thirteen private versions are stored in the isolated `sd_v2_document_templates` table, keyed by document type and SHA-256. The schema migration is `20261026044232_solardesk_private_document_templates.sql`. RLS is enabled/forced, direct `anon` and `authenticated` table access is denied, and the server role has SELECT permission only.

`GET /api/document-templates/[id]` accepts only registered document IDs, verifies server-side identity, confirmed email and active SolarDesk membership, then reads the exact registered template version. The returned bytes must match the registered digest and size limits. Responses use `Cache-Control: private, no-store`, `Vary: Cookie` and `nosniff`. Template files are not served from a public directory, embedded in public JavaScript, committed to Git, or included in deployment artifacts. Git contains the version/hash/slot metadata and access-control code only.

The browser requests this endpoint with same-origin credentials and `no-store`. It verifies the digest again, deduplicates concurrent requests and gives callers independent copies of verified bytes in memory. A failed request can retry without resetting storage. Existing IndexedDB originals remain untouched; default loading does not read them, so a mismatched old cached original cannot block the central template.

There is no browser template-upload or template-write endpoint in this flow. JSON workspace backups continue to contain business data, not template binaries. Keep the original Word references separately. Login, record access and editing retain the existing shared-workspace controls; no registration, recovery or password-change feature was added.

## Variables and review

The two Solar maps and eleven procurement maps cover 303 reviewed text slots. Sample identities, prices, dates and outcomes are replaced through these mappings; the two formerly preprinted approval assertions are now the fixed pending value **รอพิจารณา**. A generated draft is never evidence that approval, supervision, inspection, signing or payment occurred.

Saved Solar figures, quantities, branch/site and composite payment/scope text are read-only in draft review so repeated values stay consistent. Correct them in saved project/company data and reopen the draft. Changing the source data while a draft is open blocks its export. Procurement findings and other facts that cannot be inferred remain explicit draft fields. Per-file wording edits apply to the download only and are excluded from shared records/JSON backups.

## Current verification boundary

The local unit/integration/PGlite baseline is **101 passing tests**, with a further **8 optimized HTTP checks** passing. ESLint and the optimized build pass; homepage First Load JS is 134 kB and the production dependency audit reports zero vulnerabilities. The tests cover existing data/auth/role behavior plus private-template identity and membership gates, response integrity, client hash binding, retry/deduplication, independent buffer copies and old-cache isolation. Test fixtures are synthetic; CI does not require private template binaries or real credentials.

The hosted private table contains 13 registered template rows (2,813,741 decoded bytes), with their stored bytes/digests verified against the reviewed catalog. Direct anonymous/authenticated SELECT and server INSERT are denied; server SELECT is allowed. Existing workspace revision/audit count remains 10/10. The security advisor reports the intentional RLS-without-policy INFO for this server-only table; no permissive client policy is needed. Existing audit/invitation foreign-key index advisories remain a separate performance backlog; no original-system tables or indexes were changed.

A fresh test-origin browser produced actual download events for all 13 forms and exposed zero upload inputs or browser warnings/errors. Independent checks of those downloaded ZIP/XML files matched all 303 mapped slots to the synthetic saved-data values, preserved package inventory/non-text structure and checked absence of original sample identities/identifiers and external relationships. Neither the hosted storage-integrity check nor the test-origin browser pass completes the real hosted authenticated download flow, which remains pending. Earlier attachment-based browser results remain historical evidence only.

All 13 downloaded drafts converted successfully through the canonical document renderer using task-local LibreOffice and both TH SarabunPSK/TH SarabunIT๙ font families. All 32 page images were visually inspected. This is renderer compatibility evidence, not native Microsoft Word acceptance. Inherited pagination still needs editing after real facts replace placeholders: the quotation has a sparse final page, the signing annex spills its PO reference to another page, the order annex retains its original static page label despite flowing to two pages, and some long placeholders wrap awkwardly. Source layout is preserved intentionally; the app does not certify these drafts as ready to issue or silently shrink/alter contract forms. No QA PDF or private original is published.

Native Word pagination, applicable official template/contract review, final PDF generation and legacy field/identity/file migration remain open release gates. Preserve `git.deploymentEnabled.main=false`, the existing production aliases and the original application/database until the separate cutover requirements are met.
