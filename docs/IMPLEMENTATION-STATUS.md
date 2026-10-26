# SolarDesk implementation status

## Private central templates follow-up — 2026-10-26

All thirteen forms now load reviewed reusable templates through a private authenticated endpoint, without reattaching originals. The endpoint requires a confirmed account and active owner/editor/viewer SolarDesk membership; direct client table reads are denied. The additive `sd_v2_document_templates` schema stores versioned bytes privately; Git/deployments contain metadata and code only. Existing original files/IndexedDB entries remain untouched and no longer block default loading. No Auth settings, original business tables or production aliases were changed for this follow-up; the main deployment hold remains enabled.

Current verification: 101 unit/integration/PGlite tests and 8 optimized HTTP checks pass; ESLint/build pass, homepage First Load JS is 134 kB and production dependency audit reports zero vulnerabilities. Hosted storage contains 13 registered template versions whose bytes/digests match the catalog. A fresh test-origin browser produced all thirteen download events with zero upload inputs. Independent output ZIP/XML checks matched all 303 variable slots, preserved non-text structure and found no checked private sample residue. All 13 outputs converted successfully and all 32 page images were inspected with the source Thai fonts available. Native Word pagination remains open, with inherited wrapping/sparse-page/static-page-label issues documented; full hosted authenticated download acceptance is also pending. These results do not certify print readiness or complete legacy cutover. See [PRIVATE-TEMPLATES.md](PRIVATE-TEMPLATES.md) for the current workflow and limits. Earlier dated evidence below retains its original scope.

## Solar review and UX follow-up — 2026-10-26

Both Solar forms now use the same review/acknowledgement/export dialog as all eleven procurement forms. Saved monetary/composite data stays consistent; mismatched imported prices, whitespace required fields and oversized preparation failures are handled explicitly. Company/official settings retain independent dirty guards, with an in-app navigation choice. Templates load on demand and customer search reuses indexed summaries. The final build's homepage First Load JS is 134 kB versus 143 kB before this change; this measures bundle size, not hosted latency. Automated verification is 82 unit/Postgres checks plus 6 optimized HTTP checks; lint/build and dependency audit pass, with zero advisories reported on 2026-10-26. Actual Solar/procurement downloads, retry, stale-source rejection, settings save/navigation and 390-pixel responsive checks are documented in [FORM-REVIEW-UX.md](FORM-REVIEW-UX.md). Production cutover remains on hold; no database/Auth/dependency change is included.

Implementation verified 2026-10-21; deployment checks updated 2026-10-25. No completed production cutover: the original live application remains active.

## Shared workspace follow-up — 2026-10-25

Catalog follow-up: owner-managed package/equipment editing, archive state, proposal snapshot/prefill and catalog-preserving backup envelope v3 are implemented. Migration `20261025142650_solardesk_catalog_write_guard` was applied only to the SolarDesk save RPC after Postgres tests; original shape/4 MiB/table constraints, RLS and service-only execution remain enforced. The first draft was rejected by automatic review; the revised RPC explicitly repeats the original shape/size bounds and passed review/tests. Post-apply metadata shows the existing workspace unchanged at revision 2 without catalog data; advisors have no sd_v2 findings. See [CATALOG.md](CATALOG.md).

The owner confirmed no legacy test backup exists. A private-by-default backup plan/helper was syntax/dry-run tested, including refusal to target a Git checkout. PostgreSQL client tools/source service configuration and actual backup/restore verification remain pending; no existing database data was exported or changed. See [LEGACY-BACKUP.md](LEGACY-BACKUP.md).

The user authorized an existing Supabase project with isolated `sd_v2_*` tables and shared existing Auth accounts. Four RLS-enabled tables and service-only mutation RPCs were added without altering legacy tables, policies or Auth triggers/settings; the checked legacy schema fingerprint is unchanged. Server identity verification, role checks, optimistic revisions, invitation hashes, audit events, private cache headers and shared-mode UI have been implemented. Signup/recovery/password updates are excluded, and logout is local to the current session. See [SHARED-WORKSPACE.md](SHARED-WORKSPACE.md).

The owner added the server secret directly to Vercel. Cloud mode is enabled only on Preview branch `fix/readiness-audit`. Commit `609b2e3e26af5022c48887b06ab1576ff2943456` passed CI and its Git-triggered Preview is READY in Tokyo (`hnd1`), close to the approved database; eight hosted anonymous/auth-contract HTTP checks pass. Owner-assisted login and synthetic customer save/reload passed: a read-only hosted query confirms the named QA customer once, workspace revision 2, two audit events and latest audit revision 2. The agent-controlled browser still has a separate unauthenticated session, so this is an owner-assisted flow with database corroboration. Only one existing account is currently available; hosted multi-account roles/invitations and multi-device/conflict acceptance remain pending.

