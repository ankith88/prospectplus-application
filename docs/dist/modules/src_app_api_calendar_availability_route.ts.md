# Module: `src/app/api/calendar/availability/route.ts`

- **Language:** TypeScript
- **Total Lines:** 343
- **Direct Dependencies:** 6 modules imported

## Exported Symbols & API

### `VARIABLE` `dynamic`

- **Line:** 8

---

### `FUNCTION` `GET`

- **Line:** 10
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `req` | `NextRequest` | **Yes** | - | - |

---

### `VARIABLE` `searchParams`

- **Line:** 11

---

### `VARIABLE` `bookingUrlId`

- **Line:** 12

---

### `VARIABLE` `amIdParam`

- **Line:** 13

---

### `VARIABLE` `emailParam`

- **Line:** 14

---

### `VARIABLE` `dateStr`

- **Line:** 15

---

### `VARIABLE` `db`

- **Line:** 18

---

### `VARIABLE` `leadsRef`

- **Line:** 22

---

### `VARIABLE` `snap`

- **Line:** 23

---

### `VARIABLE` `isGeneralBooking`

- **Line:** 24

---

### `VARIABLE` `lead`

- **Line:** 33

---

### `VARIABLE` `amAssigned`

- **Line:** 34

---

### `VARIABLE` `contactName`

- **Line:** 36

---

### `VARIABLE` `contactEmail`

- **Line:** 37

---

### `VARIABLE` `leadId`

- **Line:** 39

---

### `VARIABLE` `contactRef`

- **Line:** 42

---

### `VARIABLE` `contactSnap`

- **Line:** 43

---

### `VARIABLE` `contactData`

- **Line:** 45

---

### `VARIABLE` `contactsSnap`

- **Line:** 52

---

### `VARIABLE` `contactData`

- **Line:** 54

---

### `VARIABLE` `usersRef`

- **Line:** 66

---

### `VARIABLE` `allUsersSnap`

- **Line:** 67

---

### `VARIABLE` `amEmailMap`

- **Line:** 69
- **Signature:** `Record<string, string>`

---

### `VARIABLE` `amEmail`

- **Line:** 77

---

### `VARIABLE` `matchedUserDoc`

- **Line:** 79

---

### `VARIABLE` `data`

- **Line:** 80

---

### `VARIABLE` `fullName`

- **Line:** 81

---

### `VARIABLE` `displayName`

- **Line:** 82

---

### `VARIABLE` `userEmail`

- **Line:** 83

---

### `VARIABLE` `isNameMatch`

- **Line:** 85

---

### `VARIABLE` `isEmailMatch`

- **Line:** 86

---

### `VARIABLE` `amUser`

- **Line:** 95

---

### `VARIABLE` `amUserId`

- **Line:** 96

---

### `VARIABLE` `targetUserDoc`

- **Line:** 113
- **Signature:** `FirebaseFirestore.DocumentSnapshot | null`

---

### `VARIABLE` `querySnap`

- **Line:** 120

---

### `VARIABLE` `allSnap`

- **Line:** 129

---

### `VARIABLE` `u`

- **Line:** 132

---

### `VARIABLE` `date`

- **Line:** 141

---

### `VARIABLE` `minBookableDate`

- **Line:** 142

---

### `VARIABLE` `dayOfWeek`

- **Line:** 160

---

### `VARIABLE` `defaultWorkingHours`

- **Line:** 162

---

### `VARIABLE` `amUser`

- **Line:** 172
- **Signature:** `UserProfile | null`

---

### `VARIABLE` `amUserId`

- **Line:** 173

---

### `VARIABLE` `workingHours`

- **Line:** 175

---

### `VARIABLE` `amTz`

- **Line:** 181

---

### `VARIABLE` `IANA_TO_MS_GRAPH`

- **Line:** 182
- **Signature:** `Record<string, string>`

---

### `VARIABLE` `msGraphTz`

- **Line:** 192

---

### `FUNCTION` `getTzOffset`

- **Line:** 195
- **Returns:** `string`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `tz` | `string` | **Yes** | - | - |
| `d` | `Date` | **Yes** | - | - |

---

### `VARIABLE` `formattedStr`

- **Line:** 197

---

### `VARIABLE` `match`

- **Line:** 198

---

### `VARIABLE` `tzOffset`

- **Line:** 207

---

### `VARIABLE` `busyBlocks`

- **Line:** 208
- **Signature:** `Array<{ start: Date; end: Date }>`

---

### `VARIABLE` `client`

- **Line:** 213

---

### `VARIABLE` `startDateTime`

- **Line:** 214

---

### `VARIABLE` `endDateTime`

- **Line:** 215

---

### `VARIABLE` `scheduleResponse`

- **Line:** 217

---

### `VARIABLE` `nonFreeItems`

- **Line:** 226

---

### `VARIABLE` `startStr`

- **Line:** 231

---

### `VARIABLE` `endStr`

- **Line:** 232

---

### `VARIABLE` `apptsSnap`

- **Line:** 259

---

### `VARIABLE` `data`

- **Line:** 261

---

### `VARIABLE` `isAleyna`

- **Line:** 263

---

### `VARIABLE` `apptDateStr`

- **Line:** 268

---

### `VARIABLE` `apptStart`

- **Line:** 270

---

### `VARIABLE` `apptEnd`

- **Line:** 271

---

### `VARIABLE` `slots`

- **Line:** 280

---

### `VARIABLE` `startStr`

- **Line:** 285

---

### `VARIABLE` `endStr`

- **Line:** 286

---

### `VARIABLE` `currentSlot`

- **Line:** 288

---

### `VARIABLE` `endLimit`

- **Line:** 289

---

### `VARIABLE` `bufferMinutes`

- **Line:** 291

---

### `VARIABLE` `durationMinutes`

- **Line:** 292

---

### `VARIABLE` `slotEnd`

- **Line:** 295

---

### `VARIABLE` `isBusy`

- **Line:** 300

---

### `VARIABLE` `blockStartWithBuffer`

- **Line:** 301

---

### `VARIABLE` `blockEndWithBuffer`

- **Line:** 302

---

### `VARIABLE` `formattedTimeStr`

- **Line:** 317

---

