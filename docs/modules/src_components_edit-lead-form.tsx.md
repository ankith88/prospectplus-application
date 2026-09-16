# Module: `src/components/edit-lead-form.tsx`

- **Language:** TypeScript
- **Total Lines:** 285
- **Direct Dependencies:** 14 modules imported

## Exported Symbols & API

### `VARIABLE` `formSchema`

- **Line:** 31

---

### `INTERFACE` `EditLeadFormProps`

- **Line:** 46

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `lead` | `Lead` | No | - |
| `onLeadUpdated` | `(lead: Partial<Lead>, oldLead: Lead) => void` | No | - |

---

### `FUNCTION` `EditLeadForm`

- **Line:** 51
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ lead, onLeadUpdated }` | `EditLeadFormProps` | **Yes** | - | - |

---

### `VARIABLE` `form`

- **Line:** 54

---

### `FUNCTION` `onSubmit`

- **Line:** 67
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `values` | `z.infer<typeof formSchema>` | **Yes** | - | - |

---

### `VARIABLE` `changes`

- **Line:** 70
- **Signature:** `string[]`

---

### `VARIABLE` `nsResult`

- **Line:** 108

---

### `VARIABLE` `nsCustomerResult`

- **Line:** 119

---

