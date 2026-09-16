# Module: `src/components/franchisee-lead-verification-client.tsx`

- **Language:** TypeScript
- **Total Lines:** 485
- **Direct Dependencies:** 19 modules imported

## Exported Symbols & API

### `FUNCTION` `isAssignedToUserOrAm`

- **Line:** 30
- **Returns:** `boolean`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `lead` | `Lead` | **Yes** | - | - |

---

### `VARIABLE` `am`

- **Line:** 31

---

### `VARIABLE` `dialer`

- **Line:** 32

---

### `VARIABLE` `isAmAssigned`

- **Line:** 34

---

### `VARIABLE` `isDialerAssigned`

- **Line:** 35

---

### `FUNCTION` `FranchiseeLeadVerificationClient`

- **Line:** 40
- **Returns:** `void`

---

### `VARIABLE` `isAdminOrSuperAdmin`

- **Line:** 64

---

### `VARIABLE` `fetchVerificationLeads`

- **Line:** 70

---

### `VARIABLE` `pendingLeads`

- **Line:** 82

---

### `VARIABLE` `isFranchiseeOrPending`

- **Line:** 83

---

### `VARIABLE` `isBucketValid`

- **Line:** 90

---

### `VARIABLE` `BATCH_SIZE`

- **Line:** 101

---

### `VARIABLE` `pendingLeadsWithContacts`

- **Line:** 102
- **Signature:** `typeof pendingLeads`

---

### `VARIABLE` `batch`

- **Line:** 104

---

### `VARIABLE` `batchResults`

- **Line:** 105

---

### `VARIABLE` `contacts`

- **Line:** 108

---

### `VARIABLE` `filteredAssignees`

- **Line:** 135

---

### `VARIABLE` `sortedUsers`

- **Line:** 136

---

### `VARIABLE` `ams`

- **Line:** 138

---

### `VARIABLE` `reps`

- **Line:** 144

---

### `FUNCTION` `handleOpenAssignModal`

- **Line:** 168

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `lead` | `Lead` | **Yes** | - | - |
| `bucket` | `'outbound' | 'account_manager'` | **Yes** | - | - |

---

### `FUNCTION` `handleConfirmAssignment`

- **Line:** 175
- **Async:** Yes

---

### `VARIABLE` `updateData`

- **Line:** 185
- **Signature:** `Partial<Lead>`

---

### `FUNCTION` `handleOpenEmailModal`

- **Line:** 226

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `lead` | `Lead` | **Yes** | - | - |

---

### `FUNCTION` `handleSendEmailToFranchisee`

- **Line:** 232
- **Async:** Yes

---

### `VARIABLE` `franchiseeObj`

- **Line:** 237

---

### `VARIABLE` `franchiseeEmail`

- **Line:** 242

---

