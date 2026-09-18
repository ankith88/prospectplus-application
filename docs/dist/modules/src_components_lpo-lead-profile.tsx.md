# Module: `src/components/lpo-lead-profile.tsx`

- **Language:** TypeScript
- **Total Lines:** 1738
- **Direct Dependencies:** 19 modules imported

## Exported Symbols & API

### `INTERFACE` `LpoLeadProfileProps`

- **Line:** 32

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `initialLead` | `any` | No | - |

---

### `FUNCTION` `LpoLeadProfile`

- **Line:** 36
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ initialLead }` | `LpoLeadProfileProps` | **Yes** | - | - |

---

### `VARIABLE` `rawStatus`

- **Line:** 45

---

### `VARIABLE` `initialStatus`

- **Line:** 46

---

### `VARIABLE` `isScfAccepted`

- **Line:** 77

---

### `VARIABLE` `hasLinkedCustomer`

- **Line:** 78

---

### `FUNCTION` `checkLpoSuburbs`

- **Line:** 88
- **Async:** Yes
- **Returns:** `void`

---

### `VARIABLE` `franchiseeRefs`

- **Line:** 91

---

### `VARIABLE` `parentLpoId`

- **Line:** 92

---

### `VARIABLE` `extractedSuburbs`

- **Line:** 93
- **Signature:** `any[]`

---

### `VARIABLE` `linkedFrans`

- **Line:** 100

---

### `VARIABLE` `embedded`

- **Line:** 110

---

### `VARIABLE` `linkedFranIds`

- **Line:** 121

---

### `VARIABLE` `parentIdSet`

- **Line:** 129

---

### `VARIABLE` `childQueries`

- **Line:** 140
- **Signature:** `any[]`

---

### `VARIABLE` `childSnaps`

- **Line:** 154

---

### `VARIABLE` `d`

- **Line:** 158

---

### `VARIABLE` `embedded`

- **Line:** 176

---

### `VARIABLE` `allFranchisees`

- **Line:** 189

---

### `VARIABLE` `cleanRef`

- **Line:** 193

---

### `VARIABLE` `fData`

- **Line:** 196

---

### `VARIABLE` `suburbs`

- **Line:** 208

---

### `FUNCTION` `handleSyncLpoSuburbs`

- **Line:** 229
- **Async:** Yes

---

### `VARIABLE` `targetNetsuiteId`

- **Line:** 230

---

### `VARIABLE` `res`

- **Line:** 244

---

### `VARIABLE` `data`

- **Line:** 253

---

### `VARIABLE` `q`

- **Line:** 286

---

### `VARIABLE` `unsubscribe`

- **Line:** 291

---

### `VARIABLE` `list`

- **Line:** 292
- **Signature:** `any[]`

---

### `FUNCTION` `handleStatusChange`

- **Line:** 306
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `newStatus` | `string` | **Yes** | - | - |

---

### `VARIABLE` `confirmLost`

- **Line:** 322

---

### `VARIABLE` `res`

- **Line:** 331

---

### `VARIABLE` `data`

- **Line:** 339

---

### `VARIABLE` `docRef`

- **Line:** 344

---

### `VARIABLE` `updatePayload`

- **Line:** 345
- **Signature:** `any`

---

### `FUNCTION` `handleAddNote`

- **Line:** 382
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `e` | `React.FormEvent` | **Yes** | - | - |

---

### `VARIABLE` `authorName`

- **Line:** 387

---

### `VARIABLE` `nowIso`

- **Line:** 388

---

### `VARIABLE` `content`

- **Line:** 389

---

### `VARIABLE` `targetParentId`

- **Line:** 398

---

### `VARIABLE` `childIds`

- **Line:** 399
- **Signature:** `string[]`

---

### `VARIABLE` `crmLeadIdsToSync`

- **Line:** 400

---

### `VARIABLE` `lRef`

- **Line:** 406

---

### `VARIABLE` `lSnap`

- **Line:** 407

---

### `VARIABLE` `cRef`

- **Line:** 417

---

### `VARIABLE` `cSnap`

- **Line:** 418

---

### `FUNCTION` `handleSaveServiceRates`

- **Line:** 449
- **Async:** Yes

---

### `VARIABLE` `am`

- **Line:** 461

---

### `VARIABLE` `pm`

- **Line:** 462

---

### `VARIABLE` `pkg`

- **Line:** 463

---

### `VARIABLE` `add`

- **Line:** 464

---

### `VARIABLE` `newServices`

- **Line:** 466

---

### `VARIABLE` `lpoDocRef`

- **Line:** 469

---

### `VARIABLE` `updatedData`

- **Line:** 470

---

### `VARIABLE` `targetParentId`

- **Line:** 487

---

### `VARIABLE` `parentRef`

- **Line:** 490

---

### `VARIABLE` `childRef`

- **Line:** 503

---

### `FUNCTION` `getResolvedFranchisees`

- **Line:** 556
- **Returns:** `string[]`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadData` | `any` | **Yes** | - | - |

