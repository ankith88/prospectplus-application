# Module: `src/components/dialer-insights-dialog.tsx`

- **Language:** TypeScript
- **Total Lines:** 182
- **Direct Dependencies:** 6 modules imported

## Exported Symbols & API

### `INTERFACE` `DialerInsightsData`

- **Line:** 18

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `leadId` | `string` | Yes | - |
| `companyName` | `string` | Yes | - |
| `phoneNumber` | `string` | Yes | - |
| `suggestedOpener` | `string` | Yes | - |
| `suggestedPersonalisation` | `string` | Yes | - |
| `apRelationship` | `string` | Yes | - |

---

### `INTERFACE` `DialerInsightsDialogProps`

- **Line:** 27

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `open` | `boolean` | No | - |
| `onOpenChange` | `(open: boolean) => void` | No | - |
| `data` | `DialerInsightsData | null` | No | - |
| `onConfirmDial` | `() => void` | No | - |

---

### `FUNCTION` `DialerInsightsDialog`

- **Line:** 34
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{
  open,
  onOpenChange,
  data,
  onConfirmDial
}` | `DialerInsightsDialogProps` | **Yes** | - | - |

---

### `FUNCTION` `handleCopy`

- **Line:** 44

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `text` | `string` | No | - | - |
| `fieldName` | `string` | No | - | - |

---

### `FUNCTION` `handleDial`

- **Line:** 51

---

