# Module: `src/components/add-contact-form.tsx`

- **Language:** TypeScript
- **Total Lines:** 231
- **Direct Dependencies:** 10 modules imported

## Exported Symbols & API

### `FUNCTION` `isValidRealEmail`

- **Line:** 21

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `val` | `string | undefined | null` | **Yes** | - | - |

---

### `VARIABLE` `email`

- **Line:** 23

---

### `VARIABLE` `parts`

- **Line:** 25

---

### `VARIABLE` `forbidden`

- **Line:** 26

---

### `VARIABLE` `isUserPartInvalid`

- **Line:** 29

---

### `VARIABLE` `domainLabels`

- **Line:** 32

---

### `VARIABLE` `isDomainPartInvalid`

- **Line:** 33

---

### `VARIABLE` `formSchema`

- **Line:** 38

---

### `INTERFACE` `AddContactFormProps`

- **Line:** 50

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `leadId` | `string` | No | - |
| `onContactAdded` | `(contact: Contact) => void` | No | - |
| `collectionName` | `'leads' | 'companies'` | Yes | - |

---

### `FUNCTION` `AddContactForm`

- **Line:** 56
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ leadId, onContactAdded, collectionName = 'leads' }` | `AddContactFormProps` | **Yes** | - | - |

---

### `VARIABLE` `form`

- **Line:** 59

---

### `FUNCTION` `onSubmit`

- **Line:** 72
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `values` | `z.infer<typeof formSchema>` | **Yes** | - | - |

---

### `VARIABLE` `firstName`

- **Line:** 74

---

### `VARIABLE` `lastName`

- **Line:** 75

---

### `VARIABLE` `fullName`

- **Line:** 76

---

### `VARIABLE` `contactData`

- **Line:** 78
- **Signature:** `Omit<Contact, 'id'>`

---

### `VARIABLE` `response`

- **Line:** 90

---

