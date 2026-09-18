# Module: `src/components/lost-customers/page.tsx`

- **Language:** TypeScript
- **Total Lines:** 822
- **Direct Dependencies:** 17 modules imported

## Exported Symbols & API

### `FUNCTION` `formatAddress`

- **Line:** 34

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `address` | `Address` | No | - | - |

---

### `FUNCTION` `parseDDMMYYYY`

- **Line:** 39
- **Returns:** `Date | null`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `dateStr` | `string` | No | - | - |

---

### `VARIABLE` `parts`

- **Line:** 41

---

### `VARIABLE` `day`

- **Line:** 43

---

### `VARIABLE` `month`

- **Line:** 44

---

### `VARIABLE` `year`

- **Line:** 45

---

### `VARIABLE` `parsed`

- **Line:** 50

---

### `TYPE` `SortKey`

- **Line:** 54
- **Signature:** `'entityId' | 'companyName' | 'franchisee' | 'cancellationdate'`

---

### `FUNCTION` `LostCustomersComponent`

- **Line:** 56
- **Returns:** `void`

---

### `VARIABLE` `itemsPerPage`

- **Line:** 78

---

### `VARIABLE` `router`

- **Line:** 79

---

### `VARIABLE` `isFranchisee`

- **Line:** 81

---

### `FUNCTION` `fetchData`

- **Line:** 85
- **Async:** Yes

---

### `VARIABLE` `companies`

- **Line:** 88

---

### `VARIABLE` `lostCompanies`

- **Line:** 94

---

### `VARIABLE` `combined`

- **Line:** 98

---

### `VARIABLE` `seenIds`

- **Line:** 101

---

### `VARIABLE` `uniqueList`

- **Line:** 102

---

### `VARIABLE` `hasAccess`

- **Line:** 117

---

### `FUNCTION` `handleFilterChange`

- **Line:** 133

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `filterName` | `keyof typeof draftFilters` | **Yes** | - | - |
| `value` | `string` | **Yes** | - | - |

---

### `FUNCTION` `handleApplyFilters`

- **Line:** 137

---

### `FUNCTION` `handleResetFilters`

- **Line:** 142

---

### `VARIABLE` `defaultFilters`

- **Line:** 143

---

### `FUNCTION` `requestSort`

- **Line:** 155

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `key` | `SortKey` | **Yes** | - | - |

---

### `VARIABLE` `direction`

- **Line:** 156
- **Signature:** `'ascending' | 'descending'`

---

### `VARIABLE` `filteredAndSortedList`

- **Line:** 164

---

### `VARIABLE` `result`

- **Line:** 165

---

### `VARIABLE` `companyMatch`

- **Line:** 166

---

### `VARIABLE` `franchiseeMatch`

- **Line:** 169

---

### `VARIABLE` `reasonMatch`

- **Line:** 172

---

### `VARIABLE` `dateMatch`

- **Line:** 177

---

### `VARIABLE` `itemDate`

- **Line:** 179

---

### `VARIABLE` `start`

- **Line:** 183

---

### `VARIABLE` `end`

- **Line:** 188

---

### `VARIABLE` `dateA`

- **Line:** 201

---

### `VARIABLE` `dateB`

- **Line:** 202

---

### `VARIABLE` `valA`

- **Line:** 206

---

### `VARIABLE` `valB`

- **Line:** 207

---

### `VARIABLE` `totalPages`

- **Line:** 223

---

### `VARIABLE` `paginatedList`

- **Line:** 224

---

### `VARIABLE` `startIndex`

- **Line:** 225

---

### `VARIABLE` `appliedReportingStats`

- **Line:** 229

---

### `VARIABLE` `startLimit`

- **Line:** 230
- **Signature:** `Date | null`

---

### `VARIABLE` `endLimit`

- **Line:** 231
- **Signature:** `Date | null`

---

### `VARIABLE` `title`

- **Line:** 232

---

### `FUNCTION` `formatBound`

- **Line:** 244

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `d` | `Date` | **Yes** | - | - |

---

### `VARIABLE` `now`

- **Line:** 253

---

### `VARIABLE` `matchingCancellations`

- **Line:** 259

---

### `VARIABLE` `parsedDate`

- **Line:** 260

---

### `VARIABLE` `companyMatch`

- **Line:** 266

---

### `VARIABLE` `franchiseeMatch`

- **Line:** 269

---

### `VARIABLE` `reasonMatch`

- **Line:** 272

---

### `VARIABLE` `themeCounts`

- **Line:** 280
- **Signature:** `Record<string, number>`

---

### `VARIABLE` `categoryCounts`

- **Line:** 281
- **Signature:** `Record<string, number>`

---

### `VARIABLE` `franchiseeCounts`

- **Line:** 282
- **Signature:** `Record<string, number>`

---

### `VARIABLE` `cancelledByCounts`

- **Line:** 283
- **Signature:** `Record<string, number>`

---

### `VARIABLE` `theme`

- **Line:** 286

---

### `VARIABLE` `category`

- **Line:** 289

---

### `VARIABLE` `franchisee`

- **Line:** 292

---

### `VARIABLE` `cancelledBy`

- **Line:** 295

---

### `VARIABLE` `chartData`

- **Line:** 309

---

### `VARIABLE` `themes`

- **Line:** 310

---

### `VARIABLE` `categories`

- **Line:** 311

---

### `VARIABLE` `franchisees`

- **Line:** 312

---

### `VARIABLE` `cancelledBy`

- **Line:** 313

---

### `VARIABLE` `COLORS`

- **Line:** 317

---

### `FUNCTION` `applyPresetRange`

- **Line:** 319

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `preset` | `string` | **Yes** | - | - |

---

### `VARIABLE` `now`

- **Line:** 320

---

### `VARIABLE` `start`

- **Line:** 321
- **Signature:** `Date | null`

---

### `VARIABLE` `end`

- **Line:** 322
- **Signature:** `Date | null`

---

### `VARIABLE` `yesterday`

- **Line:** 330

---

### `VARIABLE` `day`

- **Line:** 336

---

### `VARIABLE` `diff`

- **Line:** 337

---

### `VARIABLE` `lastWeekStart`

- **Line:** 343

---

### `VARIABLE` `lastWeekEnd`

- **Line:** 345

---

### `VARIABLE` `quarter`

- **Line:** 360

---

### `VARIABLE` `currentQuarter`

- **Line:** 366

---

### `VARIABLE` `lastQuarter`

- **Line:** 367

---

### `VARIABLE` `year`

- **Line:** 368

---

### `VARIABLE` `last7`

- **Line:** 374

---

### `VARIABLE` `last30`

- **Line:** 381

---

### `FUNCTION` `formatDateStr`

- **Line:** 391

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `d` | `Date | null` | **Yes** | - | - |

---

### `VARIABLE` `year`

- **Line:** 393

---

### `VARIABLE` `month`

- **Line:** 394

---

### `VARIABLE` `day`

- **Line:** 395

---

### `VARIABLE` `parsedDate`

- **Line:** 707

---

