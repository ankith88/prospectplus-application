# Module: `src/components/share-opportunity-dialog.tsx`

- **Language:** TypeScript
- **Total Lines:** 526
- **Direct Dependencies:** 12 modules imported

## Exported Symbols & API

### `INTERFACE` `SystemUser`

- **Line:** 37

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | No | - |
| `name` | `string` | No | - |
| `email` | `string` | No | - |
| `role` | `string` | No | - |

---

### `INTERFACE` `ShareOpportunityDialogProps`

- **Line:** 44

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `open` | `boolean` | No | - |
| `onOpenChange` | `(open: boolean) => void` | No | - |
| `lead` | `Lead | null` | No | - |

---

### `FUNCTION` `ShareOpportunityDialog`

- **Line:** 50
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{
  open,
  onOpenChange,
  lead,
}` | `ShareOpportunityDialogProps` | **Yes** | - | - |

---

### `VARIABLE` `companyName`

- **Line:** 78

---

### `FUNCTION` `fetchSystemUsers`

- **Line:** 92
- **Async:** Yes

---

### `VARIABLE` `snap`

- **Line:** 95

---

### `VARIABLE` `users`

- **Line:** 96
- **Signature:** `SystemUser[]`

---

### `VARIABLE` `data`

- **Line:** 98

---

### `VARIABLE` `roleMap`

- **Line:** 112
- **Signature:** `Record<string, boolean>`

---

### `VARIABLE` `publicToken`

- **Line:** 126

---

### `FUNCTION` `getPublicUrl`

- **Line:** 127

---

### `VARIABLE` `origin`

- **Line:** 128

---

### `FUNCTION` `handleCopyLink`

- **Line:** 132

---

### `VARIABLE` `url`

- **Line:** 133

---

### `FUNCTION` `addEmailToField`

- **Line:** 144

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `field` | `'to' | 'cc'` | **Yes** | - | - |
| `emailStr` | `string` | **Yes** | - | - |

---

### `VARIABLE` `email`

- **Line:** 145

---

### `FUNCTION` `removeEmailFromField`

- **Line:** 161

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `field` | `'to' | 'cc'` | **Yes** | - | - |
| `email` | `string` | **Yes** | - | - |

---

### `FUNCTION` `handleKeyDownInput`

- **Line:** 169

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `field` | `'to' | 'cc'` | **Yes** | - | - |
| `e` | `React.KeyboardEvent<HTMLInputElement>` | **Yes** | - | - |

---

### `VARIABLE` `val`

- **Line:** 172

---

### `VARIABLE` `filteredUsers`

- **Line:** 178

---

### `VARIABLE` `q`

- **Line:** 179

---

### `VARIABLE` `groupedUsersByRole`

- **Line:** 184

---

### `VARIABLE` `r`

- **Line:** 185

---

### `VARIABLE` `roleKeys`

- **Line:** 191

---

### `FUNCTION` `toggleRoleExpand`

- **Line:** 193

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `role` | `string` | **Yes** | - | - |

---

### `FUNCTION` `handleSendEmail`

- **Line:** 198
- **Async:** Yes

---

### `VARIABLE` `finalTo`

- **Line:** 200

---

### `VARIABLE` `finalCc`

- **Line:** 205

---

### `VARIABLE` `res`

- **Line:** 222

---

### `VARIABLE` `data`

- **Line:** 235

---

### `VARIABLE` `companyName`

- **Line:** 259

---

### `VARIABLE` `prospectPlusId`

- **Line:** 260

---

### `VARIABLE` `usersInRole`

- **Line:** 432

---

### `VARIABLE` `isExpanded`

- **Line:** 433

---

