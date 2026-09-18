# REST API & Route Reference

Total Detected Endpoints: **195**

## Endpoint Directory

| Method | Path | Handler | Location |
| :--- | :--- | :--- | :--- |
| **`GET`** | `/api/abn-lookup` | `GET` | `abn-lookup/route.ts:17` |
| **`GET`** | `/api/account-lookup` | `GET` | `account-lookup/route.ts:79` |
| **`GET`** | `/api/admin/admin-approval` | `GET` | `admin-approval/route.ts:8` |
| **`GET`** | `/api/admin/assign-lpo-account-manager` | `GET` | `assign-lpo-account-manager/route.ts:4` |
| **`POST`** | `/api/admin/assign-lpo-account-manager` | `POST` | `assign-lpo-account-manager/route.ts:17` |
| **`GET`** | `/api/admin/outbound-reporting` | `GET` | `outbound-reporting/route.ts:86` |
| **`POST`** | `/api/admin/scans/send-test-calls-report` | `POST` | `send-test-calls-report/route.ts:25` |
| **`POST`** | `/api/admin/scans/send-test-franchisee-leads-report` | `POST` | `send-test-franchisee-leads-report/route.ts:26` |
| **`POST`** | `/api/admin/scans/send-test-leads-report` | `POST` | `send-test-leads-report/route.ts:9` |
| **`POST`** | `/api/admin/scans/send-test-localmile-jobs-report` | `POST` | `send-test-localmile-jobs-report/route.ts:19` |
| **`POST`** | `/api/admin/scans/send-test-overdue-hot-leads-report` | `POST` | `send-test-overdue-hot-leads-report/route.ts:120` |
| **`POST`** | `/api/admin/scans/send-test-report` | `POST` | `send-test-report/route.ts:8` |
| **`POST`** | `/api/admin/scans/send-test-sales-snapshot-report` | `POST` | `send-test-sales-snapshot-report/route.ts:21` |
| **`POST`** | `/api/admin/scans/send-test-tickets-report` | `POST` | `send-test-tickets-report/route.ts:9` |
| **`POST`** | `/api/admin/scans/send-test-zee-gen-auto-response` | `POST` | `send-test-zee-gen-auto-response/route.ts:6` |
| **`POST`** | `/api/admin/services/bulk-import` | `POST` | `bulk-import/route.ts:48` |
| **`POST`** | `/api/admin/transfer-franchisee-ownership` | `POST` | `transfer-franchisee-ownership/route.ts:5` |
| **`POST`** | `/api/admin/users/delete` | `POST` | `delete/route.ts:5` |
| **`POST`** | `/api/admin/users/reset-password-direct` | `POST` | `reset-password-direct/route.ts:6` |
| **`POST`** | `/api/admin/users/send-password-reset` | `POST` | `send-password-reset/route.ts:5` |
| **`POST`** | `/api/admin/users/unlink-franchisee` | `POST` | `unlink-franchisee/route.ts:6` |
| **`POST`** | `/api/aircall/webhook/:secret` | `POST` | `[secret]/route.ts:20` |
| **`POST`** | `/api/aircall/webhook` | `POST` | `webhook/route.ts:15` |
| **`GET`** | `/api/ask/chats` | `GET` | `chats/route.ts:23` |
| **`POST`** | `/api/ask/chats` | `POST` | `chats/route.ts:66` |
| **`PATCH`** | `/api/ask/chats` | `PATCH` | `chats/route.ts:103` |
| **`DELETE`** | `/api/ask/chats` | `DELETE` | `chats/route.ts:129` |
| **`POST`** | `/api/ask/quick-task` | `POST` | `quick-task/route.ts:10` |
| **`POST`** | `/api/ask` | `POST` | `ask/route.ts:124` |
| **`GET`** | `/api/ask/training` | `GET` | `training/route.ts:23` |
| **`POST`** | `/api/ask/training` | `POST` | `training/route.ts:55` |
| **`GET`** | `/api/calendar/availability` | `GET` | `availability/route.ts:10` |
| **`POST`** | `/api/calendar/book` | `POST` | `book/route.ts:12` |
| **`POST`** | `/api/calendar/book-training` | `POST` | `book-training/route.ts:9` |
| **`POST`** | `/api/calendar/booking-link` | `POST` | `booking-link/route.ts:9` |
| **`POST`** | `/api/calendar/cancel` | `POST` | `cancel/route.ts:8` |
| **`POST`** | `/api/calendar/cancel-appointment` | `POST` | `cancel-appointment/route.ts:9` |
| **`GET`** | `/api/calendar/training-reminders` | `GET` | `training-reminders/route.ts:8` |
| **`POST`** | `/api/calendar/update-training-status` | `POST` | `update-training-status/route.ts:6` |
| **`POST`** | `/api/campaigns/send` | `POST` | `send/route.ts:12` |
| **`POST`** | `/api/campaigns/send 2` | `POST` | `send 2/route.ts:7` |
| **`POST`** | `/api/campaigns/send-custom-email` | `POST` | `send-custom-email/route.ts:8` |
| **`POST`** | `/api/campaigns/send-custom-sms` | `POST` | `send-custom-sms/route.ts:9` |
| **`POST`** | `/api/campaigns/send-direct` | `POST` | `send-direct/route.ts:12` |
| **`POST`** | `/api/campaigns/send-sms` | `POST` | `send-sms/route.ts:10` |
| **`POST`** | `/api/campaigns/test-connection` | `POST` | `test-connection/route.ts:4` |
| **`POST`** | `/api/campaigns/test-connection 2` | `POST` | `test-connection 2/route.ts:3` |
| **`GET`** | `/api/campaigns/track/click` | `GET` | `click/route.ts:8` |
| **`GET`** | `/api/campaigns/track/open` | `GET` | `open/route.ts:14` |
| **`GET`** | `/api/campaigns/track/unsubscribe` | `GET` | `unsubscribe/route.ts:7` |
| **`GET`** | `/api/campaigns/track 2/click` | `GET` | `click/route.ts:7` |
| **`GET`** | `/api/campaigns/track 2/open` | `GET` | `open/route.ts:13` |
| **`GET`** | `/api/campaigns/track 2/unsubscribe` | `GET` | `unsubscribe/route.ts:7` |
| **`POST`** | `/api/cancellations/ai-summary` | `POST` | `ai-summary/route.ts:5` |
| **`POST`** | `/api/cancellations` | `POST` | `cancellations/route.ts:28` |
| **`POST`** | `/api/companies/:id/addresses` | `POST` | `addresses/route.ts:8` |
| **`GET`** | `/api/companies/:id/exists` | `GET` | `exists/route.ts:9` |
| **`GET`** | `/api/companies/:id/invoices/:invoiceId/exists` | `GET` | `exists/route.ts:9` |
| **`POST`** | `/api/companies/:id/invoices/:invoiceId` | `POST` | `[invoiceId]/route.ts:149` |
| **`PATCH`** | `/api/companies/:id/invoices/:invoiceId` | `PATCH` | `[invoiceId]/route.ts:153` |
| **`PUT`** | `/api/companies/:id/invoices/:invoiceId` | `PUT` | `[invoiceId]/route.ts:157` |
| **`GET`** | `/api/companies/:id/invoices/exists` | `GET` | `exists/route.ts:9` |
| **`POST`** | `/api/companies/:id/invoices` | `POST` | `invoices/route.ts:9` |
| **`PUT`** | `/api/companies/:id/invoices` | `PUT` | `invoices/route.ts:123` |
| **`PATCH`** | `/api/companies/:id/invoices` | `PATCH` | `invoices/route.ts:127` |
| **`PATCH`** | `/api/companies/:id/lost` | `PATCH` | `lost/route.ts:9` |
| **`POST`** | `/api/companies/:id/lost` | `POST` | `lost/route.ts:172` |
| **`GET`** | `/api/companies/:id/packages` | `GET` | `packages/route.ts:7` |
| **`POST`** | `/api/companies/:id/services` | `POST` | `services/route.ts:277` |
| **`PUT`** | `/api/companies/:id/services` | `PUT` | `services/route.ts:285` |
| **`PATCH`** | `/api/companies/:id/services` | `PATCH` | `services/route.ts:293` |
| **`POST`** | `/api/companies/cancel-cascade` | `POST` | `cancel-cascade/route.ts:4` |
| **`GET`** | `/api/companies/check` | `GET` | `check/route.ts:9` |
| **`GET`** | `/api/companies/exists` | `GET` | `exists/route.ts:9` |
| **`POST`** | `/api/companies/services` | `POST` | `services/route.ts:29` |
| **`PUT`** | `/api/companies/services` | `PUT` | `services/route.ts:33` |
| **`PATCH`** | `/api/companies/services` | `PATCH` | `services/route.ts:37` |
| **`OPTIONS`** | `/api/confidentiality-deed/sign` | `OPTIONS` | `sign/route.ts:17` |
| **`GET`** | `/api/confidentiality-deed/sign` | `GET` | `sign/route.ts:21` |
| **`POST`** | `/api/confidentiality-deed/sign` | `POST` | `sign/route.ts:75` |
| **`PATCH`** | `/api/contacts/:id` | `PATCH` | `[id]/route.ts:61` |
| **`POST`** | `/api/contacts/check-shipmate-access` | `POST` | `check-shipmate-access/route.ts:7` |
| **`POST`** | `/api/contacts` | `POST` | `contacts/route.ts:61` |
| **`PATCH`** | `/api/contacts` | `PATCH` | `contacts/route.ts:165` |
| **`POST`** | `/api/copilot/draft` | `POST` | `draft/route.ts:8` |
| **`POST`** | `/api/copilot/summary` | `POST` | `summary/route.ts:8` |
| **`GET`** | `/api/cron/process-scheduled-service-changes` | `GET` | `process-scheduled-service-changes/route.ts:6` |
| **`POST`** | `/api/cron/process-scheduled-service-changes` | `POST` | `process-scheduled-service-changes/route.ts:23` |
| **`POST`** | `/api/cs-requests` | `POST` | `cs-requests/route.ts:68` |
| **`POST`** | `/api/deed-of-variation/sign` | `POST` | `sign/route.ts:7` |
| **`POST`** | `/api/email/contact-am` | `POST` | `contact-am/route.ts:6` |
| **`POST`** | `/api/email/verify` | `POST` | `verify/route.ts:160` |
| **`OPTIONS`** | `/api/eoi/sign` | `OPTIONS` | `sign/route.ts:16` |
| **`GET`** | `/api/eoi/sign` | `GET` | `sign/route.ts:20` |
| **`POST`** | `/api/eoi/sign` | `POST` | `sign/route.ts:77` |
| **`OPTIONS`** | `/api/franchise-prospects/backdate-receipt` | `OPTIONS` | `backdate-receipt/route.ts:16` |
| **`POST`** | `/api/franchise-prospects/backdate-receipt` | `POST` | `backdate-receipt/route.ts:20` |
| **`POST`** | `/api/franchise-prospects/create` | `POST` | `create/route.ts:10` |
| **`OPTIONS`** | `/api/franchise-prospects/deposit` | `OPTIONS` | `deposit/route.ts:15` |
| **`POST`** | `/api/franchise-prospects/deposit` | `POST` | `deposit/route.ts:19` |
| **`OPTIONS`** | `/api/franchise-prospects/fact-sheet` | `OPTIONS` | `fact-sheet/route.ts:16` |
| **`GET`** | `/api/franchise-prospects/fact-sheet` | `GET` | `fact-sheet/route.ts:20` |
| **`POST`** | `/api/franchise-prospects/fact-sheet` | `POST` | `fact-sheet/route.ts:123` |
| **`OPTIONS`** | `/api/franchise-prospects/nab-confirm` | `OPTIONS` | `nab-confirm/route.ts:15` |
| **`POST`** | `/api/franchise-prospects/nab-confirm` | `POST` | `nab-confirm/route.ts:19` |
| **`POST`** | `/api/franchise-prospects/send-email` | `POST` | `send-email/route.ts:10` |
| **`POST`** | `/api/franchise-prospects/send-step-email` | `POST` | `send-step-email/route.ts:8` |
| **`OPTIONS`** | `/api/franchise-prospects/training` | `OPTIONS` | `training/route.ts:16` |
| **`POST`** | `/api/franchise-prospects/training` | `POST` | `training/route.ts:20` |
| **`POST`** | `/api/franchisee-im/sign` | `POST` | `sign/route.ts:5` |
| **`PATCH`** | `/api/franchisees/:internalId` | `PATCH` | `[internalId]/route.ts:7` |
| **`DELETE`** | `/api/franchisees/:internalId` | `DELETE` | `[internalId]/route.ts:107` |
| **`POST`** | `/api/franchisees/:internalId/upload-agreement` | `POST` | `upload-agreement/route.ts:6` |
| **`POST`** | `/api/franchisees/ingest` | `POST` | `ingest/route.ts:7` |
| **`GET`** | `/api/franchisees/presales` | `GET` | `presales/route.ts:269` |
| **`POST`** | `/api/franchisees/presales` | `POST` | `presales/route.ts:448` |
| **`POST`** | `/api/franchisees/presales/send-deed-email` | `POST` | `send-deed-email/route.ts:6` |
| **`POST`** | `/api/franchisees/presales/send-im-email` | `POST` | `send-im-email/route.ts:6` |
| **`POST`** | `/api/franchisees` | `POST` | `franchisees/route.ts:7` |
| **`POST`** | `/api/franchisees/sync` | `POST` | `sync/route.ts:4` |
| **`GET`** | `/api/integrations/microsoft/auth` | `GET` | `auth/route.ts:4` |
| **`GET`** | `/api/integrations/microsoft/callback` | `GET` | `callback/route.ts:6` |
| **`GET`** | `/api/integrations/microsoft/webhook` | `GET` | `webhook/route.ts:8` |
| **`POST`** | `/api/integrations/microsoft/webhook` | `POST` | `webhook/route.ts:19` |
| **`POST`** | `/api/integrations/netsuite/send-email` | `POST` | `send-email/route.ts:5` |
| **`POST`** | `/api/leads/:id/addresses` | `POST` | `addresses/route.ts:8` |
| **`PATCH`** | `/api/leads/:id` | `PATCH` | `[id]/route.ts:44` |
| **`GET`** | `/api/leads/check` | `GET` | `check/route.ts:8` |
| **`POST`** | `/api/leads/child` | `POST` | `child/route.ts:28` |
| **`POST`** | `/api/leads/parent` | `POST` | `parent/route.ts:29` |
| **`POST`** | `/api/leads` | `POST` | `leads/route.ts:49` |
| **`POST`** | `/api/localmile/deactivate-account` | `POST` | `deactivate-account/route.ts:3` |
| **`POST`** | `/api/localmile/jobs` | `POST` | `jobs/route.ts:8` |
| **`GET`** | `/api/localmile/message-operator` | `GET` | `message-operator/route.ts:64` |
| **`POST`** | `/api/localmile/message-operator` | `POST` | `message-operator/route.ts:97` |
| **`POST`** | `/api/localmile/resend-auth` | `POST` | `resend-auth/route.ts:4` |
| **`GET`** | `/api/localmile/scheduled-jobs/depot-lodgements` | `GET` | `depot-lodgements/route.ts:8` |
| **`POST`** | `/api/localmile/scheduled-jobs` | `POST` | `scheduled-jobs/route.ts:4` |
| **`POST`** | `/api/localmile/trial-nudge/process` | `POST` | `process/route.ts:8` |
| **`GET`** | `/api/localmile-registration/:token` | `GET` | `[token]/route.ts:12` |
| **`POST`** | `/api/localmile-registration/:token` | `POST` | `[token]/route.ts:94` |
| **`GET`** | `/api/lpo/:id` | `GET` | `[id]/route.ts:3` |
| **`POST`** | `/api/lpo-leads/bulk-import` | `POST` | `bulk-import/route.ts:6` |
| **`POST`** | `/api/lpo-leads/mark-lost` | `POST` | `mark-lost/route.ts:5` |
| **`POST`** | `/api/lpo-leads` | `POST` | `lpo-leads/route.ts:24` |
| **`POST`** | `/api/lpo-leads/sync-portal-status` | `POST` | `sync-portal-status/route.ts:6` |
| **`POST`** | `/api/lpo-opportunities/share-email` | `POST` | `share-email/route.ts:6` |
| **`POST`** | `/api/lpo-opportunity/:id/action` | `POST` | `action/route.ts:6` |
| **`POST`** | `/api/lpo-plus/provision` | `POST` | `provision/route.ts:6` |
| **`POST`** | `/api/lpo-plus/reset-password` | `POST` | `reset-password/route.ts:6` |
| **`POST`** | `/api/lpo-plus/sync-territory` | `POST` | `sync-territory/route.ts:6` |
| **`GET`** | `/api/lpo-reporting` | `GET` | `lpo-reporting/route.ts:8` |
| **`POST`** | `/api/notifications/email` | `POST` | `email/route.ts:5` |
| **`GET`** | `/api/nurture/action-trigger` | `GET` | `action-trigger/route.ts:7` |
| **`POST`** | `/api/nurture/process` | `POST` | `process/route.ts:32` |
| **`GET`** | `/api/nurture/report` | `GET` | `report/route.ts:7` |
| **`POST`** | `/api/onboarding-requests/notify-email` | `POST` | `notify-email/route.ts:8` |
| **`PUT`** | `/api/operators/:internalId` | `PUT` | `[internalId]/route.ts:6` |
| **`DELETE`** | `/api/operators/:internalId` | `DELETE` | `[internalId]/route.ts:58` |
| **`POST`** | `/api/operators/ingest` | `POST` | `ingest/route.ts:6` |
| **`POST`** | `/api/operators` | `POST` | `operators/route.ts:6` |
| **`GET`** | `/api/packages/lookup` | `GET` | `lookup/route.ts:28` |
| **`OPTIONS`** | `/api/public/become-a-franchisee` | `OPTIONS` | `become-a-franchisee/route.ts:15` |
| **`POST`** | `/api/public/become-a-franchisee` | `POST` | `become-a-franchisee/route.ts:19` |
| **`GET`** | `/api/public/company/:id` | `GET` | `[id]/route.ts:4` |
| **`GET`** | `/api/scans/report` | `GET` | `report/route.ts:194` |
| **`GET`** | `/api/scans/top-users` | `GET` | `top-users/route.ts:91` |
| **`POST`** | `/api/scf/generate-quote-preview` | `POST` | `generate-quote-preview/route.ts:8` |
| **`POST`** | `/api/scf/send-quote` | `POST` | `send-quote/route.ts:24` |
| **`GET`** | `/api/search` | `GET` | `search/route.ts:8` |
| **`POST`** | `/api/shipmate/jobs` | `POST` | `jobs/route.ts:8` |
| **`GET`** | `/api/shipmate/jobs` | `GET` | `jobs/route.ts:138` |
| **`OPTIONS`** | `/api/sign/disclosure` | `OPTIONS` | `disclosure/route.ts:17` |
| **`GET`** | `/api/sign/disclosure` | `GET` | `disclosure/route.ts:21` |
| **`POST`** | `/api/sign/disclosure` | `POST` | `disclosure/route.ts:85` |
| **`OPTIONS`** | `/api/sign/franchise-agreement` | `OPTIONS` | `franchise-agreement/route.ts:17` |
| **`GET`** | `/api/sign/franchise-agreement` | `GET` | `franchise-agreement/route.ts:21` |
| **`POST`** | `/api/sign/franchise-agreement` | `POST` | `franchise-agreement/route.ts:110` |
| **`OPTIONS`** | `/api/sign/request-for-docs` | `OPTIONS` | `request-for-docs/route.ts:16` |
| **`GET`** | `/api/sign/request-for-docs` | `GET` | `request-for-docs/route.ts:20` |
| **`POST`** | `/api/sign/request-for-docs` | `POST` | `request-for-docs/route.ts:131` |
| **`POST`** | `/api/sof/sign` | `POST` | `sign/route.ts:5` |
| **`GET`** | `/api/surcharge` | `GET` | `surcharge/route.ts:3` |
| **`POST`** | `/api/tasks/outlook-sync` | `POST` | `outlook-sync/route.ts:8` |
| **`POST`** | `/api/templates/generate-preview` | `POST` | `generate-preview/route.ts:8` |
| **`GET`** | `/api/territory/boundary` | `GET` | `boundary/route.ts:133` |
| **`POST`** | `/api/territory/boundary` | `POST` | `boundary/route.ts:216` |
| **`POST`** | `/api/territory/check` | `POST` | `check/route.ts:67` |
| **`POST`** | `/api/tickets/missed-sweep` | `POST` | `missed-sweep/route.ts:8` |
| **`OPTIONS`** | `/api/tickets` | `OPTIONS` | `tickets/route.ts:16` |
| **`POST`** | `/api/tickets` | `POST` | `tickets/route.ts:23` |
| **`GET`** | `/api/tracking/email-click` | `GET` | `email-click/route.ts:5` |
| **`GET`** | `/api/tracking/email-open` | `GET` | `email-open/route.ts:5` |
| **`GET`** | `/api/tracking` | `GET` | `tracking/route.ts:5` |
| **`GET`** | `/api/users/check` | `GET` | `check/route.ts:4` |

