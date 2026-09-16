# Module: `src/app/api/campaigns/send-direct/route.ts`

- **Language:** TypeScript
- **Total Lines:** 595
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

- **Line:** 31

---

### `VARIABLE` `baseUrl`

- **Line:** 32

---

### `VARIABLE` `brandSnap`

- **Line:** 38

---

### `VARIABLE` `brandData`

- **Line:** 39

---

### `VARIABLE` `primaryColor`

- **Line:** 40

---

### `VARIABLE` `fontFamily`

- **Line:** 41

---

### `VARIABLE` `configSnap`

- **Line:** 44

---

### `VARIABLE` `activeConfig`

- **Line:** 45

---

### `VARIABLE` `senderEmail`

- **Line:** 46

---

### `VARIABLE` `templateDoc`

- **Line:** 49

---

### `VARIABLE` `templateData`

- **Line:** 57

---

### `VARIABLE` `templateBody`

- **Line:** 58

---

### `VARIABLE` `subjectLine`

- **Line:** 59

---

### `VARIABLE` `suppressionSnap`

- **Line:** 62

---

### `VARIABLE` `suppressedEmails`

- **Line:** 63

---

### `VARIABLE` `amPhoneCache`

- **Line:** 66

---

### `VARIABLE` `usersSnap`

- **Line:** 67

---

### `VARIABLE` `userMap`

- **Line:** 68

---

### `VARIABLE` `data`

- **Line:** 70

---

### `VARIABLE` `fullName`

- **Line:** 71

---

### `VARIABLE` `displayName`

- **Line:** 72

---

### `VARIABLE` `name`

- **Line:** 73

---

### `VARIABLE` `email`

- **Line:** 74

---

### `VARIABLE` `totalSent`

- **Line:** 82

---

### `VARIABLE` `totalBounced`

- **Line:** 83

---

### `VARIABLE` `nowStr`

- **Line:** 84

---

### `VARIABLE` `leadSnap`

- **Line:** 88

---

### `VARIABLE` `companySnap`

- **Line:** 89

---

### `VARIABLE` `isLead`

- **Line:** 90

---

### `VARIABLE` `isCompany`

- **Line:** 91

---

### `VARIABLE` `entityDoc`

- **Line:** 98

---

### `VARIABLE` `leadData`

- **Line:** 99

---

### `VARIABLE` `companyName`

- **Line:** 100

---

### `VARIABLE` `salesRepAssigned`

- **Line:** 101

---

### `VARIABLE` `franchiseeName`

- **Line:** 102

---

### `VARIABLE` `contactsDocs`

- **Line:** 105
- **Signature:** `any[]`

---

### `VARIABLE` `snap`

- **Line:** 107

---

### `VARIABLE` `snap`

- **Line:** 111

---

### `VARIABLE` `recipients`

- **Line:** 119
- **Signature:** `{ email: string; name: string; contactId?: string; localMilePlusAuthLink?: string; securityCode?: string }[]`

---

### `VARIABLE` `emails`

- **Line:** 122

---

### `VARIABLE` `primaryContactName`

- **Line:** 123

---

### `VARIABLE` `primaryContactLink`

- **Line:** 124

---

### `VARIABLE` `primaryContactSecurityCode`

- **Line:** 125

---

### `VARIABLE` `contactId`

- **Line:** 126

---

### `VARIABLE` `firstEmail`

- **Line:** 130

---

### `VARIABLE` `cData`

- **Line:** 132

---

### `VARIABLE` `email`

- **Line:** 133

---

### `VARIABLE` `cData`

- **Line:** 146

---

### `VARIABLE` `cData`

- **Line:** 166

---

### `VARIABLE` `email`

- **Line:** 167

---

### `VARIABLE` `name`

- **Line:** 168

---

### `VARIABLE` `email`

- **Line:** 175

---

### `VARIABLE` `nameToUse`

- **Line:** 177

---

### `VARIABLE` `emailLower`

- **Line:** 185

---

