# Module: `src/components/shipmate-access-dialog.tsx`

- **Language:** TypeScript
- **Total Lines:** 124
- **Direct Dependencies:** 10 modules imported

## Exported Symbols & API

### `INTERFACE` `ShipMateAccessDialogProps`

- **Line:** 22

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `isOpen` | `boolean` | No | - |
| `onOpenChange` | `(open: boolean) => void` | No | - |
| `lead` | `Lead` | No | - |
| `onConfirm` | `() => Promise<void>` | No | - |

---

### `FUNCTION` `ShipMateAccessDialog`

- **Line:** 29
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{
  isOpen,
  onOpenChange,
  lead,
  onConfirm,
}` | `ShipMateAccessDialogProps` | **Yes** | - | - |

---

### `FUNCTION` `handleSelectContact`

- **Line:** 45

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `contactId` | `string` | **Yes** | - | - |
| `checked` | `boolean` | **Yes** | - | - |

---

### `FUNCTION` `handleSubmit`

- **Line:** 51
- **Async:** Yes

---

