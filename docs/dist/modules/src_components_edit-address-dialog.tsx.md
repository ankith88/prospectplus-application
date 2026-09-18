# Module: `src/components/edit-address-dialog.tsx`

- **Language:** TypeScript
- **Total Lines:** 437
- **Direct Dependencies:** 18 modules imported

## Exported Symbols & API

### `VARIABLE` `formSchema`

- **Line:** 27

---

### `FUNCTION` `getInitialAddress`

- **Line:** 40
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `lead` | `Lead` | **Yes** | - | - |

---

### `VARIABLE` `addrObj`

- **Line:** 41
- **Signature:** `any`

---

### `FUNCTION` `clean`

- **Line:** 45

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `val` | `any` | **Yes** | - | - |

---

### `INTERFACE` `EditAddressDialogProps`

- **Line:** 59

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `lead` | `Lead` | No | - |
| `isOpen` | `boolean` | No | - |
| `onOpenChange` | `(open: boolean) => void` | No | - |
| `onLeadUpdated` | `(updatedLead: Partial<Lead>, oldLead: Lead) => void` | No | - |
| `userProfile` | `UserProfile | null` | Yes | - |

---

### `FUNCTION` `EditAddressDialog`

- **Line:** 67
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{
  lead,
  isOpen,
  onOpenChange,
  onLeadUpdated,
  userProfile,
}` | `EditAddressDialogProps` | **Yes** | - | - |

---

### `VARIABLE` `isUserRole`

- **Line:** 83

---

### `VARIABLE` `form`

- **Line:** 85

---

### `FUNCTION` `checkTerritory`

- **Line:** 92
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `city` | `string` | **Yes** | - | - |
| `zip` | `string` | **Yes** | - | - |

---

### `VARIABLE` `snap`

- **Line:** 96

---

### `VARIABLE` `franchisees`

- **Line:** 97

---

### `VARIABLE` `cityLower`

- **Line:** 98

---

### `VARIABLE` `zipLower`

- **Line:** 99

---

### `VARIABLE` `matches`

- **Line:** 101

---

### `VARIABLE` `firstId`

- **Line:** 112

---

### `VARIABLE` `initial`

- **Line:** 124

---

### `FUNCTION` `handleAddressSelect`

- **Line:** 139

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `parsed` | `Address` | **Yes** | - | - |

---

### `FUNCTION` `handleSendConfirmationEmail`

- **Line:** 145
- **Async:** Yes

---

### `VARIABLE` `currentAddrStr`

- **Line:** 148

---

### `VARIABLE` `formVals`

- **Line:** 149

---

### `VARIABLE` `newAddrStr`

- **Line:** 150

---

### `VARIABLE` `matchedNames`

- **Line:** 151

---

### `VARIABLE` `res`

- **Line:** 153

---

### `VARIABLE` `data`

- **Line:** 170

---

### `FUNCTION` `onSubmit`

- **Line:** 191
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `values` | `z.infer<typeof formSchema>` | **Yes** | - | - |

---

### `VARIABLE` `addressUpdate`

- **Line:** 193
- **Signature:** `Address`

---

### `VARIABLE` `payload`

- **Line:** 206
- **Signature:** `Partial<Lead>`

---

### `VARIABLE` `activityNote`

- **Line:** 215

---

### `VARIABLE` `chosen`

- **Line:** 224

---

### `VARIABLE` `chosenName`

- **Line:** 225

---

### `VARIABLE` `chosenId`

- **Line:** 226

---

### `VARIABLE` `matched`

- **Line:** 244

---

### `VARIABLE` `matchedName`

- **Line:** 245

---

### `VARIABLE` `matchedId`

- **Line:** 246

---

### `VARIABLE` `mergedSiteAddress`

- **Line:** 258
- **Signature:** `Address`

---

### `VARIABLE` `effectiveFranchiseeId`

- **Line:** 277

---

