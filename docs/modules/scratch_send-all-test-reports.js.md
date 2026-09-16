# Module: `scratch/send-all-test-reports.js`

- **Language:** JavaScript
- **Total Lines:** 513

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

### `VARIABLE` `sydneyFormatter`

- **Line:** 13

---

### `VARIABLE` `now`

- **Line:** 20

---

### `VARIABLE` `parts`

- **Line:** 23

---

### `VARIABLE` `day`

- **Line:** 24

---

### `VARIABLE` `month`

- **Line:** 25

---

### `VARIABLE` `year`

- **Line:** 26

---

### `VARIABLE` `dateString`

- **Line:** 28

---

### `VARIABLE` `targetStart`

- **Line:** 31

---

### `VARIABLE` `targetEnd`

- **Line:** 32

---

### `VARIABLE` `threeDaysAgo`

- **Line:** 34

---

### `FUNCTION` `sendAutomatedEmail`

- **Line:** 37
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `options` | `any` | **Yes** | - | - |

---

### `VARIABLE` `configSnap`

- **Line:** 38

---

### `VARIABLE` `config`

- **Line:** 44

---

### `VARIABLE` `finalSender`

- **Line:** 46

---

### `VARIABLE` `transporter`

- **Line:** 55

---

### `VARIABLE` `tokenUrl`

- **Line:** 78

---

### `VARIABLE` `tokenBody`

- **Line:** 79

---

### `VARIABLE` `tokenRes`

- **Line:** 86

---

### `VARIABLE` `tokenData`

- **Line:** 92

---

### `VARIABLE` `accessToken`

- **Line:** 93

---

### `VARIABLE` `sendMailUrl`

- **Line:** 95

---

### `VARIABLE` `mailPayload`

- **Line:** 96

---

### `VARIABLE` `graphRes`

- **Line:** 105

---

### `FUNCTION` `runLeadsReport`

- **Line:** 124
- **Async:** Yes
- **Returns:** `void`

---

### `VARIABLE` `dayStr`

- **Line:** 127

---

### `VARIABLE` `monthStr`

- **Line:** 128

---

### `VARIABLE` `dateCreatedString`

- **Line:** 129

---

### `VARIABLE` `q1`

- **Line:** 132

---

### `VARIABLE` `q2`

- **Line:** 135

---

### `VARIABLE` `q3`

- **Line:** 138

---

### `VARIABLE` `allLeadsMap`

- **Line:** 141

---

### `VARIABLE` `allLeads`

- **Line:** 145

---

### `VARIABLE` `filteredLeads`

- **Line:** 147

---

### `VARIABLE` `source`

- **Line:** 149

---

### `VARIABLE` `createdDate`

- **Line:** 156

---

### `VARIABLE` `enteredDate`

- **Line:** 171

---

### `VARIABLE` `enteredDate`

- **Line:** 177

---

### `VARIABLE` `amCounts`

- **Line:** 188

---

### `VARIABLE` `franchiseeCounts`

- **Line:** 189

---

### `VARIABLE` `am`

- **Line:** 192

---

### `VARIABLE` `fran`

- **Line:** 195

---

### `VARIABLE` `amReport`

- **Line:** 199

---

### `VARIABLE` `franReport`

- **Line:** 203

---

### `VARIABLE` `leadRowsHtml`

- **Line:** 207

---

### `VARIABLE` `addressParts`

- **Line:** 209

---

### `VARIABLE` `address`

- **Line:** 215

---

### `VARIABLE` `amRowsHtml`

- **Line:** 226

---

### `VARIABLE` `franRowsHtml`

- **Line:** 234

---

### `VARIABLE` `emailHtml`

- **Line:** 242

---

### `VARIABLE` `recipients`

- **Line:** 342

---

### `VARIABLE` `configDoc`

- **Line:** 344

---

### `VARIABLE` `result`

- **Line:** 352

---

### `FUNCTION` `runTicketsReport`

- **Line:** 361
- **Async:** Yes
- **Returns:** `void`

---

### `VARIABLE` `snapshot`

- **Line:** 364

---

### `VARIABLE` `tickets`

- **Line:** 368

---

### `VARIABLE` `snapshotTS`

- **Line:** 370

---

### `VARIABLE` `ticketsTS`

- **Line:** 374

---

### `VARIABLE` `allTicketsMap`

- **Line:** 376

---

### `VARIABLE` `allTickets`

- **Line:** 379

---

### `VARIABLE` `filteredTickets`

- **Line:** 381

---

### `VARIABLE` `createdDate`

- **Line:** 383

---

### `VARIABLE` `sourceCounts`

- **Line:** 394

---

### `VARIABLE` `source`

- **Line:** 396

---

### `VARIABLE` `sourceReport`

- **Line:** 406

---

### `VARIABLE` `sourceRowsHtml`

- **Line:** 411

---

### `VARIABLE` `emailHtml`

- **Line:** 419

---

### `VARIABLE` `recipients`

- **Line:** 488

---

### `VARIABLE` `configDoc`

- **Line:** 490

---

### `VARIABLE` `result`

- **Line:** 498

---

### `FUNCTION` `main`

- **Line:** 507
- **Async:** Yes
- **Returns:** `void`

---

