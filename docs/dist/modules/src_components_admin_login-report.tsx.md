# Module: `src/components/admin/login-report.tsx`

- **Language:** TypeScript
- **Total Lines:** 680
- **Direct Dependencies:** 12 modules imported

## Exported Symbols & API

### `INTERFACE` `LoginRecord`

- **Line:** 34

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | No | - |
| `userId` | `string` | No | - |
| `userEmail` | `string` | No | - |
| `userDisplayName` | `string` | No | - |
| `userRole` | `string` | No | - |
| `dateStr` | `string` | No | - |
| `timestamp` | `any` | No | - |
| `lastActiveTimestamp` | `any` | Yes | - |
| `isFirstLoginOfDay` | `boolean` | Yes | - |
| `clientTimezone` | `string` | No | - |
| `userAgent` | `string` | No | - |

---

### `TYPE` `SortOption`

- **Line:** 48
- **Signature:** `| 'lastActive_desc' 
  | 'lastActive_asc' 
  | 'firstLogin_desc' 
  | 'firstLogin_asc' 
  | 'userName_asc' 
  | 'userName_desc' 
  | 'role_asc'
  | 'role_desc'
  | 'sessions_desc'`

---

### `FUNCTION` `getSydneyTodayStr`

- **Line:** 59

---

### `VARIABLE` `options`

- **Line:** 60

---

### `VARIABLE` `formatter`

- **Line:** 61

---

### `FUNCTION` `getRoleBadgeStyle`

- **Line:** 65

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `role` | `string` | **Yes** | - | - |

---

### `VARIABLE` `r`

- **Line:** 66

---

### `FUNCTION` `LoginActivityReport`

- **Line:** 91
- **Returns:** `void`

---

### `VARIABLE` `fetchLogins`

- **Line:** 102

---

### `VARIABLE` `usersMap`

- **Line:** 106
- **Signature:** `Record<string, { role: string; email?: string; name?: string }>`

---

### `VARIABLE` `usersSnap`

- **Line:** 108

---

### `VARIABLE` `uData`

- **Line:** 110

---

### `VARIABLE` `role`

- **Line:** 111

---

### `VARIABLE` `loginsRef`

- **Line:** 122

---

### `VARIABLE` `q`

- **Line:** 123

---

### `VARIABLE` `querySnapshot`

- **Line:** 124

---

### `VARIABLE` `records`

- **Line:** 126
- **Signature:** `LoginRecord[]`

---

### `VARIABLE` `data`

- **Line:** 128

---

### `VARIABLE` `userId`

- **Line:** 129

---

### `VARIABLE` `fallbackUser`

- **Line:** 130

---

### `VARIABLE` `role`

- **Line:** 131

---

### `VARIABLE` `timeA`

- **Line:** 150

---

### `VARIABLE` `timeB`

- **Line:** 151

---

### `VARIABLE` `availableRoles`

- **Line:** 173

---

### `VARIABLE` `rolesSet`

- **Line:** 174

---

### `VARIABLE` `filteredRecords`

- **Line:** 182

---

### `VARIABLE` `q`

- **Line:** 191

---

### `VARIABLE` `matchName`

- **Line:** 192

---

### `VARIABLE` `matchEmail`

- **Line:** 193

---

### `VARIABLE` `matchRole`

- **Line:** 194

---

### `VARIABLE` `matchTz`

- **Line:** 195

---

### `VARIABLE` `totalUniqueUsersCount`

- **Line:** 205

---

### `VARIABLE` `uniqueIds`

- **Line:** 206

---

### `VARIABLE` `filteredUniqueUsersCount`

- **Line:** 211

---

### `VARIABLE` `uniqueIds`

- **Line:** 212

---

### `VARIABLE` `groupedRecords`

- **Line:** 217

---

### `VARIABLE` `groups`

- **Line:** 218
- **Signature:** `Record<string, LoginRecord[]>`

---

### `VARIABLE` `key`

- **Line:** 220

---

### `VARIABLE` `list`

- **Line:** 227

---

### `VARIABLE` `latestRecord`

- **Line:** 230

---

### `VARIABLE` `earliestRecord`

- **Line:** 231

---

### `VARIABLE` `explicitFirstLogin`

- **Line:** 232

---

### `VARIABLE` `firstLoginTimestamp`

- **Line:** 233

---

### `VARIABLE` `lastActiveTimestamp`

- **Line:** 234

---

### `VARIABLE` `timeLastA`

- **Line:** 250

---

### `VARIABLE` `timeLastB`

- **Line:** 251

---

### `VARIABLE` `timeFirstA`

- **Line:** 252

---

### `VARIABLE` `timeFirstB`

- **Line:** 253

---

### `FUNCTION` `toggleGroup`

- **Line:** 280

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `userName` | `string` | **Yes** | - | - |

---

### `FUNCTION` `expandAll`

- **Line:** 287

---

### `VARIABLE` `newExpanded`

- **Line:** 288
- **Signature:** `Record<string, boolean>`

---

### `FUNCTION` `collapseAll`

- **Line:** 295

---

### `FUNCTION` `clearFilters`

- **Line:** 299

---

### `FUNCTION` `formatSydneyTime`

- **Line:** 305

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `timestamp` | `any` | **Yes** | - | - |

---

### `VARIABLE` `date`

- **Line:** 307

---

### `VARIABLE` `options`

- **Line:** 308

---

### `FUNCTION` `exportToCsv`

- **Line:** 322

---

### `VARIABLE` `headers`

- **Line:** 327

---

### `VARIABLE` `rows`

- **Line:** 338

---

### `VARIABLE` `csvContent`

- **Line:** 349

---

### `VARIABLE` `blob`

- **Line:** 350

---

### `VARIABLE` `link`

- **Line:** 351

---

### `VARIABLE` `isFilterActive`

- **Line:** 359

---

### `VARIABLE` `isExpanded`

- **Line:** 582

---

### `VARIABLE` `startTimeStr`

- **Line:** 622

---

### `VARIABLE` `lastActiveStr`

- **Line:** 623

---

