# Module: `src/services/parent-lead-conversion.ts`

- **Language:** TypeScript
- **Total Lines:** 141
- **Direct Dependencies:** 4 modules imported

## Exported Symbols & API

### `FUNCTION` `convertParentLeadToSignedCustomer`

> Converts a Parent Lead in the 'leads' collection into a Parent Signed Customer in the 'companies' collection,
and links existing and new child customers under this Parent Customer.

- **Line:** 12
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `parentLeadId` | `string` | **Yes** | - | - |
| `childLeadOrCompanyIds` | `string[]` | No | - | - |

---

### `VARIABLE` `leadRef`

- **Line:** 17

---

### `VARIABLE` `leadSnap`

- **Line:** 18

---

### `VARIABLE` `parentData`

- **Line:** 20
- **Signature:** `any`

---

### `VARIABLE` `isExistingCompany`

- **Line:** 21

---

### `VARIABLE` `compRef`

- **Line:** 27

---

### `VARIABLE` `compSnap`

- **Line:** 28

---

### `VARIABLE` `nowIso`

- **Line:** 39

---

### `VARIABLE` `companyRef`

- **Line:** 42

---

### `VARIABLE` `parentCompanyPayload`

- **Line:** 44
- **Signature:** `any`

---

### `VARIABLE` `childCompRef`

- **Line:** 93

---

### `VARIABLE` `childCompSnap`

- **Line:** 94

---

### `VARIABLE` `childLeadRef`

- **Line:** 105

---

### `VARIABLE` `childLeadSnap`

- **Line:** 106

---

