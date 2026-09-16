# Module: `src/app/admin/tickets/page.tsx`

- **Language:** TypeScript
- **Total Lines:** 793
- **Direct Dependencies:** 12 modules imported

## Exported Symbols & API

### `FUNCTION` `TicketsListPage`

- **Line:** 16
- **Returns:** `void`

---

### `VARIABLE` `router`

- **Line:** 19

---

### `FUNCTION` `getConnoteFromPackage`

- **Line:** 38

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `pkg` | `any` | **Yes** | - | - |

---

### `VARIABLE` `scansList`

- **Line:** 40

---

### `FUNCTION` `chunkArray`

- **Line:** 52

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `arr` | `any[]` | **Yes** | - | - |
| `size` | `number` | **Yes** | - | - |

---

### `VARIABLE` `chunks`

- **Line:** 53

---

### `FUNCTION` `fetchConnotes`

- **Line:** 64
- **Async:** Yes

---

### `VARIABLE` `trackingIds`

- **Line:** 66

---

### `VARIABLE` `connoteMap`

- **Line:** 76
- **Signature:** `Record<string, string>`

---

### `VARIABLE` `packagesRef`

- **Line:** 77

---

### `VARIABLE` `chunks`

- **Line:** 78

---

### `VARIABLE` `qCode`

- **Line:** 83

---

### `VARIABLE` `snapCode`

- **Line:** 84

---

### `VARIABLE` `data`

- **Line:** 86

---

### `VARIABLE` `connote`

- **Line:** 87

---

### `VARIABLE` `qOrder`

- **Line:** 94

---

### `VARIABLE` `snapOrder`

- **Line:** 95

---

### `VARIABLE` `data`

- **Line:** 97

---

### `VARIABLE` `connote`

- **Line:** 98

---

### `VARIABLE` `q`

- **Line:** 131

---

### `VARIABLE` `unsubscribe`

- **Line:** 132

---

### `VARIABLE` `ticketsData`

- **Line:** 133

---

### `FUNCTION` `loadUsers`

- **Line:** 142
- **Async:** Yes
- **Returns:** `void`

---

### `VARIABLE` `users`

- **Line:** 144

---

### `VARIABLE` `cs`

- **Line:** 145

---

### `VARIABLE` `hasCsInAssigned`

- **Line:** 146

---

### `VARIABLE` `isCsDefault`

- **Line:** 151

---

### `VARIABLE` `isCsRole`

- **Line:** 154

---

### `FUNCTION` `getSlaState`

- **Line:** 170

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `ticket` | `any` | **Yes** | - | - |

---

### `VARIABLE` `isPaused`

- **Line:** 171

---

### `VARIABLE` `lastUpdate`

- **Line:** 176

---

### `VARIABLE` `time`

- **Line:** 177

---

### `VARIABLE` `diffMs`

- **Line:** 187

---

### `VARIABLE` `ageHours`

- **Line:** 188

---

### `FUNCTION` `formatAge`

- **Line:** 199

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `createdAt` | `any` | **Yes** | - | - |

---

### `VARIABLE` `created`

- **Line:** 200

---

### `VARIABLE` `diffMs`

- **Line:** 206

---

### `VARIABLE` `diffHours`

- **Line:** 207

---

### `VARIABLE` `days`

- **Line:** 211

---

### `VARIABLE` `remainingHours`

- **Line:** 212

---

### `FUNCTION` `formatLastUpdate`

- **Line:** 217

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `updatedAt` | `any` | **Yes** | - | - |
| `createdAt` | `any` | **Yes** | - | - |

---

### `VARIABLE` `time`

- **Line:** 218

---

### `VARIABLE` `date`

- **Line:** 219

---

### `VARIABLE` `diffMs`

- **Line:** 225

---

### `VARIABLE` `diffMinutes`

- **Line:** 226

---

### `VARIABLE` `diffHours`

- **Line:** 230

---

### `VARIABLE` `diffDays`

- **Line:** 234

---

### `VARIABLE` `stats`

- **Line:** 239

---

### `VARIABLE` `openCount`

- **Line:** 240

---

### `VARIABLE` `breachedCount`

- **Line:** 241

---

### `VARIABLE` `dueSoonCount`

- **Line:** 242

---

### `VARIABLE` `resolvedTodayCount`

- **Line:** 243

---

### `FUNCTION` `getSydneyTime`

- **Line:** 245

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `dateVal` | `Date` | **Yes** | - | - |

---

### `VARIABLE` `nowSydney`

- **Line:** 248

---

### `VARIABLE` `startOfToday`

- **Line:** 249

---

### `VARIABLE` `isClosed`

- **Line:** 253

---

### `VARIABLE` `sla`

- **Line:** 260

---

### `VARIABLE` `rawUpdatedDate`

- **Line:** 270

---

### `VARIABLE` `updatedDateSydney`

- **Line:** 278

---

### `VARIABLE` `filteredTickets`

- **Line:** 295

---

### `VARIABLE` `isClosed`

- **Line:** 302

---

### `VARIABLE` `assignedLower`

- **Line:** 327

---

### `VARIABLE` `userEmailLower`

- **Line:** 328

---

### `VARIABLE` `userNameLower`

- **Line:** 329

---

### `VARIABLE` `queryLower`

- **Line:** 352

---

### `VARIABLE` `cleanQuery`

- **Line:** 353

---

### `VARIABLE` `ticketId`

- **Line:** 354

---

### `VARIABLE` `ticketNum`

- **Line:** 355

---

### `VARIABLE` `barcode`

- **Line:** 356

---

### `VARIABLE` `connote`

- **Line:** 357

---

### `VARIABLE` `customer`

- **Line:** 358

---

### `VARIABLE` `reference`

- **Line:** 359

---

### `VARIABLE` `isNewOrInv`

- **Line:** 377

---

### `VARIABLE` `sla`

- **Line:** 624

---

### `VARIABLE` `newAssignee`

- **Line:** 732

---

### `VARIABLE` `ticketRef`

- **Line:** 734

---

### `VARIABLE` `name`

- **Line:** 749

---

