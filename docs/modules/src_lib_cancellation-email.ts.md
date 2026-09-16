# Module: `src/lib/cancellation-email.ts`

- **Language:** TypeScript
- **Total Lines:** 268
- **Direct Dependencies:** 2 modules imported

## Exported Symbols & API

### `INTERFACE` `CSRequestNotificationData`

- **Line:** 4

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `requestType` | `'change_of_service' | 'cancellation'` | No | - |
| `leadId` | `string` | Yes | - |
| `prospectPlusId` | `string` | Yes | - |
| `netsuiteId` | `string` | Yes | - |
| `companyName` | `string` | No | - |
| `contactName` | `string` | Yes | - |
| `contactEmail` | `string` | Yes | - |
| `contactPhone` | `string` | Yes | - |
| `requestedBy` | `string` | Yes | - |
| `capturedBy` | `string` | Yes | - |
| `serviceChangeCategories` | `string[]` | Yes | - |
| `requestedServices` | `ServiceSelection[]` | Yes | - |
| `effectiveDate` | `string` | Yes | - |
| `cancellationTheme` | `string` | Yes | - |
| `cancellationWhy` | `string` | Yes | - |
| `cancellationReason` | `string` | Yes | - |
| `cancellationDate` | `string` | Yes | - |
| `trueServiceCancellationDate` | `string` | Yes | - |
| `cancellationNotes` | `string` | Yes | - |
| `attachments` | `Array<{ name: string; url: string; size?: number }>` | Yes | - |
| `notes` | `string` | Yes | - |
| `processedBy` | `string` | Yes | - |
| `baseUrl` | `string` | Yes | - |

---

### `FUNCTION` `sendCSRequestNotificationEmail`

- **Line:** 36
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `data` | `CSRequestNotificationData` | **Yes** | - | - |

---

### `VARIABLE` `to`

- **Line:** 63

---

### `VARIABLE` `cc`

- **Line:** 64

---

### `VARIABLE` `baseUrl`

- **Line:** 65

---

### `VARIABLE` `requestsHubUrl`

- **Line:** 66

---

### `VARIABLE` `isCancellation`

- **Line:** 68

---

### `VARIABLE` `titleText`

- **Line:** 69

---

### `VARIABLE` `subject`

- **Line:** 70

---

### `VARIABLE` `servicesHtml`

- **Line:** 73

---

### `VARIABLE` `freq`

- **Line:** 76

---

### `VARIABLE` `rate`

- **Line:** 77

---

### `VARIABLE` `attachmentsHtml`

- **Line:** 83

---

### `VARIABLE` `html`

- **Line:** 90

---

### `FUNCTION` `sendCancellationNotificationEmail`

- **Line:** 262
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `data` | `any` | **Yes** | - | - |

---