---

## Endpoint Specifications

### `GET` /api/abn-lookup

> Next.js App Router GET handler for /api/abn-lookup

- **Handler Function:** `GET`
- **Source File:** `abn-lookup/route.ts:17`

---

### `GET` /api/account-lookup

> Next.js App Router GET handler for /api/account-lookup

- **Handler Function:** `GET`
- **Source File:** `account-lookup/route.ts:79`

---

### `GET` /api/admin/admin-approval

> Next.js App Router GET handler for /api/admin/admin-approval

- **Handler Function:** `GET`
- **Source File:** `admin-approval/route.ts:8`

---

### `GET` /api/admin/assign-lpo-account-manager

> Next.js App Router GET handler for /api/admin/assign-lpo-account-manager

- **Handler Function:** `GET`
- **Source File:** `assign-lpo-account-manager/route.ts:4`

---

### `POST` /api/admin/assign-lpo-account-manager

> Next.js App Router POST handler for /api/admin/assign-lpo-account-manager

- **Handler Function:** `POST`
- **Source File:** `assign-lpo-account-manager/route.ts:17`

---

### `GET` /api/admin/outbound-reporting

> Next.js App Router GET handler for /api/admin/outbound-reporting

- **Handler Function:** `GET`
- **Source File:** `outbound-reporting/route.ts:86`