Follow-up code synchronizes the displayed role and write controls when background/focus refresh detects changed access, even at the same document revision. Revoked/expired access blocks editing without remounting the workspace or discarding open drafts. Superseded/cancelled reads cannot restore stale roles, replace a newer snapshot or publish an old network error. Successful refresh clears transient read errors while retaining separate save/conflict errors. Four deferred-response regression scenarios supplement the existing database permission tests; no shared Auth accounts or settings were modified to run them.

Final local validation: 51 unit/Postgres tests plus 6 optimized-server HTTP tests pass; lint/build pass. Browser checks with the real branch components and a private loopback synthetic API confirm viewer/revoked write blocking, retained form drafts, recovery to editor, save/reload and stale-edit rejection across two tabs. The harness has no hosted Auth/database access and is outside the app repository; these are not claimed as hosted multi-account results.

The owner also added a Sensitive variable with the same server-secret name to Production. Its value was not read, changed or removed by the agent; the agent configured only Preview variables and has not changed the production alias or main deployment hold. Existing audit/source/native-document/migration release blockers remain; the historical “no Auth/shared DB” and configuration-pending statements below describe earlier versions.

## Readiness audit update — 2026-10-25

Subsequent source recovery verified all 96 legacy text files (981,770 bytes) against Vercel SHA-1 IDs; the one favicon binary was not downloaded. The private source was not committed. After explicit owner authorization for filtered source review, Auth/actions/API/storage/validation were inspected and a private security report prepared. Legacy lockfile production audit reports 25 package entries (2 critical, 18 high, 5 moderate), distinct from V2's current dependency graph. [LEGACY-COMPATIBILITY.md](LEGACY-COMPATIBILITY.md) records the remaining data/auth/status/catalog/8-PDF/template/asset gaps. Source recovery does not constitute full runtime/security/data-migration acceptance, and no legacy production fix was deployed.

The current findings and release decision are in [READINESS-AUDIT.md](READINESS-AUDIT.md). Production remains **No-Go**. This update supersedes historical test/advisory/schema counts below: 36 tests pass; full dependency audit reports zero advisories; the complete 8-model legacy Prisma schema has been recovered privately, while full legacy source/security/parity review remains incomplete. Build first-load JavaScript is approximately 137 kB.

This branch adds frozen editor/import baselines, cross-tab exclusive write locks, draft preservation, cached-template integrity checks, async Word-preview isolation and an honest local-mode/help UI. Real browser tests include simultaneous writes: one company save succeeds and the other is rejected without losing its draft. Existing production/database, original forms and the main deployment hold are preserved.

Supabase staging creation was approved only at no cost, but failed at the active free-project quota. No new project exists and no current project was changed. The user will provide free staging capacity/project; actual Auth, RLS, shared database and migration/restore verification remain pending. Native DOCX rendering remains unavailable because the bundled runtime lacks LibreOffice. Remote branch/PR checks must be verified after publication; older local-upload deployments below are not proof of this branch's provenance.

Deployment preflight rechecked 2026-10-22: all 26 tests, ESLint and the optimized build pass; production dependency audit reports zero vulnerabilities. Added `.vercelignore` to exclude secrets, original documents, local outputs and build caches. After deliberate user approval of the official CLI device-authorization flow, access to emolaza/solar-proposal was verified. A process-only ASCII-hostname workaround avoids Vercel CLI 54.18.2's OAuth header failure on this machine; it does not modify the hostname, installed CLI or existing credentials.

## Preview deployment — 2026-10-22

- URL: https://solar-proposal-kbgn5dtbs-emolaza.vercel.app
- Project: emolaza/solar-proposal (`prj_h483TN7qqCR39PhZXTrU2juoSKC1`). Deployment: `dpl_97drVbxvpvZnHgnjTr4tN22RWkwg`, Preview, READY. Next.js 15.5.28 / Node.js 24.x; remote build completed in 38 seconds.
- Provenance: 31 reviewed local source files, 481,490 bytes, plus empty directory entries. No Git commit was deployed; GitHub publication and Git-based deploys remain pending. Neither private forms nor the generated local authentication file were uploaded.
- Browser smoke checks: dashboard and lazy procurement module load; demo proposal status saves, survives reload, and was restored; dashboard calculations follow the saved state; browser console captured no errors or warnings. Procurement starts with 0/11 attached original files, as expected on a new origin.
- Existing production domain was inspected before and after: it still points to `dpl_GFATKwyGNRXNYaSSn2HQF5VhH7WT`. No production promotion or database operation was performed.
- The HTTP-check helper automatically created an automation bypass, then failed because this CLI forwarded its global config argument to curl. This was not counted as an HTTP health-check pass. The exact newly created bypass was revoked without regeneration; browser rendering and official READY/Preview inspection are the verification evidence. Deployment Protection was not disabled.
- Workspace JSON and IndexedDB form binaries are origin-local, not hosted server data. To continue from localhost on this Preview, export/import the workspace backup and reattach the original forms. Do not publish private records in application source.

