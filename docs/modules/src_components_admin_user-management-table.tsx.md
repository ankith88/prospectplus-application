# Module: `src/components/admin/user-management-table.tsx`

- **Language:** TypeScript
- **Total Lines:** 1507
- **Direct Dependencies:** 21 modules imported

## Exported Symbols & API

### `INTERFACE` `LinkedFranchiseeStateItem`

- **Line:** 34

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `franchiseeId` | `string` | No | - |
| `franchiseeName` | `string` | No | - |
| `relationship` | `'owner' | 'investor'` | No | - |
| `isDefault` | `boolean` | Yes | - |

---

### `FUNCTION` `UserManagementTable`

- **Line:** 49
- **Returns:** `void`

---

### `VARIABLE` `isOriginalAdmin`

- **Line:** 115

---

### `VARIABLE` `isSuperAdminRequiringApproval`

- **Line:** 116

---

### `VARIABLE` `fetchUsers`

- **Line:** 118

---

### `VARIABLE` `urlParams`

- **Line:** 140

---

### `VARIABLE` `approvalSuccess`

- **Line:** 141

---

### `VARIABLE` `approvalMessage`

- **Line:** 142

---

### `VARIABLE` `approvalError`

- **Line:** 143

---

### `VARIABLE` `assigned`

- **Line:** 160

---

### `VARIABLE` `isFranchiseeUser`

- **Line:** 161

---

### `VARIABLE` `linkedFran`

- **Line:** 171

---

### `VARIABLE` `initialLinkedFrans`

- **Line:** 173
- **Signature:** `LinkedFranchiseeStateItem[]`

---

### `VARIABLE` `fId`

- **Line:** 182

---

### `VARIABLE` `displayNameParts`

- **Line:** 192

---

### `FUNCTION` `handleToggleActivation`

- **Line:** 216
- **Async:** Yes

---

### `FUNCTION` `handleDeleteUser`

- **Line:** 232
- **Async:** Yes

---

### `FUNCTION` `handleUnlinkFranchisee`

- **Line:** 276
- **Async:** Yes

---

### `FUNCTION` `handleSendResetEmail`

- **Line:** 302
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `email` | `string` | **Yes** | - | - |

---

### `VARIABLE` `response`

- **Line:** 305

---

### `VARIABLE` `data`

- **Line:** 310

---

### `FUNCTION` `generateRandomPassword`

- **Line:** 325

---

### `VARIABLE` `chars`

- **Line:** 326

---

### `VARIABLE` `pass`

- **Line:** 327

---

### `FUNCTION` `handleDirectPasswordReset`

- **Line:** 334
- **Async:** Yes

---

### `VARIABLE` `response`

- **Line:** 346

---

### `VARIABLE` `data`

- **Line:** 355

---

### `FUNCTION` `handleUpdateUser`

- **Line:** 376
- **Async:** Yes

---

### `VARIABLE` `userCurrentlyHasAdmin`

- **Line:** 380

---

### `VARIABLE` `isTryingToGrantAdmin`

- **Line:** 381

---

### `VARIABLE` `effectiveAssignedRoles`

- **Line:** 383

---

### `VARIABLE` `effectiveDefaultRole`

- **Line:** 384

---

### `VARIABLE` `approvalRequested`

- **Line:** 385

---

### `VARIABLE` `computedFirstName`

- **Line:** 411

---

### `VARIABLE` `computedLastName`

- **Line:** 412

---

### `VARIABLE` `computedDisplayName`

- **Line:** 413

---

### `VARIABLE` `updateData`

- **Line:** 415
- **Signature:** `Partial<UserProfile>`

---

### `VARIABLE` `isUnlinkingFranchisee`

- **Line:** 426

---

### `VARIABLE` `validLinkedFrans`

- **Line:** 453

---

### `VARIABLE` `hasDefault`

- **Line:** 455

---

### `VARIABLE` `defaultFran`

- **Line:** 459

---

### `FUNCTION` `handleApproveRequest`

- **Line:** 512
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `request` | `AdminApprovalRequest` | **Yes** | - | - |

---

### `FUNCTION` `handleRejectRequest`

- **Line:** 530
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `request` | `AdminApprovalRequest` | **Yes** | - | - |

---

### `FUNCTION` `handleBulkLogout`

- **Line:** 548
- **Async:** Yes

---

### `VARIABLE` `timestamp`

- **Line:** 552

---

### `FUNCTION` `handleNotifySelected`

- **Line:** 566

---

### `VARIABLE` `targets`

- **Line:** 567

---

### `FUNCTION` `handleNotifySingle`

- **Line:** 572

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `user` | `UserProfile` | **Yes** | - | - |

---

### `FUNCTION` `handleSelectUser`

- **Line:** 577

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `uid` | `string` | **Yes** | - | - |
| `checked` | `boolean` | **Yes** | - | - |

---

### `FUNCTION` `handleSelectAll`

- **Line:** 583

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `checked` | `boolean` | **Yes** | - | - |

---

### `VARIABLE` `userCounts`

- **Line:** 587

---

### `VARIABLE` `active`

- **Line:** 588

---

### `VARIABLE` `disabled`

- **Line:** 589

---

### `VARIABLE` `all`

- **Line:** 590

---

### `VARIABLE` `processedUsers`

- **Line:** 595

---

### `VARIABLE` `result`

- **Line:** 596

---

### `VARIABLE` `lowerSearch`

- **Line:** 605

---

### `VARIABLE` `aValue`

- **Line:** 617

---

### `VARIABLE` `bValue`

- **Line:** 618

---

### `VARIABLE` `activeBDRs`

- **Line:** 628

---

### `FUNCTION` `requestSort`

- **Line:** 632

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `key` | `keyof UserProfile` | **Yes** | - | - |

---

### `VARIABLE` `direction`

- **Line:** 633
- **Signature:** `'ascending' | 'descending'`

---

### `FUNCTION` `getSortIndicator`

- **Line:** 640

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `key` | `keyof UserProfile` | **Yes** | - | - |

---

### `VARIABLE` `pendingReq`

- **Line:** 809

---

### `VARIABLE` `isPending`

- **Line:** 810

---

### `VARIABLE` `isApproved`

- **Line:** 811

---

### `VARIABLE` `isRejected`

- **Line:** 812

---

### `VARIABLE` `defaultPass`

- **Line:** 907

---

### `VARIABLE` `selectedFr`

- **Line:** 1194

---

### `VARIABLE` `name`

- **Line:** 1195

---

### `VARIABLE` `filtered`

- **Line:** 1257

---

### `VARIABLE` `generated`

- **Line:** 1452

---

