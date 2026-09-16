# Module: `src/components/admin/ticket-deletion.tsx`

- **Language:** TypeScript
- **Total Lines:** 300
- **Direct Dependencies:** 11 modules imported

## Exported Symbols & API

### `INTERFACE` `Ticket`

- **Line:** 24

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | No | - |
| `ticketNumber` | `string` | Yes | - |
| `companyName` | `string` | Yes | - |
| `enquiryType` | `string` | Yes | - |
| `status` | `string` | Yes | - |
| `createdAt` | `any` | Yes | - |
| `customerEntityId` | `string` | Yes | - |
| `entityId` | `string` | Yes | - |
| `netsuiteId` | `string` | Yes | - |
| `prospectPlusId` | `string` | Yes | - |
| `leadId` | `string` | Yes | - |

---

### `FUNCTION` `TicketDeletion`

- **Line:** 38
- **Returns:** `void`

---

### `FUNCTION` `handleSearch`

- **Line:** 49
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `e` | `React.FormEvent` | **Yes** | - | - |

---

### `VARIABLE` `term`

- **Line:** 51

---

### `VARIABLE` `ticketsMap`

- **Line:** 60

---

### `VARIABLE` `directDocRef`

- **Line:** 63

---

### `VARIABLE` `directSnap`

- **Line:** 64

---

### `VARIABLE` `qVal`

- **Line:** 73

---

### `VARIABLE` `queries`

- **Line:** 74

---

### `VARIABLE` `snap`

- **Line:** 84

---

### `VARIABLE` `prefixQuery`

- **Line:** 94

---

### `VARIABLE` `prefixSnap`

- **Line:** 99

---

### `VARIABLE` `extraQueries`

- **Line:** 108

---

### `VARIABLE` `eqSnap`

- **Line:** 116

---

### `FUNCTION` `handleSelectTicket`

- **Line:** 136

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `string` | **Yes** | - | - |
| `checked` | `boolean` | **Yes** | - | - |

---

### `FUNCTION` `handleSelectAll`

- **Line:** 142

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `checked` | `boolean` | **Yes** | - | - |

---

### `FUNCTION` `handleDelete`

- **Line:** 146
- **Async:** Yes

---

### `VARIABLE` `batch`

- **Line:** 152

---

### `VARIABLE` `subcollections`

- **Line:** 158

---

### `VARIABLE` `subSnap`

- **Line:** 160

---

### `VARIABLE` `isAllSelected`

- **Line:** 181

---

### `VARIABLE` `netSuiteId`

- **Line:** 242

---

### `VARIABLE` `prospectPlusId`

- **Line:** 243

---