---

### `POST` /api/admin/scans/send-test-calls-report

> Next.js App Router POST handler for /api/admin/scans/send-test-calls-report

- **Handler Function:** `POST`
- **Source File:** `send-test-calls-report/route.ts:25`

---

### `POST` /api/admin/scans/send-test-franchisee-leads-report

> Next.js App Router POST handler for /api/admin/scans/send-test-franchisee-leads-report

- **Handler Function:** `POST`
- **Source File:** `send-test-franchisee-leads-report/route.ts:26`

---

### `POST` /api/admin/scans/send-test-leads-report

> Next.js App Router POST handler for /api/admin/scans/send-test-leads-report

- **Handler Function:** `POST`
- **Source File:** `send-test-leads-report/route.ts:9`

---

### `POST` /api/admin/scans/send-test-localmile-jobs-report

> Next.js App Router POST handler for /api/admin/scans/send-test-localmile-jobs-report

- **Handler Function:** `POST`
- **Source File:** `send-test-localmile-jobs-report/route.ts:19`

---

### `POST` /api/admin/scans/send-test-overdue-hot-leads-report

> Next.js App Router POST handler for /api/admin/scans/send-test-overdue-hot-leads-report

- **Handler Function:** `POST`
- **Source File:** `send-test-overdue-hot-leads-report/route.ts:120`