---

### `VARIABLE` `names`

- **Line:** 558
- **Signature:** `string[]`

---

### `VARIABLE` `n`

- **Line:** 564

---

### `VARIABLE` `n`

- **Line:** 574

---

### `VARIABLE` `directFields`

- **Line:** 580

---

### `FUNCTION` `handleOpenEditFranchisees`

- **Line:** 600
- **Async:** Yes

---

### `VARIABLE` `snap`

- **Line:** 605

---

### `VARIABLE` `list`

- **Line:** 606
- **Signature:** `any[]`

---

### `VARIABLE` `data`

- **Line:** 608

---

### `VARIABLE` `fName`

- **Line:** 609

---

### `FUNCTION` `handleSaveFranchisees`

- **Line:** 620
- **Async:** Yes

---

### `VARIABLE` `linkedFranchiseesPayload`

- **Line:** 623

---

### `VARIABLE` `matchingDoc`

- **Line:** 624

---

### `VARIABLE` `combinedName`

- **Line:** 631

---

### `VARIABLE` `lpoDocRef`

- **Line:** 632

---

### `VARIABLE` `updatePayload`

- **Line:** 634
- **Signature:** `any`

---

### `FUNCTION` `handleResetCrmLeads`

- **Line:** 679
- **Async:** Yes

---

### `VARIABLE` `targetParentId`

- **Line:** 680

---

### `VARIABLE` `childIdsToDelete`

- **Line:** 686

---

### `VARIABLE` `qChild`

- **Line:** 688

---

### `VARIABLE` `childSnap`

- **Line:** 689

---

### `VARIABLE` `deletedChildCount`

- **Line:** 700

---

### `VARIABLE` `lpoDocRef`

- **Line:** 709

---

### `VARIABLE` `resetPayload`

- **Line:** 710
- **Signature:** `any`

---

### `VARIABLE` `updatedLeadState`

- **Line:** 731

---

### `FUNCTION` `handleUpdateLpoStatus`

- **Line:** 763
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `newStatus` | `string` | **Yes** | - | - |
| `notes` | `string` | **Yes** | - | - |

---

### `VARIABLE` `res`

- **Line:** 766

---

### `VARIABLE` `data`

- **Line:** 775

---

### `VARIABLE` `docRef`

- **Line:** 780

---

### `VARIABLE` `updatePayload`

- **Line:** 781
- **Signature:** `any`

---

### `FUNCTION` `formatDate`

- **Line:** 815

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `timestamp` | `any` | **Yes** | - | - |

---

### `VARIABLE` `date`

- **Line:** 817

---

### `VARIABLE` `statusOptions`

- **Line:** 827

---

### `FUNCTION` `handleRecheckLpoPlusStatus`

- **Line:** 831
- **Async:** Yes

---

### `VARIABLE` `res`

- **Line:** 834

---

### `VARIABLE` `data`

- **Line:** 839

---

### `VARIABLE` `newSt`

- **Line:** 842

---

### `VARIABLE` `credText`

- **Line:** 1094

---

### `VARIABLE` `isNotUsing`

- **Line:** 1297

---

### `VARIABLE` `nextStatus`

- **Line:** 1298

---

### `VARIABLE` `author`

- **Line:** 1728

---

