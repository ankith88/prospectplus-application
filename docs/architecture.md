# System Architecture & Workspace Map

## Project Profile
- **Project Name:** `ProspectPlus`
- **Architecture Style:** FULLSTACK
- **Primary Language:** `TypeScript (React)`
- **Detected Frameworks:** `Next.js` *(fullstack)*, `React` *(frontend)*, `Tailwind CSS` *(utility)*, `Firebase` *(backend)*
- **Monorepo Structure:** Single Project
- **Docker Enabled:** No
- **CI Workflows:** No



## Language Composition
| Language | Files | Share |
| :--- | :--- | :--- |
| TypeScript (React) | 392 files | 31.5% |
| Unknown (.pdf) | 3 files | 24.2% |
| JSON | 12 files | 14.5% |
| Unknown (.csv) | 5 files | 8.9% |
| TypeScript | 361 files | 8.4% |
| Unknown (.docx) | 9 files | 3.5% |
| Unknown (.png) | 11 files | 2.2% |
| Unknown (.tsbuildinfo) | 1 files | 2.2% |
| JavaScript | 81 files | 1.6% |
| HTML | 28 files | 1.3% |
| Unknown (.map) | 25 files | 0.7% |
| Unknown (.zip) | 2 files | 0.5% |
| Plain Text | 7 files | 0.1% |
| Unknown (.jpg) | 2 files | 0.1% |
| Unknown (.txt) | 1 files | 0% |
| Unknown (.mdx) | 1 files | 0% |
| Python | 2 files | 0% |
| Unknown (.svg) | 5 files | 0% |
| Unknown (.rules) | 1 files | 0% |
| CSS | 4 files | 0% |
| Unknown (.ico) | 1 files | 0% |
| Markdown | 3 files | 0% |
| YAML | 1 files | 0% |
| Unknown (.nix) | 1 files | 0% |
| Unknown (.avif) | 1 files | 0% |
| Unknown (.local) | 1 files | 0% |



