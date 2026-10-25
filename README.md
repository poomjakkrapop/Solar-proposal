# SolarDesk — Solar Proposal Workspace (V2 prototype)

A V2 implementation for the Solar Proposal project with preserved browser-local mode and an optional authenticated shared-workspace backend. This repository is not a complete recovery of the legacy Solar system. Production cutover remains on hold. See [shared-workspace setup/status](docs/SHARED-WORKSPACE.md) and [implementation history](docs/IMPLEMENTATION-STATUS.md).

Current audit and release decision (2026-10-25): [Thai readiness report](docs/READINESS-AUDIT.md). **Production cutover remains No-Go.** The user subsequently authorized isolated V2 tables in an existing Supabase project and reuse of its existing Auth accounts. The additive schema has been applied; Preview secret configuration and live Auth/multi-device tests remain pending. No legacy application table or Auth setting was changed.

## Current scope

- Responsive Thai-language workspace with dashboard, proposals, customers, catalog, and templates.
- Create and edit proposals and customers, select an existing customer, prefill system size/pricing from a package, add notes and a validity date, filter/search, and update status.
- Dashboard metrics, status charts, and customer totals derive from the stored records. There are no invented growth percentages.
- Company settings populate a preliminary A4 browser-print layout. An additional official profile stores branch/address, preparer/reviewer/approver, contact and optional payment-account fields locally.
- Solar details include PV/inverter specifications, warranties, maintenance, dates and payment terms. Turnkey pricing rounds at each stage in integer satang: operations on base cost, profit on base plus operations, then VAT. The sample's 233,000 baht base produces 294,497.44 baht total. Rates are editable sample defaults, not a claim about current PEA rules.
- Private DOCX template attachment and draft export support the two supplied forms. Only their hashes and XML slot offsets are in source. Attach the exact originals in the Templates view; binaries remain in browser IndexedDB, not on a server or in git. DOCX generation and preview dependencies load on demand.
- Procurement workspace registers 11 additional references across customer service, selection, contracting, and delivery/acceptance. Store project-specific contractor/PO/WO/budget/date/committee information separately from the customer and sales price. Track each document's reference/date/internal review status without implying a signature or approval. All records remain in the versioned workspace backup.
- Export filtered proposals as CSV or the entire workspace as a JSON backup. Import validates records and previews counts before replacement. CSV cells protect against spreadsheet formula injection.
- Data is stored locally in one versioned snapshot. Legacy v1 browser data is read without deletion, writes are atomic across customer/proposal updates, and corrupt or unsupported data is never silently reset. Storage changes in other tabs are synchronized.
- Cooperating tabs serialize writes with Web Locks and reject stale editor/import baselines while retaining drafts. Use a current browser on HTTPS (or localhost); without Web Locks, saving is blocked while reading/export remain available. Reload old tabs to the same version. This does not provide multi-device transactions or server authorization.
- Shared mode adds server-verified sign-in, role/membership checks, RLS-protected reads, transaction/revision-protected writes, invitations and audit events. It remains disabled until Preview configuration and live checks pass. Registration, recovery and password changes are absent from SolarDesk to preserve the shared Auth application's behavior. Local mode retains its original storage and limitations.
- Server-generated final PDF/DOCX, remote template uploads and legacy production integration remain incomplete. This version is not approved for sensitive production use.

## Official form workflow

1. In Company Settings, fill the official branch profile and signatory roles. Leave banking fields blank unless an authorized account should appear; the original sample account is never inherited.
2. Create/edit a proposal. Enter system/equipment information and document terms. Choose Turnkey and enter the base cost for an approval memo. Saving assigns a unique `QT-<Buddhist year><month>-<sequence>` number unless a number is entered manually.
3. Open Templates, select the proposal, attach each original DOCX, and resolve the missing-field checklist. Modified templates are deliberately rejected; offsets must be re-audited for every new template revision.
4. Export a draft, inspect the amounts and every page in Microsoft Word with the original fonts, then authorize issuance outside this prototype. Export does not send or sign anything.

The sample's equipment table uses one merged row with independently spaced descriptions/quantities, not real item rows. The fourth and fifth quantity entries are explicit manual column-position fields because their visual association cannot be verified here. Other supporting quantities and source boilerplate remain as supplied. Check every quantity and the retained On-grid wording against the actual project. System capacity and inverter capacity are separate fields, not inferred from a model name.

Browser preview is content-only: substituted fonts, VML shapes, table positions and pagination differ from Word. The packaged canonical renderer currently lacks LibreOffice; native Word/LibreOffice pagination QA and the final PDF workflow remain pending. Successful XML validation is not print-readiness approval. The supplied source files themselves are never modified.

JSON backups include proposal details and official profiles (including any user-entered payment information); store them securely. They exclude template binaries: retain both original DOCX files separately. Clearing site data removes local records/templates. `localhost` and `127.0.0.1` are different browser storage origins.

## Procurement references

