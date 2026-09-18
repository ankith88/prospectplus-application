# Module: `src/app/api/franchisees/[internalId]/upload-agreement/route.ts`

- **Language:** TypeScript
- **Total Lines:** 172
- **Direct Dependencies:** 4 modules imported

## Exported Symbols & API

### `FUNCTION` `POST`

- **Line:** 6
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `request` | `Request` | **Yes** | - | - |
| `{ params }` | `{ params: Promise<{ internalId: string }> }` | **Yes** | - | - |

---

### `VARIABLE` `formData`

- **Line:** 16

---

### `VARIABLE` `file`

- **Line:** 17

---

### `VARIABLE` `userUid`

- **Line:** 18

---

### `VARIABLE` `userName`

- **Line:** 19

---

### `VARIABLE` `arrayBuffer`

- **Line:** 29

---

### `VARIABLE` `buffer`

- **Line:** 30

---

### `VARIABLE` `base64Pdf`

- **Line:** 31

---

### `VARIABLE` `pdfDataUri`

- **Line:** 32

---

### `VARIABLE` `agreementId`

- **Line:** 35

---

### `VARIABLE` `downloadUrl`

- **Line:** 36

---

### `VARIABLE` `storagePath`

- **Line:** 37

---

### `VARIABLE` `bucket`

- **Line:** 40

---

### `VARIABLE` `bucketFile`

- **Line:** 41

---

### `VARIABLE` `extractedData`

- **Line:** 62
- **Signature:** `any`

---

### `VARIABLE` `db`

- **Line:** 75

---

### `VARIABLE` `nowStr`

- **Line:** 76

---

### `VARIABLE` `agreementRecord`

- **Line:** 78

---

### `VARIABLE` `franchiseeRef`

- **Line:** 90

---

### `VARIABLE` `franDoc`

- **Line:** 91

---

### `VARIABLE` `existingFran`

- **Line:** 92

---

### `VARIABLE` `existingAgreements`

- **Line:** 94

---

### `VARIABLE` `updatedAgreements`

- **Line:** 95

---

### `VARIABLE` `franUpdates`

- **Line:** 97
- **Signature:** `Record<string, any>`

---

### `VARIABLE` `userSnapshots`

- **Line:** 115

---

### `VARIABLE` `updatedUserUids`

- **Line:** 116
- **Signature:** `string[]`

---

### `VARIABLE` `userData`

- **Line:** 119

---

### `VARIABLE` `linkedIds`

- **Line:** 120
- **Signature:** `string[]`

---

### `VARIABLE` `mainId`

- **Line:** 121

---

### `VARIABLE` `isLinked`

- **Line:** 123

---

### `VARIABLE` `userRef`

- **Line:** 126

---

### `VARIABLE` `existingUserAgreements`

- **Line:** 127

---

### `VARIABLE` `updatedUserAgreements`

- **Line:** 128

---

### `VARIABLE` `userUpdatePayload`

- **Line:** 130
- **Signature:** `Record<string, any>`

---

