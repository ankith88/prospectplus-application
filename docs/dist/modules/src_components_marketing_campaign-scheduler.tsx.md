# Module: `src/components/marketing/campaign-scheduler.tsx`

- **Language:** TypeScript
- **Total Lines:** 1740
- **Direct Dependencies:** 13 modules imported

## Exported Symbols & API

### `INTERFACE` `Template`

- **Line:** 16

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | No | - |
| `name` | `string` | No | - |
| `subject` | `string` | No | - |
| `body` | `string` | No | - |

---

### `INTERFACE` `Campaign`

- **Line:** 23

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | Yes | - |
| `name` | `string` | No | - |
| `campaignType` | `'email' | 'sms' | 'container'` | Yes | - |
| `targetAudience` | `'leads' | 'franchisees'` | Yes | - |
| `templateId` | `string` | Yes | - |
| `smsMessage` | `string` | Yes | - |
| `templateName` | `string` | Yes | - |
| `audienceFilters` | `{
    customerCampaign?: string;
    salesRepAssigned?: string;
    dialerAssigned?: string;
    franchisee?: string;
    marketingList?: string;
    selectedFranchisees?: string[];
    state?: string;
    leadStatus?: string;
  }` | Yes | - |
| `senderType` | `'default' | 'sales_rep'` | Yes | - |
| `senderName` | `string` | Yes | - |
| `replyToEmail` | `string` | Yes | - |
| `senderEmail` | `string` | Yes | - |
| `subjectLine` | `string` | Yes | - |
| `schedulingType` | `'instant' | 'scheduled'` | Yes | - |
| `scheduledAt` | `string` | Yes | - |
| `status` | `'draft' | 'queued' | 'sending' | 'sent' | 'failed' | 'active'` | No | - |
| `createdAt` | `string` | No | - |
| `sentAt` | `string` | Yes | - |
| `metrics` | `{
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
    unsubscribed: number;
  }` | Yes | - |
| `nurtureJourneyIds` | `string[]` | Yes | - |
| `emailTemplateIds` | `string[]` | Yes | - |
| `smsTemplateIds` | `string[]` | Yes | - |

---

### `FUNCTION` `CampaignScheduler`

