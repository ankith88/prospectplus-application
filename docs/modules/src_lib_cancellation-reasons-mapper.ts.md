# Module: `src/lib/cancellation-reasons-mapper.ts`

- **Language:** TypeScript
- **Total Lines:** 550

## Exported Symbols & API

### `INTERFACE` `CancellationHierarchyMatch`

- **Line:** 1

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `themeId` | `string` | No | - |
| `themeName` | `string` | No | - |
| `whyId` | `string` | No | - |
| `whyName` | `string` | No | - |
| `reasonId` | `string` | No | - |
| `reasonName` | `string` | No | - |

---

### `VARIABLE` `DEFAULT_CANCELLATION_HIERARCHY`

- **Line:** 10

---

### `FUNCTION` `getMergedCancellationHierarchy`

- **Line:** 293
- **Returns:** `any[]`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `incomingThemes` | `any[]` | No | - | - |

---

### `FUNCTION` `normId`

- **Line:** 294

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `any` | **Yes** | - | - |

---

### `VARIABLE` `mergedMap`

- **Line:** 295

---

### `VARIABLE` `tid`

- **Line:** 317

---

### `VARIABLE` `existingTheme`

- **Line:** 318

---

### `VARIABLE` `whyMap`

- **Line:** 332

---

### `VARIABLE` `wid`

- **Line:** 337

---

### `VARIABLE` `existingWhy`

- **Line:** 338

---

### `VARIABLE` `reasonMap`

- **Line:** 347

---

### `VARIABLE` `rid`

- **Line:** 351

---

### `FUNCTION` `autoMapLostOutcome`

- **Line:** 368
- **Returns:** `CancellationHierarchyMatch | null`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `outcome` | `string` | **Yes** | - | - |

---

### `VARIABLE` `normalized`

- **Line:** 369

---

### `TYPE` `CancellationType`

- **Line:** 451
- **Signature:** `'GREY' | 'GREEN' | 'YELLOW' | 'RED'`

---

### `INTERFACE` `CancellationTypeInfo`

- **Line:** 453

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `type` | `CancellationType` | No | - |
| `label` | `string` | No | - |
| `shortLabel` | `string` | No | - |
| `description` | `string` | No | - |
| `colorClass` | `string` | No | - |
| `badgeClass` | `string` | No | - |
| `hexColor` | `string` | No | - |

---

### `VARIABLE` `CANCELLATION_TYPE_CONFIG`

- **Line:** 463
- **Signature:** `Record<CancellationType, CancellationTypeInfo>`

---

### `FUNCTION` `getCancellationTypeInfo`

- **Line:** 502
- **Returns:** `CancellationTypeInfo`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `r` | `{
  cancellationReason?: string;
  cancelledByFranchisee?: boolean;
  isFranchiseeCancelled?: boolean;
  cancellationType?: string;
}` | **Yes** | - | - |

---

### `VARIABLE` `reason`

- **Line:** 513

---

### `VARIABLE` `greyKeywords`

- **Line:** 516

---

### `VARIABLE` `greenKeywords`

- **Line:** 535

---

