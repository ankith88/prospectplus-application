# Module: `src/components/multi-site-manager.tsx`

- **Language:** TypeScript
- **Total Lines:** 1209
- **Direct Dependencies:** 21 modules imported

## Exported Symbols & API

### `INTERFACE` `MultiSiteManagerProps`

- **Line:** 33

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `lead` | `Lead` | No | - |
| `contacts` | `Contact[]` | No | - |
| `onLocationsUpdated` | `() => void` | No | - |

---

### `FUNCTION` `MultiSiteManager`

- **Line:** 39
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ lead, contacts, onLocationsUpdated }` | `MultiSiteManagerProps` | **Yes** | - | - |

---

### `VARIABLE` `roleStr`

- **Line:** 42

---

### `VARIABLE` `canManageMultiSite`

- **Line:** 43

---

### `FUNCTION` `loadFrs`

- **Line:** 98
- **Async:** Yes
- **Returns:** `void`

---

### `VARIABLE` `frs`

- **Line:** 100

---

### `VARIABLE` `cityTrimmed`

- **Line:** 111

---

### `VARIABLE` `cityUpper`

- **Line:** 112

---

### `VARIABLE` `stateUpper`

- **Line:** 113

---

### `VARIABLE` `zipTrimmed`

- **Line:** 114

---

### `VARIABLE` `matches`

- **Line:** 123

---

### `VARIABLE` `matchedName`

- **Line:** 137

---

### `VARIABLE` `matchedId`

- **Line:** 138

---

### `FUNCTION` `loadRelatedLeads`

- **Line:** 161
- **Async:** Yes

---

### `VARIABLE` `resolvedParent`

- **Line:** 165
- **Signature:** `Lead | null`

---

### `VARIABLE` `resolvedChildren`

- **Line:** 166
- **Signature:** `Lead[]`

---

### `VARIABLE` `siblings`

- **Line:** 177

---

### `VARIABLE` `allFamily`

- **Line:** 188

---

### `VARIABLE` `signedIds`

- **Line:** 189

---

### `VARIABLE` `invs`

- **Line:** 195

---

### `VARIABLE` `controller`

- **Line:** 219

---

### `VARIABLE` `delayDebounce`

- **Line:** 221

---

### `VARIABLE` `results`

- **Line:** 228

---

### `FUNCTION` `handleLinkParent`

- **Line:** 247
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `parentId` | `string` | **Yes** | - | - |
| `parentName` | `string` | **Yes** | - | - |

---

### `VARIABLE` `controller`

- **Line:** 290

---

### `VARIABLE` `delayDebounce`

- **Line:** 292

---

### `VARIABLE` `results`

- **Line:** 299

---

### `FUNCTION` `handleLinkChild`

- **Line:** 318
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `childId` | `string` | **Yes** | - | - |
| `childName` | `string` | **Yes** | - | - |

---

### `VARIABLE` `childObj`

- **Line:** 322

---

### `VARIABLE` `newAddress`

- **Line:** 334
- **Signature:** `Address`

---

### `VARIABLE` `currentLocations`

- **Line:** 341

---

### `FUNCTION` `handleLinkMultipleChildren`

- **Line:** 365
- **Async:** Yes

---

### `VARIABLE` `currentLocations`

- **Line:** 369

---

### `VARIABLE` `connectedCount`

- **Line:** 370

---

### `VARIABLE` `childObj`

- **Line:** 373

---

### `VARIABLE` `newAddress`

- **Line:** 382
- **Signature:** `Address`

---

### `FUNCTION` `handleUnlinkParent`

- **Line:** 419
- **Async:** Yes

---

### `FUNCTION` `handleUnlinkChild`

- **Line:** 450
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `child` | `Lead` | **Yes** | - | - |

---

### `FUNCTION` `handleAddLocation`

- **Line:** 481
- **Async:** Yes

---

### `VARIABLE` `targetParentId`

- **Line:** 487

---

### `VARIABLE` `targetParentLead`

- **Line:** 488

---

### `VARIABLE` `newAddress`

- **Line:** 497
- **Signature:** `Address`

---

### `VARIABLE` `localManager`

- **Line:** 508
- **Signature:** `Contact`

---

### `VARIABLE` `finalCompanyName`

- **Line:** 516

---

### `VARIABLE` `childLeadId`

- **Line:** 519

---

### `VARIABLE` `currentLocations`

- **Line:** 533

---

### `VARIABLE` `isSelected`

- **Line:** 698

---

### `VARIABLE` `streetVal`

- **Line:** 819

---

### `VARIABLE` `cityVal`

- **Line:** 820

---

### `VARIABLE` `cityVal`

- **Line:** 843

---

### `VARIABLE` `found`

- **Line:** 894

---

### `VARIABLE` `addrObj`

- **Line:** 1048

---

### `VARIABLE` `parts`

- **Line:** 1049

---

### `VARIABLE` `isSigned`

- **Line:** 1064

---

### `VARIABLE` `inv`

- **Line:** 1065

---

### `VARIABLE` `firstItem`

- **Line:** 1066

---

### `VARIABLE` `serviceName`

- **Line:** 1067

---

### `VARIABLE` `addrObj`

- **Line:** 1112

---

### `VARIABLE` `parts`

- **Line:** 1113

---

### `VARIABLE` `isSigned`

- **Line:** 1128

---

### `VARIABLE` `inv`

- **Line:** 1129

---

### `VARIABLE` `firstItem`

- **Line:** 1130

---

### `VARIABLE` `serviceName`

- **Line:** 1131

---

