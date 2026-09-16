# Module: `src/app/check-in/[leadId]/select-services/page.tsx`

- **Language:** TypeScript
- **Total Lines:** 925
- **Direct Dependencies:** 33 modules imported

## Exported Symbols & API

### `VARIABLE` `days`

- **Line:** 52

---

### `VARIABLE` `formSchema`

- **Line:** 54

---

### `TYPE` `FormValues`

- **Line:** 68
- **Signature:** `z.infer<typeof formSchema>`

---

### `FUNCTION` `SelectServicesContent`

- **Line:** 70
- **Returns:** `void`

---

### `FUNCTION` `fetchLocations`

- **Line:** 83
- **Async:** Yes
- **Returns:** `void`

---

### `VARIABLE` `snap`

- **Line:** 85

---

### `VARIABLE` `targetId`

- **Line:** 96

---

### `VARIABLE` `targetName`

- **Line:** 97

---

### `VARIABLE` `found`

- **Line:** 100

---

### `VARIABLE` `found`

- **Line:** 106

---

### `VARIABLE` `router`

- **Line:** 115

---

### `VARIABLE` `params`

- **Line:** 116

---

### `VARIABLE` `searchParams`

- **Line:** 117

---

### `VARIABLE` `mode`

- **Line:** 119

---

### `VARIABLE` `form`

- **Line:** 121

---

### `VARIABLE` `leadId`

- **Line:** 136

---

### `VARIABLE` `formattedServices`

- **Line:** 165

---

### `VARIABLE` `selectedServices`

- **Line:** 173

---

### `VARIABLE` `addServices`

- **Line:** 174

---

### `VARIABLE` `shipmateAccess`

- **Line:** 175

---

### `VARIABLE` `localmileAccess`

- **Line:** 176

---

### `VARIABLE` `isLpoNetworkBucket`

- **Line:** 178

---

### `VARIABLE` `initialSelectedServices`

- **Line:** 181
- **Signature:** `string[]`

---

### `VARIABLE` `initialFrequencies`

- **Line:** 182
- **Signature:** `Record<string, any>`

---

### `VARIABLE` `initialRates`

- **Line:** 183
- **Signature:** `Record<string, any>`

---

### `VARIABLE` `defaultContactId`

- **Line:** 190

---

### `VARIABLE` `hasExistingLocalMileAccess`

- **Line:** 192

---

### `FUNCTION` `handleDateSelect`

- **Line:** 208

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `range` | `DateRange | undefined` | **Yes** | - | - |
| `onChange` | `(...event: any[]) => void` | **Yes** | - | - |

---

### `FUNCTION` `handleContactAdded`

- **Line:** 216

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `newContact` | `Contact` | **Yes** | - | - |

---

### `FUNCTION` `handleSubmit`

- **Line:** 221
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `values` | `FormValues` | **Yes** | - | - |

---

### `VARIABLE` `nsResponse`

- **Line:** 264
- **Signature:** `{ success: boolean; message: string }`

---

### `VARIABLE` `newStatus`

- **Line:** 265
- **Signature:** `Lead['status']`

---

### `VARIABLE` `successDescription`

- **Line:** 266
- **Signature:** `string`

---

### `VARIABLE` `allContactIdsToUpdate`

- **Line:** 268

---

### `VARIABLE` `serviceSelections`

- **Line:** 281

---

### `VARIABLE` `trialDates`

- **Line:** 288

---

### `VARIABLE` `salesRepIdMap`

- **Line:** 305
- **Signature:** `Record<string, string>`

---

### `VARIABLE` `salesRepId`

- **Line:** 311

---

### `VARIABLE` `mappedServices`

- **Line:** 313

---

### `VARIABLE` `matchingService`

- **Line:** 314

---

### `VARIABLE` `freqStr`

- **Line:** 316

---

### `VARIABLE` `daysMap`

- **Line:** 320

---

### `VARIABLE` `boolArr`

- **Line:** 321

---

### `VARIABLE` `hasPriorQuote`

- **Line:** 334

---

### `VARIABLE` `signupServices`

- **Line:** 337

---

### `VARIABLE` `effectiveShipmateAccess`

- **Line:** 338

---

### `VARIABLE` `effectiveLocalmileAccess`

- **Line:** 339

---

### `VARIABLE` `serviceSelectionsForDb`

- **Line:** 377

---

### `VARIABLE` `isPmpo`

- **Line:** 389

---

### `VARIABLE` `freq`

- **Line:** 390

---

### `VARIABLE` `isRecurring`

- **Line:** 391

---

### `VARIABLE` `freqArr`

- **Line:** 394

---

### `VARIABLE` `bankLocId`

- **Line:** 454

---

### `VARIABLE` `bankLocName`

- **Line:** 455

---

### `VARIABLE` `activeRouteId`

- **Line:** 480

---

### `FUNCTION` `getTitle`

- **Line:** 495

---

### `VARIABLE` `contactOptions`

- **Line:** 505
- **Signature:** `MultiSelectOption[]`

---

### `VARIABLE` `newSelected`

- **Line:** 654

---

### `VARIABLE` `newFrequency`

- **Line:** 702

---

### `VARIABLE` `currentDays`

- **Line:** 725

---

### `VARIABLE` `newDays`

- **Line:** 726

---

### `VARIABLE` `stateVal`

- **Line:** 747

---

### `VARIABLE` `nearbyBanks`

- **Line:** 748

---

### `VARIABLE` `query`

- **Line:** 749

---

### `VARIABLE` `displayBanks`

- **Line:** 751

---

### `VARIABLE` `isFallback`

- **Line:** 761

---

### `VARIABLE` `allStateBanks`

- **Line:** 763

---

### `VARIABLE` `activeBankId`

- **Line:** 772

---

### `VARIABLE` `matchingBank`

- **Line:** 773

---

### `VARIABLE` `effectiveValue`

- **Line:** 781

---

### `VARIABLE` `allLocs`

- **Line:** 809

---

### `VARIABLE` `found`

- **Line:** 810

---

### `FUNCTION` `SelectServicesPage`

- **Line:** 918
- **Returns:** `void`

---

