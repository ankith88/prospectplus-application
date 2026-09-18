# Module: `src/services/admin-approval.ts`

- **Language:** TypeScript
- **Total Lines:** 271
- **Direct Dependencies:** 4 modules imported

## Exported Symbols & API

### `VARIABLE` `ORIGINAL_ADMIN_UID`

- **Line:** 6

---

### `VARIABLE` `SUPER_ADMIN_REQUIRING_APPROVAL_UID`

- **Line:** 7

---

### `FUNCTION` `createAdminApprovalRequest`

> Creates an admin approval request when super admin `a543AEr3TcaHyj4c1Gh0fJoQ6UB2` grants admin access.

- **Line:** 12
- **Async:** Yes
- **Returns:** `Promise<string>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `params` | `{
  targetUserId: string;
  targetUserEmail: string;
  targetUserName: string;
  requestedByUid: string;
  requestedByName: string;
}` | **Yes** | - | - |

---

### `VARIABLE` `requestId`

- **Line:** 21

---

### `VARIABLE` `now`

- **Line:** 22

---

### `VARIABLE` `requestData`

- **Line:** 24
- **Signature:** `AdminApprovalRequest`

---

### `VARIABLE` `originalAdminEmail`

- **Line:** 46

---

### `VARIABLE` `origDoc`

- **Line:** 48

---

### `VARIABLE` `origin`

- **Line:** 57

---

### `VARIABLE` `approveUrl`

- **Line:** 58

---

### `VARIABLE` `rejectUrl`

- **Line:** 59

---

### `VARIABLE` `userSettingsUrl`

- **Line:** 60

---

### `VARIABLE` `emailHtml`

- **Line:** 62

---

### `FUNCTION` `approveAdminAccessRequest`

> Approves an admin approval request (callable by Original Admin `ncyhw...`)

- **Line:** 168
- **Async:** Yes
- **Returns:** `Promise<void>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `params` | `{
  requestId: string;
  actionedByUid: string;
  actionedByName: string;
}` | **Yes** | - | - |

---

### `VARIABLE` `reqDocRef`

- **Line:** 179

---

### `VARIABLE` `reqSnap`

- **Line:** 180

---

### `VARIABLE` `reqData`

- **Line:** 186

---

### `VARIABLE` `targetUserRef`

- **Line:** 187

---

### `VARIABLE` `userSnap`

- **Line:** 188

---

### `VARIABLE` `userData`

- **Line:** 194

---

### `VARIABLE` `currentAssignedRoles`

- **Line:** 195
- **Signature:** `UserRole[]`

---

### `VARIABLE` `updatedAssignedRoles`

- **Line:** 197

---

### `VARIABLE` `now`

- **Line:** 199

---

### `FUNCTION` `rejectAdminAccessRequest`

> Rejects an admin approval request (callable by Original Admin `ncyhw...`)

- **Line:** 222
- **Async:** Yes
- **Returns:** `Promise<void>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `params` | `{
  requestId: string;
  actionedByUid: string;
  actionedByName: string;
}` | **Yes** | - | - |

---

### `VARIABLE` `reqDocRef`

- **Line:** 233

---

### `VARIABLE` `reqSnap`

- **Line:** 234

---

### `VARIABLE` `reqData`

- **Line:** 240

---

### `VARIABLE` `now`

- **Line:** 241

---

### `FUNCTION` `getAllAdminApprovalRequests`

> Fetches all admin approval requests

- **Line:** 261
- **Async:** Yes
- **Returns:** `Promise<AdminApprovalRequest[]>`

---

### `VARIABLE` `q`

- **Line:** 263

---

### `VARIABLE` `snap`

- **Line:** 264

---