---

### `POST` /api/admin/scans/send-test-report

> Next.js App Router POST handler for /api/admin/scans/send-test-report

- **Handler Function:** `POST`
- **Source File:** `send-test-report/route.ts:8`

---

### `POST` /api/admin/scans/send-test-sales-snapshot-report

> Next.js App Router POST handler for /api/admin/scans/send-test-sales-snapshot-report

- **Handler Function:** `POST`
- **Source File:** `send-test-sales-snapshot-report/route.ts:21`

---

### `POST` /api/admin/scans/send-test-tickets-report

> Next.js App Router POST handler for /api/admin/scans/send-test-tickets-report

- **Handler Function:** `POST`
- **Source File:** `send-test-tickets-report/route.ts:9`

---

### `POST` /api/admin/scans/send-test-zee-gen-auto-response

> Next.js App Router POST handler for /api/admin/scans/send-test-zee-gen-auto-response

- **Handler Function:** `POST`
- **Source File:** `send-test-zee-gen-auto-response/route.ts:6`

---

### `POST` /api/admin/services/bulk-import

> Next.js App Router POST handler for /api/admin/services/bulk-import

- **Handler Function:** `POST`
- **Source File:** `bulk-import/route.ts:48`

---

### `POST` /api/admin/transfer-franchisee-ownership

> Next.js App Router POST handler for /api/admin/transfer-franchisee-ownership

- **Handler Function:** `POST`
- **Source File:** `transfer-franchisee-ownership/route.ts:5`

---

### `POST` /api/admin/users/delete

> Next.js App Router POST handler for /api/admin/users/delete

- **Handler Function:** `POST`
- **Source File:** `delete/route.ts:5`

---

### `POST` /api/admin/users/reset-password-direct

> Next.js App Router POST handler for /api/admin/users/reset-password-direct

- **Handler Function:** `POST`
- **Source File:** `reset-password-direct/route.ts:6`

---

### `POST` /api/admin/users/send-password-reset

> Next.js App Router POST handler for /api/admin/users/send-password-reset

- **Handler Function:** `POST`
- **Source File:** `send-password-reset/route.ts:5`

---

### `POST` /api/admin/users/unlink-franchisee

> Next.js App Router POST handler for /api/admin/users/unlink-franchisee

- **Handler Function:** `POST`
- **Source File:** `unlink-franchisee/route.ts:6`

---

### `POST` /api/aircall/webhook/:secret

> Next.js App Router POST handler for /api/aircall/webhook/:secret

- **Handler Function:** `POST`
- **Source File:** `[secret]/route.ts:20`

---

### `POST` /api/aircall/webhook

> Next.js App Router POST handler for /api/aircall/webhook

- **Handler Function:** `POST`
- **Source File:** `webhook/route.ts:15`

---

### `GET` /api/ask/chats

> Next.js App Router GET handler for /api/ask/chats

- **Handler Function:** `GET`
- **Source File:** `chats/route.ts:23`

---

### `POST` /api/ask/chats

> Next.js App Router POST handler for /api/ask/chats

- **Handler Function:** `POST`
- **Source File:** `chats/route.ts:66`

---

### `PATCH` /api/ask/chats

> Next.js App Router PATCH handler for /api/ask/chats

- **Handler Function:** `PATCH`
- **Source File:** `chats/route.ts:103`

---

### `DELETE` /api/ask/chats

> Next.js App Router DELETE handler for /api/ask/chats

- **Handler Function:** `DELETE`
- **Source File:** `chats/route.ts:129`

---

### `POST` /api/ask/quick-task

> Next.js App Router POST handler for /api/ask/quick-task

- **Handler Function:** `POST`
- **Source File:** `quick-task/route.ts:10`

---

### `POST` /api/ask

> Next.js App Router POST handler for /api/ask

- **Handler Function:** `POST`
- **Source File:** `ask/route.ts:124`

---

### `GET` /api/ask/training

> Next.js App Router GET handler for /api/ask/training

- **Handler Function:** `GET`
- **Source File:** `training/route.ts:23`

---

### `POST` /api/ask/training

> Next.js App Router POST handler for /api/ask/training

- **Handler Function:** `POST`
- **Source File:** `training/route.ts:55`

---

### `GET` /api/calendar/availability

> Next.js App Router GET handler for /api/calendar/availability

- **Handler Function:** `GET`
- **Source File:** `availability/route.ts:10`

---

### `POST` /api/calendar/book

> Next.js App Router POST handler for /api/calendar/book

- **Handler Function:** `POST`
- **Source File:** `book/route.ts:12`

---

### `POST` /api/calendar/book-training

> Next.js App Router POST handler for /api/calendar/book-training

- **Handler Function:** `POST`
- **Source File:** `book-training/route.ts:9`

---

### `POST` /api/calendar/booking-link

> Next.js App Router POST handler for /api/calendar/booking-link

- **Handler Function:** `POST`
- **Source File:** `booking-link/route.ts:9`

---

### `POST` /api/calendar/cancel

> Next.js App Router POST handler for /api/calendar/cancel

- **Handler Function:** `POST`
- **Source File:** `cancel/route.ts:8`

---

### `POST` /api/calendar/cancel-appointment

> Next.js App Router POST handler for /api/calendar/cancel-appointment

- **Handler Function:** `POST`
- **Source File:** `cancel-appointment/route.ts:9`

---

### `GET` /api/calendar/training-reminders

> Next.js App Router GET handler for /api/calendar/training-reminders

- **Handler Function:** `GET`
- **Source File:** `training-reminders/route.ts:8`

---

### `POST` /api/calendar/update-training-status

> Next.js App Router POST handler for /api/calendar/update-training-status

- **Handler Function:** `POST`
- **Source File:** `update-training-status/route.ts:6`

---

### `POST` /api/campaigns/send

> Next.js App Router POST handler for /api/campaigns/send

- **Handler Function:** `POST`
- **Source File:** `send/route.ts:12`

---

### `POST` /api/campaigns/send 2

> Next.js App Router POST handler for /api/campaigns/send 2

- **Handler Function:** `POST`
- **Source File:** `send 2/route.ts:7`

---

### `POST` /api/campaigns/send-custom-email

> Next.js App Router POST handler for /api/campaigns/send-custom-email

- **Handler Function:** `POST`
- **Source File:** `send-custom-email/route.ts:8`

---

### `POST` /api/campaigns/send-custom-sms

> Next.js App Router POST handler for /api/campaigns/send-custom-sms

- **Handler Function:** `POST`
- **Source File:** `send-custom-sms/route.ts:9`

---

### `POST` /api/campaigns/send-direct

> Next.js App Router POST handler for /api/campaigns/send-direct

