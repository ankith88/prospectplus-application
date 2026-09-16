# Module: `src/app/api/admin/outbound-reporting/route.ts`

- **Language:** TypeScript
- **Total Lines:** 494
- **Direct Dependencies:** 4 modules imported

## Exported Symbols & API

### `VARIABLE` `dynamic`

- **Line:** 6

---

### `INTERFACE` `CacheEntry`

- **Line:** 8

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `timestamp` | `number` | No | - |
| `data` | `any` | No | - |

---

### `VARIABLE` `memoryCacheMap`

- **Line:** 14

---

### `VARIABLE` `CACHE_TTL_MS`

- **Line:** 15

---

### `FUNCTION` `safeGetStatus`

- **Line:** 17
- **Returns:** `string`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `val` | `any` | **Yes** | - | - |

---

### `VARIABLE` `trimmed`

- **Line:** 20

---

### `VARIABLE` `clean`

- **Line:** 22

---

### `FUNCTION` `parseDateString`

- **Line:** 29
- **Returns:** `Date | null`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `dateVal` | `any` | **Yes** | - | - |

---

### `VARIABLE` `d`

- **Line:** 36

---

### `VARIABLE` `d`

- **Line:** 40

---

### `FUNCTION` `sanitizeString`

- **Line:** 46
- **Returns:** `string`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `val` | `any` | **Yes** | - | - |
| `maxLength` | `number` | No | - | - |

---

### `VARIABLE` `str`

- **Line:** 48

---

### `FUNCTION` `deepSanitize`

- **Line:** 64
- **Returns:** `any`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `val` | `any` | **Yes** | - | - |

---

### `VARIABLE` `cleaned`

- **Line:** 76
- **Signature:** `Record<string, any>`

---

### `VARIABLE` `cleanKey`

- **Line:** 78

---

### `FUNCTION` `GET`

- **Line:** 86
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `req` | `NextRequest` | **Yes** | - | - |

---

### `VARIABLE` `startDateParam`

- **Line:** 89

---

### `VARIABLE` `endDateParam`

- **Line:** 90

---

### `VARIABLE` `forceRefresh`

- **Line:** 91

---

### `VARIABLE` `now`

- **Line:** 93

---

### `VARIABLE` `startISO`

- **Line:** 96

---

### `VARIABLE` `parsedStart`

- **Line:** 98

---

### `VARIABLE` `cacheKey`

- **Line:** 104

---

### `VARIABLE` `cachedEntry`

- **Line:** 105

---

### `VARIABLE` `db`

- **Line:** 117

---

### `VARIABLE` `activityQuery`

- **Line:** 121

---

### `VARIABLE` `parsedEnd`

- **Line:** 126

---

### `VARIABLE` `usersQuery`

- **Line:** 133

---

### `VARIABLE` `apptQuery`

- **Line:** 136

---

### `VARIABLE` `userList`

- **Line:** 145
- **Signature:** `string[]`

---

### `VARIABLE` `data`

- **Line:** 147

---

### `VARIABLE` `name`

- **Line:** 148

---

### `VARIABLE` `role`

- **Line:** 151

---

### `VARIABLE` `activeRole`

- **Line:** 152

---

### `VARIABLE` `assignedRoles`

- **Line:** 153

---

### `VARIABLE` `isDialerRole`

- **Line:** 155

---

### `VARIABLE` `dialersParam`

- **Line:** 180

---

### `VARIABLE` `targetDialers`

- **Line:** 181

---

### `VARIABLE` `leadFields`

- **Line:** 186

---

### `VARIABLE` `leadMap`

- **Line:** 196

---

### `FUNCTION` `processDoc`

- **Line:** 198

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `doc` | `FirebaseFirestore.DocumentSnapshot | FirebaseFirestore.QueryDocumentSnapshot` | **Yes** | - | - |
| `isFromCompanies` | `any` | No | `false` | - |

---

### `VARIABLE` `data`

- **Line:** 199

---

### `VARIABLE` `targetedLeadPromises`

- **Line:** 237
- **Signature:** `Promise<FirebaseFirestore.QuerySnapshot>[]`

---

### `VARIABLE` `dialerChunks`

