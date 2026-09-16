# Module: `src/components/edit-contact-form.tsx`

- **Language:** TypeScript
- **Total Lines:** 258
- **Direct Dependencies:** 12 modules imported

## Exported Symbols & API

### `FUNCTION` `isValidRealEmail`

- **Line:** 23

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `val` | `string | undefined | null` | **Yes** | - | - |

---

### `VARIABLE` `email`

- **Line:** 25

---

### `VARIABLE` `parts`

- **Line:** 27

---

### `VARIABLE` `forbidden`

- **Line:** 28

---

### `VARIABLE` `isUserPartInvalid`

- **Line:** 31

---

### `VARIABLE` `domainLabels`

- **Line:** 34

---

### `VARIABLE` `isDomainPartInvalid`

- **Line:** 35

---

### `VARIABLE` `formSchema`

- **Line:** 40

---

### `INTERFACE` `EditContactFormProps`

- **Line:** 52

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `leadId` | `string` | No | - |
| `contact` | `Contact` | No | - |
| `onContactUpdated` | `(contact: Contact) => void` | No | - |
| `onClose` | `() => void` | No | - |
| `collectionName` | `'leads' | 'companies'` | Yes | - |

---

### `FUNCTION` `EditContactForm`

- **Line:** 60
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ leadId, contact, onContactUpdated, onClose, collectionName = 'leads' }` | `EditContactFormProps` | **Yes** | - | - |

---

### `VARIABLE` `nameParts`

- **Line:** 64

---

### `VARIABLE` `defaultFirstName`

- **Line:** 65

---

### `VARIABLE` `defaultLastName`

- **Line:** 66

---

### `VARIABLE` `form`

- **Line:** 68

---

### `FUNCTION` `onSubmit`

- **Line:** 81
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `values` | `z.infer<typeof formSchema>` | **Yes** | - | - |

---

### `VARIABLE` `firstName`

- **Line:** 83

---

### `VARIABLE` `lastName`

- **Line:** 84

---

### `VARIABLE` `fullName`

- **Line:** 85

---

### `VARIABLE` `accessToLocalMile`

- **Line:** 86
- **Signature:** `'yes' | 'no'`

---

### `VARIABLE` `accessToShipMate`

- **Line:** 87
- **Signature:** `'yes' | 'no'`

---

### `VARIABLE` `updatedContactData`

- **Line:** 88
- **Signature:** `Contact`

---

### `VARIABLE` `response`

- **Line:** 101

---

