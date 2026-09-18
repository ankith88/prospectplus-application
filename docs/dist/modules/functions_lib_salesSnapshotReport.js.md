# Module: `functions/lib/salesSnapshotReport.js`

- **Language:** JavaScript
- **Total Lines:** 518

## Exported Symbols & API

### `VARIABLE` `__createBinding`

- **Line:** 2

---

### `VARIABLE` `desc`

- **Line:** 4

---

### `VARIABLE` `__setModuleDefault`

- **Line:** 13

---

### `VARIABLE` `__importStar`

- **Line:** 18

---

### `FUNCTION` `ownKeys`

- **Line:** 19

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `o` | `any` | **Yes** | - | - |

---

### `VARIABLE` `ar`

- **Line:** 21

---

### `VARIABLE` `result`

- **Line:** 29

---

### `VARIABLE` `functions`

- **Line:** 38

---

### `VARIABLE` `admin`

- **Line:** 39

---

### `VARIABLE` `emailDispatcher_1`

- **Line:** 40

---

### `FUNCTION` `calculateMonthlyValue`

- **Line:** 42
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `lead` | `any` | **Yes** | - | - |

---

### `VARIABLE` `applicableStatuses`

- **Line:** 43

---

### `VARIABLE` `currentStatus`

- **Line:** 44

---

### `VARIABLE` `totalMonthlyValue`

- **Line:** 51

---

### `VARIABLE` `weeklyDays`

- **Line:** 59

---

### `FUNCTION` `parseDate`

- **Line:** 68
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `dateVal` | `any` | **Yes** | - | - |

---

### `VARIABLE` `d`

- **Line:** 79

---

### `FUNCTION` `runSalesSnapshotReport`

- **Line:** 82
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `dateString` | `any` | **Yes** | - | - |
| `recipients` | `any` | **Yes** | - | - |
| `fromAddress` | `any` | **Yes** | - | - |

---

### `VARIABLE` `db`

- **Line:** 83

---

### `VARIABLE` `targetStart`

- **Line:** 87

---

### `VARIABLE` `targetEnd`

- **Line:** 88

---

### `VARIABLE` `dayStr`

- **Line:** 89

---

### `VARIABLE` `monthStr`

- **Line:** 90

---

### `VARIABLE` `dateCreatedString`

- **Line:** 91

---

### `VARIABLE` `usersSnap`

- **Line:** 92

---

### `VARIABLE` `amUserIdentifiers`

- **Line:** 93

---

### `VARIABLE` `u`

- **Line:** 95

---

### `VARIABLE` `roles`

- **Line:** 96

---

### `VARIABLE` `isAM`

- **Line:** 97

---

### `VARIABLE` `firstName`

- **Line:** 102

---

### `VARIABLE` `lastName`

- **Line:** 103

---

### `VARIABLE` `fullName`

- **Line:** 104

---

### `FUNCTION` `isManualActivity`

- **Line:** 113
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `act` | `any` | **Yes** | - | - |

---

### `VARIABLE` `source`

- **Line:** 126

---

### `VARIABLE` `author`

- **Line:** 130

---

### `VARIABLE` `noteText`

- **Line:** 134

---

### `VARIABLE` `activitySnap`

- **Line:** 144

---

### `VARIABLE` `rawActivities`

- **Line:** 145

---

### `VARIABLE` `actDate`

- **Line:** 152

---

### `VARIABLE` `author`

- **Line:** 157

---

### `VARIABLE` `apptSnap`

- **Line:** 164

---

### `VARIABLE` `rawAppointments`

- **Line:** 165

---

### `VARIABLE` `apptDate`

- **Line:** 172

---

### `VARIABLE` `activeLeadIds`

- **Line:** 176

---

### `VARIABLE` `leadsSnap`

- **Line:** 182

---

### `VARIABLE` `companiesSnap`

- **Line:** 183

---

### `VARIABLE` `allLeadsMap`

- **Line:** 184

---

### `VARIABLE` `data`

- **Line:** 187

---

### `VARIABLE` `isReferenced`

- **Line:** 188

---

### `VARIABLE` `createdYesterday`

- **Line:** 190

---

### `VARIABLE` `createdDate`

- **Line:** 195

---

### `VARIABLE` `enteredDate`

- **Line:** 201

---

### `VARIABLE` `data`

- **Line:** 212

---

### `VARIABLE` `isReferenced`

- **Line:** 213

---

### `VARIABLE` `createdYesterday`

- **Line:** 214

---

### `VARIABLE` `createdDate`

- **Line:** 216

---

### `VARIABLE` `allLeads`

- **Line:** 225

---

### `VARIABLE` `totalNewLeads`

- **Line:** 227

---

### `VARIABLE` `quotesCount`

- **Line:** 228

---

### `VARIABLE` `scfsCount`

- **Line:** 229

---

### `VARIABLE` `trialsCount`

- **Line:** 230

---

### `VARIABLE` `wonCount`

- **Line:** 231

---

### `VARIABLE` `totalWonMRR`

- **Line:** 232

---

### `VARIABLE` `totalPipelineMRR`

- **Line:** 233

---

### `VARIABLE` `agentActivity`

- **Line:** 235

---

### `FUNCTION` `incrementAgent`

- **Line:** 236

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `user` | `any` | **Yes** | - | - |
| `type` | `any` | **Yes** | - | - |

---

### `VARIABLE` `name`

- **Line:** 237

---

### `VARIABLE` `author`

- **Line:** 245

---

### `VARIABLE` `author`

- **Line:** 257

---

### `VARIABLE` `status`

- **Line:** 261

---

### `VARIABLE` `createdYesterday`

- **Line:** 263

---

### `VARIABLE` `createdDate`

- **Line:** 268

---

### `VARIABLE` `quoteSentYesterday`

- **Line:** 276

---

### `VARIABLE` `qDate`

- **Line:** 278

---

### `VARIABLE` `scfAcceptedYesterday`

- **Line:** 285

---

### `VARIABLE` `sDate`

- **Line:** 287

---

### `VARIABLE` `trialStartedYesterday`

- **Line:** 294

---

### `VARIABLE` `tDate`

- **Line:** 296

---

### `VARIABLE` `wonYesterday`

- **Line:** 303

---

### `VARIABLE` `wDate`

- **Line:** 305

---

### `VARIABLE` `agentRowsHtml`

- **Line:** 320

---

### `VARIABLE` `emailHtml`

- **Line:** 332

---

### `VARIABLE` `db`

- **Line:** 448

---

### `VARIABLE` `recipients`

- **Line:** 449

---

### `VARIABLE` `frequency`

- **Line:** 450

---

### `VARIABLE` `fromAddress`

- **Line:** 451

---

### `VARIABLE` `configDoc`

- **Line:** 453

---

### `VARIABLE` `data`

- **Line:** 455

---

### `VARIABLE` `sydneyHourStr`

- **Line:** 485

---

### `VARIABLE` `currentHour`

- **Line:** 490

---

### `VARIABLE` `targetHour`

- **Line:** 491

---

### `VARIABLE` `sydneyFormatter`

- **Line:** 497

---

### `VARIABLE` `now`

- **Line:** 503

---

### `VARIABLE` `parts`

- **Line:** 505

---

### `VARIABLE` `day`

- **Line:** 506

---

### `VARIABLE` `month`

- **Line:** 507

---

### `VARIABLE` `year`

- **Line:** 508

---

### `VARIABLE` `dateString`

- **Line:** 509

---

