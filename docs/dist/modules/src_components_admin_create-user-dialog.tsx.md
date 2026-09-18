# Module: `src/components/admin/create-user-dialog.tsx`

- **Language:** TypeScript
- **Total Lines:** 533
- **Direct Dependencies:** 16 modules imported

## Exported Symbols & API

### `VARIABLE` `formSchema`

- **Line:** 36

---

### `INTERFACE` `CreateUserDialogProps`

- **Line:** 65

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `isOpen` | `boolean` | No | - |
| `onOpenChange` | `(open: boolean) => void` | No | - |
| `onUserCreated` | `() => void` | No | - |

---

### `FUNCTION` `CreateUserDialog`

- **Line:** 71
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ isOpen, onOpenChange, onUserCreated }` | `CreateUserDialogProps` | **Yes** | - | - |

---

### `VARIABLE` `form`

- **Line:** 76

---

### `FUNCTION` `fetchData`

- **Line:** 114
- **Async:** Yes

---

### `VARIABLE` `activeBDRs`

- **Line:** 130

---

### `VARIABLE` `role`

- **Line:** 132

---

### `VARIABLE` `isOwnershipTransfer`

- **Line:** 133

---

### `FUNCTION` `handleSubmit`

- **Line:** 135
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `values` | `z.infer<typeof formSchema>` | **Yes** | - | - |

---

### `VARIABLE` `isSuperAdminRequiringApproval`

- **Line:** 138

---

### `VARIABLE` `isGrantingAdmin`

- **Line:** 139

---

### `VARIABLE` `effectiveRole`

- **Line:** 141

---

### `VARIABLE` `newUserId`

- **Line:** 143
- **Signature:** `string | undefined`

---

### `VARIABLE` `transferRes`

- **Line:** 147

---

### `VARIABLE` `transferData`

- **Line:** 157

---

### `VARIABLE` `fullAddressStr`

- **Line:** 163

---

### `VARIABLE` `createdId`

- **Line:** 164

---

### `VARIABLE` `origin`

- **Line:** 195

---

### `VARIABLE` `signInLink`

- **Line:** 196

---

### `VARIABLE` `fullName`

- **Line:** 197

---

### `VARIABLE` `emailHtml`

- **Line:** 198

---

### `VARIABLE` `selectedFr`

- **Line:** 308

---

