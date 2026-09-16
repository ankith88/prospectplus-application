# Module: `src/services/lpo-cancellation-cascade-server.ts`

- **Language:** TypeScript
- **Total Lines:** 123
- **Direct Dependencies:** 2 modules imported

## Exported Symbols & API

### `INTERFACE` `LpoCancellationCascadeOptions`

- **Line:** 4

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `leadId` | `string` | No | - |
| `companyName` | `string` | Yes | - |
| `cancellationReason` | `string` | Yes | - |
| `cancelledBy` | `string` | Yes | - |

---

### `FUNCTION` `processLpoCancellationCascade`

> Handles cascading cancellation for LPO Network customers:
1. Cancels all child leads and companies linked to the parent.
2. Marks linked lpo_leads documents as 'Lost' / 'Disabled'.
3. Disables LPO.Plus application user access (Auth & lpoconnect DB).

- **Line:** 17
- **Async:** Yes
- **Returns:** `Promise<{ success: boolean; updatedChildCount: number; updatedLpoCount: number }>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `options` | `LpoCancellationCascadeOptions` | **Yes** | - | - |

---

### `VARIABLE` `nowIso`

- **Line:** 19

---

### `VARIABLE` `leadRef`

- **Line:** 23

---

### `VARIABLE` `compRef`

- **Line:** 24

---

### `VARIABLE` `data`

- **Line:** 27

---

### `VARIABLE` `companyName`

- **Line:** 28

---

### `VARIABLE` `isLpoContext`

- **Line:** 30

---

### `VARIABLE` `childLeadIds`

- **Line:** 39

---

### `VARIABLE` `childCompIds`

- **Line:** 40

---

### `VARIABLE` `lpoLeadIdsToUpdate`

- **Line:** 41

---

### `VARIABLE` `parentIdToSearch`

- **Line:** 48

---

### `VARIABLE` `childCount`

- **Line:** 78

---

### `VARIABLE` `lpoCount`

- **Line:** 82

---

### `VARIABLE` `lpoRef`

- **Line:** 87

---

### `VARIABLE` `lpoSnap`

- **Line:** 88

---

### `VARIABLE` `lpoData`

- **Line:** 90

---

### `VARIABLE` `netSuiteId`

- **Line:** 104

---

### `VARIABLE` `contactEmail`

- **Line:** 105

---

### `VARIABLE` `mainNetsuiteId`

- **Line:** 112

---

### `VARIABLE` `mainEmail`

- **Line:** 113

---

