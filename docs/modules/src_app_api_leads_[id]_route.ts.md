# Module: `src/app/api/leads/[id]/route.ts`

- **Language:** TypeScript
- **Total Lines:** 187
- **Direct Dependencies:** 4 modules imported

## Exported Symbols & API

### `VARIABLE` `db`

- **Line:** 6

---

### `VARIABLE` `API_KEY`

- **Line:** 7

---

### `FUNCTION` `generateUniqueProspectPlusId`

- **Line:** 9
- **Async:** Yes
- **Returns:** `Promise<string>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `db` | `FirebaseFirestore.Firestore` | **Yes** | - | - |

---

### `VARIABLE` `unique`

- **Line:** 10

---

### `VARIABLE` `candidate`

- **Line:** 11

---

### `VARIABLE` `attempts`

- **Line:** 12

---

### `VARIABLE` `leadsSnap`

- **Line:** 16

---

### `VARIABLE` `companiesSnap`

- **Line:** 18

---

### `FUNCTION` `unwrapValue`

- **Line:** 25
- **Returns:** `any`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `val` | `any` | **Yes** | - | - |

---

### `VARIABLE` `result`

- **Line:** 33
- **Signature:** `any`

---

### `FUNCTION` `PATCH`

- **Line:** 44
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `req` | `NextRequest` | **Yes** | - | - |
| `{ params }` | `{ params: Promise<{ id: string }> }` | **Yes** | - | - |

---

### `VARIABLE` `apiKeyHeader`

- **Line:** 48

---

### `VARIABLE` `resolvedParams`

- **Line:** 49

---

### `VARIABLE` `leadId`

- **Line:** 50

---

### `VARIABLE` `rawBody`

- **Line:** 57

---

### `VARIABLE` `body`

- **Line:** 60
- **Signature:** `any`

---

### `VARIABLE` `unwrapped`

- **Line:** 62

---

### `VARIABLE` `leadRef`

- **Line:** 70

---

### `VARIABLE` `leadSnap`

- **Line:** 73

---

### `VARIABLE` `updateData`

- **Line:** 79
- **Signature:** `any`

---

### `VARIABLE` `existingData`

- **Line:** 89

---

### `VARIABLE` `targetStatus`

- **Line:** 98

---

### `VARIABLE` `isLocalMilePending`

- **Line:** 99

---

### `VARIABLE` `isLocalMileOpportunity`

- **Line:** 100

---

### `VARIABLE` `currentBucket`

- **Line:** 101

---

### `VARIABLE` `effectiveBucket`

- **Line:** 111

---

### `VARIABLE` `effectiveSource`

- **Line:** 116

---

### `VARIABLE` `isWebsiteSourceLead`

- **Line:** 117

---

### `VARIABLE` `finalBucket`

- **Line:** 123

---

### `VARIABLE` `bhSnap`

- **Line:** 126

---

### `VARIABLE` `nowIso`

- **Line:** 128

---

### `VARIABLE` `bhEntry`

- **Line:** 129

---

### `VARIABLE` `finalLpoLeadId`

- **Line:** 149

---

### `VARIABLE` `activityRef`

- **Line:** 168

---

