# Solar forms and workspace review

Updated 2026-10-26. This change updates the audit Preview. It does not replace the legacy production app or migrate its records.

## Common document flow

The two existing Solar originals (approval estimate and expense notification/quotation) now follow the same review flow as the eleven procurement forms: select a saved project, attach the exact reviewed original, open **เตรียม Word ฉบับร่าง**, inspect the data/text, acknowledge the draft notice and download. Retry uses the last identical bytes; content preview remains optional.

A shared Word draft dialog retains the original source package through the existing exact-hash/OOXML engine. It keeps the title and download actions visible while the content scrolls. Solar totals are summarized first; the remaining saved data expands on demand. Native dialogs provide modal focus and inert background controls; Escape closes a nested preview without closing its parent draft. Closing edited wording offers an in-app choice to return or discard that temporary wording. Editing resets acknowledgement and hides an obsolete retry. A changed saved project/company/source blocks generation until the draft is reopened.

Solar monetary values, amounts in words, quantities, branch/site and composite payment/scope terms are read-only in the review. Edit those fields in the proposal/company settings, save and reopen the draft so dependent text stays consistent. The labelled reference/name/address wording that is editable is download-only; it does not modify central records or JSON backups. No signature, approval, inspection result, dispatch or payment is created by exporting.

## Correctness fixes

- A valid imported Turnkey record could previously retain one sales amount and export another calculated amount. Both Solar forms now reject a mismatch at satang precision, with instructions to review and re-save the proposal. Imported records are never silently rewritten.
- Whitespace no longer satisfies required quotation references, addresses or equipment fields, or enables empty optional bank/cheque instructions.
- Oversized/malformed calculated amounts now produce preparation errors before a Solar or procurement draft can crash its workspace during rendering.
- Company and official-profile drafts independently report unsaved work. Sidebar navigation offers return/discard; saving one form cannot clear the other's warning. Existing conflict baselines and failure behavior remain in place, with browser unload protection.

## Performance and accessibility

Templates load on demand like procurement and catalog. Customer totals are indexed in one proposal pass and memoized independently of search. Legacy normalized-name fallback applies only when a proposal lacks a customer ID; linked IDs, numeric addition order and source records remain unchanged. Search typing filters existing summaries rather than recalculating every customer's proposals.

Template descriptions/status text have stronger contrast; search, numeric wrappers and textareas show keyboard focus. The draft uses two columns on desktop and one on small screens. The tested 390-pixel viewport had a 390-pixel page width and an approximately 374-pixel dialog, with download controls inside the viewport. This is responsive smoke verification, not a complete screen-reader/device audit or hosted performance benchmark.

## Verification and limits

The regression suite covers mismatched/large estimates, whitespace, mapped field coverage, locked composite data, XML controls, safe filenames and customer-summary parity. Browser checks with synthetic data cover both Solar downloads, identical-byte retry, editing/acknowledgement reset, return/discard, nested preview/Escape, shared-data changes invalidating a draft, retention of originals after reload, and a procurement draft through the shared dialog. Both settings forms retained drafts when navigation was cancelled; after saving only company details, official-profile navigation protection remained active. Saving both retained the new values on reopening; synthetic test edits were restored.

Private ZIP/XML checks preserve source hashes, non-text structure, logos and package parts, remove checked sample identities and validate edited text escaping. The new supervision output matches its previously verified output except metadata timestamps. Original/generated binaries and screenshots stay outside Git. No dependency, schema, Auth configuration or production-domain change is included.

Final native Word pagination, current official template/contract review, final PDF generation and the broader legacy data/identity/file compatibility gates remain open. See [document workflow](DOCUMENT-DOWNLOADS.md), [legacy compatibility](LEGACY-COMPATIBILITY.md) and [shared-workspace acceptance](SHARED-WORKSPACE.md). No assertion of error-free software or full production readiness is made.
