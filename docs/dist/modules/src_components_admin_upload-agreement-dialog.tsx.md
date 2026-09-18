# Module: `src/components/admin/upload-agreement-dialog.tsx`

- **Language:** TypeScript
- **Total Lines:** 358
- **Direct Dependencies:** 8 modules imported

## Exported Symbols & API

### `INTERFACE` `UploadAgreementDialogProps`

- **Line:** 18

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `isOpen` | `boolean` | No | - |
| `onClose` | `() => void` | No | - |
| `franchiseeId` | `string` | No | - |
| `franchiseeName` | `string` | No | - |
| `onSuccess` | `() => void` | Yes | - |

---

### `FUNCTION` `UploadAgreementDialog`

- **Line:** 26
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{
  isOpen,
  onClose,
  franchiseeId,
  franchiseeName,
  onSuccess,
}` | `UploadAgreementDialogProps` | **Yes** | - | - |

---

### `FUNCTION` `handleFileChange`

- **Line:** 44

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `e` | `React.ChangeEvent<HTMLInputElement>` | **Yes** | - | - |

---

### `VARIABLE` `selected`

- **Line:** 46

---

### `FUNCTION` `handleUploadAndScrape`

- **Line:** 61
- **Async:** Yes

---

### `VARIABLE` `formData`

- **Line:** 70

---

### `VARIABLE` `response`

- **Line:** 81

---

### `VARIABLE` `data`

- **Line:** 86

---

### `FUNCTION` `resetAndClose`

- **Line:** 124

---

