# Module: `src/app/api/localmile-registration/[token]/route.ts`

- **Language:** TypeScript
- **Total Lines:** 321
- **Direct Dependencies:** 6 modules imported

## Exported Symbols & API

### `VARIABLE` `dynamic`

- **Line:** 8

---

### `VARIABLE` `db`

- **Line:** 10

---

### `FUNCTION` `GET`

- **Line:** 12
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `req` | `NextRequest` | **Yes** | - | - |
| `{ params }` | `{ params: Promise<{ token: string }> }` | **Yes** | - | - |

---

### `VARIABLE` `resolvedParams`

- **Line:** 16

---

### `VARIABLE` `leadId`

- **Line:** 17

---

### `VARIABLE` `leadSnap`

- **Line:** 24

---

### `VARIABLE` `leadData`

- **Line:** 29

---

### `VARIABLE` `amName`

- **Line:** 32

---

### `VARIABLE` `amEmail`

- **Line:** 33

---

### `VARIABLE` `amPhone`

- **Line:** 34

---

### `VARIABLE` `amDisplayName`

- **Line:** 35

---

### `VARIABLE` `normalizedAmName`

- **Line:** 38

---

### `VARIABLE` `usersSnap`

- **Line:** 39

---

### `VARIABLE` `matchedUserDoc`

- **Line:** 40

---

### `VARIABLE` `data`

- **Line:** 41

---

### `VARIABLE` `fullName`

- **Line:** 42

---

### `VARIABLE` `displayName`

- **Line:** 43

---

### `VARIABLE` `userData`

- **Line:** 48

---

### `VARIABLE` `contactsSnap`

- **Line:** 56

---

### `VARIABLE` `contacts`

- **Line:** 57

---

### `FUNCTION` `POST`

- **Line:** 94
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `req` | `NextRequest` | **Yes** | - | - |
| `{ params }` | `{ params: Promise<{ token: string }> }` | **Yes** | - | - |

---

### `VARIABLE` `resolvedParams`

- **Line:** 98

---

### `VARIABLE` `leadId`

- **Line:** 99

---

### `VARIABLE` `body`

- **Line:** 106

---

### `VARIABLE` `leadRef`

- **Line:** 109

---

### `VARIABLE` `leadSnap`

- **Line:** 110

---

### `VARIABLE` `leadData`

- **Line:** 115

---

### `VARIABLE` `finalContact`

- **Line:** 131
- **Signature:** `any`

---

### `VARIABLE` `finalContactId`

- **Line:** 132

---

### `VARIABLE` `contactSnap`

- **Line:** 136

---

### `VARIABLE` `contactSnap`

- **Line:** 145

---

### `VARIABLE` `alreadyHasAccess`

- **Line:** 146

---

### `VARIABLE` `fullName`

- **Line:** 156

---

### `VARIABLE` `nsContactRes`

- **Line:** 160

---

### `VARIABLE` `contactSnap`

- **Line:** 179

---

### `VARIABLE` `primaryContactsSnap`

- **Line:** 196

---

### `VARIABLE` `batch`

- **Line:** 197

---

### `VARIABLE` `newContactRef`

- **Line:** 204

---

### `VARIABLE` `currentCount`

- **Line:** 217

---

### `VARIABLE` `contactSnap`

- **Line:** 237

---

### `VARIABLE` `contactNameParts`

- **Line:** 254

---

### `VARIABLE` `contactFirstName`

- **Line:** 255

---

### `VARIABLE` `contactLastName`

- **Line:** 256

---

### `VARIABLE` `trialRes`

- **Line:** 260

---

### `VARIABLE` `isOutbound`

- **Line:** 286

---

### `VARIABLE` `nowIso`

- **Line:** 287

---

