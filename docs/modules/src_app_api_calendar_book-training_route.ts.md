# Module: `src/app/api/calendar/book-training/route.ts`

- **Language:** TypeScript
- **Total Lines:** 464
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

### `VARIABLE` `parsedAdditionalEmails`

- **Line:** 24
- **Signature:** `string[]`

---

### `VARIABLE` `db`

- **Line:** 44

---

### `VARIABLE` `apptId`

- **Line:** 47

---

### `VARIABLE` `parentId`

- **Line:** 48

---

### `VARIABLE` `fallbackTeamsMeetingId`

- **Line:** 49

---

### `VARIABLE` `fallbackTeamsJoinUrl`

- **Line:** 50

---

### `FUNCTION` `getSydneyOffset`

- **Line:** 53
- **Returns:** `string`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `dateStr` | `string` | **Yes** | - | - |

---

### `VARIABLE` `sampleDate`

- **Line:** 55

---

### `VARIABLE` `formattedStr`

- **Line:** 56

---

### `VARIABLE` `match`

- **Line:** 57

---

### `VARIABLE` `targetDateStr`

- **Line:** 67

---

### `VARIABLE` `rawDateObj`

- **Line:** 71

---

### `VARIABLE` `hours`

- **Line:** 76

---

### `VARIABLE` `minutes`

- **Line:** 77

---

### `VARIABLE` `parts`

- **Line:** 79

---

### `VARIABLE` `timeParts`

- **Line:** 80

---

### `VARIABLE` `startHStr`

- **Line:** 87

---

### `VARIABLE` `startMStr`

- **Line:** 88

---

### `VARIABLE` `tzOffset`

- **Line:** 89

---

### `VARIABLE` `startLocalIso`

- **Line:** 91

---

### `VARIABLE` `startDateTime`

- **Line:** 92

---

### `VARIABLE` `endDateTime`

- **Line:** 93

---

### `VARIABLE` `endParts`

- **Line:** 95

---

### `VARIABLE` `endH`

- **Line:** 109

---

### `VARIABLE` `endLocalIsoStr`

- **Line:** 110

---

### `VARIABLE` `formattedDate`

- **Line:** 112

---

### `VARIABLE` `isoDueDate`

- **Line:** 120

---

### `VARIABLE` `appointmentDateStr`

- **Line:** 121

---

### `VARIABLE` `teamsJoinUrl`

- **Line:** 128

---

### `VARIABLE` `msGraphEventId`

- **Line:** 129
- **Signature:** `string | null`

---

### `VARIABLE` `aleynaUserId`

- **Line:** 130
- **Signature:** `string | null`

---

### `VARIABLE` `usersRef`

- **Line:** 134

---

### `VARIABLE` `aleynaUserDoc`

- **Line:** 135
- **Signature:** `FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot | null`

---

### `VARIABLE` `aleynaSnap`

- **Line:** 137

---

### `VARIABLE` `idSnap`

- **Line:** 141

---

### `VARIABLE` `allSnap`

- **Line:** 145

---

### `VARIABLE` `u`

- **Line:** 147

---

### `VARIABLE` `aleynaData`

- **Line:** 158

---

### `VARIABLE` `client`

- **Line:** 161

---

### `VARIABLE` `attendeesList`

- **Line:** 163

---

### `VARIABLE` `meetingSubject`

- **Line:** 180

---

### `VARIABLE` `meetingBody`

- **Line:** 181

---

### `VARIABLE` `event`

- **Line:** 183

---

### `VARIABLE` `createdEvent`

- **Line:** 202

---

### `FUNCTION` `formatIcsDate`

- **Line:** 216

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `d` | `Date` | **Yes** | - | - |

---

### `VARIABLE` `dtStartStr`

- **Line:** 217

---

### `VARIABLE` `dtEndStr`

- **Line:** 218

---

### `VARIABLE` `dtStampStr`

- **Line:** 219

---

### `VARIABLE` `finalUserName`

- **Line:** 222

---

### `VARIABLE` `finalUserEmail`

- **Line:** 223

---

### `VARIABLE` `finalFranchiseeName`

- **Line:** 224

---

### `VARIABLE` `dbUserDoc`

- **Line:** 227
- **Signature:** `FirebaseFirestore.DocumentSnapshot | null`

---

### `VARIABLE` `uDoc`

- **Line:** 229

---

### `VARIABLE` `uSnap`

- **Line:** 233

---

### `VARIABLE` `uData`

- **Line:** 238

---

### `VARIABLE` `apptRef`

- **Line:** 254

---

### `VARIABLE` `apptData`

- **Line:** 256

---

### `VARIABLE` `icsContent`

- **Line:** 285

---

### `VARIABLE` `icsBase64`

- **Line:** 308

---

### `VARIABLE` `icsDataUri`

- **Line:** 309

---

### `VARIABLE` `googleCalUrl`

- **Line:** 312

---

### `VARIABLE` `outlookCalUrl`

- **Line:** 313

---

### `VARIABLE` `confirmationHtml`

- **Line:** 316

---

### `VARIABLE` `recipients`

- **Line:** 438

---

