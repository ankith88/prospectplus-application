# Module: `src/app/admin/in-review-leads/in-review-leads-client.tsx`

- **Language:** TypeScript
- **Total Lines:** 927
- **Direct Dependencies:** 24 modules imported

## Exported Symbols & API

### `VARIABLE` `BUCKET_LABELS`

- **Line:** 54
- **Signature:** `Record<string, string>`

---

### `FUNCTION` `parseAnyDate`

- **Line:** 67
- **Returns:** `Date | null`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `val` | `any` | **Yes** | - | - |

---

### `VARIABLE` `ms`

- **Line:** 73

---

### `VARIABLE` `d`

- **Line:** 74

---

### `VARIABLE` `d`

- **Line:** 80

---

### `VARIABLE` `d`

- **Line:** 87

---

### `VARIABLE` `d`

- **Line:** 91

---

### `VARIABLE` `trimmed`

- **Line:** 96

---

### `VARIABLE` `dmY`

- **Line:** 99

---

### `VARIABLE` `d`

- **Line:** 101

---

### `VARIABLE` `parsedIso`

- **Line:** 106

---

### `VARIABLE` `parsedStandard`

- **Line:** 111

---

### `FUNCTION` `safeFormatDate`

- **Line:** 118
- **Returns:** `string`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `val` | `any` | **Yes** | - | - |
| `outputFormat` | `any` | No | `'dd/MM/yyyy'` | - |

---

### `VARIABLE` `d`

- **Line:** 119

---

### `FUNCTION` `InReviewLeadsClient`

- **Line:** 128
- **Returns:** `void`

---

### `VARIABLE` `isFranchisee`

- **Line:** 130

---

### `VARIABLE` `router`

- **Line:** 132

---

### `VARIABLE` `isAllowed`

- **Line:** 134

---

### `FUNCTION` `fetchData`

- **Line:** 168
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `isRef` | `any` | No | `false` | - |

---

### `VARIABLE` `inReviewLeads`

- **Line:** 179

---

### `VARIABLE` `leadStatusOptions`

- **Line:** 201

---

### `VARIABLE` `statuses`

- **Line:** 202

---

### `VARIABLE` `existingInLeads`

- **Line:** 203

---

### `VARIABLE` `uniqueFranchisees`

- **Line:** 208

---

### `VARIABLE` `uniqueCampaigns`

- **Line:** 212

---

### `VARIABLE` `set`

- **Line:** 213

---

### `VARIABLE` `uniqueSources`

- **Line:** 218

---

### `VARIABLE` `set`

- **Line:** 219

---

### `VARIABLE` `uniqueCustomerStatuses`

- **Line:** 224

---

### `VARIABLE` `set`

- **Line:** 225

---

### `FUNCTION` `handleFilterChange`

- **Line:** 230

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `filterName` | `keyof typeof filters` | **Yes** | - | - |
| `value` | `any` | **Yes** | - | - |

---

### `FUNCTION` `handleClearFilters`

- **Line:** 234

---

### `VARIABLE` `filteredLeads`

- **Line:** 250

---

### `VARIABLE` `q`

- **Line:** 254

---

### `VARIABLE` `matchId`

- **Line:** 255

---

### `VARIABLE` `q`

- **Line:** 261

---

### `VARIABLE` `matchEntity`

- **Line:** 262

---

### `VARIABLE` `q`

- **Line:** 268

---

### `VARIABLE` `matchCompany`

- **Line:** 269

---

### `VARIABLE` `q`

- **Line:** 275

---

### `VARIABLE` `leadSuburb`

- **Line:** 276

---

### `VARIABLE` `leadFran`

- **Line:** 287

---

### `VARIABLE` `leadEnteredStr`

- **Line:** 308

---

### `VARIABLE` `leadDate`

- **Line:** 309

---

### `VARIABLE` `fromDate`

- **Line:** 312

---

### `VARIABLE` `toDate`

- **Line:** 317

---

### `VARIABLE` `totalPages`

- **Line:** 333

---

### `VARIABLE` `paginatedLeads`

- **Line:** 334

---

### `VARIABLE` `start`

- **Line:** 335

---

### `VARIABLE` `eligibleUsers`

- **Line:** 340

---

### `VARIABLE` `roles`

- **Line:** 344

---

### `VARIABLE` `primaryRole`

- **Line:** 345

---

### `VARIABLE` `allRoles`

- **Line:** 346

---

### `FUNCTION` `handleSelectAllFiltered`

- **Line:** 372

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `checked` | `boolean` | **Yes** | - | - |

---

### `FUNCTION` `handleSelectRow`

- **Line:** 380

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |
| `checked` | `boolean` | **Yes** | - | - |

---

### `FUNCTION` `handleAssignLeads`

- **Line:** 389
- **Async:** Yes

---

### `VARIABLE` `assignmentMap`

- **Line:** 402
- **Signature:** `Record<string, string>`

---

### `VARIABLE` `leadCurrentBuckets`

- **Line:** 403
- **Signature:** `Record<string, string>`

---

### `VARIABLE` `selectedLeadObjs`

- **Line:** 405

---

### `VARIABLE` `shuffledLeadIds`

- **Line:** 417

---

### `VARIABLE` `shuffledUserIds`

- **Line:** 419

---

### `VARIABLE` `assignedUser`

- **Line:** 423

---

### `VARIABLE` `targetLabel`

- **Line:** 436

---

### `VARIABLE` `hasActiveFilters`

- **Line:** 455

---

### `VARIABLE` `isSelected`

- **Line:** 805

---

### `VARIABLE` `contact`

- **Line:** 806

---

### `VARIABLE` `assignedRep`

- **Line:** 807

---

### `VARIABLE` `suburbName`

- **Line:** 808

---