## Workspace Directory Tree
```text
. (prospectplus-application)
├── .agent/
│   └── workflows/
│       ├── merge_to_main.md
│       └── new_branch.md
├── .idx/
│   ├── dev.nix
│   └── icon.png
├── .storybook/
│   ├── main.ts
│   └── preview.tsx
├── functions/
│   ├── lib/  # [Internal library and client modules]
│   │   ├── services/  # [Service layer & external integrations]
│   │   │   ├── emailDispatcher.js
│   │   │   ├── emailDispatcher.js.map
│   │   │   ├── PipelineEngine.js
│   │   │   └── PipelineEngine.js.map
│   │   ├── webhooks/
│   │   │   ├── aircall.js
│   │   │   ├── aircall.js.map
│   │   │   ├── netsuite.js
│   │   │   ├── netsuite.js.map
│   │   │   ├── packages.js
│   │   │   └── packages.js.map
│   │   ├── backfillStatuses.js
│   │   ├── backfillStatuses.js.map
│   │   ├── callsReport.js
│   │   ├── callsReport.js.map
│   │   ├── franchiseeSync.js
│   │   ├── franchiseeSync.js.map
│   │   ├── index.js
│   │   ├── index.js.map
│   │   ├── invoices.js
│   │   ├── invoices.js.map
│   │   ├── journeyDispatcher.js
│   │   ├── journeyDispatcher.js.map
│   │   ├── leads.js
│   │   ├── leads.js.map
│   │   ├── localmileJobsReport.js
│   │   ├── localmileJobsReport.js.map
│   │   ├── mergeLeads.js
│   │   ├── mergeLeads.js.map
│   │   ├── overdueHotLeadsReport.js
│   │   ├── overdueHotLeadsReport.js.map
│   │   ├── packageHooks.js
│   │   ├── packageHooks.js.map
│   │   ├── products.js
│   │   ├── products.js.map
│   │   ├── reportsAggregation.js
│   │   ├── reportsAggregation.js.map
│   │   ├── salesSnapshotAggregator.js
│   │   ├── salesSnapshotAggregator.js.map
│   │   ├── salesSnapshotReport.js
│   │   ├── salesSnapshotReport.js.map
│   │   ├── scans.js
│   │   ├── scans.js.map
│   │   ├── scoringEngine.js
│   │   ├── scoringEngine.js.map
│   │   ├── services.js
│   │   ├── services.js.map
│   │   ├── syncJobs.js
│   │   ├── syncJobs.js.map
│   │   ├── tickets.js
│   │   └── tickets.js.map
│   ├── src/  # [Core source code directory]
│   │   ├── services/  # [Service layer & external integrations]
│   │   │   ├── emailDispatcher.ts
│   │   │   └── PipelineEngine.ts
│   │   ├── webhooks/
│   │   │   ├── aircall.ts
│   │   │   ├── netsuite.ts
│   │   │   └── packages.ts
│   │   ├── backfillStatuses.ts
│   │   ├── callsReport.ts
│   │   ├── franchiseeSync.ts
│   │   ├── index.ts
│   │   ├── invoices.ts
│   │   ├── journeyDispatcher.ts
│   │   ├── leads.ts
│   │   ├── localmileJobsReport.ts
│   │   ├── mergeLeads.ts
│   │   ├── overdueHotLeadsReport.ts
│   │   ├── packageHooks.ts
│   │   ├── products.ts
│   │   ├── reportsAggregation.ts
│   │   ├── salesSnapshotAggregator.ts
│   │   ├── salesSnapshotReport.ts
│   │   ├── scans.ts
│   │   ├── scoringEngine.ts
│   │   ├── services.ts
│   │   ├── syncJobs.ts
│   │   └── tickets.ts
│   ├── .DS_Store
│   ├── .env
│   ├── .eslintrc.js
│   ├── package.json
│   └── tsconfig.json
├── lpo_leads/
│   └── LPOLeadProfilesListResults671.csv
├── mockups/
│   ├── email templates/
│   │   ├── 5-free-collections-info-outbound-v2-2026-07-22.html
│   │   ├── localmile-access-outbound-v2-2026-07-22.html
│   │   ├── lost_no_response.html
│   │   ├── No Answer - ShipMate Info.html
│   │   ├── out_of_territory.html
│   │   ├── PUD - Thank You & Next Steps.html
│   │   ├── Send Quote - Product.html
│   │   ├── Send Quote - Service & Product.html
│   │   ├── Send Quote - Service.html
│   │   ├── ShipMate Demo Confirmed.html
│   │   ├── Shipping - Thank You & Next Steps.html
│   │   └── V2 - Send Quote - Service & Product.html
│   ├── OneDrive_1_22-07-2026/
│   │   ├── Activated - No First Job [Replace all].html
│   │   ├── LocalMile Not Activated - [Replace all].html
│   │   ├── Trial Complete.html
│   │   ├── Trial Nudge - Job 1 - Reminder 1 & 2.html
│   │   ├── Trial Nudge - Job 2 - Reminder 1 & 2.html
│   │   ├── Trial Nudge - Job 3 - Reminder 1 & 2.html
│   │   └── Trial Nudge - Job 4 - Reminder 1 & 2.html
│   ├── .DS_Store
│   ├── Batch 2 - J2 Enriched - Alex List.csv
│   ├── Deed of Variation - Exit Program - Template.pdf
│   ├── Import Leads - Sample Data.csv
│   ├── pp_email_base_template.html
│   ├── pp_email_template.html
│   ├── pp_email_template.html.zip
│   ├── Prospect-Plus-Ticketing-Mockup-v5 1.html
│   ├── ProspectPlus Homepage Copy Revisions.docx
│   ├── prospectplus-account-lookup-mockup.html
│   ├── prospectplus-credentials-email.html
│   ├── prospectplus-homepage-mockup.html
│   ├── send_quote_prod.html
│   ├── send_quote_serv_prod.html
│   ├── send_quote_service.html
│   ├── Service Upload V2.csv
│   └── Service Upload.csv
├── public/  # [Static assets & public media]
│   ├── icon.jpg
│   ├── manifest.json
│   ├── mockServiceWorker.js
│   └── og-image.jpg
├── scratch/
│   ├── am-assignment-log.json
│   ├── assign-account-managers.js
│   ├── booking-url-log.json
│   ├── check_packages_live.js
│   ├── check_packages_sync.js
│   ├── check-2008259.js
│   ├── check-2010443-phone.js
│   ├── check-2010443.ts
│   ├── check-initiated.js
│   ├── check-lead-2037339.ts
│   ├── check-lpo-db-prod.js
│   ├── check-lpo-db.js
│   ├── check-outbound-field-sales.ts
│   ├── check-phone-db.js
│   ├── check-phone.ts
│   ├── count_docs.js
│   ├── count-unassigned-leads.js
│   ├── find-initiated-all.js
│   ├── find-website-leads-missing-history.ts
│   ├── generate-general-booking-links.js
│   ├── get_lead_details.js
│   ├── inspect_activities.js
│   ├── inspect_customer_packages.js
│   ├── inspect_lead_1931805.js
│   ├── inspect_leads.js
│   ├── inspect_services.js
│   ├── inspect_this_month_cache.js
│   ├── inspect-lead.js
│   ├── lead_output.json
│   ├── recalculate_all_ranges.js
│   ├── report_invoices_admin.js
│   ├── report_invoices_client.ts
│   ├── report_invoices_gcloud.js
│   ├── report_invoices.ts
│   ├── revert-account-managers.js
│   ├── revert-booking-urls.js
│   ├── revert-general-booking-links.js
│   ├── run-assign-lpo-am.ts
│   ├── send-all-test-reports.js
│   ├── test_calc_top_users.js
│   ├── test_db.mjs
│   ├── test_packages_query.js
│   ├── test_rest_query.js
│   ├── test_subcollection.js
│   ├── test_token_connection.js
│   ├── test-lead-1985895-reporting.ts
│   ├── test-leads-fix.js
│   ├── test-send-localmile-report.js
│   ├── trigger-all-reports.js
│   ├── trigger-sales-snapshot-test-report.js
│   ├── trigger-test-report.js
│   ├── update-booking-urls.js
│   └── verify_2006779.ts
├── scripts/  # [Build and automation scripts]
│   ├── analyze-outbound-am.ts
│   ├── assign-blank-am-leads.ts
│   ├── backfill-account-manager.ts
│   ├── backfill-delivered-status.ts
│   ├── backfill-latest-scan-date.ts
│   ├── backfill-localmile-links.ts
│   ├── backfill-packages-denorm.ts
│   ├── backfill-prospect-plus-id.ts
│   ├── backfill-search-keywords.ts
│   ├── backfill-sof-links.ts
│   ├── backfill-website-lead-bucket-history.ts
│   ├── check-2003924.ts
│   ├── check-alexandria.ts
│   ├── check-backfill-progress.ts
│   ├── check-blank-am-leads.ts
│   ├── check-lead-company.ts
│   ├── check-leads.ts
│   ├── check-package.js
│   ├── check-primary-contacts.ts
│   ├── check-shipmate-portal-status.ts
│   ├── check-won-leads.ts
│   ├── copy-company-to-lead.ts
│   ├── copy-main-territory-to-tge.ts
│   ├── duplicate-won-leads.ts
│   ├── fetch-barcodes-2026.ts
│   ├── fetch-historical-barcodes.ts
│   ├── find-uncalled-leads.ts
│   ├── import-participating-lpos.ts
│   ├── link-franchisee-user.ts
│   ├── merge-leads-to-companies.ts
│   ├── migrate-user-roles.ts
│   ├── refactor_roles.js
│   ├── reset-sync-jobs.js
│   ├── reset-sync-jobs.ts
│   ├── seed-cancellation-reasons.ts
│   ├── seed-territory-coordinates.ts
│   ├── sync-leads-to-mailplus-v2.ts
│   ├── sync-real-tracking.ts
│   ├── sync-uncalled-leads.ts
│   ├── transfer-franchisee-ownership.ts
│   ├── trigger-backfill.ts
│   ├── update-call-activities.ts
│   ├── update-customer-status.ts
│   ├── update-outbound-field-sales-false.ts
│   ├── update-primary-contacts.ts
│   └── verify-email-fix.js
├── src/  # [Core source code directory]
│   ├── ai/
│   │   ├── flows/
│   │   │   ├── ai-lead-scoring.ts
│   │   │   ├── analyze-business-card.ts
│   │   │   ├── analyze-checkin-flow.ts
│   │   │   ├── analyze-transcript-flow.ts
│   │   │   ├── analyze-visit-note.ts
│   │   │   ├── ask-query-flow.ts
│   │   │   ├── classify-email-intent.ts
│   │   │   ├── discover-multisite-branches-flow.ts
│   │   │   ├── extract-franchisee-agreement.ts
│   │   │   ├── gather-company-insights.ts
│   │   │   ├── generate-email-draft.ts
│   │   │   ├── generate-marketing-asset.ts
│   │   │   ├── get-call-transcript-flow.ts
│   │   │   ├── get-leads-tool.ts
│   │   │   ├── get-user-call-transcripts-flow.ts
│   │   │   ├── improve-script.ts
│   │   │   ├── initiate-call-flow.ts
│   │   │   ├── next-best-action.ts
│   │   │   ├── prospect-website-tool.ts
│   │   │   ├── score-cold-call.ts
│   │   │   └── talking-point-suggestions.ts
│   │   ├── dev.ts
│   │   └── genkit.ts
│   ├── app/  # [Next.js App Router or application entry point]
│   │   ├── __/
│   │   │   └── auth/
│   │   ├── account-lookup/
│   │   │   └── page.tsx
│   │   ├── account-manager/
│   │   │   ├── multisites/
│   │   │   ├── pipeline/
│   │   │   ├── reports/
│   │   │   └── settings/
│   │   ├── admin/
│   │   │   ├── all-leads/
│   │   │   ├── app-tickets/
│   │   │   ├── brand-bot/
│   │   │   ├── dashboard/
│   │   │   ├── data/
│   │   │   ├── deployments/
│   │   │   ├── financial-dashboard/
│   │   │   ├── franchisee-invoicing/
│   │   │   ├── franchisees/
│   │   │   ├── import-lpos/
│   │   │   ├── in-review-leads/
│   │   │   ├── lifecycle-dashboard/
│   │   │   ├── locations/
│   │   │   ├── login-report/
│   │   │   ├── mailbox/
│   │   │   ├── marketing/
│   │   │   ├── mass-link-customers/
│   │   │   ├── partner-locations/
│   │   │   ├── settings/
│   │   │   ├── tickets/
│   │   │   └── unassigned-leads/
│   │   ├── api/  # [Backend API endpoints & handlers]
│   │   │   ├── abn-lookup/
│   │   │   ├── account-lookup/
│   │   │   ├── admin/
│   │   │   ├── aircall/
│   │   │   ├── ask/
│   │   │   ├── calendar/
│   │   │   ├── campaigns/
│   │   │   ├── cancellations/
│   │   │   ├── check-tickets/
│   │   │   ├── companies/
│   │   │   ├── confidentiality-deed/
│   │   │   ├── contacts/
│   │   │   ├── copilot/
│   │   │   ├── cron/
│   │   │   ├── cs-requests/
│   │   │   ├── debug-lead/
│   │   │   ├── deed-of-variation/
│   │   │   ├── email/
│   │   │   ├── eoi/
│   │   │   ├── franchise-prospects/
│   │   │   ├── franchisee-im/
│   │   │   ├── franchisees/
│   │   │   ├── integrations/
│   │   │   ├── leads/
│   │   │   ├── localmile/
│   │   │   ├── localmile-registration/
│   │   │   ├── lpo/
│   │   │   ├── lpo-leads/
│   │   │   ├── lpo-opportunities/
│   │   │   ├── lpo-opportunity/
│   │   │   ├── lpo-plus/
│   │   │   ├── lpo-reporting/
│   │   │   ├── mailbox/
│   │   │   ├── notifications/
│   │   │   ├── nurture/
│   │   │   ├── onboarding-requests/
│   │   │   ├── operators/
│   │   │   ├── packages/  # [Monorepo workspace packages]
│   │   │   ├── public/  # [Static assets & public media]
│   │   │   ├── scans/
│   │   │   ├── scf/
│   │   │   ├── search/
│   │   │   ├── shipmate/
│   │   │   ├── sign/
│   │   │   ├── sof/
│   │   │   ├── surcharge/
│   │   │   ├── tasks/
│   │   │   ├── templates/
│   │   │   ├── territory/
│   │   │   ├── tickets/
│   │   │   ├── tracking/
│   │   │   ├── users/
│   │   │   └── v1/
│   │   ├── api-docs/
│   │   ├── app-tickets/
│   │   │   ├── create/
│   │   │   └── page.tsx
│   │   ├── appointments/
│   │   │   └── page.tsx
│   │   ├── ask/
│   │   │   ├── ask-client.tsx
│   │   │   └── page.tsx
│   │   ├── auth/
│   │   │   └── action/
│   │   ├── book/
│   │   │   └── [bookingUrlId]/
│   │   ├── calls/
│   │   │   └── page.tsx
│   │   ├── capture-visit/
│   │   │   └── page.tsx
│   │   ├── check-in/
│   │   │   ├── [leadId]/
│   │   │   └── printable/
│   │   ├── check-ins/
│   │   │   └── page.tsx
│   │   ├── companies/
│   │   │   └── [id]/
│   │   ├── completed-routes/
│   │   │   └── page.tsx
│   │   ├── confidentiality-deed/
│   │   │   └── [token]/
│   │   ├── customer-request/
│   │   │   └── [companyId]/
│   │   ├── customer-success/
│   │   │   ├── cancellation-reporting/
│   │   │   ├── cancellations/
│   │   │   ├── cs-requests/
│   │   │   ├── onboarding/
│   │   │   ├── pipeline/
│   │   │   └── reporting/
│   │   ├── deed-of-variation/
│   │   │   └── [presaleId]/
│   │   ├── door-to-door-reporting/
│   │   │   └── page.tsx
│   │   ├── eoi/
│   │   │   └── [token]/
│   │   ├── fact-sheet/
│   │   │   └── [token]/
│   │   ├── field-activity-report/
│   │   │   └── page.tsx
│   │   ├── field-sales/
│   │   │   ├── schedules/
│   │   │   └── page.tsx
│   │   ├── franchisee-home/
│   │   │   └── page.tsx
│   │   ├── franchisee-im/
│   │   │   └── [token]/
│   │   ├── franchisee-lead-verification/
│   │   │   └── page.tsx
│   │   ├── franchisee-leads/
│   │   │   └── page.tsx
│   │   ├── hotel-leads/
│   │   │   └── page.tsx
│   │   ├── inbound-leads/
│   │   │   └── page.tsx
│   │   ├── inbound-reporting/
│   │   │   └── page.tsx
│   │   ├── leads/
│   │   │   ├── [id]/
│   │   │   ├── archive/
│   │   │   ├── map/
│   │   │   ├── new/
│   │   │   ├── suppressions/
│   │   │   └── page.tsx
│   │   ├── localmile-registration/
│   │   │   └── [token]/
│   │   ├── lost-customers/
│   │   │   └── page.tsx
│   │   ├── lpo-leads/
│   │   │   ├── [id]/
│   │   │   └── page.tsx
│   │   ├── lpo-opportunities/
│   │   │   └── page.tsx
│   │   ├── lpo-opportunity/
│   │   │   ├── [id]/
│   │   │   └── lpo-opportunity-client.tsx
│   │   ├── lpo-reporting/
│   │   │   └── page.tsx
│   │   ├── marketing-analytics/
│   │   │   └── page.tsx
│   │   ├── multisite-reporting/
│   │   │   └── page.tsx
│   │   ├── multisites/
│   │   │   └── page.tsx
│   │   ├── my-franchise/
│   │   │   └── page.tsx
│   │   ├── operations/
│   │   │   ├── franchise-prospects/
│   │   │   └── training-appointments/
│   │   ├── outbound-dialer-performance/
│   │   │   └── page.tsx
│   │   ├── prospecting-areas/
│   │   │   └── page.tsx
│   │   ├── reports/
│   │   │   └── page.tsx
│   │   ├── reset-password/
│   │   │   └── page.tsx
│   │   ├── sales-snapshot/
│   │   │   └── page.tsx
│   │   ├── saved-routes/
│   │   │   └── page.tsx
│   │   ├── scans/
│   │   │   ├── report/
│   │   │   ├── top-users/
│   │   │   └── page.tsx
│   │   ├── scf/
│   │   │   └── [scfId]/
│   │   ├── sign/
│   │   │   ├── disclosure/
│   │   │   ├── franchise-agreement/
│   │   │   └── request-for-docs/
│   │   ├── signed-customers/
│   │   │   └── page.tsx
│   │   ├── signin/
│   │   │   └── page.tsx
│   │   ├── sof/
│   │   │   └── [id]/
│   │   ├── tasks/
│   │   │   └── page.tsx
│   │   ├── transcripts/
│   │   │   └── page.tsx
│   │   ├── unassigned_calls/
│   │   │   └── page.tsx
│   │   ├── unassigned-calls/
│   │   │   └── page.tsx
│   │   ├── unmatched-activities/
│   │   │   └── page.tsx
│   │   ├── visit-notes/
│   │   │   └── page.tsx
│   │   ├── app-layout.tsx
│   │   ├── favicon.ico
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/  # [Reusable UI component library]
│   │   ├── account-manager/
│   │   │   ├── am-queue-view.tsx
│   │   │   ├── am-reports-dashboard.tsx
│   │   │   ├── am-settings-dashboard.tsx
│   │   │   ├── calendar-settings-config.tsx
│   │   │   ├── lead-email-dialog.tsx
│   │   │   ├── lead-notes-dialog.tsx
│   │   │   ├── multisites-dashboard.tsx
│   │   │   └── pipeline-dashboard.tsx
│   │   ├── admin/
│   │   │   ├── activity-search-deletion.tsx
│   │   │   ├── am-leave-management.tsx
│   │   │   ├── bulk-account-manager-updater.tsx
│   │   │   ├── bulk-bucket-updater.tsx
│   │   │   ├── bulk-export-invoices.tsx
│   │   │   ├── bulk-export-leads.tsx
│   │   │   ├── bulk-import-invoices.tsx
│   │   │   ├── bulk-import-operators.tsx
│   │   │   ├── bulk-import-products.tsx
│   │   │   ├── bulk-import-services.tsx
│   │   │   ├── campaign-deletion.tsx
│   │   │   ├── cancellation-reasons-manager.tsx
│   │   │   ├── create-user-dialog.tsx
│   │   │   ├── daily-report-recipients.tsx
│   │   │   ├── data-deletion-table.tsx
│   │   │   ├── deed-of-variation-dialog.tsx
│   │   │   ├── dialer-assignment-date-updater.tsx
│   │   │   ├── financial-dashboard-client.tsx
│   │   │   ├── franchisee-directory-client.tsx
│   │   │   ├── franchisee-invoicing-client.tsx
│   │   │   ├── granular-deletion.tsx
│   │   │   ├── import-locations-client.tsx
│   │   │   ├── import-lpos-client.tsx
│   │   │   ├── lead-status-updater.tsx
│   │   │   ├── lifecycle-dashboard.tsx
│   │   │   ├── login-report.tsx
│   │   │   ├── lpo-lead-deletion.tsx
│   │   │   ├── operators-directory-client.tsx
│   │   │   ├── partner-locations-client.tsx
│   │   │   ├── send-notification-dialog.tsx
│   │   │   ├── suburb-mapping-client.tsx
│   │   │   ├── territory-map-client.tsx
│   │   │   ├── territory-presale-wizard.tsx
│   │   │   ├── ticket-deletion.tsx
│   │   │   ├── upload-agreement-dialog.tsx
│   │   │   └── user-management-table.tsx
│   │   ├── appointments/
│   │   │   └── page.tsx
│   │   ├── ask/
│   │   │   ├── ask-chart-view.tsx
│   │   │   ├── ask-chatbot.tsx
│   │   │   ├── ask-sidebar.tsx
│   │   │   ├── ask-training-dialog.tsx
│   │   │   ├── quick-task-dialog.tsx
│   │   │   ├── record-preview-drawer.tsx
│   │   │   ├── report-pdf-generator.ts
│   │   │   ├── results-view.tsx
│   │   │   └── terminology-panel.tsx
│   │   ├── capture-visit/
│   │   │   ├── field-discovery-step.tsx
│   │   │   └── summary-step.tsx
│   │   ├── check-in/
│   │   │   └── [leadId]/
│   │   ├── customer-success/
│   │   │   ├── book-onboarding-appointment-dialog.tsx
│   │   │   ├── cancellation-dashboard.tsx
│   │   │   ├── cancellation-reporting-client.tsx
│   │   │   ├── cs-requests-dashboard.tsx
│   │   │   ├── onboarding-requests-client.tsx
│   │   │   ├── organise-onboarding-dialog.tsx
│   │   │   ├── pipeline-dashboard.tsx
│   │   │   └── reporting-client.tsx
│   │   ├── field-sales/
│   │   │   └── page.tsx
│   │   ├── franchisee/
│   │   │   └── my-franchise-client.tsx
│   │   ├── journey-builder/
│   │   │   └── JourneyCanvas.tsx
│   │   ├── lost-customers/
│   │   │   └── page.tsx
│   │   ├── marketing/
│   │   │   ├── allocate-bucket-dialog.tsx
│   │   │   ├── asset-library.tsx
│   │   │   ├── campaign-analytics 2.tsx
│   │   │   ├── campaign-analytics.tsx
│   │   │   ├── campaign-scheduler 2.tsx
│   │   │   ├── campaign-scheduler.tsx
│   │   │   ├── import-leads-client.tsx
│   │   │   ├── lead-campaigns-client.tsx
│   │   │   ├── lead-nurture-card.tsx
│   │   │   ├── marketing-lists-client.tsx
│   │   │   ├── move-to-nurture-dialog.tsx
│   │   │   ├── nurture-journeys.tsx
│   │   │   ├── outlook-settings 2.tsx
│   │   │   ├── outlook-settings.tsx
│   │   │   ├── sms-template-builder.tsx
│   │   │   ├── snippet-builder.tsx
│   │   │   ├── suppression-list.tsx
│   │   │   ├── template-builder 2.tsx
│   │   │   └── template-builder.tsx
│   │   ├── onboarding/
│   │   │   └── onboarding-provider.tsx
│   │   ├── operations/
│   │   │   ├── franchise-prospect-detail-client.tsx
│   │   │   └── franchise-prospects-client.tsx
│   │   ├── scans/
│   │   │   ├── contact-report-client.tsx
│   │   │   ├── scans-client.tsx
│   │   │   ├── scans-reporting-client.tsx
│   │   │   └── top-users-client.tsx
│   │   ├── signed-customers/
│   │   │   └── page.tsx
│   │   ├── sync/
│   │   │   └── sync-progress-widget.tsx
│   │   ├── tickets/
│   │   ├── ui/
│   │   │   ├── accordion.tsx
│   │   │   ├── alert-dialog.tsx
│   │   │   ├── alert.tsx
│   │   │   ├── animated-number.tsx
│   │   │   ├── animated-stat-card.tsx
│   │   │   ├── avatar.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── button.tsx
│   │   │   ├── calendar.tsx
│   │   │   ├── card.tsx
│   │   │   ├── carousel.tsx
│   │   │   ├── chart.tsx
│   │   │   ├── checkbox.tsx
│   │   │   ├── collapsible.tsx
│   │   │   ├── command.tsx
│   │   │   ├── copy-button.tsx
│   │   │   ├── custom-bulk-select-control.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── email-verification-badge.tsx
│   │   │   ├── form.tsx
│   │   │   ├── input.tsx
│   │   │   ├── label.tsx
│   │   │   ├── loader.tsx
│   │   │   ├── menubar.tsx
│   │   │   ├── multi-select-combobox.tsx
│   │   │   ├── open-tracking-tips.tsx
│   │   │   ├── percentage-loader.tsx
│   │   │   ├── popover.tsx
│   │   │   ├── progress.tsx
│   │   │   ├── pulse-badge.tsx
│   │   │   ├── radio-group.tsx
│   │   │   ├── rich-text-editor.tsx
│   │   │   ├── scroll-area.tsx
│   │   │   ├── select.tsx
│   │   │   ├── separator.tsx
│   │   │   ├── sheet.tsx
│   │   │   ├── sidebar.tsx
│   │   │   ├── skeleton.tsx
│   │   │   ├── slider.tsx
│   │   │   ├── switch.tsx
│   │   │   ├── table.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── textarea.tsx
│   │   │   ├── toast.tsx
│   │   │   ├── toaster.tsx
│   │   │   ├── tooltip.tsx
│   │   │   ├── visual-iframe-editor.tsx
│   │   │   └── visually-hidden.tsx
│   │   ├── access-denied.tsx
│   │   ├── add-contact-form.tsx
│   │   ├── address-autocomplete.tsx
│   │   ├── ai-email-copilot.tsx
│   │   ├── ai-thinking-wave.tsx
│   │   ├── appointment-status-badge.tsx
│   │   ├── archived-leads-client.tsx
│   │   ├── bucket-breakdown-bar.tsx
│   │   ├── call-attempt-badge.tsx
│   │   ├── call-notification-listener.tsx
│   │   ├── calls-client.tsx
│   │   ├── cancel-customer-dialog.tsx
│   │   ├── check-ins-client.tsx
│   │   ├── closest-auspost-banner.tsx
│   │   ├── cold-call-scorecard.tsx
│   │   ├── command-palette.tsx
│   │   ├── company-profile.tsx
│   │   ├── company-scan-metrics.tsx
│   │   ├── daily-area-log-dialog.tsx
│   │   ├── dashback-email-dialog.tsx
│   │   ├── dialer-insights-dialog.tsx
│   │   ├── discover-multisites-dialog.tsx
│   │   ├── discovery-questions-form.tsx
│   │   ├── discovery-radar-chart.tsx
│   │   ├── edit-address-dialog.tsx
│   │   ├── edit-contact-form.tsx
│   │   ├── edit-lead-form.tsx
│   │   ├── edit-note-dialog.tsx
│   │   ├── edit-postal-address-dialog.tsx
│   │   ├── edit-task-dialog.tsx
│   │   ├── email-dialog.tsx
│   │   ├── enter-multisite-lead-dialog.tsx
│   │   ├── executive-dashboard-client.tsx
│   │   ├── franchisee-home-client.tsx
│   │   ├── franchisee-lead-verification-client.tsx
│   │   ├── franchisee-leads-client.tsx
│   │   ├── franchisee-switcher.tsx
│   │   ├── google-address-input.tsx
│   │   ├── inbound-reports-client.tsx
│   │   ├── invoice-details-dialog.tsx
│   │   ├── lead-products.tsx
│   │   ├── lead-profile.tsx
│   │   ├── lead-status-badge.tsx
│   │   ├── leads-client.tsx
│   │   ├── leads-map-client.tsx
│   │   ├── localmile-access-dialog.tsx
│   │   ├── log-note-dialog.tsx
│   │   ├── loss-reason-picker.tsx
│   │   ├── lpo-conversion-wizard.tsx
│   │   ├── lpo-lead-profile.tsx
│   │   ├── lpo-reporting-client.tsx
│   │   ├── manage-additional-addresses-dialog.tsx
│   │   ├── manage-services-dialog.tsx
│   │   ├── map-modal.tsx
│   │   ├── move-lead-dialog.tsx
│   │   ├── multi-site-manager.tsx
│   │   ├── multisite-reporting-client.tsx
│   │   ├── new-lead-form.tsx
│   │   ├── notification-center.tsx
│   │   ├── notify-upsell-dialog.tsx
│   │   ├── outlook-settings.tsx
│   │   ├── performance-timer.tsx
│   │   ├── post-call-outcome-dialog.tsx
│   │   ├── posthog-reporting-client.tsx
│   │   ├── prev-month-cohort-widget.tsx
│   │   ├── product-quote-dialog.tsx
│   │   ├── quick-add-lead-dialog.tsx
│   │   ├── reports-client.tsx
│   │   ├── request-address-change-dialog.tsx
│   │   ├── request-assignment-dialog.tsx
│   │   ├── resolve-pending-items-modal.tsx
│   │   ├── revisit-dialog.tsx
│   │   ├── sales-snapshot-client.tsx
│   │   ├── schedule-appointment-dialog.tsx
│   │   ├── score-indicator.tsx
│   │   ├── service-selection-dialog.tsx
│   │   ├── share-opportunity-dialog.tsx
│   │   ├── shipmate-access-dialog.tsx
│   │   ├── sms-dialog.tsx
│   │   ├── standing-order-form.tsx
│   │   ├── status-breakdown-bar.tsx
│   │   ├── status-outcome-guide.tsx
│   │   ├── status-outcome-info.tsx
│   │   ├── task-reminder-bell.tsx
│   │   ├── tasks-client.tsx
│   │   ├── training-appointments-client.tsx
│   │   ├── transcript-viewer.tsx
│   │   ├── unassigned-call-dialog.tsx
│   │   ├── universal-search.tsx
│   │   ├── visit-note-processor-dialog.tsx
│   │   └── visit-notes-client.tsx
│   ├── hooks/  # [Custom React hooks]
│   │   ├── use-auth.tsx
│   │   ├── use-debounce.ts
│   │   ├── use-dialing-session.tsx
│   │   ├── use-google-maps.ts
│   │   ├── use-loading.tsx
│   │   ├── use-mobile.tsx
│   │   ├── use-performance.tsx
│   │   ├── use-permissions.tsx
│   │   ├── use-speech-input.ts
│   │   ├── use-toast.ts
│   │   └── useDynamicRouting.ts
│   ├── lib/  # [Internal library and client modules]
│   │   ├── account-manager/
│   │   │   ├── compute-am-priority.test.ts
│   │   │   └── compute-am-priority.ts
│   │   ├── ask/
│   │   │   └── query-spec.ts
│   │   ├── search/
│   │   │   ├── search-service.ts
│   │   │   └── search-utils.ts
│   │   ├── australian-holidays.ts
│   │   ├── bank-utils.ts
│   │   ├── cancellation-email.ts
│   │   ├── cancellation-invoice-helper.ts
│   │   ├── cancellation-reasons-mapper.ts
│   │   ├── checkin-scoring.ts
│   │   ├── confetti.ts
│   │   ├── constants.ts
│   │   ├── contact-utils.ts
│   │   ├── discovery-constants.ts
│   │   ├── discovery-scoring.ts
│   │   ├── duplicate-detector.test.ts
│   │   ├── duplicate-detector.ts
│   │   ├── email-dispatcher.ts
│   │   ├── firebase-admin.ts
│   │   ├── firebase.ts
│   │   ├── franchisee-schema.ts
│   │   ├── franchisee-user-service.ts
│   │   ├── lead-lookup.ts
│   │   ├── lead-permissions.ts
│   │   ├── lead-stage-analytics.ts
│   │   ├── leave-utils.ts
│   │   ├── localmile-db.ts
│   │   ├── localmile-security.ts
│   │   ├── localmile-utils.ts
│   │   ├── lodgement-helpers.ts
│   │   ├── lpo-connect-db.ts
│   │   ├── mrr-realization.ts
│   │   ├── mrr.ts
│   │   ├── onboarding-scripts.ts
│   │   ├── presale-token.ts
│   │   ├── presale-types.ts
│   │   ├── pricing-helpers.ts
│   │   ├── prospect-plus-id.ts
│   │   ├── status-colors.ts
│   │   ├── status-outcome-mapping.ts
│   │   ├── template-replacer.ts
│   │   ├── territory-export.ts
│   │   ├── ticket-schema.ts
│   │   ├── types.ts
│   │   ├── utils.test.ts
│   │   ├── utils.ts
│   │   ├── verify-email-client.ts
│   │   ├── welcome-email-template.ts
│   │   └── zee-gen-leads-service.ts
│   ├── scripts/  # [Build and automation scripts]
│   ├── services/  # [Service layer & external integrations]
│   │   ├── admin-approval.ts
│   │   ├── firebase-server.ts
│   │   ├── firebase.ts
│   │   ├── lead-campaigns.ts
│   │   ├── localmile-deactivation.ts
│   │   ├── localmile-recredit-action.ts
│   │   ├── localmile-sync-server.ts
│   │   ├── LocationService.ts
│   │   ├── lpo-account-manager-service.ts
│   │   ├── lpo-cancellation-cascade-server.ts
│   │   ├── lpo-plus-service.ts
│   │   ├── marketing-brain.ts
│   │   ├── mass-link-service.ts
│   │   ├── microsoft-graph.ts
│   │   ├── netsuite-deployment-proxy.ts
│   │   ├── netsuite-field-sales-proxy.ts
│   │   ├── netsuite-localmile-proxy.ts
│   │   ├── netsuite-mpproducts-proxy.ts
│   │   ├── netsuite-schedule-proxy.ts
│   │   ├── netsuite-services-proxy.ts
│   │   ├── netsuite-signup-proxy.ts
│   │   ├── netsuite-upsell-proxy.ts
│   │   ├── netsuite-visit-note-proxy.ts
│   │   ├── netsuite.ts
│   │   ├── onboarding-service.ts
│   │   ├── parent-lead-conversion.ts
│   │   ├── rekey-lead.ts
│   │   ├── scheduled-service-transition.ts
│   │   └── sms-service.ts
│   ├── stories/
│   │   ├── assets/
│   │   │   ├── accessibility.png
│   │   │   ├── accessibility.svg
│   │   │   ├── addon-library.png
│   │   │   ├── assets.png
│   │   │   ├── avif-test-image.avif
│   │   │   ├── context.png
│   │   │   ├── discord.svg
│   │   │   ├── docs.png
│   │   │   ├── figma-plugin.png
│   │   │   ├── github.svg
│   │   │   ├── share.png
│   │   │   ├── styling.png
│   │   │   ├── testing.png
│   │   │   ├── theming.png
│   │   │   ├── tutorials.svg
│   │   │   └── youtube.svg
│   │   ├── button.css
│   │   ├── Button.stories.ts
│   │   ├── Button.tsx
│   │   ├── Configure.mdx
│   │   ├── header.css
│   │   ├── Header.stories.ts
│   │   ├── Header.tsx
│   │   ├── page.css
│   │   ├── Page.stories.ts
│   │   └── Page.tsx
│   └── .DS_Store
├── Zee sales process/
│   ├── Confidentiality Deed_Mail  Plus -.docx
│   ├── CONTRACT OF SALE OF BUSINESS - SAMPLE.docx
│   ├── Deed of variation Exit Program Assistance Offer 18 November 2021_AU_Active01_909812951_Trinh_MMCD.docx
│   ├── EOI -.docx
│   ├── FRA1745-Homebush.pdf
│   ├── Franchise  Brochure.pdf
│   ├── Franchise Sale Options for Franchisees.docx
│   ├── Franchisee IM Waterloo Alexandria.docx
│   ├── Mail Plus Key Fact Sheet for new Buyers.docx
│   ├── Mail Plus Key Fact Sheet for new Buyers.docx.zip
│   └── Request for Docs - New Template Legal Instructions_Arncliffe_MMCD_16062026.docx
├── .DS_Store
├── .env.local
├── .firebaserc
├── .gitignore
├── apphosting.yaml
├── check_date.js
├── check_lead.js
├── check-franchisees.ts
├── check-leads.ts
├── components.json
├── docupulse.config.json
├── firebase.json
├── firestore.indexes.json
├── firestore.rules
├── fix_permissions.py
├── next-env.d.ts
├── next.config.js
├── package.json
├── postcss.config.mjs
├── query_leads.js
├── README.md
├── replace_kpi.js
├── replace_render.js
├── scratch-test.js
├── scratch.js
├── scratch.py
├── storybook_ai_setup.txt
├── tailwind.config.ts
├── test-admin.js
├── test-franchisee.ts
├── test-lead.ts
├── test-leads.ts
├── test-user.ts
├── tsconfig.json
├── tsconfig.tsbuildinfo
├── vitest.config.ts
└── vitest.shims.d.ts
```

---
*Generated automatically by [DocuPulse](https://github.com/docupulse/docupulse)*
