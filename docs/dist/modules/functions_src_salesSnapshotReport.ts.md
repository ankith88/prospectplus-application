# Module: `functions/src/salesSnapshotReport.ts`

- **Language:** TypeScript
- **Total Lines:** 511
- **Direct Dependencies:** 3 modules imported

## Exported Symbols & API

### `FUNCTION` `calculateMonthlyValue`

- **Line:** 6
- **Returns:** `number`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `lead` | `any` | **Yes** | - | - |

---

### `VARIABLE` `applicableStatuses`

- **Line:** 7

---

### `VARIABLE` `currentStatus`

- **Line:** 8

---

### `VARIABLE` `totalMonthlyValue`

- **Line:** 18

---

### `VARIABLE` `weeklyDays`

- **Line:** 25

---

### `FUNCTION` `parseDate`

- **Line:** 36
- **Returns:** `Date | null`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `dateVal` | `any` | **Yes** | - | - |

---

### `VARIABLE` `d`

- **Line:** 43

---

### `FUNCTION` `runSalesSnapshotReport`

- **Line:** 47
- **Async:** Yes
- **Returns:** `Promise<any>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `dateString` | `string` | **Yes** | - | - |
| `recipients` | `string[]` | **Yes** | - | - |
| `fromAddress` | `string` | No | - | - |

---

### `VARIABLE` `db`

- **Line:** 48

---

### `VARIABLE` `targetStart`

- **Line:** 53

---

### `VARIABLE` `targetEnd`

- **Line:** 54

---

### `VARIABLE` `dayStr`

- **Line:** 56

---

### `VARIABLE` `monthStr`

- **Line:** 57

---

### `VARIABLE` `dateCreatedString`

- **Line:** 58

---

### `VARIABLE` `usersSnap`

- **Line:** 60

---

### `VARIABLE` `amUserIdentifiers`

- **Line:** 61

---

### `VARIABLE` `u`

- **Line:** 63

---

### `VARIABLE` `roles`

- **Line:** 64

---

### `VARIABLE` `isAM`

- **Line:** 65

---

### `VARIABLE` `firstName`

- **Line:** 70

---

### `VARIABLE` `lastName`

- **Line:** 71

---

### `VARIABLE` `fullName`

- **Line:** 72

---

### `FUNCTION` `isManualActivity`

- **Line:** 82
- **Returns:** `boolean`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `act` | `any` | **Yes** | - | - |

---

### `VARIABLE` `source`

- **Line:** 96

---

### `VARIABLE` `author`

- **Line:** 100

---

### `VARIABLE` `noteText`

- **Line:** 104

---

### `VARIABLE` `activitySnap`

- **Line:** 117

---

### `VARIABLE` `rawActivities`

- **Line:** 118

---

### `VARIABLE` `actDate`

- **Line:** 124

---

### `VARIABLE` `author`

- **Line:** 128

---

### `VARIABLE` `apptSnap`

- **Line:** 136

---

### `VARIABLE` `rawAppointments`

- **Line:** 137

---

### `VARIABLE` `apptDate`

- **Line:** 143

---

### `VARIABLE` `activeLeadIds`

- **Line:** 148

---

### `VARIABLE` `leadsSnap`

- **Line:** 153

---

### `VARIABLE` `companiesSnap`

- **Line:** 154

---

### `VARIABLE` `allLeadsMap`

- **Line:** 156

---

### `VARIABLE` `data`

- **Line:** 160

---

### `VARIABLE` `isReferenced`

- **Line:** 161

---

### `VARIABLE` `createdYesterday`

- **Line:** 164

---

### `VARIABLE` `createdDate`

- **Line:** 168

---

### `VARIABLE` `enteredDate`

- **Line:** 173

---

### `VARIABLE` `data`

- **Line:** 186

---

### `VARIABLE` `isReferenced`

- **Line:** 187

---

### `VARIABLE` `createdYesterday`

- **Line:** 189

---

### `VARIABLE` `createdDate`

- **Line:** 191

---

### `VARIABLE` `allLeads`

- **Line:** 202

---

### `VARIABLE` `totalNewLeads`

- **Line:** 205

---

### `VARIABLE` `quotesCount`

- **Line:** 206

---

### `VARIABLE` `scfsCount`

- **Line:** 207

---

### `VARIABLE` `trialsCount`

- **Line:** 208

---

### `VARIABLE` `wonCount`

- **Line:** 209

---

### `VARIABLE` `totalWonMRR`

- **Line:** 210

---

### `VARIABLE` `totalPipelineMRR`

- **Line:** 211

---

### `VARIABLE` `agentActivity`

- **Line:** 214
- **Signature:** `Record<string, { calls: number; visits: number; tasks: number; total: number }>`

---

### `FUNCTION` `incrementAgent`

- **Line:** 216

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `user` | `string` | **Yes** | - | - |
| `type` | `'calls' | 'visits' | 'tasks'` | **Yes** | - | - |

---

### `VARIABLE` `name`

- **Line:** 217

---

### `VARIABLE` `author`

- **Line:** 226

---

### `VARIABLE` `author`

- **Line:** 237

---

### `VARIABLE` `status`

- **Line:** 242

---

### `VARIABLE` `createdYesterday`

- **Line:** 245

---

### `VARIABLE` `createdDate`

- **Line:** 249

---

### `VARIABLE` `quoteSentYesterday`

- **Line:** 257

---

### `VARIABLE` `qDate`

- **Line:** 259

---

### `VARIABLE` `scfAcceptedYesterday`

- **Line:** 266

---

### `VARIABLE` `sDate`

- **Line:** 268

---

### `VARIABLE` `trialStartedYesterday`

- **Line:** 275

---

### `VARIABLE` `tDate`

- **Line:** 277

---

### `VARIABLE` `wonYesterday`

- **Line:** 284

---

### `VARIABLE` `wDate`

- **Line:** 286

---

### `VARIABLE` `agentRowsHtml`

- **Line:** 303

---

### `VARIABLE` `emailHtml`

- **Line:** 316

---

### `VARIABLE` `sendDailySalesSnapshotReport`

> Scheduled Cloud Function that runs daily. Check current hour in Sydney to match schedule.

- **Line:** 429

---

### `VARIABLE` `db`

- **Line:** 436

---

### `VARIABLE` `recipients`

- **Line:** 437

---

### `VARIABLE` `frequency`

- **Line:** 438

---

### `VARIABLE` `fromAddress`

- **Line:** 439

---

### `VARIABLE` `configDoc`

- **Line:** 442

---

### `VARIABLE` `data`

- **Line:** 444

---

### `VARIABLE` `sydneyHourStr`

- **Line:** 474

---

### `VARIABLE` `currentHour`

- **Line:** 480

---

### `VARIABLE` `targetHour`

- **Line:** 481

---

### `VARIABLE` `sydneyFormatter`

- **Line:** 489

---

### `VARIABLE` `now`

- **Line:** 496

---

### `VARIABLE` `parts`

- **Line:** 498

---

### `VARIABLE` `day`

- **Line:** 499

---

### `VARIABLE` `month`

- **Line:** 500

---

### `VARIABLE` `year`

- **Line:** 501

---

### `VARIABLE` `dateString`

- **Line:** 502

---

