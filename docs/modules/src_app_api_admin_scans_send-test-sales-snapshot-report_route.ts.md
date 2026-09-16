# Module: `src/app/api/admin/scans/send-test-sales-snapshot-report/route.ts`

- **Language:** TypeScript
- **Total Lines:** 447
- **Direct Dependencies:** 6 modules imported

## Exported Symbols & API

### `VARIABLE` `dynamic`

- **Line:** 8

---

### `FUNCTION` `parseDate`

- **Line:** 10
- **Returns:** `Date | null`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `dateVal` | `any` | **Yes** | - | - |

---

### `VARIABLE` `d`

- **Line:** 17

---

### `FUNCTION` `POST`

- **Line:** 21
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `request` | `Request` | **Yes** | - | - |

---

### `VARIABLE` `body`

- **Line:** 23

---

### `VARIABLE` `db`

- **Line:** 30

---

### `VARIABLE` `sydneyFormatter`

- **Line:** 32

---

### `VARIABLE` `dateString`

- **Line:** 39
- **Signature:** `string`

---

### `VARIABLE` `targetStart`

- **Line:** 40
- **Signature:** `Date`

---

### `VARIABLE` `targetEnd`

- **Line:** 41
- **Signature:** `Date`

---

### `VARIABLE` `now`

- **Line:** 49

---

### `VARIABLE` `parts`

- **Line:** 51

---

### `VARIABLE` `day`

- **Line:** 52

---

### `VARIABLE` `month`

- **Line:** 53

---

### `VARIABLE` `year`

- **Line:** 54

---

### `VARIABLE` `dayStr`

- **Line:** 61

---

### `VARIABLE` `monthStr`

- **Line:** 62

---

### `VARIABLE` `dateCreatedString`

- **Line:** 63

---

### `VARIABLE` `usersSnap`

- **Line:** 65

---

### `VARIABLE` `amUserIdentifiers`

- **Line:** 66

---

### `VARIABLE` `u`

- **Line:** 68

---

### `VARIABLE` `roles`

- **Line:** 69

---

### `VARIABLE` `isAM`

- **Line:** 70

---

### `VARIABLE` `firstName`

- **Line:** 75

---

### `VARIABLE` `lastName`

- **Line:** 76

---

### `VARIABLE` `fullName`

- **Line:** 77

---

### `FUNCTION` `isManualActivity`

- **Line:** 87
- **Returns:** `boolean`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `act` | `any` | **Yes** | - | - |

---

### `VARIABLE` `source`

- **Line:** 101

---

### `VARIABLE` `author`

- **Line:** 105

---

### `VARIABLE` `noteText`

- **Line:** 109

---

### `VARIABLE` `activitySnap`

- **Line:** 122

---

### `VARIABLE` `rawActivities`

- **Line:** 123

---

### `VARIABLE` `actDate`

- **Line:** 129

---

### `VARIABLE` `author`

- **Line:** 133

---

### `VARIABLE` `apptSnap`

- **Line:** 141

---

### `VARIABLE` `rawAppointments`

- **Line:** 142

---

### `VARIABLE` `apptDate`

- **Line:** 148

---

### `VARIABLE` `activeLeadIds`

- **Line:** 153

---

### `VARIABLE` `leadsSnap`

- **Line:** 158

---

### `VARIABLE` `companiesSnap`

- **Line:** 159

---

### `VARIABLE` `allLeadsMap`

- **Line:** 161

---

### `VARIABLE` `data`

- **Line:** 165

---

### `VARIABLE` `isReferenced`

- **Line:** 166

---

### `VARIABLE` `createdYesterday`

- **Line:** 169

---

### `VARIABLE` `createdDate`

- **Line:** 173

---

### `VARIABLE` `enteredDate`

- **Line:** 178

---

### `VARIABLE` `data`

- **Line:** 191

---

### `VARIABLE` `isReferenced`

- **Line:** 192

---

### `VARIABLE` `createdYesterday`

- **Line:** 194

---

### `VARIABLE` `createdDate`

- **Line:** 196

---

### `VARIABLE` `allLeads`

- **Line:** 207

---

### `VARIABLE` `totalNewLeads`

- **Line:** 210

---

### `VARIABLE` `quotesCount`

- **Line:** 211

---

### `VARIABLE` `scfsCount`

- **Line:** 212

---

### `VARIABLE` `trialsCount`

- **Line:** 213

---

### `VARIABLE` `wonCount`

- **Line:** 214

---

### `VARIABLE` `totalWonMRR`

- **Line:** 215

---

### `VARIABLE` `totalPipelineMRR`

- **Line:** 216

---

### `VARIABLE` `agentActivity`

- **Line:** 219
- **Signature:** `Record<string, { calls: number; visits: number; tasks: number; total: number }>`

---

### `FUNCTION` `incrementAgent`

- **Line:** 221

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `user` | `string` | **Yes** | - | - |
| `type` | `'calls' | 'visits' | 'tasks'` | **Yes** | - | - |

---

### `VARIABLE` `name`

- **Line:** 222

---

### `VARIABLE` `author`

- **Line:** 231

---

### `VARIABLE` `author`

- **Line:** 242

---

### `VARIABLE` `status`

- **Line:** 247

---

### `VARIABLE` `createdYesterday`

- **Line:** 250

---

### `VARIABLE` `createdDate`

- **Line:** 254

---

### `VARIABLE` `quoteSentYesterday`

- **Line:** 262

---

### `VARIABLE` `qDate`

- **Line:** 264

---

### `VARIABLE` `scfAcceptedYesterday`

- **Line:** 271

---

### `VARIABLE` `sDate`

- **Line:** 273

---

### `VARIABLE` `trialStartedYesterday`

- **Line:** 280

---

### `VARIABLE` `tDate`

- **Line:** 282

---

### `VARIABLE` `wonYesterday`

- **Line:** 289

---

### `VARIABLE` `wDate`

- **Line:** 291

---

### `VARIABLE` `agentRowsHtml`

- **Line:** 307

---

### `VARIABLE` `emailHtml`

- **Line:** 320

---

### `VARIABLE` `fromAddress`

- **Line:** 418

---

### `VARIABLE` `configDoc`

- **Line:** 420

---

### `VARIABLE` `toStr`

- **Line:** 428

---

### `VARIABLE` `result`

- **Line:** 430

---

