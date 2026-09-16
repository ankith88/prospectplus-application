# Module: `src/components/manage-additional-addresses-dialog.tsx`

- **Language:** TypeScript
- **Total Lines:** 243
- **Direct Dependencies:** 14 modules imported

## Exported Symbols & API

### `VARIABLE` `standardTags`

- **Line:** 23

---

### `VARIABLE` `formSchema`

- **Line:** 25

---

### `INTERFACE` `ManageAdditionalAddressesDialogProps`

- **Line:** 40

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `leadId` | `string` | No | - |
| `isCompany` | `boolean` | No | - |
| `addressToEdit` | `TaggedAddress | null` | Yes | - |
| `isOpen` | `boolean` | No | - |
| `onOpenChange` | `(open: boolean) => void` | No | - |
| `onAddressSaved` | `() => void` | No | - |

---

### `FUNCTION` `ManageAdditionalAddressesDialog`

- **Line:** 49
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{
  leadId,
  isCompany,
  addressToEdit,
  isOpen,
  onOpenChange,
  onAddressSaved,
}` | `ManageAdditionalAddressesDialogProps` | **Yes** | - | - |

---

### `VARIABLE` `form`

- **Line:** 60

---

### `VARIABLE` `isStandard`

- **Line:** 81

---

### `FUNCTION` `onSubmit`

- **Line:** 117
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `values` | `z.infer<typeof formSchema>` | **Yes** | - | - |

---

### `VARIABLE` `finalTag`

- **Line:** 119

---

### `VARIABLE` `addressData`

- **Line:** 125
- **Signature:** `Omit<TaggedAddress, 'id'>`

---

