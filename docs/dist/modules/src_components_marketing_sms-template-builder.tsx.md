# Module: `src/components/marketing/sms-template-builder.tsx`

- **Language:** TypeScript
- **Total Lines:** 656
- **Direct Dependencies:** 13 modules imported

## Exported Symbols & API

### `INTERFACE` `SmsTemplate`

- **Line:** 30

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | Yes | - |
| `name` | `string` | No | - |
| `body` | `string` | No | - |
| `createdAt` | `string` | No | - |
| `updatedAt` | `string` | No | - |
| `createdBy` | `string` | Yes | - |
| `createdByRole` | `string` | Yes | - |

---

### `FUNCTION` `SmsTemplateBuilder`

- **Line:** 40
- **Returns:** `void`

---

### `FUNCTION` `canEditTemplate`

- **Line:** 48

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `template` | `SmsTemplate | null` | **Yes** | - | - |

---

### `VARIABLE` `role`

- **Line:** 52

---

### `VARIABLE` `isOwner`

- **Line:** 53

---

### `VARIABLE` `isFullAdmin`

- **Line:** 54

---

### `VARIABLE` `createdByAm`

- **Line:** 63

---

### `VARIABLE` `isEditable`

- **Line:** 70

---

### `VARIABLE` `bodyTextareaRef`

- **Line:** 81

---

### `FUNCTION` `handleSendTestSms`

- **Line:** 89
- **Async:** Yes

---

### `VARIABLE` `res`

- **Line:** 109

---

### `VARIABLE` `result`

- **Line:** 117

---

### `FUNCTION` `fetchCampaigns`

- **Line:** 146
- **Async:** Yes

---

### `VARIABLE` `snap`

- **Line:** 148

---

### `VARIABLE` `list`

- **Line:** 149

---

### `FUNCTION` `fetchTemplates`

- **Line:** 159
- **Async:** Yes

---

### `VARIABLE` `snap`

- **Line:** 163

---

### `VARIABLE` `list`

- **Line:** 164

---

### `FUNCTION` `handleSelectTemplate`

- **Line:** 181

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `template` | `SmsTemplate` | **Yes** | - | - |

---

### `FUNCTION` `handleNewTemplate`

- **Line:** 187

---

### `FUNCTION` `insertContent`

- **Line:** 193

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `textContent` | `string` | **Yes** | - | - |

---

### `VARIABLE` `textarea`

- **Line:** 194

---

### `VARIABLE` `start`

- **Line:** 197

---

### `VARIABLE` `end`

- **Line:** 198

---

### `VARIABLE` `value`

- **Line:** 199

---

### `VARIABLE` `newValue`

- **Line:** 201

---

### `FUNCTION` `handleSave`

- **Line:** 210
- **Async:** Yes

---

### `VARIABLE` `now`

- **Line:** 230

---

### `VARIABLE` `data`

- **Line:** 232
- **Signature:** `any`

---

### `VARIABLE` `ref`

- **Line:** 239

---

### `VARIABLE` `docRef`

- **Line:** 245

---

### `FUNCTION` `handleDelete`

- **Line:** 265
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `string` | **Yes** | - | - |
| `e` | `React.MouseEvent` | **Yes** | - | - |

---

### `VARIABLE` `templateToDelete`

- **Line:** 267

---

### `FUNCTION` `handleDuplicate`

- **Line:** 295
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `template` | `SmsTemplate` | **Yes** | - | - |
| `e` | `React.MouseEvent` | **Yes** | - | - |

---

### `VARIABLE` `now`

- **Line:** 299

---

### `VARIABLE` `data`

- **Line:** 301

---

### `VARIABLE` `filteredTemplates`

- **Line:** 327

---

### `VARIABLE` `q`

- **Line:** 329

---

### `VARIABLE` `nameMatch`

- **Line:** 330

---

### `VARIABLE` `bodyMatch`

- **Line:** 331

---

### `VARIABLE` `camp`

- **Line:** 336

---

### `VARIABLE` `isLinked`

- **Line:** 338

---

### `VARIABLE` `groupedData`

- **Line:** 397
- **Signature:** `{ campaignId: string; campaignName: string; templates: SmsTemplate[] }[]`

---

### `VARIABLE` `campaignTemplates`

- **Line:** 400

---

### `VARIABLE` `linkedTemplateIds`

- **Line:** 410

---

### `VARIABLE` `unlinkedTemplates`

- **Line:** 411

---

### `FUNCTION` `toggleGroup`

- **Line:** 420

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `groupId` | `string` | **Yes** | - | - |

---

### `VARIABLE` `isCollapsed`

- **Line:** 430

---