- **Line:** 238
- **Signature:** `string[][]`

---

### `VARIABLE` `targetedSnaps`

- **Line:** 247

---

### `VARIABLE` `isCompany`

- **Line:** 249

---

### `VARIABLE` `processed`

- **Line:** 251

---

### `VARIABLE` `activeLeadIds`

- **Line:** 263

---

### `VARIABLE` `leadId`

- **Line:** 265

---

### `VARIABLE` `leadId`

- **Line:** 269

---

### `VARIABLE` `missingLeadIds`

- **Line:** 273

---

### `VARIABLE` `leadRefs`

- **Line:** 275

---

### `VARIABLE` `companyRefs`

- **Line:** 276

---

### `VARIABLE` `batchSize`

- **Line:** 278

---

### `VARIABLE` `allBatches`

- **Line:** 279
- **Signature:** `Promise<FirebaseFirestore.DocumentSnapshot[]>[]`

---

### `VARIABLE` `batchResults`

- **Line:** 287

---

### `VARIABLE` `isCompanyBatch`

- **Line:** 289

---

### `VARIABLE` `processed`

- **Line:** 292

---

### `VARIABLE` `combinedLeads`

- **Line:** 305

---

### `VARIABLE` `currentBucket`

- **Line:** 307

---

### `VARIABLE` `isCurrentlyOutbound`

- **Line:** 308

---

### `VARIABLE` `wasOutboundFlag`

- **Line:** 309

---

### `VARIABLE` `wasInBucketHistory`

- **Line:** 310

---

### `VARIABLE` `isAssignedToActiveDialer`

- **Line:** 314

---

### `VARIABLE` `dLower`

- **Line:** 315

---

### `VARIABLE` `assignedLower`

- **Line:** 316

---

### `VARIABLE` `activeLeadMap`

- **Line:** 323

---

### `VARIABLE` `rawActivities`

- **Line:** 327
- **Signature:** `any[]`

---

### `VARIABLE` `data`

- **Line:** 329

---

### `VARIABLE` `leadId`

- **Line:** 330

---

### `VARIABLE` `lead`

- **Line:** 332

---

### `VARIABLE` `author`

- **Line:** 336

---

### `VARIABLE` `authorLower`

- **Line:** 341

---

### `VARIABLE` `notesLower`

- **Line:** 342

---

### `VARIABLE` `rawCalls`

- **Line:** 363

---

### `VARIABLE` `lead`

- **Line:** 366

---

### `VARIABLE` `outcomeMatch`

- **Line:** 367

---

### `VARIABLE` `outcome`

- **Line:** 368

---

### `VARIABLE` `finalCalls`

- **Line:** 378
- **Signature:** `any[]`

---

### `VARIABLE` `callsByLead`

- **Line:** 379
- **Signature:** `Record<string, any[]>`

---

### `VARIABLE` `outcomes`

- **Line:** 386

---

### `VARIABLE` `attempts`

- **Line:** 387

---

### `VARIABLE` `parsedAttempt`

- **Line:** 392

---

### `VARIABLE` `attemptTime`

- **Line:** 393

---

### `VARIABLE` `matched`

- **Line:** 394

---

### `VARIABLE` `parsedOutcome`

- **Line:** 395

---

### `VARIABLE` `outcomeTime`

- **Line:** 396

---

### `VARIABLE` `dateA`

- **Line:** 406

---

### `VARIABLE` `dateB`

- **Line:** 407

---

### `VARIABLE` `cutoffDate`

- **Line:** 412

---

### `VARIABLE` `appts`

- **Line:** 413
- **Signature:** `any[]`

---

### `VARIABLE` `data`

- **Line:** 415

---

### `VARIABLE` `authorLower`

- **Line:** 416

---

### `VARIABLE` `notesLower`

- **Line:** 417

---

### `VARIABLE` `apptDate`

- **Line:** 428

---

### `VARIABLE` `leadId`

- **Line:** 433

---

### `VARIABLE` `lead`

- **Line:** 435

---

### `VARIABLE` `dateA`

- **Line:** 461

---

### `VARIABLE` `dateB`

- **Line:** 462

---

### `VARIABLE` `responseData`

- **Line:** 466

---

