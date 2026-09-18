# Module: `src/components/ask/record-preview-drawer.tsx`

- **Language:** TypeScript
- **Total Lines:** 206
- **Direct Dependencies:** 7 modules imported

## Exported Symbols & API

### `INTERFACE` `RecordPreviewDrawerProps`

- **Line:** 14

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `isOpen` | `boolean` | No | - |
| `onClose` | `() => void` | No | - |
| `record` | `any` | No | - |
| `collection` | `string` | No | - |
| `onOpenTaskModal` | `(record: any) => void` | Yes | - |

---

### `FUNCTION` `RecordPreviewDrawer`

- **Line:** 22
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{
  isOpen,
  onClose,
  record,
  collection,
  onOpenTaskModal,
}` | `RecordPreviewDrawerProps` | **Yes** | - | - |

---

### `VARIABLE` `recordName`

- **Line:** 31

---

### `VARIABLE` `recordId`

- **Line:** 32

---

### `FUNCTION` `getRecordHref`

- **Line:** 34

---

### `VARIABLE` `statusColor`

- **Line:** 41

---

