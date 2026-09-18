# Module: `src/app/api/campaigns/send-sms/route.ts`

- **Language:** TypeScript
- **Total Lines:** 364
- **Direct Dependencies:** 6 modules imported

## Exported Symbols & API

### `VARIABLE` `db`

- **Line:** 8

---

### `FUNCTION` `POST`

- **Line:** 10
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `request` | `Request` | **Yes** | - | - |

---

### `VARIABLE` `body`

- **Line:** 12

---

### `VARIABLE` `campaignRef`

- **Line:** 23

---

### `VARIABLE` `campaignDoc`

- **Line:** 24

---

### `VARIABLE` `campaignData`

- **Line:** 33

---

### `VARIABLE` `smsMessageTemplate`

- **Line:** 51

---

### `VARIABLE` `usersSnap`

- **Line:** 54

---

### `VARIABLE` `userMap`

- **Line:** 55

---

### `VARIABLE` `uData`

- **Line:** 57

---

### `VARIABLE` `uName`

- **Line:** 58

---

### `VARIABLE` `targetAudience`

- **Line:** 65

---

### `VARIABLE` `filters`

- **Line:** 66

---

### `VARIABLE` `targetQuery`

- **Line:** 67
- **Signature:** `any`

---

### `VARIABLE` `targetSnapshotRaw`

- **Line:** 92

---

### `VARIABLE` `targetDocs`

- **Line:** 95

---

### `VARIABLE` `docData`

- **Line:** 96

---

### `VARIABLE` `territories`

- **Line:** 102

---

### `VARIABLE` `hasState`

- **Line:** 103

---

### `VARIABLE` `currentStatus`

- **Line:** 111

---

### `VARIABLE` `suppressionSnap`

- **Line:** 119

---

### `VARIABLE` `suppressedEmails`

- **Line:** 120

---

### `VARIABLE` `totalSent`

- **Line:** 122

---

### `VARIABLE` `totalDelivered`

- **Line:** 123

---

### `VARIABLE` `totalBounced`

- **Line:** 124

---

### `VARIABLE` `nowStr`

- **Line:** 126

---

### `VARIABLE` `docId`

- **Line:** 130

---

### `VARIABLE` `docData`

- **Line:** 131

---

### `VARIABLE` `companyName`

- **Line:** 132

---

### `VARIABLE` `salesRepAssigned`

- **Line:** 133

---

### `VARIABLE` `recipients`

- **Line:** 136
- **Signature:** `{ email: string; name: string; phone: string; contactId?: string; localMilePlusAuthLink?: string; securityCode?: string }[]`

---

### `VARIABLE` `phone`

- **Line:** 139

---

### `VARIABLE` `email`

- **Line:** 140

---

### `VARIABLE` `contactsSnap`

- **Line:** 145

---

### `VARIABLE` `cData`

- **Line:** 149

---

### `VARIABLE` `email`

- **Line:** 150

---

### `VARIABLE` `phone`

- **Line:** 151

---

### `VARIABLE` `name`

- **Line:** 152

---

### `VARIABLE` `phone`

- **Line:** 160

---

### `VARIABLE` `email`

- **Line:** 161

---

### `VARIABLE` `emailLower`

- **Line:** 170

---

### `VARIABLE` `deliveryRef`

- **Line:** 178

---

### `VARIABLE` `deliveryId`

- **Line:** 179

---

### `VARIABLE` `amName`

- **Line:** 182

---

### `VARIABLE` `amMobile`

- **Line:** 183

---

### `VARIABLE` `amEmail`

- **Line:** 184

---

### `VARIABLE` `amCalendly`

- **Line:** 185

---

### `VARIABLE` `matchedUser`

- **Line:** 187

---

### `VARIABLE` `franchiseeMainContact`

- **Line:** 196

---

### `VARIABLE` `franchiseeEmail`

- **Line:** 197

---

### `VARIABLE` `franchiseeMobile`

- **Line:** 198

---

### `VARIABLE` `franchiseeData`

- **Line:** 200
- **Signature:** `any`

---

### `VARIABLE` `franDoc`

- **Line:** 202

---

### `VARIABLE` `franSnap`

- **Line:** 208

---

### `VARIABLE` `scheduledServiceDate`

- **Line:** 223

---

### `VARIABLE` `dateObj`

- **Line:** 229

---

### `VARIABLE` `dd`

- **Line:** 231

---

### `VARIABLE` `mm`

- **Line:** 232

---

### `VARIABLE` `yyyy`

- **Line:** 233

---

### `VARIABLE` `contactFirstName`

- **Line:** 242

---

### `VARIABLE` `scfLink`

- **Line:** 243

---

### `VARIABLE` `sofPublicLink`

- **Line:** 244

---

### `VARIABLE` `localMileLink`

- **Line:** 245

---

### `VARIABLE` `localMileActivationLink`

- **Line:** 246

---

### `VARIABLE` `localMileSecurityCode`

- **Line:** 247

---

### `VARIABLE` `compiledBody`

- **Line:** 249

---

### `VARIABLE` `sendResult`

- **Line:** 285

---

### `VARIABLE` `status`

- **Line:** 287

---

### `VARIABLE` `isRealBounced`

- **Line:** 288

---

### `VARIABLE` `errorMessage`

- **Line:** 289

---

### `VARIABLE` `isBounced`

- **Line:** 300

---

