# Module: `src/components/customer-success/book-onboarding-appointment-dialog.tsx`

- **Language:** TypeScript
- **Total Lines:** 223
- **Direct Dependencies:** 13 modules imported

## Exported Symbols & API

### `INTERFACE` `BookOnboardingAppointmentDialogProps`

- **Line:** 30

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `open` | `boolean` | No | - |
| `onOpenChange` | `(open: boolean) => void` | No | - |
| `request` | `OnboardingRequest | null` | No | - |
| `onSuccess` | `() => void` | Yes | - |

---

### `FUNCTION` `BookOnboardingAppointmentDialog`

- **Line:** 37
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{
  open,
  onOpenChange,
  request,
  onSuccess,
}` | `BookOnboardingAppointmentDialogProps` | **Yes** | - | - |

---

### `VARIABLE` `tomorrow`

- **Line:** 56

---

### `VARIABLE` `defaultDateStr`

- **Line:** 58

---

### `FUNCTION` `handleSubmit`

- **Line:** 67
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `e` | `React.FormEvent` | **Yes** | - | - |

---

### `VARIABLE` `combinedISO`

- **Line:** 78

---

