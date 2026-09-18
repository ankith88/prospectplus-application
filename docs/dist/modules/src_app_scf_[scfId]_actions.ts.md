# Module: `src/app/scf/[scfId]/actions.ts`

- **Language:** TypeScript
- **Total Lines:** 583
- **Direct Dependencies:** 5 modules imported

## Exported Symbols & API

### `FUNCTION` `getAdminLeadOrCompanyRef`

- **Line:** 9
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |

---

### `VARIABLE` `ref`

- **Line:** 10

---

### `VARIABLE` `snap`

- **Line:** 11

---

### `FUNCTION` `acceptScfAction`

- **Line:** 18
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |
| `scfId` | `string` | **Yes** | - | - |

---

### `VARIABLE` `scfDocRef`

- **Line:** 26

---

### `VARIABLE` `scfDocSnap`

- **Line:** 27

---

### `VARIABLE` `altCol`

- **Line:** 29

---

### `VARIABLE` `altScfRef`

- **Line:** 30

---

### `VARIABLE` `altScfSnap`

- **Line:** 31

---

### `VARIABLE` `scfData`

- **Line:** 39

---

### `VARIABLE` `status`

- **Line:** 40

---

### `VARIABLE` `leadData`

- **Line:** 46

---

### `VARIABLE` `abn`

- **Line:** 47

---

### `VARIABLE` `cleanedAbn`

- **Line:** 48

---

### `VARIABLE` `nowStr`

- **Line:** 54

---

### `VARIABLE` `leadData`

- **Line:** 62

---

### `VARIABLE` `isSyncedWithNetSuite`

- **Line:** 65

---

### `VARIABLE` `commRegId`

- **Line:** 68

---

### `VARIABLE` `payload1`

- **Line:** 69

---

### `VARIABLE` `nsUrl1`

- **Line:** 73

---

### `VARIABLE` `response1`

- **Line:** 77

---

### `VARIABLE` `text1`

- **Line:** 78

---

### `VARIABLE` `isScript1900Success`

- **Line:** 81

---

### `VARIABLE` `salesRep`

- **Line:** 90

---

### `VARIABLE` `leadInternalId`

- **Line:** 91

---

### `VARIABLE` `nsUrl2`

- **Line:** 92

---

### `VARIABLE` `response2`

- **Line:** 94

---

### `VARIABLE` `isLpoProcess`

- **Line:** 98

---

### `VARIABLE` `childSnaps`

- **Line:** 107

---

### `VARIABLE` `cData`

- **Line:** 109

---

### `VARIABLE` `cNsId`

- **Line:** 110

---

### `VARIABLE` `cPayload1`

- **Line:** 113

---

### `VARIABLE` `cNsUrl1`

- **Line:** 114

---

### `VARIABLE` `cNsUrl2`

- **Line:** 117

---

### `VARIABLE` `acceptedScfData`

- **Line:** 134

---

### `VARIABLE` `acceptedServices`

- **Line:** 135

---

### `VARIABLE` `acceptedProducts`

- **Line:** 136

---

### `VARIABLE` `rawScfStartDate`

- **Line:** 137

---

### `VARIABLE` `todayStr`

- **Line:** 139

---

### `VARIABLE` `effectiveDateStr`

- **Line:** 140

---

### `VARIABLE` `isFutureEffectiveDate`

- **Line:** 153

---

### `VARIABLE` `currentStatus`

- **Line:** 156

---

### `VARIABLE` `isCompanyOrSignedCustomer`

- **Line:** 157

---

### `VARIABLE` `statusUpdates`

- **Line:** 161
- **Signature:** `any`

---

### `VARIABLE` `currentServices`

- **Line:** 172

---

### `VARIABLE` `currentHistory`

- **Line:** 173

---

### `VARIABLE` `historyRecord`

- **Line:** 176

---

### `VARIABLE` `isLpoProcessLead`

- **Line:** 211

---

### `VARIABLE` `childSnap`

- **Line:** 220

---

### `VARIABLE` `batch`

- **Line:** 222

---

### `VARIABLE` `lpoSnap`

- **Line:** 236

---

### `VARIABLE` `amName`

- **Line:** 253

---

### `VARIABLE` `amEmail`

- **Line:** 254

---

