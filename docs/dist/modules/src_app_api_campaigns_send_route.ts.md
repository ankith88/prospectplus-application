# Module: `src/app/api/campaigns/send/route.ts`

- **Language:** TypeScript
- **Total Lines:** 464
- **Direct Dependencies:** 7 modules imported

## Exported Symbols & API

### `VARIABLE` `db`

- **Line:** 10

---

### `FUNCTION` `POST`

- **Line:** 12
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `request` | `Request` | **Yes** | - | - |

---

### `VARIABLE` `body`

- **Line:** 14

---

### `VARIABLE` `urlObj`

- **Line:** 24

---

### `VARIABLE` `baseUrl`

- **Line:** 25

---

### `VARIABLE` `campaignRef`

- **Line:** 31

---

### `VARIABLE` `campaignDoc`

- **Line:** 32

---

### `VARIABLE` `campaignData`

- **Line:** 41

---

### `VARIABLE` `templateId`

- **Line:** 53

---

### `VARIABLE` `templateDoc`

- **Line:** 54

---

### `VARIABLE` `templateData`

- **Line:** 64

---

### `VARIABLE` `templateBody`

- **Line:** 65

---

### `VARIABLE` `targetAudience`

- **Line:** 68

---

### `VARIABLE` `filters`

- **Line:** 69

---

### `VARIABLE` `targetQuery`

- **Line:** 70
- **Signature:** `any`

---

### `VARIABLE` `collectionName`

- **Line:** 71

---

### `VARIABLE` `targetSnapshotRaw`

- **Line:** 96

---

### `VARIABLE` `targetDocs`

- **Line:** 99

---

### `VARIABLE` `docData`

- **Line:** 100

---

### `VARIABLE` `territories`

- **Line:** 106

---

### `VARIABLE` `hasState`

- **Line:** 107

---

### `VARIABLE` `currentStatus`

- **Line:** 115

---

### `VARIABLE` `suppressionSnap`

- **Line:** 123

---

### `VARIABLE` `suppressedEmails`

- **Line:** 124

---

### `VARIABLE` `amPhoneCache`

- **Line:** 127

---

### `VARIABLE` `usersSnap`

- **Line:** 128

---

### `VARIABLE` `userMap`

- **Line:** 129

---

### `VARIABLE` `data`

- **Line:** 131

---

### `VARIABLE` `fullName`

- **Line:** 132

---

### `VARIABLE` `displayName`

- **Line:** 133

---

### `VARIABLE` `name`

- **Line:** 134

---

### `VARIABLE` `email`

- **Line:** 135

---

### `VARIABLE` `totalSent`

- **Line:** 143

---

### `VARIABLE` `totalDelivered`

- **Line:** 144

---

### `VARIABLE` `totalBounced`

- **Line:** 145

---

### `VARIABLE` `nowStr`

- **Line:** 147

---

### `VARIABLE` `docId`

- **Line:** 151

---

### `VARIABLE` `docData`

- **Line:** 152

---

### `VARIABLE` `companyName`

- **Line:** 153

---

### `VARIABLE` `salesRepAssigned`

- **Line:** 154

---

### `VARIABLE` `franchiseeName`

- **Line:** 155

---

### `VARIABLE` `leadSenderEmail`

- **Line:** 158

---

### `VARIABLE` `repClean`

- **Line:** 160

---

### `VARIABLE` `recipients`

- **Line:** 173
- **Signature:** `{ email: string; name: string; contactId?: string; localMilePlusAuthLink?: string; securityCode?: string }[]`

---

### `VARIABLE` `email`

- **Line:** 176

---

### `VARIABLE` `contactsSnap`

- **Line:** 181

---

### `VARIABLE` `cData`

- **Line:** 185

---

### `VARIABLE` `email`

- **Line:** 186

---

### `VARIABLE` `name`

- **Line:** 187

---

### `VARIABLE` `email`

- **Line:** 195

---

### `VARIABLE` `emailLower`

- **Line:** 204

---

### `VARIABLE` `deliveryRef`

- **Line:** 212

---

### `VARIABLE` `deliveryId`

- **Line:** 213

---

### `VARIABLE` `compiledBody`

- **Line:** 216

---

### `VARIABLE` `contactFirstName`

- **Line:** 217

---

### `VARIABLE` `amName`

- **Line:** 220

---

### `VARIABLE` `amMobile`

- **Line:** 221

---

### `VARIABLE` `amNameLower`

- **Line:** 224

---

### `VARIABLE` `matchedUser`

- **Line:** 225

---

### `VARIABLE` `franchiseeMainContact`

- **Line:** 238

---

### `VARIABLE` `franchiseeEmail`

- **Line:** 239

---

### `VARIABLE` `franchiseeMobile`

- **Line:** 240

---

### `VARIABLE` `franchiseeData`

- **Line:** 242
- **Signature:** `any`

---

### `VARIABLE` `franDoc`

- **Line:** 244

---

### `VARIABLE` `franSnap`

- **Line:** 250

---

### `VARIABLE` `scheduledServiceDate`

- **Line:** 265

---

### `VARIABLE` `dateObj`

- **Line:** 271

---

### `VARIABLE` `dd`

- **Line:** 273

---

### `VARIABLE` `mm`

- **Line:** 274

---

### `VARIABLE` `yyyy`

- **Line:** 275

---

### `VARIABLE` `localMileLink`

- **Line:** 283

---

### `VARIABLE` `localMileActivationLink`

- **Line:** 284

---

### `VARIABLE` `localMileSecurityCode`

- **Line:** 285

---

### `VARIABLE` `sofPublicLink`

- **Line:** 286

---

### `VARIABLE` `placeholderCtx`

- **Line:** 288

---

### `VARIABLE` `compiledSubject`

- **Line:** 314

---

### `VARIABLE` `wrappedBody`

- **Line:** 317

---

### `VARIABLE` `unsubscribeUrl`

- **Line:** 320

---

### `VARIABLE` `finalHtml`

- **Line:** 322

---

### `VARIABLE` `footerUnsubscribe`

- **Line:** 327

---

### `VARIABLE` `trackingPixel`

- **Line:** 340

---

### `VARIABLE` `isBouncedSimulated`

- **Line:** 344

---

### `VARIABLE` `status`

- **Line:** 346

---

### `VARIABLE` `isRealBounced`

- **Line:** 347

---

### `VARIABLE` `errorMessage`

- **Line:** 348

---

### `VARIABLE` `sendResult`

- **Line:** 354

---

### `VARIABLE` `isBounced`

- **Line:** 372

---

### `FUNCTION` `wrapLinks`

> Parses HTML body and wraps hyperlinks in tracking redirects.

- **Line:** 451
- **Returns:** `string`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `html` | `string` | **Yes** | - | - |
| `deliveryId` | `string` | **Yes** | - | - |
| `baseUrl` | `string` | **Yes** | - | - |

---

### `VARIABLE` `anchorRegex`

- **Line:** 453

---

### `VARIABLE` `trackingUrl`

- **Line:** 460

---