- **Handler Function:** `POST`
- **Source File:** `send-direct/route.ts:12`

---

### `POST` /api/campaigns/send-sms

> Next.js App Router POST handler for /api/campaigns/send-sms

- **Handler Function:** `POST`
- **Source File:** `send-sms/route.ts:10`

---

### `POST` /api/campaigns/test-connection

> Next.js App Router POST handler for /api/campaigns/test-connection

- **Handler Function:** `POST`
- **Source File:** `test-connection/route.ts:4`

---

### `POST` /api/campaigns/test-connection 2

> Next.js App Router POST handler for /api/campaigns/test-connection 2

- **Handler Function:** `POST`
- **Source File:** `test-connection 2/route.ts:3`

---

### `GET` /api/campaigns/track/click

> Next.js App Router GET handler for /api/campaigns/track/click

- **Handler Function:** `GET`
- **Source File:** `click/route.ts:8`

---

### `GET` /api/campaigns/track/open

> Next.js App Router GET handler for /api/campaigns/track/open

- **Handler Function:** `GET`
- **Source File:** `open/route.ts:14`

---

### `GET` /api/campaigns/track/unsubscribe

> Next.js App Router GET handler for /api/campaigns/track/unsubscribe

- **Handler Function:** `GET`
- **Source File:** `unsubscribe/route.ts:7`

---

### `GET` /api/campaigns/track 2/click

> Next.js App Router GET handler for /api/campaigns/track 2/click

- **Handler Function:** `GET`
- **Source File:** `click/route.ts:7`

---

### `GET` /api/campaigns/track 2/open

> Next.js App Router GET handler for /api/campaigns/track 2/open

- **Handler Function:** `GET`
- **Source File:** `open/route.ts:13`

---

### `GET` /api/campaigns/track 2/unsubscribe

> Next.js App Router GET handler for /api/campaigns/track 2/unsubscribe

- **Handler Function:** `GET`
- **Source File:** `unsubscribe/route.ts:7`

---

### `POST` /api/cancellations/ai-summary

> Next.js App Router POST handler for /api/cancellations/ai-summary

- **Handler Function:** `POST`
- **Source File:** `ai-summary/route.ts:5`

---

### `POST` /api/cancellations

> Next.js App Router POST handler for /api/cancellations

- **Handler Function:** `POST`
- **Source File:** `cancellations/route.ts:28`

---

### `POST` /api/companies/:id/addresses

> Next.js App Router POST handler for /api/companies/:id/addresses

- **Handler Function:** `POST`
- **Source File:** `addresses/route.ts:8`

---

### `GET` /api/companies/:id/exists

> Next.js App Router GET handler for /api/companies/:id/exists

- **Handler Function:** `GET`
- **Source File:** `exists/route.ts:9`

---

### `GET` /api/companies/:id/invoices/:invoiceId/exists

> Next.js App Router GET handler for /api/companies/:id/invoices/:invoiceId/exists

- **Handler Function:** `GET`
- **Source File:** `exists/route.ts:9`

---

### `POST` /api/companies/:id/invoices/:invoiceId

> Next.js App Router POST handler for /api/companies/:id/invoices/:invoiceId

- **Handler Function:** `POST`
- **Source File:** `[invoiceId]/route.ts:149`

---

### `PATCH` /api/companies/:id/invoices/:invoiceId

> Next.js App Router PATCH handler for /api/companies/:id/invoices/:invoiceId

- **Handler Function:** `PATCH`
- **Source File:** `[invoiceId]/route.ts:153`

---

### `PUT` /api/companies/:id/invoices/:invoiceId

> Next.js App Router PUT handler for /api/companies/:id/invoices/:invoiceId

- **Handler Function:** `PUT`
- **Source File:** `[invoiceId]/route.ts:157`

---

### `GET` /api/companies/:id/invoices/exists

> Next.js App Router GET handler for /api/companies/:id/invoices/exists

- **Handler Function:** `GET`
- **Source File:** `exists/route.ts:9`

---

### `POST` /api/companies/:id/invoices

> Next.js App Router POST handler for /api/companies/:id/invoices

- **Handler Function:** `POST`
- **Source File:** `invoices/route.ts:9`

---

### `PUT` /api/companies/:id/invoices

> Next.js App Router PUT handler for /api/companies/:id/invoices

- **Handler Function:** `PUT`
- **Source File:** `invoices/route.ts:123`

---

### `PATCH` /api/companies/:id/invoices

> Next.js App Router PATCH handler for /api/companies/:id/invoices

- **Handler Function:** `PATCH`
- **Source File:** `invoices/route.ts:127`

---

### `PATCH` /api/companies/:id/lost

> Next.js App Router PATCH handler for /api/companies/:id/lost

- **Handler Function:** `PATCH`
- **Source File:** `lost/route.ts:9`

---

### `POST` /api/companies/:id/lost

> Next.js App Router POST handler for /api/companies/:id/lost

- **Handler Function:** `POST`
- **Source File:** `lost/route.ts:172`

---

### `GET` /api/companies/:id/packages

> Next.js App Router GET handler for /api/companies/:id/packages

- **Handler Function:** `GET`
- **Source File:** `packages/route.ts:7`

---

### `POST` /api/companies/:id/services

> Next.js App Router POST handler for /api/companies/:id/services

- **Handler Function:** `POST`
- **Source File:** `services/route.ts:277`

---

### `PUT` /api/companies/:id/services

> Next.js App Router PUT handler for /api/companies/:id/services

- **Handler Function:** `PUT`
- **Source File:** `services/route.ts:285`

---

### `PATCH` /api/companies/:id/services

> Next.js App Router PATCH handler for /api/companies/:id/services

- **Handler Function:** `PATCH`
- **Source File:** `services/route.ts:293`

---

### `POST` /api/companies/cancel-cascade

> Next.js App Router POST handler for /api/companies/cancel-cascade

- **Handler Function:** `POST`
- **Source File:** `cancel-cascade/route.ts:4`

---

### `GET` /api/companies/check

> Next.js App Router GET handler for /api/companies/check

- **Handler Function:** `GET`
- **Source File:** `check/route.ts:9`

---

### `GET` /api/companies/exists

> Next.js App Router GET handler for /api/companies/exists

- **Handler Function:** `GET`
- **Source File:** `exists/route.ts:9`

---

### `POST` /api/companies/services

> Next.js App Router POST handler for /api/companies/services

- **Handler Function:** `POST`
- **Source File:** `services/route.ts:29`

---

### `PUT` /api/companies/services

> Next.js App Router PUT handler for /api/companies/services

- **Handler Function:** `PUT`
- **Source File:** `services/route.ts:33`

---

### `PATCH` /api/companies/services

> Next.js App Router PATCH handler for /api/companies/services

- **Handler Function:** `PATCH`
- **Source File:** `services/route.ts:37`

---

### `OPTIONS` /api/confidentiality-deed/sign

> Next.js App Router OPTIONS handler for /api/confidentiality-deed/sign

- **Handler Function:** `OPTIONS`
- **Source File:** `sign/route.ts:17`

---

### `GET` /api/confidentiality-deed/sign

> Next.js App Router GET handler for /api/confidentiality-deed/sign

- **Handler Function:** `GET`
- **Source File:** `sign/route.ts:21`

---

### `POST` /api/confidentiality-deed/sign

> Next.js App Router POST handler for /api/confidentiality-deed/sign

- **Handler Function:** `POST`
- **Source File:** `sign/route.ts:75`

---

### `PATCH` /api/contacts/:id

> Next.js App Router PATCH handler for /api/contacts/:id

- **Handler Function:** `PATCH`
- **Source File:** `[id]/route.ts:61`

---