Open **จัดจ้าง**, choose an existing proposal/project, and attach the supplied files in one batch. SHA-256 identifies the reviewed version of each file; a changed/unknown document is rejected without overwriting an existing reference. All 11 binaries are retained only in private browser IndexedDB, sharing the original template store without migrating or deleting it. Ten DOCX files have browser content previews; the legacy supervision `.doc` is retained but cannot be rendered or mapped until a separately verified DOCX conversion is supplied.

The four stage buttons show 2 / 3 / 4 / 2 documents. Their grouping is an organizational aid, not a legal workflow approval or a claim that source filename numbers establish a valid order. Save the project fields and document tracking explicitly. Switching projects/pages or leaving the browser warns about unsaved edits. Saving an ordinary sales proposal preserves its procurement fields. Concurrent edits to the same procurement data are rejected instead of silently overwriting them.

These 11 references are **not enabled for automatic document generation** yet. They contain different projects, partly conflicting dates/payment clauses and optional contract alternatives; no existing signatories, signatures, contractor identities, prices, approval/check marks or acceptance outcomes are applied to a new project. No account, citizen ID or identity-document copies are requested by the procurement editor. The editor's dates use Gregorian years (e.g. 2026), with date and order validation. Zero amounts/rates/days mean unset or explicitly zero and require review, not a prescribed default.

Before implementing generation, obtain the supervision DOCX, confirm the exact legal/template revision and alternatives with the responsible reviewer, inventory every editable slot including shapes/fields/headers, and complete native Word rendering and privacy checks for every document. Do not infer applicable procurement rules, agreement-vs-contract choice, guarantee rates, or approval authority from these historic samples. No legal advice or current-regulation verification is provided by this reference library.

## Run locally

Requires Node.js 22.18+.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Verification

```bash
npm test
npm run lint
npm run build
npm run test:http
```

The data-integrity tests require Node.js 22.18+ (Node.js 24 is used locally). Tests cover backup round trips, legacy migration, corrupted/versioned data, ID collisions, customer renames, numeric validation, CSV injection, sample estimate arithmetic, Thai baht text and document slot coverage. Private reference audits are intentionally outside this app directory.

Security check on 2026-10-25: full `npm audit --json` reports **zero advisories** for the current lockfile, including development dependencies. This supersedes the five development-only advisories observed on 2026-10-21; no forced dependency changes were made in this audit. Next.js is 15.5.28, with a PostCSS 8.5.31 override. Rerun audits before release; this dependency result is not a complete application security audit.

## GitHub and Vercel workflow

Repository: https://github.com/poomjakkrapop/Solar-proposal. The Next.js application is at the repository root. The included GitHub Actions workflow runs clean installation, tests, lint and a production build on pull requests and pushes to `main`. No application or deployment credentials are required for CI.

Use GitHub as the source of truth for reviewed V2 changes: feature branch → pull request → passing CI → Vercel Preview → user acceptance → merge to `main`. Vercel project `emolaza/solar-proposal` is already connected to this repository with production branch `main`. **Production release is on hold:** `vercel.json` sets `git.deploymentEnabled.main` to `false`, preventing a push to `main` from replacing the legacy application. Other branches remain eligible for Preview deployments under the existing Vercel integration. This is a Git-triggered deployment guard, not an authentication control or a block on manual CLI deployments. See [Vercel Git configuration](https://vercel.com/docs/project-configuration/git-configuration).

Do not remove the `main` guard, switch domains or manually release production until legacy source/data recovery, feature compatibility, authentication/shared storage and user acceptance are complete. Test with isolated preview credentials/data. The observed CLI `--skip-domain` alias-assignment incident is recorded in the implementation status; do not assume that flag alone protects the live domain in this environment.

Do not commit `.env`, original customer documents, private recovery files or database exports. `.env.example` contains empty names only; the browser's localStorage/IndexedDB data is not part of the repository. Existing document binaries stay on the user's machine.

## Remaining roadmap

- Finish native document layout QA, review the source table quantities/page fields and legal/payment boilerplate, then add tested final PDF generation.
- Finish the full legacy source review and audit its auth, server actions and API routes. The complete Prisma schema has been recovered privately (eight models); the feature/data compatibility matrix and a lossless migration are still incomplete.
- Add server-side authentication, tenant/role authorization, validated CRUD and audit logs with a disposable database first. Import local records only through a reviewed migration; do not point this prototype at production.
- Verify remote CI and Git-triggered Preview deployments; add reviewed branch protection and a production approval gate before removing the `main` deployment hold. Preserve the old application and a tested rollback path.

## Safety and next steps

Do not replace the legacy production application or connect this implementation to the existing production database yet. Preview and a separate production candidate exist, but deployment success is not full-system readiness. Before cutover, recover and verify the complete production Prisma schema and document/template assets, compare every legacy workflow, design backward-compatible migrations, add server-side authentication/authorization and validation, and test against a disposable database copy. Add secrets only to local environment files or Vercel settings; never commit them.
