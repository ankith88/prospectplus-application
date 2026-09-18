# Module: `src/components/customer-success/cs-requests-dashboard.tsx`

- **Language:** TypeScript
- **Total Lines:** 1478
- **Direct Dependencies:** 25 modules imported

## Exported Symbols & API

### `VARIABLE` `REASONS`

- **Line:** 49

---

### `FUNCTION` `CSRequestsDashboard`

- **Line:** 51
- **Returns:** `void`

---

### `FUNCTION` `handleOpenResellDialog`

- **Line:** 83
- **Async:** Yes

---

### `VARIABLE` `compSnap`

- **Line:** 87

---

### `VARIABLE` `leadSnap`

- **Line:** 88

---

### `FUNCTION` `handleResellSuccess`

- **Line:** 111
- **Async:** Yes

---

### `VARIABLE` `userDisplayName`

- **Line:** 114

---

### `VARIABLE` `processedAt`

- **Line:** 115

---

### `VARIABLE` `saveCompRef`

- **Line:** 137

---

### `VARIABLE` `saveLeadRef`

- **Line:** 138

---

### `VARIABLE` `saveUpdates`

- **Line:** 144

---

### `FUNCTION` `fetchHierarchy`

- **Line:** 197
- **Async:** Yes

---

### `VARIABLE` `snap`

- **Line:** 199

---

### `FUNCTION` `fetchRequests`

- **Line:** 208
- **Async:** Yes

---

### `FUNCTION` `isPublicOrProfileRequest`

- **Line:** 212

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `item` | `any` | **Yes** | - | - |

---

### `VARIABLE` `csSnap`

- **Line:** 223

---

### `VARIABLE` `csList`

- **Line:** 224

---

### `VARIABLE` `cancelSnap`

- **Line:** 229

---

### `VARIABLE` `legacyList`

- **Line:** 230

---

### `VARIABLE` `data`

- **Line:** 232

---

### `VARIABLE` `existingKeys`

- **Line:** 258

---

### `VARIABLE` `dateStr`

- **Line:** 260

---

### `VARIABLE` `existingIds`

- **Line:** 264

---

### `VARIABLE` `merged`

- **Line:** 266

---

### `VARIABLE` `dateStr`

- **Line:** 269

---

### `VARIABLE` `key`

- **Line:** 270

---

### `VARIABLE` `filteredRequests`

- **Line:** 298

---

### `VARIABLE` `q`

- **Line:** 313

---

### `VARIABLE` `comp`

- **Line:** 314

---

### `VARIABLE` `ns`

- **Line:** 315

---

### `VARIABLE` `contact`

- **Line:** 316

---

### `VARIABLE` `email`

- **Line:** 317

---

### `VARIABLE` `stats`

- **Line:** 326

---

### `VARIABLE` `total`

- **Line:** 327

---

### `VARIABLE` `serviceChanges`

- **Line:** 328

---

### `VARIABLE` `cancellations`

- **Line:** 329

---

### `VARIABLE` `pending`

- **Line:** 330

---

### `FUNCTION` `handleOpenProcess`

- **Line:** 335

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `req` | `CSRequest` | **Yes** | - | - |

---

### `VARIABLE` `activeThemes`

- **Line:** 347

---

### `VARIABLE` `initThemeId`

- **Line:** 348

---

### `VARIABLE` `initWhyId`

- **Line:** 349

---

### `VARIABLE` `initReasonId`

- **Line:** 350

---

### `FUNCTION` `handleProofFileUpload`

- **Line:** 377
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `e` | `React.ChangeEvent<HTMLInputElement>` | **Yes** | - | - |

---

### `VARIABLE` `files`

- **Line:** 378

---

### `VARIABLE` `uploadedList`

- **Line:** 383

---

### `VARIABLE` `file`

- **Line:** 385

---

### `VARIABLE` `fileUrl`

- **Line:** 386

---

### `VARIABLE` `storageRef`

- **Line:** 389

---

### `VARIABLE` `reader`

- **Line:** 395

---

### `FUNCTION` `handleRemoveProofAttachment`

- **Line:** 428

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `index` | `number` | **Yes** | - | - |

---

### `FUNCTION` `handleCopyPublicLink`

- **Line:** 432

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `companyId` | `string` | **Yes** | - | - |
| `companyName` | `string` | **Yes** | - | - |

---

### `VARIABLE` `origin`

- **Line:** 433

---

### `VARIABLE` `publicUrl`

- **Line:** 434

---

### `FUNCTION` `handleInitiateCall`

- **Line:** 443

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `phoneNumber` | `string` | **Yes** | - | - |

---

### `FUNCTION` `handleProcessServiceChange`

- **Line:** 449
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `newStatus` | `'Completed' | 'Cancelled'` | **Yes** | - | - |

---

### `VARIABLE` `userDisplayName`

- **Line:** 453

---

### `VARIABLE` `processedAt`

- **Line:** 454

---

### `VARIABLE` `compRef`

- **Line:** 457

---

### `VARIABLE` `leadRef`

- **Line:** 458

---

### `VARIABLE` `updates`

- **Line:** 464

---

### `VARIABLE` `compRef`

- **Line:** 507

---

### `VARIABLE` `leadRef`

- **Line:** 508

---

### `FUNCTION` `handleProcessCancellation`

- **Line:** 542
- **Async:** Yes

---

### `VARIABLE` `userDisplayName`

- **Line:** 558

---

### `VARIABLE` `processedAt`

- **Line:** 559

---

### `VARIABLE` `saveCompRef`

- **Line:** 594

---

### `VARIABLE` `saveLeadRef`

- **Line:** 595

---

### `VARIABLE` `saveUpdates`

- **Line:** 601

---

### `VARIABLE` `activeThemes`

- **Line:** 633

---

### `VARIABLE` `selectedThemeObj`

- **Line:** 634

---

### `VARIABLE` `selectedWhyObj`

- **Line:** 635

---

### `VARIABLE` `selectedReasonObj`

- **Line:** 636

---

### `VARIABLE` `themeName`

- **Line:** 638

---

### `VARIABLE` `whyName`

- **Line:** 639

---

### `VARIABLE` `reasonName`

- **Line:** 640

---

### `VARIABLE` `cancelCompRef`

- **Line:** 676

---

### `VARIABLE` `cancelLeadRef`

- **Line:** 677

---

### `VARIABLE` `cancelUpdates`

- **Line:** 683

---

### `VARIABLE` `activityNotes`

- **Line:** 696

---

### `VARIABLE` `isServiceChange`

- **Line:** 901

---

### `VARIABLE` `formattedDate`

- **Line:** 902

---

### `VARIABLE` `updated`

- **Line:** 1167

---

### `VARIABLE` `updated`

- **Line:** 1192

---