### `POST` /api/contacts/check-shipmate-access

> Next.js App Router POST handler for /api/contacts/check-shipmate-access

- **Handler Function:** `POST`
- **Source File:** `check-shipmate-access/route.ts:7`

---

### `POST` /api/contacts

> Next.js App Router POST handler for /api/contacts

- **Handler Function:** `POST`
- **Source File:** `contacts/route.ts:61`

---

### `PATCH` /api/contacts

> Next.js App Router PATCH handler for /api/contacts

- **Handler Function:** `PATCH`
- **Source File:** `contacts/route.ts:165`

---

### `POST` /api/copilot/draft

> Next.js App Router POST handler for /api/copilot/draft

- **Handler Function:** `POST`
- **Source File:** `draft/route.ts:8`

---

### `POST` /api/copilot/summary

> Next.js App Router POST handler for /api/copilot/summary

- **Handler Function:** `POST`
- **Source File:** `summary/route.ts:8`

---

### `GET` /api/cron/process-scheduled-service-changes

> Next.js App Router GET handler for /api/cron/process-scheduled-service-changes

- **Handler Function:** `GET`
- **Source File:** `process-scheduled-service-changes/route.ts:6`

---

### `POST` /api/cron/process-scheduled-service-changes

> Next.js App Router POST handler for /api/cron/process-scheduled-service-changes

- **Handler Function:** `POST`
- **Source File:** `process-scheduled-service-changes/route.ts:23`

---

### `POST` /api/cs-requests

> Next.js App Router POST handler for /api/cs-requests

- **Handler Function:** `POST`
- **Source File:** `cs-requests/route.ts:68`

---

### `POST` /api/deed-of-variation/sign

> Next.js App Router POST handler for /api/deed-of-variation/sign

- **Handler Function:** `POST`
- **Source File:** `sign/route.ts:7`

---

### `POST` /api/email/contact-am

> Next.js App Router POST handler for /api/email/contact-am

- **Handler Function:** `POST`
- **Source File:** `contact-am/route.ts:6`

---

### `POST` /api/email/verify

> Next.js App Router POST handler for /api/email/verify

- **Handler Function:** `POST`
- **Source File:** `verify/route.ts:160`

---

### `OPTIONS` /api/eoi/sign

> Next.js App Router OPTIONS handler for /api/eoi/sign

- **Handler Function:** `OPTIONS`
- **Source File:** `sign/route.ts:16`

---

### `GET` /api/eoi/sign

> Next.js App Router GET handler for /api/eoi/sign

- **Handler Function:** `GET`
- **Source File:** `sign/route.ts:20`

---

### `POST` /api/eoi/sign

> Next.js App Router POST handler for /api/eoi/sign

- **Handler Function:** `POST`
- **Source File:** `sign/route.ts:77`

---

### `OPTIONS` /api/franchise-prospects/backdate-receipt

> Next.js App Router OPTIONS handler for /api/franchise-prospects/backdate-receipt

- **Handler Function:** `OPTIONS`
- **Source File:** `backdate-receipt/route.ts:16`

---

### `POST` /api/franchise-prospects/backdate-receipt

> Next.js App Router POST handler for /api/franchise-prospects/backdate-receipt

- **Handler Function:** `POST`
- **Source File:** `backdate-receipt/route.ts:20`

---

### `POST` /api/franchise-prospects/create

> Next.js App Router POST handler for /api/franchise-prospects/create

- **Handler Function:** `POST`
- **Source File:** `create/route.ts:10`

---

### `OPTIONS` /api/franchise-prospects/deposit

> Next.js App Router OPTIONS handler for /api/franchise-prospects/deposit

- **Handler Function:** `OPTIONS`
- **Source File:** `deposit/route.ts:15`

---

### `POST` /api/franchise-prospects/deposit

> Next.js App Router POST handler for /api/franchise-prospects/deposit

- **Handler Function:** `POST`
- **Source File:** `deposit/route.ts:19`

---

### `OPTIONS` /api/franchise-prospects/fact-sheet

> Next.js App Router OPTIONS handler for /api/franchise-prospects/fact-sheet

- **Handler Function:** `OPTIONS`
- **Source File:** `fact-sheet/route.ts:16`

---

### `GET` /api/franchise-prospects/fact-sheet

> Next.js App Router GET handler for /api/franchise-prospects/fact-sheet

- **Handler Function:** `GET`
- **Source File:** `fact-sheet/route.ts:20`

---

### `POST` /api/franchise-prospects/fact-sheet

> Next.js App Router POST handler for /api/franchise-prospects/fact-sheet

- **Handler Function:** `POST`
- **Source File:** `fact-sheet/route.ts:123`

---

### `OPTIONS` /api/franchise-prospects/nab-confirm

> Next.js App Router OPTIONS handler for /api/franchise-prospects/nab-confirm

- **Handler Function:** `OPTIONS`
- **Source File:** `nab-confirm/route.ts:15`

---

### `POST` /api/franchise-prospects/nab-confirm

> Next.js App Router POST handler for /api/franchise-prospects/nab-confirm

- **Handler Function:** `POST`
- **Source File:** `nab-confirm/route.ts:19`

---

### `POST` /api/franchise-prospects/send-email

> Next.js App Router POST handler for /api/franchise-prospects/send-email

- **Handler Function:** `POST`
- **Source File:** `send-email/route.ts:10`

---

### `POST` /api/franchise-prospects/send-step-email

> Next.js App Router POST handler for /api/franchise-prospects/send-step-email

- **Handler Function:** `POST`
- **Source File:** `send-step-email/route.ts:8`

---

### `OPTIONS` /api/franchise-prospects/training

> Next.js App Router OPTIONS handler for /api/franchise-prospects/training

- **Handler Function:** `OPTIONS`
- **Source File:** `training/route.ts:16`

---

### `POST` /api/franchise-prospects/training

> Next.js App Router POST handler for /api/franchise-prospects/training

- **Handler Function:** `POST`
- **Source File:** `training/route.ts:20`

---

### `POST` /api/franchisee-im/sign

> Next.js App Router POST handler for /api/franchisee-im/sign

- **Handler Function:** `POST`
- **Source File:** `sign/route.ts:5`

---

### `PATCH` /api/franchisees/:internalId

> Next.js App Router PATCH handler for /api/franchisees/:internalId

- **Handler Function:** `PATCH`
- **Source File:** `[internalId]/route.ts:7`

---

### `DELETE` /api/franchisees/:internalId

> Next.js App Router DELETE handler for /api/franchisees/:internalId

- **Handler Function:** `DELETE`
- **Source File:** `[internalId]/route.ts:107`

---

### `POST` /api/franchisees/:internalId/upload-agreement

> Next.js App Router POST handler for /api/franchisees/:internalId/upload-agreement

- **Handler Function:** `POST`
- **Source File:** `upload-agreement/route.ts:6`

---

### `POST` /api/franchisees/ingest

> Next.js App Router POST handler for /api/franchisees/ingest

- **Handler Function:** `POST`
- **Source File:** `ingest/route.ts:7`

---

### `GET` /api/franchisees/presales

> Next.js App Router GET handler for /api/franchisees/presales

- **Handler Function:** `GET`
- **Source File:** `presales/route.ts:269`

---

### `POST` /api/franchisees/presales

> Next.js App Router POST handler for /api/franchisees/presales

- **Handler Function:** `POST`
- **Source File:** `presales/route.ts:448`

---

### `POST` /api/franchisees/presales/send-deed-email

> Next.js App Router POST handler for /api/franchisees/presales/send-deed-email

- **Handler Function:** `POST`
- **Source File:** `send-deed-email/route.ts:6`

---

### `POST` /api/franchisees/presales/send-im-email

