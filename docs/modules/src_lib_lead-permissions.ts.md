# Module: `src/lib/lead-permissions.ts`

- **Language:** TypeScript
- **Total Lines:** 388
- **Direct Dependencies:** 1 modules imported

## Exported Symbols & API

### `FUNCTION` `isLeadActionableForUser`

- **Line:** 3
- **Returns:** `boolean`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `lead` | `Lead | null | undefined` | **Yes** | - | - |
| `userProfile` | `UserProfile | null | undefined` | **Yes** | - | - |
| `isSuperAdmin` | `boolean` | No | `false` | - |

---

### `VARIABLE` `role`

- **Line:** 10

---

### `VARIABLE` `roleLower`

- **Line:** 11

---

### `VARIABLE` `assignedRoles`

- **Line:** 27

---

### `VARIABLE` `isOperationsRole`

- **Line:** 28

---

### `VARIABLE` `isLpoNetworkBucket`

- **Line:** 34

---

### `VARIABLE` `userDisplayName`

- **Line:** 43

---

### `VARIABLE` `userEmail`

- **Line:** 44

---

### `VARIABLE` `userUid`

- **Line:** 45

---

### `FUNCTION` `isAssignedToUser`

- **Line:** 47

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `assignedValue` | `string | null` | No | - | - |

---

### `VARIABLE` `val`

- **Line:** 49

---

### `VARIABLE` `bucket`

- **Line:** 58

---

### `VARIABLE` `bucket`

- **Line:** 71

---

### `FUNCTION` `isAccountManagerUser`

- **Line:** 96
- **Returns:** `boolean`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `userProfile` | `UserProfile | null` | No | - | - |

---

### `VARIABLE` `roleLower`

- **Line:** 98

---

### `VARIABLE` `assignedRoles`

- **Line:** 99

---

### `VARIABLE` `amRoles`

- **Line:** 100

---

### `FUNCTION` `isAccountOrSalesManager`

- **Line:** 104
- **Returns:** `boolean`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `userProfile` | `UserProfile | null` | No | - | - |
| `isSuperAdmin` | `boolean` | No | `false` | - |

---

### `VARIABLE` `roleLower`

- **Line:** 109

---

### `VARIABLE` `assignedRoles`

- **Line:** 110

---

### `VARIABLE` `allowedRoles`

- **Line:** 111

---

### `FUNCTION` `canReassignLead`

- **Line:** 123
- **Returns:** `boolean`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `userProfile` | `UserProfile | null | undefined` | **Yes** | - | - |
| `isSuperAdmin` | `boolean` | No | `false` | - |

---

### `VARIABLE` `roleLower`

- **Line:** 130

---

### `VARIABLE` `assignedRoles`

- **Line:** 131

---

### `VARIABLE` `allowedRoles`

- **Line:** 132

---

### `FUNCTION` `canChangeBucket`

- **Line:** 145
- **Returns:** `boolean`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `userProfile` | `UserProfile | null | undefined` | **Yes** | - | - |
| `isSuperAdmin` | `boolean` | No | `false` | - |

---

### `VARIABLE` `roleLower`

- **Line:** 152

---

### `VARIABLE` `allowedRoles`

- **Line:** 154

---

### `FUNCTION` `isSaleDealsVisible`

- **Line:** 166
- **Returns:** `boolean`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `userProfile` | `UserProfile | null | undefined` | **Yes** | - | - |

---

### `VARIABLE` `roleLower`

- **Line:** 171

---

### `FUNCTION` `canEditSignedCustomerAddress`

- **Line:** 179
- **Returns:** `boolean`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `userProfile` | `UserProfile | null | undefined` | **Yes** | - | - |
| `isSuperAdmin` | `boolean` | No | `false` | - |

---

### `VARIABLE` `roleLower`

- **Line:** 186

---

### `FUNCTION` `isFranchiseeRole`

- **Line:** 194
- **Returns:** `boolean`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `userProfile` | `Partial<UserProfile> | null | undefined` | **Yes** | - | - |

---

### `VARIABLE` `role`

- **Line:** 196

---

### `VARIABLE` `roleLower`

- **Line:** 197

---

### `VARIABLE` `assignedRoles`

- **Line:** 198

---

### `FUNCTION` `canFranchiseeAccessLead`

- **Line:** 202
- **Returns:** `boolean`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `lead` | `Lead | null | undefined` | **Yes** | - | - |
| `userProfile` | `UserProfile | null | undefined` | **Yes** | - | - |

---

### `VARIABLE` `role`

- **Line:** 208

---

### `VARIABLE` `roleLower`

- **Line:** 209

---

### `VARIABLE` `isFranchiseeRole`

- **Line:** 210

---

### `VARIABLE` `userFranchiseeNames`

- **Line:** 219

---

### `VARIABLE` `userFranchiseeIds`

- **Line:** 220

---

### `VARIABLE` `leadFranchiseeName`

- **Line:** 274

---

### `VARIABLE` `leadFranchiseeId`

- **Line:** 275

---

### `VARIABLE` `hasLinkedMatch`

- **Line:** 295

---

### `VARIABLE` `norm`

- **Line:** 297

---

### `VARIABLE` `nameNorm`

- **Line:** 300

---

### `VARIABLE` `idNorm`

- **Line:** 301

---

### `VARIABLE` `userDisplayName`

- **Line:** 311

---

### `VARIABLE` `userEmail`

- **Line:** 312

---

### `VARIABLE` `userUid`

- **Line:** 313

---

### `VARIABLE` `userName`

- **Line:** 314

---

### `FUNCTION` `isUserIdentity`

- **Line:** 316

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `val` | `string | null` | No | - | - |

---

### `VARIABLE` `norm`

- **Line:** 318

---

### `FUNCTION` `isSignedCustomer`

- **Line:** 344
- **Returns:** `boolean`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `lead` | `Partial<Lead> | null` | No | - | - |

---

### `VARIABLE` `status`

- **Line:** 346

---

### `VARIABLE` `customerStatus`

- **Line:** 347

---

### `VARIABLE` `isCompany`

- **Line:** 348

---

### `FUNCTION` `canChangeFranchisee`

- **Line:** 363
- **Returns:** `boolean`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `lead` | `Partial<Lead> | null | undefined` | **Yes** | - | - |
| `userProfile` | `UserProfile | null | undefined` | **Yes** | - | - |
| `isSuperAdmin` | `boolean` | No | `false` | - |

---

### `VARIABLE` `role`

- **Line:** 370

---

### `VARIABLE` `roleLower`

- **Line:** 371

---

### `VARIABLE` `isStrictAdmin`

- **Line:** 372

---

