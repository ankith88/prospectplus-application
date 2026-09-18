# Module: `src/hooks/use-permissions.tsx`

- **Language:** TypeScript
- **Total Lines:** 289
- **Direct Dependencies:** 6 modules imported

## Exported Symbols & API

### `INTERFACE` `PermissionsContextType`

- **Line:** 10

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `roleAccessMatrix` | `Record<string, string[]>` | No | - |
| `canView` | `(feature: string) => boolean` | No | - |
| `loadingPermissions` | `boolean` | No | - |

---

### `VARIABLE` `PermissionsContext`

- **Line:** 16

---

### `VARIABLE` `DEFAULT_ROLE_ACCESS`

- **Line:** 23
- **Signature:** `Record<string, string[]>`

---

### `FUNCTION` `PermissionsProvider`

- **Line:** 62

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ children }` | `{ children: React.ReactNode }` | **Yes** | - | - |

---

### `VARIABLE` `matrixDocRef`

- **Line:** 69

---

### `FUNCTION` `seedDefault`

- **Line:** 72
- **Async:** Yes

---

### `VARIABLE` `snapshot`

- **Line:** 74

---

### `VARIABLE` `currentFeatures`

- **Line:** 78

---

### `VARIABLE` `needsUpdate`

- **Line:** 79

---

### `VARIABLE` `currentReporting`

- **Line:** 81
- **Signature:** `string[]`

---

### `VARIABLE` `currentNewLead`

- **Line:** 87
- **Signature:** `string[]`

---

### `VARIABLE` `currentImportLeads`

- **Line:** 93
- **Signature:** `string[]`

---

### `VARIABLE` `currentArchivedLeads`

- **Line:** 99
- **Signature:** `string[]`

---

### `VARIABLE` `currentTerritoryMap`

- **Line:** 105
- **Signature:** `string[]`

---

### `VARIABLE` `currentSignedCustomers`

- **Line:** 117
- **Signature:** `string[]`

---

### `VARIABLE` `currentFranchisees`

- **Line:** 126
- **Signature:** `string[]`

---

### `VARIABLE` `currentHistoryAppointments`

- **Line:** 137
- **Signature:** `string[]`

---

### `VARIABLE` `currentHistoryCallsTranscripts`

- **Line:** 143
- **Signature:** `string[]`

---

### `VARIABLE` `currentTickets`

- **Line:** 154
- **Signature:** `string[]`

---

### `VARIABLE` `unsubscribe`

- **Line:** 173

---

### `FUNCTION` `canView`

- **Line:** 189
- **Returns:** `boolean`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `feature` | `string` | **Yes** | - | - |

---

### `VARIABLE` `roleLower`

- **Line:** 219

---

### `VARIABLE` `roleLower`

- **Line:** 227

---

### `VARIABLE` `roleLower`

- **Line:** 235

---

### `VARIABLE` `firestoreRoles`

- **Line:** 273

---

### `VARIABLE` `defaultRoles`

- **Line:** 274

---

### `VARIABLE` `allowedRoles`

- **Line:** 275

---

### `VARIABLE` `userRoleNormalized`

- **Line:** 277

---

### `FUNCTION` `usePermissions`

- **Line:** 288

---

