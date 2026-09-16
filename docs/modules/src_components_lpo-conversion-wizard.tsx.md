# Module: `src/components/lpo-conversion-wizard.tsx`

- **Language:** TypeScript
- **Total Lines:** 1296
- **Direct Dependencies:** 16 modules imported

## Exported Symbols & API

### `FUNCTION` `buildLpoServicesArray`

- **Line:** 28
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `ampoRate` | `any` | **Yes** | - | - |
| `pmpoRate` | `any` | **Yes** | - | - |
| `packageRate` | `any` | **Yes** | - | - |
| `additionalBagRate` | `any` | **Yes** | - | - |
| `startDate` | `string` | No | - | - |

---

### `VARIABLE` `am`

- **Line:** 29

---

### `VARIABLE` `pm`

- **Line:** 30

---

### `VARIABLE` `pkg`

- **Line:** 31

---

### `VARIABLE` `add`

- **Line:** 32

---

### `VARIABLE` `todayStr`

- **Line:** 34

---

### `VARIABLE` `services`

- **Line:** 36
- **Signature:** `any[]`

---

### `FUNCTION` `getInitialStep`

- **Line:** 74
- **Returns:** `number`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `lead` | `any` | **Yes** | - | - |

---

### `VARIABLE` `statusStr`

- **Line:** 78

---

### `FUNCTION` `getFranchiseeSuburbs`

- **Line:** 99
- **Returns:** `any[]`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `fran` | `any` | **Yes** | - | - |

---

### `VARIABLE` `parsed`

- **Line:** 109

---

### `VARIABLE` `parsed`

- **Line:** 115

---

### `FUNCTION` `calculateDistance`

- **Line:** 123
- **Returns:** `number`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `lat1` | `number` | **Yes** | - | - |
| `lon1` | `number` | **Yes** | - | - |
| `lat2` | `number` | **Yes** | - | - |
| `lon2` | `number` | **Yes** | - | - |

---

### `VARIABLE` `R`

- **Line:** 124

---

### `VARIABLE` `dLat`

- **Line:** 125

---

### `VARIABLE` `dLon`

- **Line:** 126

---

### `VARIABLE` `a`

- **Line:** 127

---

### `VARIABLE` `c`

- **Line:** 133

---

### `INTERFACE` `LpoConversionWizardProps`

- **Line:** 137

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `lead` | `any` | No | - |
| `onSuccess` | `(updatedLead: any) => void` | No | - |

---

### `FUNCTION` `LpoConversionWizard`

- **Line:** 142
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ lead, onSuccess }` | `LpoConversionWizardProps` | **Yes** | - | - |

---

### `VARIABLE` `router`

- **Line:** 143

---

### `FUNCTION` `fetchData`

- **Line:** 186
- **Async:** Yes
- **Returns:** `void`

---

### `VARIABLE` `locationsSnap`

- **Line:** 190

---

### `VARIABLE` `locs`

- **Line:** 191
- **Signature:** `any[]`

---

### `VARIABLE` `data`

- **Line:** 193

---

### `VARIABLE` `sortedLocs`

- **Line:** 200

---

### `VARIABLE` `distance`

- **Line:** 201

---

### `VARIABLE` `locLat`

- **Line:** 202

---

### `VARIABLE` `locLng`

- **Line:** 203

---

### `VARIABLE` `postcodeA`

- **Line:** 213

---

### `VARIABLE` `postcodeB`

- **Line:** 214

---

### `VARIABLE` `suburbA`

- **Line:** 217

---

### `VARIABLE` `suburbB`

- **Line:** 218

---

### `VARIABLE` `leadSuburb`

- **Line:** 219

---

### `VARIABLE` `preselected`

- **Line:** 229

---

### `VARIABLE` `franchiseesSnap`

- **Line:** 239

---

### `VARIABLE` `fList`

- **Line:** 240
- **Signature:** `any[]`

---

### `VARIABLE` `data`

- **Line:** 242

---

### `VARIABLE` `nameA`

- **Line:** 247

---

### `VARIABLE` `nameB`

- **Line:** 248

---

### `FUNCTION` `handleLinkFranchisees`

- **Line:** 267

---

### `VARIABLE` `unmappedNames`

- **Line:** 268
- **Signature:** `string[]`

---

### `VARIABLE` `updated`

- **Line:** 270

---

### `VARIABLE` `existing`

- **Line:** 271

---

### `VARIABLE` `original`

- **Line:** 272

---

### `VARIABLE` `suburbs`

- **Line:** 273

---

### `VARIABLE` `franName`

- **Line:** 274

---

### `FUNCTION` `handleUpdateFranchiseeField`

- **Line:** 314

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `franchiseeId` | `string` | **Yes** | - | - |
| `field` | `string` | **Yes** | - | - |
| `value` | `string` | **Yes** | - | - |

---

### `FUNCTION` `handleDeleteLinkedFranchisee`

- **Line:** 320

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `franchiseeId` | `string` | **Yes** | - | - |

---

### `FUNCTION` `handleNextStep`

- **Line:** 325
- **Async:** Yes

---

### `VARIABLE` `docRef`

- **Line:** 328

---

### `VARIABLE` `step1Data`

- **Line:** 349

---

### `VARIABLE` `step2Data`

- **Line:** 375

---

### `VARIABLE` `step3Data`

- **Line:** 394

---

### `FUNCTION` `handleBackStep`

- **Line:** 424
- **Async:** Yes

---

### `VARIABLE` `docRef`

- **Line:** 428

---

### `VARIABLE` `prevStep`

- **Line:** 429

---

### `FUNCTION` `handleSubmit`

- **Line:** 448
- **Async:** Yes

---

### `VARIABLE` `timestampSuffix`

- **Line:** 462

---

### `VARIABLE` `parentProspectPlusId`

- **Line:** 463

---

### `VARIABLE` `nameParts`

- **Line:** 466

---

### `VARIABLE` `firstName`

- **Line:** 467

---

### `VARIABLE` `lastName`

- **Line:** 468

---

### `VARIABLE` `primaryContact`

- **Line:** 470

---

### `VARIABLE` `leadAddress`

- **Line:** 478

---

### `VARIABLE` `parentLeadPayload`

- **Line:** 490

---

### `VARIABLE` `contactsToCopy`

- **Line:** 554

---

### `VARIABLE` `parentLeadDocRef`

- **Line:** 559

---

### `VARIABLE` `parentLeadId`

- **Line:** 563

---

### `VARIABLE` `createdChildLeadIds`

- **Line:** 579
- **Signature:** `string[]`

---

### `VARIABLE` `childProspectPlusId`

- **Line:** 581

---

### `VARIABLE` `zeeName`

- **Line:** 582

---

### `VARIABLE` `zeeId`

- **Line:** 583

---

### `VARIABLE` `childLeadPayload`

- **Line:** 585

---

### `VARIABLE` `childDocRef`

- **Line:** 600

---

### `VARIABLE` `childLeadId`

- **Line:** 601

---

### `VARIABLE` `conversionData`

- **Line:** 619

---

### `VARIABLE` `docRef`

- **Line:** 669

---

### `VARIABLE` `isActive`

- **Line:** 736

---

### `VARIABLE` `initialProgress`

- **Line:** 737

---

### `VARIABLE` `isCompleted`

- **Line:** 738

---

### `VARIABLE` `fullFran`

- **Line:** 1096

---

### `VARIABLE` `suburbs`

- **Line:** 1097

---

### `VARIABLE` `hasSuburbs`

- **Line:** 1098

---

### `VARIABLE` `subs`

- **Line:** 1241

---

