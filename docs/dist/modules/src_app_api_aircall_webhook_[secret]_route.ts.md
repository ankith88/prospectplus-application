# Module: `src/app/api/aircall/webhook/[secret]/route.ts`

- **Language:** TypeScript
- **Total Lines:** 271
- **Direct Dependencies:** 5 modules imported

## Exported Symbols & API

### `VARIABLE` `db`

- **Line:** 7

---

### `FUNCTION` `formatDuration`

> Formats a duration in seconds to a human-readable format like "2m 5s"

- **Line:** 12
- **Returns:** `string`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `seconds` | `number` | **Yes** | - | - |

---

### `VARIABLE` `m`

- **Line:** 14

---

### `VARIABLE` `s`

- **Line:** 15

---

### `FUNCTION` `POST`

- **Line:** 20
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `req` | `NextRequest` | **Yes** | - | - |
| `{ params }` | `{ params: Promise<{ secret: string }> }` | **Yes** | - | - |

---

### `VARIABLE` `resolvedParams`

- **Line:** 24

---

### `VARIABLE` `secret`

- **Line:** 25

---

### `VARIABLE` `configuredSecret`

- **Line:** 28

---

### `VARIABLE` `event`

- **Line:** 35

---

### `VARIABLE` `callData`

- **Line:** 40

---

### `VARIABLE` `callId`

- **Line:** 45

---

### `VARIABLE` `phoneNumber`

- **Line:** 46

---

### `VARIABLE` `duration`

- **Line:** 47

---

### `VARIABLE` `direction`

- **Line:** 48

---

### `VARIABLE` `status`

- **Line:** 49

---

### `VARIABLE` `author`

- **Line:** 50

---

### `VARIABLE` `recording`

- **Line:** 51

---

### `VARIABLE` `timestampSeconds`

- **Line:** 53

---

### `VARIABLE` `date`

- **Line:** 54

---

### `VARIABLE` `rawMatches`

- **Line:** 62

---

### `VARIABLE` `matches`

- **Line:** 63

---

### `VARIABLE` `docSnap`

- **Line:** 64

---

### `VARIABLE` `selectedMatch`

- **Line:** 68

---

### `VARIABLE` `matchedInitiatedDocId`

- **Line:** 69
- **Signature:** `string | null`

---

### `VARIABLE` `callTimeMs`

- **Line:** 73

---

### `VARIABLE` `maxTimeDiffMs`

- **Line:** 74

---

### `VARIABLE` `activityRef`

- **Line:** 77

---

### `VARIABLE` `initiatedSnap`

- **Line:** 79

---

### `VARIABLE` `actData`

- **Line:** 85

---

### `VARIABLE` `actTimeMs`

- **Line:** 86

---

### `VARIABLE` `timeDiff`

- **Line:** 87

---

### `VARIABLE` `authorMatch`

- **Line:** 90

---

### `VARIABLE` `notes`

- **Line:** 106

---

### `VARIABLE` `activityData`

- **Line:** 111

---

### `VARIABLE` `existingMatch`

- **Line:** 126
- **Signature:** `typeof selectedMatch`

---

### `VARIABLE` `existingActivityDocId`

- **Line:** 127
- **Signature:** `string | null`

---

### `VARIABLE` `activityRef`

- **Line:** 130

---

### `VARIABLE` `snap`

- **Line:** 131

---

### `VARIABLE` `activityRef`

- **Line:** 141

---

### `VARIABLE` `matchesWithNames`

- **Line:** 148

---

### `VARIABLE` `docSnap`

- **Line:** 149

---

### `VARIABLE` `data`

- **Line:** 150

---

### `VARIABLE` `resolvedAgentEmail`

- **Line:** 159

---

### `VARIABLE` `resolvedAuthor`

- **Line:** 160

---

### `VARIABLE` `callTimeMs`

- **Line:** 163

---

### `VARIABLE` `maxTimeDiffMs`

- **Line:** 164

---

### `VARIABLE` `activityRef`

- **Line:** 167

---

### `VARIABLE` `initiatedSnap`

- **Line:** 168

---

### `VARIABLE` `actData`

- **Line:** 174

---

### `VARIABLE` `actTimeMs`

- **Line:** 175

---

### `VARIABLE` `unassignedData`

- **Line:** 186

---

### `VARIABLE` `collectionType`

- **Line:** 200

---

### `VARIABLE` `leadId`

- **Line:** 201

---

### `VARIABLE` `activityRef`

- **Line:** 204

---

### `VARIABLE` `existingActivitySnap`

- **Line:** 205

---

### `VARIABLE` `existingDocId`

- **Line:** 208

---

### `VARIABLE` `docRef`

- **Line:** 215

---

### `VARIABLE` `transcriptionData`

- **Line:** 222

---

### `VARIABLE` `callId`

- **Line:** 227

---

### `VARIABLE` `activitySnap`

- **Line:** 236

---

### `VARIABLE` `activityDoc`

- **Line:** 243

---

### `VARIABLE` `parentRef`

- **Line:** 244

---

### `VARIABLE` `leadId`

- **Line:** 250

---

### `VARIABLE` `collectionType`

- **Line:** 251

---

### `VARIABLE` `result`

- **Line:** 256

---

