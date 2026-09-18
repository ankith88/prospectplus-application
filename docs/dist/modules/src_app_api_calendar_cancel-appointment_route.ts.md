# Module: `src/app/api/calendar/cancel-appointment/route.ts`

- **Language:** TypeScript
- **Total Lines:** 282
- **Direct Dependencies:** 5 modules imported

## Exported Symbols & API

### `VARIABLE` `dynamic`

- **Line:** 7

---

### `FUNCTION` `POST`

- **Line:** 9
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `req` | `NextRequest` | **Yes** | - | - |

---

### `VARIABLE` `body`

- **Line:** 11

---

### `VARIABLE` `db`

- **Line:** 18

---

### `VARIABLE` `apptDocRef`

- **Line:** 19
- **Signature:** `FirebaseFirestore.DocumentReference | null`

---

### `VARIABLE` `apptData`

- **Line:** 20
- **Signature:** `any`

---

### `VARIABLE` `parentId`

- **Line:** 25

---

### `VARIABLE` `trainingRef`

- **Line:** 26

---

### `VARIABLE` `trainingSnap`

- **Line:** 27

---

### `VARIABLE` `leadRef`

- **Line:** 33

---

### `VARIABLE` `leadSnap`

- **Line:** 34

---

### `VARIABLE` `compRef`

- **Line:** 40

---

### `VARIABLE` `compSnap`

- **Line:** 41

---

### `VARIABLE` `snap`

- **Line:** 52

---

### `VARIABLE` `cancellationTimestamp`

- **Line:** 64

---

### `VARIABLE` `cancelReasonText`

- **Line:** 65

---

### `VARIABLE` `cancellerName`

- **Line:** 66

---

### `VARIABLE` `parentDocRef`

- **Line:** 77

---

### `VARIABLE` `leadSnap`

- **Line:** 80

---

### `VARIABLE` `leadData`

- **Line:** 82

---

### `VARIABLE` `existingAppts`

- **Line:** 83

---

### `VARIABLE` `updatedAppts`

- **Line:** 84

---

### `VARIABLE` `client`

- **Line:** 101

---

### `VARIABLE` `dateVal`

- **Line:** 110

---

### `VARIABLE` `startDateTime`

- **Line:** 111

---

### `VARIABLE` `endDateTime`

- **Line:** 112

---

### `VARIABLE` `formattedDate`

- **Line:** 113

---

### `VARIABLE` `timeSlot`

- **Line:** 122

---

### `VARIABLE` `leadName`

- **Line:** 123

---

### `VARIABLE` `franchiseeTerritory`

- **Line:** 124

---

### `FUNCTION` `formatIcsDate`

- **Line:** 126

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `d` | `Date` | **Yes** | - | - |

---

### `VARIABLE` `dtStartStr`

- **Line:** 127

---

### `VARIABLE` `dtEndStr`

- **Line:** 128

---

### `VARIABLE` `dtStampStr`

- **Line:** 129

---

### `VARIABLE` `icsContent`

- **Line:** 131

---

### `VARIABLE` `icsBase64`

- **Line:** 151

---

### `VARIABLE` `icsDataUri`

- **Line:** 152

---

### `VARIABLE` `cancellationHtml`

- **Line:** 155

---

### `VARIABLE` `recipientsList`

- **Line:** 250

---

### `VARIABLE` `recipients`

- **Line:** 256

---