### `VARIABLE` `usersSnap`

- **Line:** 256

---

### `VARIABLE` `matchedUser`

- **Line:** 257

---

### `VARIABLE` `data`

- **Line:** 258

---

### `VARIABLE` `fullName`

- **Line:** 259

---

### `VARIABLE` `senderAmEmail`

- **Line:** 271

---

### `VARIABLE` `franchiseeKey`

- **Line:** 274

---

### `VARIABLE` `franchiseeEmail`

- **Line:** 275

---

### `VARIABLE` `franchiseeContactName`

- **Line:** 276

---

### `VARIABLE` `franchiseeTerritoryName`

- **Line:** 277

---

### `VARIABLE` `franchiseeSnap`

- **Line:** 280

---

### `VARIABLE` `matchedFranchisee`

- **Line:** 281

---

### `VARIABLE` `d`

- **Line:** 282

---

### `VARIABLE` `fData`

- **Line:** 291

---

### `VARIABLE` `recipientEmails`

- **Line:** 298

---

### `VARIABLE` `ccEmail`

- **Line:** 302

---

### `VARIABLE` `contactName`

- **Line:** 305

---

### `VARIABLE` `contactEmail`

- **Line:** 306

---

### `VARIABLE` `contactPhone`

- **Line:** 307

---

### `VARIABLE` `contactsSnap`

- **Line:** 308

---

### `VARIABLE` `contactData`

- **Line:** 310

---

### `VARIABLE` `street`

- **Line:** 317

---

### `VARIABLE` `city`

- **Line:** 318

---

### `VARIABLE` `state`

- **Line:** 319

---

### `VARIABLE` `zip`

- **Line:** 320

---

### `VARIABLE` `formattedAddress`

- **Line:** 321

---

### `VARIABLE` `scfSnap`

- **Line:** 324

---

### `VARIABLE` `scfDataObj`

- **Line:** 328

---

### `VARIABLE` `servicesList`

- **Line:** 329
- **Signature:** `Array<{ name: string; frequency?: string[]; rate?: number }>`

---

### `VARIABLE` `rawStartDate`

- **Line:** 331

---

### `VARIABLE` `formattedStartDate`

- **Line:** 335

---

### `VARIABLE` `prospectPlusId`

- **Line:** 342

---

### `VARIABLE` `companyName`

- **Line:** 343

---

### `VARIABLE` `subject`

- **Line:** 344

---

### `VARIABLE` `baseUrl`

- **Line:** 345

---

### `VARIABLE` `leadLink`

- **Line:** 346

---

### `VARIABLE` `servicesRowsHtml`

- **Line:** 348

---

### `VARIABLE` `freqStr`

- **Line:** 350

---

### `VARIABLE` `rateStr`

- **Line:** 351

---

### `VARIABLE` `emailHtml`

- **Line:** 362

---

### `FUNCTION` `updateScfDetailsAction`

- **Line:** 490
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |
| `contactId` | `string | null | undefined` | **Yes** | - | - |
| `data` | `{
    abn?: string;
    contactName?: string;
    contactEmail?: string;
    contactPhone?: string;
    customerServiceEmail?: string;
    customerPhone?: string;
  }` | **Yes** | - | - |
| `scfId` | `string` | No | - | - |

---

### `VARIABLE` `scfSnap`

- **Line:** 507

---

### `VARIABLE` `altCol`

- **Line:** 509

---

### `VARIABLE` `scfData`

- **Line:** 513

---

### `VARIABLE` `status`

- **Line:** 514

---

### `VARIABLE` `scfsSnap`

- **Line:** 520

---

### `VARIABLE` `altCol`

- **Line:** 522

---

### `VARIABLE` `hasAcceptedScf`

- **Line:** 525

---

### `VARIABLE` `d`

- **Line:** 526

---

### `VARIABLE` `leadUpdate`

- **Line:** 534
- **Signature:** `any`

---

### `VARIABLE` `fullLead`

- **Line:** 544

---

### `VARIABLE` `contactUpdate`

- **Line:** 560
- **Signature:** `any`

---

### `VARIABLE` `contactRef`

- **Line:** 566

---

### `VARIABLE` `cSnap`

- **Line:** 567

---

### `VARIABLE` `altCol`

- **Line:** 571

---

