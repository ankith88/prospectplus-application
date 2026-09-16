# Module: `src/lib/zee-gen-leads-service.ts`

- **Language:** TypeScript
- **Total Lines:** 470
- **Direct Dependencies:** 3 modules imported

## Exported Symbols & API

### `INTERFACE` `ZeeGenAutoResponseOptions`

- **Line:** 5

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `testEmail` | `string` | Yes | - |
| `targetDate` | `string` | Yes | - |
| `fromAddress` | `string` | Yes | - |

---

### `INTERFACE` `FranchiseeAutoResponseResult`

- **Line:** 11

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `franchisee` | `string` | No | - |
| `leadCount` | `number` | No | - |
| `recipientEmail` | `string` | No | - |
| `sent` | `boolean` | No | - |
| `simulated` | `boolean` | Yes | - |
| `error` | `string` | Yes | - |

---

### `INTERFACE` `ProcessZeeGenAutoResponseResponse`

- **Line:** 20

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `success` | `boolean` | No | - |
| `targetDate` | `string` | No | - |
| `templateFound` | `boolean` | No | - |
| `totalFranchiseesWithLeads` | `number` | No | - |
| `totalLeadsProcessed` | `number` | No | - |
| `results` | `FranchiseeAutoResponseResult[]` | No | - |
| `error` | `string` | Yes | - |

---

### `VARIABLE` `DEFAULT_ZEE_GEN_TEMPLATE_BODY`

- **Line:** 30

---

### `FUNCTION` `processZeeGenAutoResponse`

- **Line:** 164
- **Async:** Yes
- **Returns:** `Promise<ProcessZeeGenAutoResponseResponse>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `options` | `ZeeGenAutoResponseOptions` | No | `{}` | - |

---

### `VARIABLE` `db`

- **Line:** 165

---

### `VARIABLE` `usersSnap`

- **Line:** 168

---

### `VARIABLE` `franchiseeUserIds`

- **Line:** 169

---

### `VARIABLE` `franchiseeUserEmails`

- **Line:** 170

---

### `VARIABLE` `franchiseeUserNames`

- **Line:** 171

---

### `VARIABLE` `userMapByEmail`

- **Line:** 172

---

### `VARIABLE` `userMapByUid`

- **Line:** 173

---

### `VARIABLE` `u`

- **Line:** 176

---

### `VARIABLE` `role`

- **Line:** 182

---

### `VARIABLE` `assignedRoles`

- **Line:** 183

---

### `VARIABLE` `isFranchisee`

- **Line:** 184

---

### `VARIABLE` `dName`

- **Line:** 189

---

### `VARIABLE` `sydneyFormatter`

- **Line:** 195

---

### `VARIABLE` `dateString`

- **Line:** 202
- **Signature:** `string`

---

### `VARIABLE` `d`

- **Line:** 203
- **Signature:** `number`

---

### `VARIABLE` `m`

- **Line:** 203
- **Signature:** `number`

---

### `VARIABLE` `y`

- **Line:** 203
- **Signature:** `number`

---

### `VARIABLE` `parts`

- **Line:** 207

---

### `VARIABLE` `parts`

- **Line:** 220

---

### `VARIABLE` `now`

- **Line:** 229

---

### `VARIABLE` `parts`

- **Line:** 231

---

### `VARIABLE` `dayVal`

- **Line:** 232

---

### `VARIABLE` `monthVal`

- **Line:** 233

---

### `VARIABLE` `yearVal`

- **Line:** 234

---

### `VARIABLE` `targetStart`

- **Line:** 241

---

### `VARIABLE` `targetEnd`

- **Line:** 242

---

### `VARIABLE` `dateCreatedString`

- **Line:** 243

---

### `VARIABLE` `threeDaysAgo`

- **Line:** 245

---

### `VARIABLE` `q1`

- **Line:** 249

---

### `VARIABLE` `q2`

- **Line:** 250

---

### `VARIABLE` `q3`

- **Line:** 251

---

### `VARIABLE` `q4`

- **Line:** 252

---

### `VARIABLE` `allLeadsMap`

- **Line:** 254

---

### `VARIABLE` `allLeads`

- **Line:** 259

---

### `VARIABLE` `filteredLeads`

- **Line:** 262

---

### `VARIABLE` `isDateMatch`

- **Line:** 263

---

### `VARIABLE` `createdDate`

- **Line:** 267
- **Signature:** `Date`

---

### `VARIABLE` `enteredDate`

- **Line:** 280

---

### `VARIABLE` `enteredDate`

- **Line:** 286

---

### `VARIABLE` `createdByRole`

- **Line:** 297

---

### `VARIABLE` `sourceVal`

- **Line:** 300

---

### `VARIABLE` `uid`

- **Line:** 303

---

### `VARIABLE` `email`

- **Line:** 306

---

### `VARIABLE` `creatorName`

- **Line:** 309

---

### `VARIABLE` `franchiseeGroups`

- **Line:** 316

---

### `VARIABLE` `franName`

- **Line:** 318

---

### `VARIABLE` `templateSnap`

- **Line:** 326

---

### `VARIABLE` `rawSubject`

- **Line:** 331

---

### `VARIABLE` `rawBody`

- **Line:** 332

---

### `VARIABLE` `templateFound`

- **Line:** 333

---

### `VARIABLE` `templateDoc`

- **Line:** 336

---

### `VARIABLE` `activeFromAddress`

- **Line:** 343

---

### `VARIABLE` `configDoc`

- **Line:** 346

---

### `VARIABLE` `franchiseesSnap`

- **Line:** 359

---

### `VARIABLE` `franchiseeEmailMap`

- **Line:** 360

---

### `VARIABLE` `data`

- **Line:** 363

---

### `VARIABLE` `nameKey`

- **Line:** 364

---

### `VARIABLE` `email`

- **Line:** 365

---

### `VARIABLE` `results`

- **Line:** 374
- **Signature:** `FranchiseeAutoResponseResult[]`

---

### `VARIABLE` `recipientEmail`

- **Line:** 379

---

### `VARIABLE` `fNameLower`

- **Line:** 385

---

### `VARIABLE` `userFran`

- **Line:** 391

---

### `VARIABLE` `firstLead`

- **Line:** 401

---

### `VARIABLE` `finalSubject`

- **Line:** 418

---

### `VARIABLE` `finalBody`

- **Line:** 423

---

### `VARIABLE` `sendResult`

- **Line:** 435

---