> Next.js App Router POST handler for /api/franchisees/presales/send-im-email

- **Handler Function:** `POST`
- **Source File:** `send-im-email/route.ts:6`

---

### `POST` /api/franchisees

> Next.js App Router POST handler for /api/franchisees

- **Handler Function:** `POST`
- **Source File:** `franchisees/route.ts:7`

---

### `POST` /api/franchisees/sync

> Next.js App Router POST handler for /api/franchisees/sync

- **Handler Function:** `POST`
- **Source File:** `sync/route.ts:4`

---

### `GET` /api/integrations/microsoft/auth

> Next.js App Router GET handler for /api/integrations/microsoft/auth

- **Handler Function:** `GET`
- **Source File:** `auth/route.ts:4`

---

### `GET` /api/integrations/microsoft/callback

> Next.js App Router GET handler for /api/integrations/microsoft/callback

- **Handler Function:** `GET`
- **Source File:** `callback/route.ts:6`

---

### `GET` /api/integrations/microsoft/webhook

> Next.js App Router GET handler for /api/integrations/microsoft/webhook

- **Handler Function:** `GET`
- **Source File:** `webhook/route.ts:8`

---

### `POST` /api/integrations/microsoft/webhook

> Next.js App Router POST handler for /api/integrations/microsoft/webhook

- **Handler Function:** `POST`
- **Source File:** `webhook/route.ts:19`

---

### `POST` /api/integrations/netsuite/send-email

> Next.js App Router POST handler for /api/integrations/netsuite/send-email

- **Handler Function:** `POST`
- **Source File:** `send-email/route.ts:5`

---

### `POST` /api/leads/:id/addresses

> Next.js App Router POST handler for /api/leads/:id/addresses

- **Handler Function:** `POST`
- **Source File:** `addresses/route.ts:8`

---

### `PATCH` /api/leads/:id

> Next.js App Router PATCH handler for /api/leads/:id

- **Handler Function:** `PATCH`
- **Source File:** `[id]/route.ts:44`

---

### `GET` /api/leads/check

> Next.js App Router GET handler for /api/leads/check

- **Handler Function:** `GET`
- **Source File:** `check/route.ts:8`

---

### `POST` /api/leads/child

> Next.js App Router POST handler for /api/leads/child

- **Handler Function:** `POST`
- **Source File:** `child/route.ts:28`

---

### `POST` /api/leads/parent

> Next.js App Router POST handler for /api/leads/parent

- **Handler Function:** `POST`
- **Source File:** `parent/route.ts:29`

---

### `POST` /api/leads

> Next.js App Router POST handler for /api/leads

- **Handler Function:** `POST`
- **Source File:** `leads/route.ts:49`

---

### `POST` /api/localmile/deactivate-account

> Next.js App Router POST handler for /api/localmile/deactivate-account

- **Handler Function:** `POST`
- **Source File:** `deactivate-account/route.ts:3`

---

### `POST` /api/localmile/jobs

> Next.js App Router POST handler for /api/localmile/jobs

- **Handler Function:** `POST`
- **Source File:** `jobs/route.ts:8`

---

### `GET` /api/localmile/message-operator

> Next.js App Router GET handler for /api/localmile/message-operator

- **Handler Function:** `GET`
- **Source File:** `message-operator/route.ts:64`

---

### `POST` /api/localmile/message-operator

> Next.js App Router POST handler for /api/localmile/message-operator

- **Handler Function:** `POST`
- **Source File:** `message-operator/route.ts:97`

---

### `POST` /api/localmile/resend-auth

> Next.js App Router POST handler for /api/localmile/resend-auth

- **Handler Function:** `POST`
- **Source File:** `resend-auth/route.ts:4`

---

### `GET` /api/localmile/scheduled-jobs/depot-lodgements

> Next.js App Router GET handler for /api/localmile/scheduled-jobs/depot-lodgements

- **Handler Function:** `GET`
- **Source File:** `depot-lodgements/route.ts:8`

---

### `POST` /api/localmile/scheduled-jobs

> Next.js App Router POST handler for /api/localmile/scheduled-jobs

- **Handler Function:** `POST`
- **Source File:** `scheduled-jobs/route.ts:4`

---

### `POST` /api/localmile/trial-nudge/process

> Next.js App Router POST handler for /api/localmile/trial-nudge/process

- **Handler Function:** `POST`
- **Source File:** `process/route.ts:8`

---

### `GET` /api/localmile-registration/:token

> Next.js App Router GET handler for /api/localmile-registration/:token

- **Handler Function:** `GET`
- **Source File:** `[token]/route.ts:12`

---

### `POST` /api/localmile-registration/:token

> Next.js App Router POST handler for /api/localmile-registration/:token

- **Handler Function:** `POST`
- **Source File:** `[token]/route.ts:94`

---

### `GET` /api/lpo/:id

> Next.js App Router GET handler for /api/lpo/:id

- **Handler Function:** `GET`
- **Source File:** `[id]/route.ts:3`

---

### `POST` /api/lpo-leads/bulk-import

> Next.js App Router POST handler for /api/lpo-leads/bulk-import

- **Handler Function:** `POST`
- **Source File:** `bulk-import/route.ts:6`

---

### `POST` /api/lpo-leads/mark-lost

> Next.js App Router POST handler for /api/lpo-leads/mark-lost

- **Handler Function:** `POST`
- **Source File:** `mark-lost/route.ts:5`

---

### `POST` /api/lpo-leads

> Next.js App Router POST handler for /api/lpo-leads

- **Handler Function:** `POST`
- **Source File:** `lpo-leads/route.ts:24`

---

### `POST` /api/lpo-leads/sync-portal-status

> Next.js App Router POST handler for /api/lpo-leads/sync-portal-status

- **Handler Function:** `POST`
- **Source File:** `sync-portal-status/route.ts:6`

---

### `POST` /api/lpo-opportunities/share-email

> Next.js App Router POST handler for /api/lpo-opportunities/share-email

- **Handler Function:** `POST`
- **Source File:** `share-email/route.ts:6`

---

### `POST` /api/lpo-opportunity/:id/action

> Next.js App Router POST handler for /api/lpo-opportunity/:id/action

- **Handler Function:** `POST`
- **Source File:** `action/route.ts:6`

---

### `POST` /api/lpo-plus/provision

> Next.js App Router POST handler for /api/lpo-plus/provision

- **Handler Function:** `POST`
- **Source File:** `provision/route.ts:6`

---

### `POST` /api/lpo-plus/reset-password

> Next.js App Router POST handler for /api/lpo-plus/reset-password

- **Handler Function:** `POST`
- **Source File:** `reset-password/route.ts:6`

---

### `POST` /api/lpo-plus/sync-territory

> Next.js App Router POST handler for /api/lpo-plus/sync-territory

- **Handler Function:** `POST`
- **Source File:** `sync-territory/route.ts:6`

---

### `GET` /api/lpo-reporting

> Next.js App Router GET handler for /api/lpo-reporting

- **Handler Function:** `GET`
- **Source File:** `lpo-reporting/route.ts:8`

---

### `POST` /api/notifications/email

> Next.js App Router POST handler for /api/notifications/email

- **Handler Function:** `POST`
- **Source File:** `email/route.ts:5`

---

### `GET` /api/nurture/action-trigger

> Next.js App Router GET handler for /api/nurture/action-trigger

- **Handler Function:** `GET`
- **Source File:** `action-trigger/route.ts:7`

---

### `POST` /api/nurture/process

> Next.js App Router POST handler for /api/nurture/process

- **Handler Function:** `POST`
- **Source File:** `process/route.ts:32`

---

### `GET` /api/nurture/report

> Next.js App Router GET handler for /api/nurture/report

