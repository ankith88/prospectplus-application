# Module: `scratch/trigger-sales-snapshot-test-report.js`

- **Language:** JavaScript
- **Total Lines:** 428

## Exported Symbols & API

### `VARIABLE` `admin`

- **Line:** 1

---

### `VARIABLE` `nodemailer`

- **Line:** 2

---

### `VARIABLE` `db`

- **Line:** 10

---

### `FUNCTION` `calculateMonthlyValue`

- **Line:** 12
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `lead` | `any` | **Yes** | - | - |

---

### `VARIABLE` `applicableStatuses`

- **Line:** 13

---

### `VARIABLE` `currentStatus`

- **Line:** 14

---

### `VARIABLE` `totalMonthlyValue`

- **Line:** 24

---

### `VARIABLE` `weeklyDays`

- **Line:** 31

---

### `FUNCTION` `parseDate`

- **Line:** 41
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `dateVal` | `any` | **Yes** | - | - |

---

### `VARIABLE` `d`

- **Line:** 48

---

### `FUNCTION` `sendAutomatedEmail`

- **Line:** 52
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ to, subject, html, customFrom }` | `any` | **Yes** | - | - |

---

### `VARIABLE` `transporter`

- **Line:** 57

---

### `VARIABLE` `info`

- **Line:** 72

---

### `FUNCTION` `trigger`

- **Line:** 102
- **Async:** Yes
- **Returns:** `void`

---

### `VARIABLE` `recipients`

- **Line:** 103

---

### `VARIABLE` `fromAddress`

- **Line:** 104

---

### `VARIABLE` `sydneyFormatter`

- **Line:** 107

---

### `VARIABLE` `now`

- **Line:** 114

---

### `VARIABLE` `parts`

- **Line:** 116

---

### `VARIABLE` `day`

- **Line:** 117

---

### `VARIABLE` `month`

- **Line:** 118

---

### `VARIABLE` `year`

- **Line:** 119

---

### `VARIABLE` `dateString`

- **Line:** 120

---

### `VARIABLE` `targetStart`

- **Line:** 123

---

### `VARIABLE` `targetEnd`

- **Line:** 124

---

### `VARIABLE` `dayStr`

- **Line:** 126

---

### `VARIABLE` `monthStr`

- **Line:** 127

---

### `VARIABLE` `dateCreatedString`

- **Line:** 128

---

### `VARIABLE` `activitySnap`

- **Line:** 133

---

### `VARIABLE` `rawActivities`

- **Line:** 134

---

### `VARIABLE` `actDate`

- **Line:** 140

---

### `VARIABLE` `apptSnap`

- **Line:** 145

---

### `VARIABLE` `rawAppointments`

- **Line:** 146

---

### `VARIABLE` `apptDate`

- **Line:** 152

---

### `VARIABLE` `activeLeadIds`

- **Line:** 157

---

### `VARIABLE` `leadsSnap`

- **Line:** 162

---

### `VARIABLE` `companiesSnap`

- **Line:** 163

---

### `VARIABLE` `allLeadsMap`

- **Line:** 165

---

### `VARIABLE` `data`

- **Line:** 169

---

### `VARIABLE` `isReferenced`

- **Line:** 170

---

### `VARIABLE` `createdYesterday`

- **Line:** 172

---

### `VARIABLE` `createdDate`

- **Line:** 176

---

### `VARIABLE` `enteredDate`

- **Line:** 181

---

### `VARIABLE` `data`

- **Line:** 194

---

### `VARIABLE` `isReferenced`

- **Line:** 195

---

### `VARIABLE` `createdYesterday`

- **Line:** 197

---

### `VARIABLE` `createdDate`

- **Line:** 199

---

### `VARIABLE` `allLeads`

- **Line:** 210

---

### `VARIABLE` `totalNewLeads`

- **Line:** 213

---

### `VARIABLE` `quotesCount`

- **Line:** 214

---

### `VARIABLE` `scfsCount`

- **Line:** 215

---

### `VARIABLE` `trialsCount`

- **Line:** 216

---

### `VARIABLE` `wonCount`

- **Line:** 217

---

### `VARIABLE` `totalWonMRR`

- **Line:** 218

---

### `VARIABLE` `totalPipelineMRR`

- **Line:** 219

---

### `VARIABLE` `agentActivity`

- **Line:** 221

---

### `FUNCTION` `incrementAgent`

- **Line:** 223

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `user` | `any` | **Yes** | - | - |
| `type` | `any` | **Yes** | - | - |

---

### `VARIABLE` `name`

- **Line:** 224

---

### `VARIABLE` `author`

- **Line:** 233

---

### `VARIABLE` `author`

- **Line:** 244

---

### `VARIABLE` `status`

- **Line:** 249

---

### `VARIABLE` `createdYesterday`

- **Line:** 251

---

### `VARIABLE` `createdDate`

- **Line:** 255

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

- **Line:** 306

---

### `VARIABLE` `emailHtml`

- **Line:** 318

---

### `VARIABLE` `res`

- **Line:** 417

---

