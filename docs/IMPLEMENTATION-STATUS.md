# SolarDesk implementation status

Implementation verified 2026-10-21; deployment checks updated 2026-10-25. No completed production cutover: the original live application remains active.

## Shared workspace follow-up — 2026-10-25

The user authorized an existing Supabase project with isolated `sd_v2_*` tables and shared existing Auth accounts. Four RLS-enabled tables and service-only mutation RPCs were added without altering legacy tables, policies or Auth triggers/settings; the checked legacy schema fingerprint is unchanged. Server identity verification, role checks, optimistic revisions, invitation hashes, audit events, private cache headers and shared-mode UI have been implemented. Signup/recovery/password updates are excluded, and logout is local to the current session. See [SHARED-WORKSPACE.md](SHARED-WORKSPACE.md).

The owner added the server secret directly to Vercel. Cloud mode is enabled only on Preview branch `fix/readiness-audit`; commit `e309b1a0250f211b19bcb2f509e5c32524004136` passed CI and its Git-triggered deployment is READY. Eight hosted anonymous/auth-contract HTTP checks pass. The owner reports successful sign-in and the hosted SolarDesk tables contain one initially empty workspace, one member and one creation audit. The agent-controlled browser still has a separate unauthenticated session, so this is not recorded as a complete agent-observed browser flow. Customer save/reload and multi-account/multi-device tests remain pending.

The owner also added a Sensitive variable with the same server-secret name to Production. Its value was not read, changed or removed by the agent; the agent configured only Preview variables and has not changed the production alias or main deployment hold. Existing audit/source/native-document/migration release blockers remain; the historical “no Auth/shared DB” and configuration-pending statements below describe earlier versions.

## Readiness audit update — 2026-10-25

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