- **Handler Function:** `GET`
- **Source File:** `report/route.ts:7`

---

### `POST` /api/onboarding-requests/notify-email

> Next.js App Router POST handler for /api/onboarding-requests/notify-email

- **Handler Function:** `POST`
- **Source File:** `notify-email/route.ts:8`

---

### `PUT` /api/operators/:internalId

> Next.js App Router PUT handler for /api/operators/:internalId

- **Handler Function:** `PUT`
- **Source File:** `[internalId]/route.ts:6`

---

### `DELETE` /api/operators/:internalId

> Next.js App Router DELETE handler for /api/operators/:internalId

- **Handler Function:** `DELETE`
- **Source File:** `[internalId]/route.ts:58`

---

### `POST` /api/operators/ingest

> Next.js App Router POST handler for /api/operators/ingest

- **Handler Function:** `POST`
- **Source File:** `ingest/route.ts:6`

---

### `POST` /api/operators

> Next.js App Router POST handler for /api/operators

- **Handler Function:** `POST`
- **Source File:** `operators/route.ts:6`

---

### `GET` /api/packages/lookup

> Next.js App Router GET handler for /api/packages/lookup

- **Handler Function:** `GET`
- **Source File:** `lookup/route.ts:28`

---

### `OPTIONS` /api/public/become-a-franchisee

> Next.js App Router OPTIONS handler for /api/public/become-a-franchisee

- **Handler Function:** `OPTIONS`
- **Source File:** `become-a-franchisee/route.ts:15`

---

### `POST` /api/public/become-a-franchisee

> Next.js App Router POST handler for /api/public/become-a-franchisee

- **Handler Function:** `POST`
- **Source File:** `become-a-franchisee/route.ts:19`

---

### `GET` /api/public/company/:id

> Next.js App Router GET handler for /api/public/company/:id

- **Handler Function:** `GET`
- **Source File:** `[id]/route.ts:4`

---

### `GET` /api/scans/report

> Next.js App Router GET handler for /api/scans/report

- **Handler Function:** `GET`
- **Source File:** `report/route.ts:194`

---

### `GET` /api/scans/top-users

> Next.js App Router GET handler for /api/scans/top-users

- **Handler Function:** `GET`
- **Source File:** `top-users/route.ts:91`

---

### `POST` /api/scf/generate-quote-preview

> Next.js App Router POST handler for /api/scf/generate-quote-preview

- **Handler Function:** `POST`
- **Source File:** `generate-quote-preview/route.ts:8`

---

### `POST` /api/scf/send-quote

> Next.js App Router POST handler for /api/scf/send-quote

- **Handler Function:** `POST`
- **Source File:** `send-quote/route.ts:24`

---

### `GET` /api/search

> Next.js App Router GET handler for /api/search

- **Handler Function:** `GET`
- **Source File:** `search/route.ts:8`

---

### `POST` /api/shipmate/jobs

> Next.js App Router POST handler for /api/shipmate/jobs

- **Handler Function:** `POST`
- **Source File:** `jobs/route.ts:8`

---

### `GET` /api/shipmate/jobs

> Next.js App Router GET handler for /api/shipmate/jobs

- **Handler Function:** `GET`
- **Source File:** `jobs/route.ts:138`

---

### `OPTIONS` /api/sign/disclosure

> Next.js App Router OPTIONS handler for /api/sign/disclosure

- **Handler Function:** `OPTIONS`
- **Source File:** `disclosure/route.ts:17`

---

### `GET` /api/sign/disclosure

> Next.js App Router GET handler for /api/sign/disclosure

- **Handler Function:** `GET`
- **Source File:** `disclosure/route.ts:21`

---

### `POST` /api/sign/disclosure

> Next.js App Router POST handler for /api/sign/disclosure

- **Handler Function:** `POST`
- **Source File:** `disclosure/route.ts:85`

---

### `OPTIONS` /api/sign/franchise-agreement

> Next.js App Router OPTIONS handler for /api/sign/franchise-agreement

- **Handler Function:** `OPTIONS`
- **Source File:** `franchise-agreement/route.ts:17`

---

### `GET` /api/sign/franchise-agreement

> Next.js App Router GET handler for /api/sign/franchise-agreement

- **Handler Function:** `GET`
- **Source File:** `franchise-agreement/route.ts:21`

---

### `POST` /api/sign/franchise-agreement

> Next.js App Router POST handler for /api/sign/franchise-agreement

- **Handler Function:** `POST`
- **Source File:** `franchise-agreement/route.ts:110`

---

### `OPTIONS` /api/sign/request-for-docs

> Next.js App Router OPTIONS handler for /api/sign/request-for-docs

- **Handler Function:** `OPTIONS`
- **Source File:** `request-for-docs/route.ts:16`

---

### `GET` /api/sign/request-for-docs

> Next.js App Router GET handler for /api/sign/request-for-docs

- **Handler Function:** `GET`
- **Source File:** `request-for-docs/route.ts:20`

---

### `POST` /api/sign/request-for-docs

> Next.js App Router POST handler for /api/sign/request-for-docs

- **Handler Function:** `POST`
- **Source File:** `request-for-docs/route.ts:131`

---

### `POST` /api/sof/sign

> Next.js App Router POST handler for /api/sof/sign

- **Handler Function:** `POST`
- **Source File:** `sign/route.ts:5`

---

### `GET` /api/surcharge

> Next.js App Router GET handler for /api/surcharge

- **Handler Function:** `GET`
- **Source File:** `surcharge/route.ts:3`

---

### `POST` /api/tasks/outlook-sync

> Next.js App Router POST handler for /api/tasks/outlook-sync

- **Handler Function:** `POST`
- **Source File:** `outlook-sync/route.ts:8`

---

### `POST` /api/templates/generate-preview

> Next.js App Router POST handler for /api/templates/generate-preview

- **Handler Function:** `POST`
- **Source File:** `generate-preview/route.ts:8`

---

### `GET` /api/territory/boundary

> Next.js App Router GET handler for /api/territory/boundary

- **Handler Function:** `GET`
- **Source File:** `boundary/route.ts:133`

---

### `POST` /api/territory/boundary

> Next.js App Router POST handler for /api/territory/boundary

- **Handler Function:** `POST`
- **Source File:** `boundary/route.ts:216`

---

### `POST` /api/territory/check

> Next.js App Router POST handler for /api/territory/check

- **Handler Function:** `POST`
- **Source File:** `check/route.ts:67`

---

### `POST` /api/tickets/missed-sweep

> Next.js App Router POST handler for /api/tickets/missed-sweep

- **Handler Function:** `POST`
- **Source File:** `missed-sweep/route.ts:8`

---

### `OPTIONS` /api/tickets

> Next.js App Router OPTIONS handler for /api/tickets

- **Handler Function:** `OPTIONS`
- **Source File:** `tickets/route.ts:16`

---

### `POST` /api/tickets

> Next.js App Router POST handler for /api/tickets

- **Handler Function:** `POST`
- **Source File:** `tickets/route.ts:23`

---

### `GET` /api/tracking/email-click

> Next.js App Router GET handler for /api/tracking/email-click

- **Handler Function:** `GET`
- **Source File:** `email-click/route.ts:5`

---

### `GET` /api/tracking/email-open

> Next.js App Router GET handler for /api/tracking/email-open

- **Handler Function:** `GET`
- **Source File:** `email-open/route.ts:5`

---

### `GET` /api/tracking

> Next.js App Router GET handler for /api/tracking

- **Handler Function:** `GET`
- **Source File:** `tracking/route.ts:5`

---

### `GET` /api/users/check

> Next.js App Router GET handler for /api/users/check

- **Handler Function:** `GET`
- **Source File:** `check/route.ts:4`

---

