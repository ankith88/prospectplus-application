# Module: `src/app/api/admin/scans/send-test-franchisee-leads-report/route.ts`

- **Language:** TypeScript
- **Total Lines:** 397
- **Direct Dependencies:** 5 modules imported

## Exported Symbols & API

### `VARIABLE` `dynamic`

- **Line:** 7

---

### `FUNCTION` `formatBucketName`

- **Line:** 9
- **Returns:** `string`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `bucketStr` | `string` | **Yes** | - | - |

---

### `VARIABLE` `b`

- **Line:** 11

---

### `FUNCTION` `POST`

- **Line:** 26
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `request` | `Request` | **Yes** | - | - |

---

### `VARIABLE` `body`

- **Line:** 28

---

### `VARIABLE` `db`

- **Line:** 35

---

### `VARIABLE` `usersSnap`

- **Line:** 38

---

### `VARIABLE` `franchiseeUserIds`

- **Line:** 39

---

### `VARIABLE` `franchiseeUserEmails`

- **Line:** 40

---

### `VARIABLE` `franchiseeUserNames`

- **Line:** 41

---

### `VARIABLE` `u`

- **Line:** 44

---

### `VARIABLE` `role`

- **Line:** 45

---

### `VARIABLE` `assignedRoles`

- **Line:** 46

---

### `VARIABLE` `isFranchisee`

- **Line:** 47

---

### `VARIABLE` `dName`

- **Line:** 52

---

### `VARIABLE` `sydneyFormatter`

- **Line:** 57

---

### `VARIABLE` `dateString`

- **Line:** 64
- **Signature:** `string`

---

### `VARIABLE` `now`

- **Line:** 69

---

### `VARIABLE` `parts`

- **Line:** 71

---

### `VARIABLE` `day`

- **Line:** 72

---

### `VARIABLE` `month`

- **Line:** 73

---

### `VARIABLE` `year`

- **Line:** 74

---

### `VARIABLE` `targetStart`

- **Line:** 80

---

### `VARIABLE` `targetEnd`

- **Line:** 81

---

### `VARIABLE` `dayStr`

- **Line:** 83

---

### `VARIABLE` `monthStr`

- **Line:** 84

---

### `VARIABLE` `dateCreatedString`

- **Line:** 85

---

### `VARIABLE` `threeDaysAgo`

- **Line:** 87

---

### `VARIABLE` `q1`

- **Line:** 91

---

### `VARIABLE` `q2`

- **Line:** 94

---

### `VARIABLE` `q3`

- **Line:** 97

---

### `VARIABLE` `q4`

- **Line:** 100

---

### `VARIABLE` `allLeadsMap`

- **Line:** 103

---

### `VARIABLE` `allLeads`

- **Line:** 108

---

### `VARIABLE` `filteredLeads`

- **Line:** 110

---

### `VARIABLE` `isDateMatch`

- **Line:** 112

---

### `VARIABLE` `createdDate`

- **Line:** 116
- **Signature:** `Date`

---

### `VARIABLE` `enteredDate`

- **Line:** 129

---

### `VARIABLE` `enteredDate`

- **Line:** 135

---

### `VARIABLE` `createdByRole`

- **Line:** 147

---

### `VARIABLE` `sourceVal`

- **Line:** 150

---

### `VARIABLE` `uid`

- **Line:** 153

---

### `VARIABLE` `email`

- **Line:** 156

---

### `VARIABLE` `creatorName`

- **Line:** 159

---

### `VARIABLE` `franchiseeCounts`

- **Line:** 166
- **Signature:** `Record<string, number>`

---

### `VARIABLE` `bucketCounts`

- **Line:** 167
- **Signature:** `Record<string, number>`

---

### `VARIABLE` `amCounts`

- **Line:** 168
- **Signature:** `Record<string, number>`

---

### `VARIABLE` `fran`

- **Line:** 172

---

### `VARIABLE` `rawBucket`

- **Line:** 176

---

### `VARIABLE` `formattedBucket`

- **Line:** 177

---

### `VARIABLE` `isAmBucket`

- **Line:** 181

---

### `VARIABLE` `am`

- **Line:** 183

---

### `VARIABLE` `franReport`

- **Line:** 188

---

### `VARIABLE` `bucketReport`

- **Line:** 192

---

### `VARIABLE` `amReport`

- **Line:** 196

---

### `VARIABLE` `leadRowsHtml`

- **Line:** 200

---

### `VARIABLE` `addressParts`

- **Line:** 202

---

### `VARIABLE` `address`

- **Line:** 208

---

### `VARIABLE` `creator`

- **Line:** 209

---

### `VARIABLE` `formattedBucket`

- **Line:** 210

---

### `VARIABLE` `assignedAm`

- **Line:** 211

---

### `VARIABLE` `franRowsHtml`

- **Line:** 225

---

### `VARIABLE` `bucketRowsHtml`

- **Line:** 233

---

### `VARIABLE` `amRowsHtml`

- **Line:** 241

---

### `VARIABLE` `emailHtml`

- **Line:** 249

---

### `VARIABLE` `toStr`

- **Line:** 365

---

### `VARIABLE` `fromAddress`

- **Line:** 366

---

### `VARIABLE` `configDoc`

- **Line:** 368

---

### `VARIABLE` `result`

- **Line:** 376

---