## Production candidate and recovered alias assignment — 2026-10-25

- URL: https://solar-proposal-pvs1ss1bc-emolaza.vercel.app
- Target/status: production candidate, READY; deployment `dpl_2XR9xeQoa5Qqt91sr9VVbZRSednE`. Framework: Next.js 15.5.28, Node.js 24.x; remote build 40 seconds. Commit: none, local source only. The source upload again contained 31 files / 481,490 bytes, excluding environment files, private forms and backups.
- Fresh checks: all 26 tests and ESLint pass; production dependency audit reports zero vulnerabilities. Browser dashboard renders, demo status saves and survives reload, then was restored. The lazy procurement page loads with no original forms attached on the new origin. Captured browser error/warning list is empty.
- Post-deploy observability: the candidate's bounded error-log scan (`--level error --since 1h --limit 50`) returned no entries. Project-specific drain count is zero; long-term monitoring/alerts and user acceptance remain incomplete. These checks do not establish full application readiness.
- Release incident: the command explicitly used `--prod --skip-domain`, but the CLI nevertheless assigned `solar-proposal-emolaza.vercel.app` to the new candidate. Read-only inspection confirmed that alias change. A rollback request was rejected with 422 because the project's production pointer was already the old deployment. The live alias was then restored explicitly to `solar-proposal-qi98ud8rz-emolaza.vercel.app` and inspected again: all three original aliases point to `dpl_GFATKwyGNRXNYaSSn2HQF5VhH7WT`. No deployment or database was deleted, and no migration ran. The precise CLI/server cause of the unexpected alias assignment is not established; do not repeat this production-staging command assuming it leaves aliases untouched.
- Release decision: HOLD main-domain cutover. The new version still lacks real authentication, shared database, legacy feature/data parity, reviewed final Word output and GitHub-backed deployment provenance. `git ls-remote` on the requested GitHub repository returned no refs. Deployment success alone must not be described as a complete, multi-user production system.
- The candidate remains usable separately for the existing browser-local workflow only. An informed choice between that limited mode and completing authenticated shared storage is required before replacing the old application.

## GitHub source publication — 2026-10-25

The reviewed V2 application is published at the root of `poomjakkrapop/Solar-proposal` on `main`; this is not a full recovery of the legacy application. Source, tests, documentation, empty environment-name example and credential-free CI are included. Original documents, local browser records, recovery artifacts, `.env.local`, `.vercel`, dependencies and build outputs are excluded.

Read-only verification found the existing Vercel project already connected to this exact GitHub repository with production branch `main`. `vercel.json` therefore holds Git-triggered deployment of `main` (`git.deploymentEnabled.main=false`) while leaving non-main Preview branches eligible. Do not remove this hold until release requirements below are satisfied. CI checks source changes; remote CI results and commit identity must be confirmed from GitHub after publication. The earlier deployment records above retain their original local-source provenance; pushing source does not retroactively make those builds Git-triggered.

## Architecture

Next.js 15.5.28 App Router, React 19.1, TypeScript, responsive Thai UI and locally hosted Sarabun fonts. The main dashboard is statically rendered and hydrates a client workspace. Initial route JavaScript in the verified build is 135 kB. PizZip and docx-preview are loaded only for document operations. Template preview is browser-rendered content, not a native Word pagination service.

There are no database connections, authenticated users, server actions or business API routes in this isolated version. Workspace data lives in a versioned localStorage snapshot; private original DOCX templates live separately in IndexedDB. A dynamic review route reads those local templates only after hydration. The old production database and application have not been modified.

## Implemented workflows

