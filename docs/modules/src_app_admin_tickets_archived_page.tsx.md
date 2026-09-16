# Module: `src/app/admin/tickets/archived/page.tsx`

- **Language:** TypeScript
- **Total Lines:** 567
- **Direct Dependencies:** 10 modules imported

## Exported Symbols & API

### `FUNCTION` `ArchivedTicketsListPage`

- **Line:** 14
- **Returns:** `void`

---

### `VARIABLE` `router`

- **Line:** 17

---

### `VARIABLE` `q`

- **Line:** 47

---

### `VARIABLE` `unsubscribe`

- **Line:** 48

---

### `VARIABLE` `ticketsData`

- **Line:** 49

---

### `FUNCTION` `loadUsers`

- **Line:** 60
- **Async:** Yes
- **Returns:** `void`

---

### `VARIABLE` `users`

- **Line:** 62

---

### `FUNCTION` `getTicketOutcomes`

- **Line:** 74

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `t` | `any` | **Yes** | - | - |

---

### `VARIABLE` `enquiryTypeStr`

- **Line:** 75

---

### `VARIABLE` `isDamaged`

- **Line:** 81

---

### `VARIABLE` `isLost`

- **Line:** 87

---

### `FUNCTION` `formatResolvedBy`

- **Line:** 96

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `assignedUser` | `string` | **Yes** | - | - |

---

### `VARIABLE` `parts`

- **Line:** 99

---

### `VARIABLE` `first`

- **Line:** 101

---

### `VARIABLE` `last`

- **Line:** 102

---

### `VARIABLE` `parts`

- **Line:** 107

---

### `VARIABLE` `first`

- **Line:** 109

---

### `VARIABLE` `last`

- **Line:** 110

---

### `FUNCTION` `formatClosedDate`

- **Line:** 117

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `dateVal` | `any` | **Yes** | - | - |

---

### `VARIABLE` `date`

- **Line:** 118

---

### `FUNCTION` `formatAgeAtClose`

- **Line:** 129

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `createdAt` | `any` | **Yes** | - | - |
| `updatedAt` | `any` | **Yes** | - | - |

---

### `VARIABLE` `created`

- **Line:** 130

---

### `VARIABLE` `updated`

- **Line:** 131

---

### `VARIABLE` `diffMs`

- **Line:** 133

---

### `VARIABLE` `diffHours`

- **Line:** 135

---

### `VARIABLE` `days`

- **Line:** 139

---

### `VARIABLE` `uniqueEnquiryTypes`

- **Line:** 144

---

### `VARIABLE` `types`

- **Line:** 145

---

### `VARIABLE` `uniqueAssignees`

- **Line:** 158

---

### `VARIABLE` `assignees`

- **Line:** 159

---

### `VARIABLE` `uniqueDepots`

- **Line:** 168

---

### `VARIABLE` `depots`

- **Line:** 169

---

### `VARIABLE` `depotVal`

- **Line:** 171

---

### `VARIABLE` `filteredTickets`

- **Line:** 180

---

### `VARIABLE` `queryLower`

- **Line:** 192

---

### `VARIABLE` `cleanQuery`

- **Line:** 193

---

### `VARIABLE` `ticketId`

- **Line:** 194

---

### `VARIABLE` `ticketNum`

- **Line:** 195

---

### `VARIABLE` `barcode`

- **Line:** 196

---

### `VARIABLE` `contactName`

- **Line:** 197

---

### `VARIABLE` `companyName`

- **Line:** 198

---

### `VARIABLE` `updatedTime`

- **Line:** 215

---

### `VARIABLE` `now`

- **Line:** 216

---

### `VARIABLE` `oneDayMs`

- **Line:** 217

---

### `VARIABLE` `startOfToday`

- **Line:** 220

---

### `VARIABLE` `startOfToday`

- **Line:** 224

---

### `VARIABLE` `startOfYesterday`

- **Line:** 226

---

### `VARIABLE` `depotVal`

- **Line:** 251

---

### `VARIABLE` `dateA`

- **Line:** 257

---

### `VARIABLE` `dateB`

- **Line:** 258

---

### `FUNCTION` `handleExportCSV`

- **Line:** 272

---

### `VARIABLE` `headers`

- **Line:** 273

---

### `FUNCTION` `escapeCsvCell`

- **Line:** 285

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `val` | `any` | **Yes** | - | - |

---

### `VARIABLE` `rows`

- **Line:** 287

---

### `VARIABLE` `outcome`

- **Line:** 289

---

### `VARIABLE` `csvContent`

- **Line:** 303

---

### `VARIABLE` `blob`

- **Line:** 304

---

### `VARIABLE` `link`

- **Line:** 305

---

### `VARIABLE` `url`

- **Line:** 306

---