### `VARIABLE` `deliveryRef`

- **Line:** 193

---

### `VARIABLE` `deliveryId`

- **Line:** 194

---

### `VARIABLE` `compiledBody`

- **Line:** 197

---

### `VARIABLE` `contactFirstName`

- **Line:** 198

---

### `VARIABLE` `amName`

- **Line:** 201

---

### `VARIABLE` `amMobile`

- **Line:** 202

---

### `VARIABLE` `amNameLower`

- **Line:** 205

---

### `VARIABLE` `matchedUser`

- **Line:** 206

---

### `VARIABLE` `franchiseeMainContact`

- **Line:** 219

---

### `VARIABLE` `franchiseeEmail`

- **Line:** 220

---

### `VARIABLE` `franchiseeMobile`

- **Line:** 221

---

### `VARIABLE` `franchiseeData`

- **Line:** 223
- **Signature:** `any`

---

### `VARIABLE` `fIdStr`

- **Line:** 225

---

### `VARIABLE` `franDoc`

- **Line:** 226

---

### `VARIABLE` `franSnap1`

- **Line:** 230

---

### `VARIABLE` `franSnap2`

- **Line:** 234

---

### `VARIABLE` `franSnap`

- **Line:** 242

---

### `VARIABLE` `scheduledServiceDate`

- **Line:** 258

---

### `VARIABLE` `dateObj`

- **Line:** 264

---

### `VARIABLE` `dd`

- **Line:** 266

---

### `VARIABLE` `mm`

- **Line:** 267

---

### `VARIABLE` `yyyy`

- **Line:** 268

---

### `VARIABLE` `localMileLink`

- **Line:** 276

---

### `VARIABLE` `localMileActivationLink`

- **Line:** 277

---

### `VARIABLE` `localMileSecurityCode`

- **Line:** 278

---

### `VARIABLE` `sofPublicLink`

- **Line:** 279

---

### `VARIABLE` `placeholderCtx`

- **Line:** 281

---

### `VARIABLE` `compiledSubject`

- **Line:** 307

---

### `VARIABLE` `ticketNumber`

- **Line:** 316

---

### `VARIABLE` `trackingId`

- **Line:** 317

---

### `VARIABLE` `packageCode`

- **Line:** 318

---

### `VARIABLE` `connoteNumber`

- **Line:** 319

---

### `VARIABLE` `receiverName`

- **Line:** 320

---

### `VARIABLE` `receiverCompanyName`

- **Line:** 321

---

### `VARIABLE` `receiverAddress`

- **Line:** 322

---

### `VARIABLE` `wrappedBody`

- **Line:** 360

---

### `VARIABLE` `unsubscribeUrl`

- **Line:** 363

---

### `VARIABLE` `finalHtml`

- **Line:** 365

---

### `VARIABLE` `footerUnsubscribe`

- **Line:** 371

---

### `VARIABLE` `trackingPixel`

- **Line:** 384

---

### `VARIABLE` `finalHtmlFormatted`

- **Line:** 388

---

### `VARIABLE` `isBouncedSimulated`

- **Line:** 452

---

### `VARIABLE` `status`

- **Line:** 454

---

### `VARIABLE` `isRealBounced`

- **Line:** 455

---

### `VARIABLE` `errorMessage`

- **Line:** 456

---

### `VARIABLE` `sendResult`

- **Line:** 462

---

### `VARIABLE` `isBounced`

- **Line:** 488

---

### `VARIABLE` `activityNotes`

- **Line:** 509

---

### `VARIABLE` `parts`

- **Line:** 511

---

### `FUNCTION` `wrapLinks`

- **Line:** 585
- **Returns:** `string`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `html` | `string` | **Yes** | - | - |
| `deliveryId` | `string` | **Yes** | - | - |
| `baseUrl` | `string` | **Yes** | - | - |

---

### `VARIABLE` `anchorRegex`

- **Line:** 586

---

### `VARIABLE` `trackingUrl`

- **Line:** 591

---

