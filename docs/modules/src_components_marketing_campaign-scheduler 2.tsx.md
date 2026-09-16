# Module: `src/components/marketing/campaign-scheduler 2.tsx`

- **Language:** TypeScript
- **Total Lines:** 745
- **Direct Dependencies:** 11 modules imported

## Exported Symbols & API

### `INTERFACE` `Template`

- **Line:** 15

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | No | - |
| `name` | `string` | No | - |
| `subject` | `string` | No | - |
| `body` | `string` | No | - |

---

### `INTERFACE` `Campaign`

- **Line:** 22

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | Yes | - |
| `name` | `string` | No | - |
| `templateId` | `string` | No | - |
| `templateName` | `string` | Yes | - |
| `audienceFilters` | `{
    customerCampaign?: string;
    salesRepAssigned?: string;
    dialerAssigned?: string;
    franchisee?: string;
  }` | No | - |
| `senderName` | `string` | No | - |
| `replyToEmail` | `string` | No | - |
| `subjectLine` | `string` | No | - |
| `schedulingType` | `'instant' | 'scheduled'` | No | - |
| `scheduledAt` | `string` | Yes | - |
| `status` | `'draft' | 'queued' | 'sending' | 'sent' | 'failed'` | No | - |
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

---

### `FUNCTION` `CampaignScheduler`

- **Line:** 51
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ onCampaignCreated }` | `{ onCampaignCreated?: () => void }` | **Yes** | - | - |

---

### `FUNCTION` `fetchCampaignsAndTemplates`

- **Line:** 98
- **Async:** Yes

---

### `VARIABLE` `tList`

- **Line:** 106

---

### `VARIABLE` `cList`

- **Line:** 112

---

### `VARIABLE` `data`

- **Line:** 113

---

### `VARIABLE` `t`

- **Line:** 114

---

### `FUNCTION` `scanUniqueLeadFields`

- **Line:** 135
- **Async:** Yes

---

### `VARIABLE` `snap`

- **Line:** 137

---

### `VARIABLE` `camps`

- **Line:** 138

---

### `VARIABLE` `dialers`

- **Line:** 139

---

### `VARIABLE` `frans`

- **Line:** 140

---

### `VARIABLE` `d`

- **Line:** 143

---

### `FUNCTION` `calculateAudienceSize`

- **Line:** 157
- **Async:** Yes

---

### `VARIABLE` `leadsSnap`

- **Line:** 160

---

### `VARIABLE` `suppressionSnap`

- **Line:** 161

---

### `VARIABLE` `suppressed`

- **Line:** 162

---

### `VARIABLE` `matchedCount`

- **Line:** 164

---

### `VARIABLE` `suppressedCount`

- **Line:** 165

---

### `VARIABLE` `lead`

- **Line:** 168

---

### `VARIABLE` `contactsSnap`

- **Line:** 177

---

### `VARIABLE` `recipients`

- **Line:** 178
- **Signature:** `string[]`

---

### `VARIABLE` `c`

- **Line:** 182

---

### `VARIABLE` `email`

- **Line:** 188

---

### `FUNCTION` `handleTemplateChange`

- **Line:** 212

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `val` | `string` | **Yes** | - | - |

---

### `VARIABLE` `temp`

- **Line:** 214

---

### `FUNCTION` `handleDelete`

- **Line:** 220
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `string` | **Yes** | - | - |
| `e` | `React.MouseEvent` | **Yes** | - | - |

---

### `FUNCTION` `handleScheduleSubmit`

- **Line:** 232
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `e` | `React.FormEvent` | **Yes** | - | - |

---

### `VARIABLE` `now`

- **Line:** 265

---

### `VARIABLE` `scheduledAt`

- **Line:** 266

---

### `VARIABLE` `campaignData`

- **Line:** 269
- **Signature:** `Omit<Campaign, 'id'>`

---

### `VARIABLE` `docRef`

- **Line:** 299

---

### `VARIABLE` `response`

- **Line:** 312

---

### `VARIABLE` `result`

- **Line:** 317

---

### `FUNCTION` `resetForm`

- **Line:** 349

---

### `VARIABLE` `filters`

- **Line:** 664

---

### `VARIABLE` `filterChips`

- **Line:** 665

---

