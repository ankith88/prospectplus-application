# Module: `src/lib/presale-types.ts`

- **Language:** TypeScript
- **Total Lines:** 124
- **Direct Dependencies:** 1 modules imported

## Exported Symbols & API

### `INTERFACE` `PresaleMainDetails`

- **Line:** 3

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `franchiseeName` | `string` | Yes | - |
| `tradingEntity` | `string` | No | - |
| `mainContact` | `string` | No | - |
| `mobileNumber` | `string` | No | - |
| `email` | `string` | No | - |
| `personalEmail` | `string` | Yes | - |
| `abn` | `string` | No | - |
| `dateListedForSale` | `string` | No | - |
| `address` | `string` | No | - |
| `streetNumberAndName` | `string` | Yes | - |
| `suburb` | `string` | Yes | - |
| `state` | `string` | Yes | - |
| `postcode` | `string` | Yes | - |
| `dateBusinessStarted` | `string` | Yes | - |
| `expiryDate` | `string` | Yes | - |
| `ultimateExpiryDate` | `string` | Yes | - |
| `unlimitedTermOffer` | `string` | Yes | - |

---

### `TYPE` `DeedOption`

- **Line:** 23
- **Signature:** `'option_1' | 'option_2' | 'option_3'`

---

### `INTERFACE` `PresaleDeedOfVariation`

- **Line:** 25

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `status` | `'not_started' | 'sent' | 'option_selected' | 'signed_online' | 'pdf_uploaded'` | No | - |
| `selectedOption` | `DeedOption` | Yes | - |
| `party1Name` | `string` | Yes | - |
| `party1Address` | `string` | Yes | - |
| `party2Name` | `string` | Yes | - |
| `party2Address` | `string` | Yes | - |
| `party3Name` | `string` | Yes | - |
| `dateSent` | `string` | Yes | - |
| `sentAt` | `string` | Yes | - |
| `sentToEmail` | `string` | Yes | - |
| `signedAt` | `string` | Yes | - |
| `signerName` | `string` | Yes | - |
| `signerEmail` | `string` | Yes | - |
| `signatureDataUrl` | `string` | Yes | - |
| `directorSignerName` | `string` | Yes | - |
| `directorSignedAt` | `string` | Yes | - |
| `directorSignatureDataUrl` | `string` | Yes | - |
| `pdfFileName` | `string` | Yes | - |
| `pdfDataUrl` | `string` | Yes | - |
| `publicToken` | `string` | Yes | - |

---

### `INTERFACE` `PresalesDetails`

- **Line:** 48

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `commencementDate` | `string` | No | - |
| `expiryDate` | `string` | No | - |
| `ultimateExpiryDate` | `string` | No | - |
| `unlimitedTermOffer` | `string` | No | - |
| `unlimitedTermFee` | `number | string` | No | - |
| `renewalTermsYears` | `number | string` | No | - |
| `termOnFranchiseeIM` | `string` | No | - |
| `territoryName` | `string` | Yes | - |
| `dateBusinessStarted` | `string` | No | - |
| `numberOfOwners` | `string` | Yes | - |
| `reasonForSale` | `string` | Yes | - |
| `serviceRevenue` | `number | string` | No | - |
| `serviceRevenueYear` | `string` | No | - |
| `franchiseFeesOnServiceRevenue` | `string` | Yes | - |
| `marketingLevy` | `string` | Yes | - |
| `expressRevenue` | `string` | Yes | - |
| `salePrice` | `number | string` | No | - |
| `lowPrice` | `number | string` | No | - |
| `highPrice` | `number | string` | No | - |
| `totalDailyRunTime` | `string` | No | - |
| `currentMorningShift` | `string` | Yes | - |
| `currentAfternoonShift` | `string` | Yes | - |
| `franchiseTerm` | `string` | Yes | - |
| `mpexCommission` | `number | string` | No | - |
| `mpexCommissionYear` | `string` | No | - |
| `sendleCommission` | `number | string` | No | - |
| `sendleCommissionYear` | `string` | No | - |
| `salesCommissionPercent` | `number | string` | No | - |
| `nabAccreditation` | `string` | No | - |
| `nabAccreditationFee` | `number | string` | No | - |
| `territoryMapUrl` | `string` | Yes | - |
| `imStatus` | `'not_started' | 'sent' | 'signed_online'` | Yes | - |
| `publicToken` | `string` | Yes | - |
| `sentAt` | `string` | Yes | - |
| `sentToEmail` | `string` | Yes | - |
| `signedAt` | `string` | Yes | - |
| `signerName` | `string` | Yes | - |
| `signerEmail` | `string` | Yes | - |
| `signatureDataUrl` | `string` | Yes | - |

---

### `TYPE` `StepStatus`

- **Line:** 97
- **Signature:** `'Not Started' | 'In Progress' | 'Pending Review' | 'Completed'`

---

### `INTERFACE` `PresaleRecord`

- **Line:** 99

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | No | - |
| `franchiseeId` | `string` | No | - |
| `franchiseeName` | `string` | No | - |
| `status` | `'Step 1: Main Details' | 'Step 2: Deed Pending' | 'Step 3: Verification Pending' | 'Step 4: Presales Details' | 'Step 4: Franchisee IM Confirmation' | 'Active Presale' | 'Sold' | 'Cancelled'` | No | - |
| `step1Status` | `StepStatus` | No | - |
| `step2Status` | `StepStatus` | No | - |
| `step3Status` | `StepStatus` | No | - |
| `step4Status` | `StepStatus` | No | - |
| `mainDetails` | `PresaleMainDetails` | No | - |
| `deedOfVariation` | `PresaleDeedOfVariation` | No | - |
| `presalesDetails` | `PresalesDetails` | No | - |
| `createdAt` | `string` | No | - |
| `updatedAt` | `string` | No | - |
| `createdByUid` | `string` | Yes | - |
| `createdByName` | `string` | Yes | - |
| `updatedByUid` | `string` | Yes | - |
| `updatedByName` | `string` | Yes | - |
| `cancellationReason` | `string` | Yes | - |
| `cancellationNotes` | `string` | Yes | - |
| `cancelledAt` | `string` | Yes | - |
| `cancelledByUid` | `string` | Yes | - |
| `cancelledByName` | `string` | Yes | - |

---

