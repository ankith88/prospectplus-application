# Module: `src/components/cancel-customer-dialog.tsx`

- **Language:** TypeScript
- **Total Lines:** 681
- **Direct Dependencies:** 18 modules imported

## Exported Symbols & API

### `INTERFACE` `CancelCustomerDialogProps`

- **Line:** 29

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `isOpen` | `boolean` | No | - |
| `onOpenChange` | `(open: boolean) => void` | No | - |
| `lead` | `Lead | null` | Yes | - |
| `mode` | `'request' | 'cancel'` | Yes | - |
| `onSuccess` | `(updatedLeadDetails?: Partial<Lead>) => void` | Yes | - |

---

### `FUNCTION` `CancelCustomerDialog`

- **Line:** 37
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{
  isOpen,
  onOpenChange,
  lead,
  mode,
  onSuccess,
}` | `CancelCustomerDialogProps` | **Yes** | - | - |

---

### `VARIABLE` `isDirectCancel`

- **Line:** 47

---

### `VARIABLE` `defaultRequestedBy`

- **Line:** 69

---

### `VARIABLE` `defaultCapturedBy`

- **Line:** 73

---

### `FUNCTION` `fetchHierarchy`

- **Line:** 86
- **Async:** Yes

---

### `VARIABLE` `snap`

- **Line:** 88

---

### `FUNCTION` `handleProofFileUpload`

- **Line:** 98
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `e` | `React.ChangeEvent<HTMLInputElement>` | **Yes** | - | - |

---

### `VARIABLE` `files`

- **Line:** 99

---

### `VARIABLE` `uploadedList`

- **Line:** 104

---

### `VARIABLE` `file`

- **Line:** 106

---

### `VARIABLE` `fileUrl`

- **Line:** 107

---

### `VARIABLE` `storageRef`

- **Line:** 110

---

### `VARIABLE` `reader`

- **Line:** 116

---

### `FUNCTION` `handleRemoveProofAttachment`

- **Line:** 149

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `index` | `number` | **Yes** | - | - |

---

### `FUNCTION` `handleConfirmCancellation`

- **Line:** 153
- **Async:** Yes

---

### `VARIABLE` `selectedThemeObj`

- **Line:** 201

---

### `VARIABLE` `selectedWhyObj`

- **Line:** 202

---

### `VARIABLE` `selectedReasonObj`

- **Line:** 205

---

### `VARIABLE` `themeName`

- **Line:** 209

---

### `VARIABLE` `whyName`

- **Line:** 210

---

### `VARIABLE` `reasonName`

- **Line:** 211

---

### `VARIABLE` `staffName`

- **Line:** 213

---

### `VARIABLE` `userEmail`

- **Line:** 214

---

### `VARIABLE` `nowIso`

- **Line:** 215

---

### `VARIABLE` `companyRef`

- **Line:** 218

---

### `VARIABLE` `leadRef`

- **Line:** 219

---

### `VARIABLE` `existsInCompany`

- **Line:** 226

---

### `VARIABLE` `existsInLead`

- **Line:** 227

---

### `VARIABLE` `updates`

- **Line:** 241
- **Signature:** `any`

---

### `VARIABLE` `leadAny`

- **Line:** 281

---

### `VARIABLE` `cancelPayload`

- **Line:** 282

---

### `VARIABLE` `updates`

- **Line:** 373
- **Signature:** `any`

---

### `VARIABLE` `leadAny`

- **Line:** 412

---

### `VARIABLE` `cancelReqPayload`

- **Line:** 413

---

### `VARIABLE` `staffName`

- **Line:** 671

---

