# Module: `src/app/account-lookup/page.tsx`

- **Language:** TypeScript
- **Total Lines:** 783
- **Direct Dependencies:** 5 modules imported

## Exported Symbols & API

### `INTERFACE` `Site`

- **Line:** 9

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | No | - |
| `type` | `'lead' | 'company'` | No | - |
| `companyName` | `string` | No | - |
| `prospectPlusId` | `string | null` | No | - |
| `entityId` | `string | null` | No | - |
| `status` | `string` | No | - |
| `customerStatus` | `string` | No | - |
| `franchisee` | `string` | No | - |
| `accountManagerAssigned` | `string` | No | - |
| `address` | `{
    address1?: string;
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
  } | null` | No | - |
| `lastInvoiceDate` | `string | null` | No | - |
| `lastInvoiceNumber` | `string | null` | No | - |

---

### `INTERFACE` `Group`

- **Line:** 30

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | No | - |
| `name` | `string` | No | - |
| `type` | `'group'` | No | - |
| `meta` | `{
    total: number;
    serviced: number;
    toWin: number;
  }` | No | - |
| `sites` | `Site[]` | No | - |

---

### `INTERFACE` `Ticket`

- **Line:** 42

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | No | - |
| `ticketNumber` | `string` | No | - |
| `enquiryType` | `string` | No | - |
| `status` | `string` | No | - |
| `priority` | `string` | No | - |
| `companyName` | `string` | No | - |
| `createdAt` | `string | null` | No | - |

---

### `FUNCTION` `AccountLookupPage`

- **Line:** 52
- **Returns:** `void`

---

### `VARIABLE` `handler`

- **Line:** 69

---

### `VARIABLE` `trimmedQuery`

- **Line:** 78

---

### `VARIABLE` `controller`

- **Line:** 86

---

### `FUNCTION` `getAuthHeaders`

- **Line:** 88
- **Async:** Yes

---

### `VARIABLE` `reqHeaders`

- **Line:** 89
- **Signature:** `Record<string, string>`

---

### `VARIABLE` `idToken`

- **Line:** 91

---

### `FUNCTION` `fetchData`

- **Line:** 100
- **Async:** Yes

---

### `VARIABLE` `headers`

- **Line:** 102

---

### `VARIABLE` `res`

- **Line:** 105

---

### `VARIABLE` `data`

- **Line:** 109

---

### `FUNCTION` `handleClear`

- **Line:** 161

---

### `FUNCTION` `getStatusColorClass`

- **Line:** 168

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `status` | `string` | **Yes** | - | - |

---

### `VARIABLE` `s`

- **Line:** 169

---

### `FUNCTION` `formatAddress`

- **Line:** 176

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `address` | `Site['address']` | **Yes** | - | - |

---

### `VARIABLE` `addr1`

- **Line:** 178

---

### `VARIABLE` `parts`

- **Line:** 179

---

### `VARIABLE` `hasResults`

- **Line:** 189

---

### `VARIABLE` `isSearching`

- **Line:** 190

---

