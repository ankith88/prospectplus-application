# Module: `src/components/localmile-access-dialog.tsx`

- **Language:** TypeScript
- **Total Lines:** 282
- **Direct Dependencies:** 16 modules imported

## Exported Symbols & API

### `INTERFACE` `LocalMileAccessDialogProps`

- **Line:** 27

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `isOpen` | `boolean` | No | - |
| `onOpenChange` | `(open: boolean) => void` | No | - |
| `lead` | `Lead` | No | - |
| `onConfirm` | `(serviceType: string, rate: number, selectedContactsInfo: any[]) => Promise<void>` | No | - |

---

### `FUNCTION` `LocalMileAccessDialog`

- **Line:** 34
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{
  isOpen,
  onOpenChange,
  lead,
  onConfirm,
}` | `LocalMileAccessDialogProps` | **Yes** | - | - |

---

### `VARIABLE` `isDialer`

- **Line:** 41

---

### `VARIABLE` `pmpo`

- **Line:** 53

---

### `FUNCTION` `handleSelectContact`

- **Line:** 70

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `contactId` | `string` | **Yes** | - | - |
| `checked` | `boolean` | **Yes** | - | - |

---

### `FUNCTION` `handleRateChange`

- **Line:** 76

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `e` | `React.ChangeEvent<HTMLInputElement>` | **Yes** | - | - |

---

### `VARIABLE` `val`

- **Line:** 78

---

### `FUNCTION` `handleSubmit`

- **Line:** 84
- **Async:** Yes

---

### `VARIABLE` `validSelectedContacts`

- **Line:** 85

---

### `VARIABLE` `c`

- **Line:** 86

---

### `VARIABLE` `numericRate`

- **Line:** 108

---

### `VARIABLE` `selectedContactsInfo`

- **Line:** 120
- **Signature:** `any[]`

---

### `VARIABLE` `c`

- **Line:** 123

---

### `VARIABLE` `isValidContact`

- **Line:** 239

---