- Proposal/customer creation and editing, package presets, search/filter, status tracking and metrics derived from actual local records.
- Cost/operations/profit/VAT calculation in integer satang; Thai currency words; dates, document numbering, equipment, warranties, maintenance and payment terms.
- Shared branch/signatory profile, optional user-entered payment accounts and missing-field checks. Approval memo generation is blocked when the total exceeds the configured authority limit.
- Exact-hash attachment of two privately supplied originals, non-destructive text-slot replacement and Word draft downloads. Original account/customer information is not inherited into generated outputs. Unedited styles, drawings, relationships and layout structure are retained.
- CSV formula protection, JSON backup/import validation, legacy workspace migration, cross-tab updates and accessible editor/preview keyboard handling.
- Read-only GitHub CI workflow: dependency installation, production advisory check, tests, lint and build. Actions pinned to verified immutable commits; no deployment tokens are used.

## Verified evidence

- 26 automated tests pass; ESLint and optimized Next build pass.
- Both draft downloads tested in the locally served optimized build. Browser console has no captured warning/error in that final run. Tab focus remains in the preview and Escape restores focus.
- Private read-only ZIP/XML QA confirms unchanged source hashes, identical non-text document/footer structure, original sample identifiers absent in every generated XML part, and expected totals and equipment present. Unchanged uncompressed package parts: 17 for approval, 30 for quotation.
- Next.js security patch, compatible Sharp 0.35.5 and PostCSS 8.5.31 override applied. Production npm audit reports zero advisories. Full audit still reports five entries in the unpatched development-only braces/lint chain; see README for scope.
- Existing five local demo proposals and four customers retained. One clearly labelled synthetic proposal/customer and a synthetic official profile were added for end-to-end testing. No production records were imported or edited.

## Not yet complete

- Procurement update: registered 11 private reference files in four stages; 10 DOCX content previews tested, legacy DOC preview disabled. Added separate project contractor/WO/PO/budget/dates/committee fields and per-document internal tracking. Backup retained all six local proposals/five customers and procurement data after editing a sales proposal; customer sales price remained unchanged. Native keyboard testing confirmed date-order validation. The 11 new references remain read-only: no automatic generation, signature, approval or acceptance outcome is enabled.

- Canonical native DOCX rendering is unavailable because the packaged runtime lacks LibreOffice. Browser preview demonstrably differs in font metrics, VML positioning, equipment-column alignment and page count. Final Word/PDF visual approval is pending.
- The supplied merged equipment row has ambiguous independently spaced quantity positions. Positions four/five are explicit manual fields, not inferred equipment counts; all quantities and static boilerplate require Word review.
- Authentication/authorization, shared persistent database, tenant isolation, server validation, audit logs and full legacy data/function parity are not implemented.
- The full legacy source/schema remains incompletely recovered. Do not replace the existing deployment with this prototype until that audit and migration plan are complete.
- Source publication and the credential-free GitHub Actions workflow are recorded above. Confirm remote CI and establish branch protection/release approvals. The Preview and separate production candidate are READY as recorded above; the brief unintended live-alias assignment was restored. The original live application remains active.

## Safe next sequence

1. Verify both output forms with the original fonts in Word and resolve the quantity mapping and pagination before final PDF issuance.
2. Recover the complete legacy source/schema and document a feature/data compatibility matrix.
3. Implement authenticated server/database workflows against a disposable data copy, with reviewed backward-compatible migrations.
4. Publish reviewed, secret-free source to GitHub without triggering an unreviewed production replacement. Configure branch checks and a separate Vercel Preview with isolated configuration.
5. Complete user acceptance and rollback checks before any main-branch production cutover.

## Document download and procurement draft update — 2026-10-25

The current behavior supersedes the historical read-only procurement description above. All eleven DOCX references now generate editable drafts through 221 reviewed structural slots, with source identities/outcomes removed, saved-project prefill, explicit unresolved fields and optional preview/retry. The supervision reference was saved as a real DOCX in Microsoft Word and inspected privately. Its original DOC remains downloadable unchanged under its existing storage key; the converted DOCX uses an independent hash-checked key. Both survive reload and either attachment order without overwriting one another. Supervision handover evidence, actual findings, dates and recommendations remain explicit draft fields rather than sample outcomes.

Validation: 73 unit/Postgres checks, 6 optimized HTTP checks, ESLint and optimized Next.js build pass. Actual browser download and identical-byte retry passed for the eleventh draft, after the earlier ten-file integration. Its private ZIP/XML comparison retained all 16 parts and non-text body structure/line breaks, removed checked sample identities/identifiers and confirmed both original DOC copies and their downloaded reference unchanged. No new dependency, database migration, Auth setting or production alias change is included. See [current workflow, verification and limitations](DOCUMENT-DOWNLOADS.md). Source binaries and private QA outputs remain outside Git. Final native draft pagination and official template/legal review are still pending; production remains No-Go pending the existing legacy/data acceptance gates.