- **Line:** 66
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ onCampaignCreated }` | `{ onCampaignCreated?: () => void }` | **Yes** | - | - |

---

### `VARIABLE` `isFranchisee`

- **Line:** 68

---

### `VARIABLE` `groupedTemplates`

- **Line:** 101

---

### `VARIABLE` `groups`

- **Line:** 102
- **Signature:** `{ campaignId: string; campaignName: string; templates: Template[] }[]`

---

### `VARIABLE` `campTemplates`

- **Line:** 105

---

### `VARIABLE` `linkedTemplateIds`

- **Line:** 115

---

### `VARIABLE` `unlinkedTemplates`

- **Line:** 119

---

### `FUNCTION` `fetchCampaignsAndTemplates`

- **Line:** 180
- **Async:** Yes

---

### `VARIABLE` `tList`

- **Line:** 190

---

### `VARIABLE` `smsList`

- **Line:** 196

---

### `VARIABLE` `journeyList`

- **Line:** 203

---

### `VARIABLE` `cList`

- **Line:** 209

---

### `VARIABLE` `data`

- **Line:** 210

---

### `VARIABLE` `t`

- **Line:** 211

---

### `FUNCTION` `openTestModalForCampaign`

- **Line:** 232

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `type` | `'email' | 'sms'` | **Yes** | - | - |

---

### `VARIABLE` `tmpl`

- **Line:** 237

---

### `FUNCTION` `handleSendTestEmail`

- **Line:** 246
- **Async:** Yes

---

### `VARIABLE` `res`

- **Line:** 266

---

### `VARIABLE` `result`

- **Line:** 276

---

### `FUNCTION` `handleSendTestSms`

- **Line:** 300
- **Async:** Yes

---

### `VARIABLE` `res`

- **Line:** 320

---

### `VARIABLE` `result`

- **Line:** 328

---

### `FUNCTION` `scanUniqueLeadFields`

- **Line:** 352
- **Async:** Yes

---

### `VARIABLE` `snap`

- **Line:** 354

---

### `VARIABLE` `camps`

- **Line:** 355

---

### `VARIABLE` `dialers`

- **Line:** 356

---

### `VARIABLE` `frans`

- **Line:** 357

---

### `VARIABLE` `mLists`

- **Line:** 358

---

### `VARIABLE` `statuses`

- **Line:** 359

---

### `VARIABLE` `d`

- **Line:** 362

---

### `FUNCTION` `calculateAudienceSize`

- **Line:** 383
- **Async:** Yes

---

### `VARIABLE` `leadsSnap`

- **Line:** 386

---

### `VARIABLE` `suppressionSnap`

- **Line:** 387

---

### `VARIABLE` `suppressed`

- **Line:** 388

---

### `VARIABLE` `tempRecipients`

- **Line:** 390
- **Signature:** `any[]`

---

### `VARIABLE` `matchedCount`

- **Line:** 391

---

### `VARIABLE` `suppressedCount`

- **Line:** 392

---

### `VARIABLE` `franchiseesSnap`

- **Line:** 395

---

### `VARIABLE` `matchedFranchisees`

- **Line:** 396

---

### `VARIABLE` `f`

- **Line:** 397

---

### `VARIABLE` `territories`

- **Line:** 401

---

### `VARIABLE` `hasState`

- **Line:** 402

---

### `VARIABLE` `f`

- **Line:** 409

---

### `VARIABLE` `email`

- **Line:** 410

---

### `VARIABLE` `isSuppressed`

- **Line:** 412

---

### `VARIABLE` `matchedLeads`

- **Line:** 431

---

### `VARIABLE` `lead`

- **Line:** 432

---

### `VARIABLE` `currentStatus`

- **Line:** 439

---

### `VARIABLE` `contactsResults`

- **Line:** 446

---

### `VARIABLE` `lead`

- **Line:** 448

---

### `VARIABLE` `leadId`

- **Line:** 449

---

### `VARIABLE` `contactsSnap`

- **Line:** 451

---

### `VARIABLE` `contacts`

- **Line:** 462
- **Signature:** `{ email: string; name: string }[]`

---

### `VARIABLE` `c`

- **Line:** 466

---

### `VARIABLE` `email`

- **Line:** 475

---

### `VARIABLE` `isSuppressed`

- **Line:** 485

---

### `FUNCTION` `exportPoolToCSV`

- **Line:** 522

---

### `VARIABLE` `headers`

- **Line:** 526

---

### `VARIABLE` `rows`

- **Line:** 527

---

### `VARIABLE` `csvContent`

- **Line:** 538

---

### `VARIABLE` `blob`

- **Line:** 543

---

### `VARIABLE` `url`

- **Line:** 544

---

### `VARIABLE` `link`

- **Line:** 545

---

### `FUNCTION` `handleTemplateChange`

- **Line:** 553

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `val` | `string` | **Yes** | - | - |

---

### `VARIABLE` `temp`

- **Line:** 555

---

### `FUNCTION` `handleDelete`

- **Line:** 561
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `string` | **Yes** | - | - |
| `e` | `React.MouseEvent` | **Yes** | - | - |

---

### `FUNCTION` `handleEditCampaign`

- **Line:** 573

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `c` | `Campaign` | **Yes** | - | - |

---

### `VARIABLE` `dt`

- **Line:** 587

---

### `VARIABLE` `year`

- **Line:** 588

---

### `VARIABLE` `month`

- **Line:** 589

---

### `VARIABLE` `day`

- **Line:** 590

---

### `VARIABLE` `hours`

- **Line:** 591

---

### `VARIABLE` `mins`

- **Line:** 592

---

### `VARIABLE` `filters`

- **Line:** 603

---

### `FUNCTION` `handleScheduleSubmit`

- **Line:** 619
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `e` | `React.FormEvent` | **Yes** | - | - |

---

### `VARIABLE` `now`

- **Line:** 673

---

### `VARIABLE` `scheduledAt`

- **Line:** 674

---

### `VARIABLE` `campaignData`

- **Line:** 677
- **Signature:** `any`

---

### `FUNCTION` `cleanUndefined`

- **Line:** 720
- **Returns:** `any`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `obj` | `any` | **Yes** | - | - |

---

### `VARIABLE` `cleaned`

- **Line:** 721
- **Signature:** `any`

---

### `VARIABLE` `cleanedCampaignData`

- **Line:** 732

---

### `VARIABLE` `docId`

- **Line:** 734

---

### `VARIABLE` `ref`

- **Line:** 736

---

### `VARIABLE` `docRef`

- **Line:** 753

---

### `VARIABLE` `endpoint`

- **Line:** 769

---

### `VARIABLE` `response`

- **Line:** 770

---

### `VARIABLE` `result`

- **Line:** 775

---

### `FUNCTION` `resetForm`

- **Line:** 807

---

### `VARIABLE` `selectedTmpl`

- **Line:** 988

---

### `VARIABLE` `filters`

- **Line:** 1440

---

### `VARIABLE` `filterChips`

- **Line:** 1441

---

### `VARIABLE` `t`

- **Line:** 1627

---

### `VARIABLE` `t`

- **Line:** 1684

---

