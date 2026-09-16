# Module: `src/services/lead-campaigns.ts`

- **Language:** TypeScript
- **Total Lines:** 125
- **Direct Dependencies:** 2 modules imported

## Exported Symbols & API

### `INTERFACE` `LeadCampaign`

- **Line:** 15

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | No | - |
| `name` | `string` | No | - |
| `description` | `string` | Yes | - |
| `isBuiltIn` | `boolean` | No | - |
| `isActive` | `boolean` | No | - |
| `createdBy` | `string` | Yes | - |
| `createdAt` | `Timestamp | Date | string | null` | Yes | - |

---

### `VARIABLE` `BUILT_IN_CAMPAIGNS`

- **Line:** 25
- **Signature:** `Omit<LeadCampaign, 'id'>[]`

---

### `FUNCTION` `getLeadCampaigns`

- **Line:** 37
- **Async:** Yes
- **Returns:** `Promise<LeadCampaign[]>`

---

### `VARIABLE` `q`

- **Line:** 39

---

### `VARIABLE` `snap`

- **Line:** 40

---

### `VARIABLE` `dbCampaigns`

- **Line:** 42
- **Signature:** `LeadCampaign[]`

---

### `VARIABLE` `existingNames`

- **Line:** 48

---

### `VARIABLE` `missingBuiltIns`

- **Line:** 50
- **Signature:** `LeadCampaign[]`

---

### `FUNCTION` `createLeadCampaign`

- **Line:** 68
- **Async:** Yes
- **Returns:** `Promise<string>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `payload` | `{
  name: string;
  description?: string;
  createdBy?: string;
}` | **Yes** | - | - |

---

### `VARIABLE` `nameTrimmed`

- **Line:** 73

---

### `VARIABLE` `existing`

- **Line:** 78

---

### `VARIABLE` `newDocRef`

- **Line:** 83

---

### `FUNCTION` `toggleLeadCampaignStatus`

- **Line:** 95
- **Async:** Yes
- **Returns:** `Promise<void>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `campaignId` | `string` | **Yes** | - | - |
| `currentIsActive` | `boolean` | **Yes** | - | - |

---

### `VARIABLE` `campaignName`

- **Line:** 98

---

### `VARIABLE` `matchedBuiltIn`

- **Line:** 99

---

### `VARIABLE` `docRef`

- **Line:** 111

---

### `FUNCTION` `deleteLeadCampaign`

- **Line:** 117
- **Async:** Yes
- **Returns:** `Promise<void>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `campaignId` | `string` | **Yes** | - | - |

---

### `VARIABLE` `docRef`

- **Line:** 122

---

