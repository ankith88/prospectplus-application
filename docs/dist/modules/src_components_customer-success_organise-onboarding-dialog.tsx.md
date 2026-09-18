# Module: `src/components/customer-success/organise-onboarding-dialog.tsx`

- **Language:** TypeScript
- **Total Lines:** 262
- **Direct Dependencies:** 15 modules imported

## Exported Symbols & API

### `INTERFACE` `OrganiseOnboardingDialogProps`

- **Line:** 32

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `open` | `boolean` | No | - |
| `onOpenChange` | `(open: boolean) => void` | No | - |
| `lead` | `Lead | null` | Yes | - |
| `companyName` | `string` | Yes | - |
| `contactName` | `string` | Yes | - |
| `contactEmail` | `string` | Yes | - |
| `contactPhone` | `string` | Yes | - |
| `leadId` | `string` | Yes | - |
| `onSuccess` | `() => void` | Yes | - |

---

### `FUNCTION` `OrganiseOnboardingDialog`

- **Line:** 44
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{
  open,
  onOpenChange,
  lead,
  companyName: propCompanyName,
  contactName: propContactName,
  contactEmail: propContactEmail,
  contactPhone: propContactPhone,
  leadId: propLeadId,
  onSuccess,
}` | `OrganiseOnboardingDialogProps` | **Yes** | - | - |

---

### `VARIABLE` `firstContact`

- **Line:** 58

---

### `VARIABLE` `effectiveLeadId`

- **Line:** 59

---

### `VARIABLE` `effectiveCompanyName`

- **Line:** 60

---

### `VARIABLE` `effectiveContactName`

- **Line:** 61

---

### `VARIABLE` `effectiveContactEmail`

- **Line:** 62

---

### `VARIABLE` `effectiveContactPhone`

- **Line:** 63

---

### `VARIABLE` `liamUser`

- **Line:** 80

---

### `FUNCTION` `handleAssigneeChange`

- **Line:** 89

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `uid` | `string` | **Yes** | - | - |

---

### `VARIABLE` `found`

- **Line:** 91

---

### `VARIABLE` `isLpoPlusOnboarding`

- **Line:** 99

---

### `FUNCTION` `handleSubmit`

- **Line:** 109
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `e` | `React.FormEvent` | **Yes** | - | - |

---

