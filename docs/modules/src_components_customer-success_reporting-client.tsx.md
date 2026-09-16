# Module: `src/components/customer-success/reporting-client.tsx`

- **Language:** TypeScript
- **Total Lines:** 776
- **Direct Dependencies:** 22 modules imported

## Exported Symbols & API

### `INTERFACE` `CsCallRecord`

- **Line:** 42

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | No | - |
| `leadId` | `string` | No | - |
| `leadName` | `string` | Yes | - |
| `companyName` | `string` | Yes | - |
| `author` | `string` | No | - |
| `outcome` | `string` | No | - |
| `notes` | `string` | No | - |
| `date` | `string` | No | - |
| `leadStatus` | `string` | Yes | - |
| `customerSuccessAssigned` | `string` | Yes | - |

---

### `INTERFACE` `CsLeadSummary`

- **Line:** 55

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `leadId` | `string` | No | - |
| `leadName` | `string` | No | - |
| `companyName` | `string` | No | - |
| `csCallCount` | `number` | No | - |
| `lastCsOutcome` | `string` | No | - |
| `lastCsContactedDate` | `string` | No | - |
| `customerStatus` | `string` | No | - |
| `customerSuccessAssigned` | `string` | No | - |

---

### `VARIABLE` `COLORS`

- **Line:** 66

---

### `FUNCTION` `CustomerSuccessReportingClient`

- **Line:** 68
- **Returns:** `void`

---

### `FUNCTION` `fetchData`

- **Line:** 92
- **Async:** Yes

---

### `VARIABLE` `leadsSnap`

- **Line:** 96

---

### `VARIABLE` `fetchedLeads`

- **Line:** 97
- **Signature:** `any[]`

---

### `VARIABLE` `extractedCsCalls`

- **Line:** 98
- **Signature:** `CsCallRecord[]`

---

### `VARIABLE` `data`

- **Line:** 101

---

### `VARIABLE` `leadId`

- **Line:** 102

---

### `VARIABLE` `activityQuery`

- **Line:** 126

---

### `VARIABLE` `actSnap`

- **Line:** 130

---

### `VARIABLE` `actData`

- **Line:** 132

---

### `VARIABLE` `parentLeadRef`

- **Line:** 133

---

### `VARIABLE` `leadId`

- **Line:** 134

---

### `VARIABLE` `matchedLead`

- **Line:** 135

---

### `VARIABLE` `rawNotes`

- **Line:** 137

---

### `VARIABLE` `outcome`

- **Line:** 138

---

### `VARIABLE` `parts`

- **Line:** 140

---

### `VARIABLE` `existing`

- **Line:** 144

---

### `FUNCTION` `handleQuickDateChange`

- **Line:** 182

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `value` | `string` | **Yes** | - | - |

---

### `VARIABLE` `now`

- **Line:** 184

---

### `VARIABLE` `csRepsList`

- **Line:** 199

---

### `VARIABLE` `repsSet`

- **Line:** 200

---

### `VARIABLE` `filteredCalls`

- **Line:** 211

---

### `VARIABLE` `lead`

- **Line:** 215

---

### `VARIABLE` `camp`

- **Line:** 216

---

### `VARIABLE` `matchesAuthor`

- **Line:** 222

---

### `VARIABLE` `matchesAssigned`

- **Line:** 223

---

### `VARIABLE` `callDate`

- **Line:** 229

---

### `VARIABLE` `fromDate`

- **Line:** 230

---

### `VARIABLE` `toDate`

- **Line:** 231

---

### `VARIABLE` `q`

- **Line:** 239

---

### `VARIABLE` `matchesLead`

- **Line:** 240

---

### `VARIABLE` `matchesCompany`

- **Line:** 241

---

### `VARIABLE` `matchesAuthor`

- **Line:** 242

---

### `VARIABLE` `matchesOutcome`

- **Line:** 243

---

### `VARIABLE` `matchesNotes`

- **Line:** 244

---

### `VARIABLE` `filteredLeads`

- **Line:** 255

---

### `VARIABLE` `camp`

- **Line:** 259

---

### `VARIABLE` `hasCsActivity`

- **Line:** 264

---

### `VARIABLE` `isCsAssigned`

- **Line:** 265

---

### `VARIABLE` `matchesAssigned`

- **Line:** 269

---

### `VARIABLE` `matchesAuthor`

- **Line:** 270

---

### `VARIABLE` `totalAttempts`

- **Line:** 278

---

### `VARIABLE` `uniqueLeadsContacted`

- **Line:** 280

---

### `VARIABLE` `setIds`

- **Line:** 281

---

### `VARIABLE` `avgAttemptsPerLead`

- **Line:** 285

---

### `VARIABLE` `totalCsAssignedLeads`

- **Line:** 287

---

### `VARIABLE` `csContactCoverage`

- **Line:** 288

---

### `VARIABLE` `outcomeDistribution`

- **Line:** 293

---

### `VARIABLE` `counts`

- **Line:** 294
- **Signature:** `Record<string, number>`

---

### `VARIABLE` `outcome`

- **Line:** 296

---

### `VARIABLE` `topOutcome`

- **Line:** 304

---

### `VARIABLE` `attemptFrequencyData`

- **Line:** 307

---

### `VARIABLE` `countsMap`

- **Line:** 308
- **Signature:** `Record<string, number>`

---

### `VARIABLE` `oneAttempt`

- **Line:** 313

---

### `VARIABLE` `twoAttempts`

- **Line:** 314

---

### `VARIABLE` `threeToFour`

- **Line:** 315

---

### `VARIABLE` `fivePlus`

- **Line:** 316

---

### `VARIABLE` `csRepLeaderboard`

- **Line:** 334

---

### `VARIABLE` `repsMap`

- **Line:** 335
- **Signature:** `Record<string, { name: string; totalCalls: number; uniqueLeads: Set<string>; outcomesCount: Record<string, number>; lastDate: string }>`

---

### `VARIABLE` `author`

- **Line:** 338

---

### `FUNCTION` `handleExportCsv`

- **Line:** 371

---

### `VARIABLE` `csvRows`

- **Line:** 372

---

### `VARIABLE` `csvContent`

- **Line:** 386

---

### `VARIABLE` `encodedUri`

- **Line:** 387

---

### `VARIABLE` `link`

- **Line:** 388

---

