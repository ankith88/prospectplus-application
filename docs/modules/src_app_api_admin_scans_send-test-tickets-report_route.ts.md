# Module: `src/app/api/admin/scans/send-test-tickets-report/route.ts`

- **Language:** TypeScript
- **Total Lines:** 205
- **Direct Dependencies:** 5 modules imported

## Exported Symbols & API

### `VARIABLE` `dynamic`

- **Line:** 7

---

### `FUNCTION` `POST`

- **Line:** 9
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `request` | `Request` | **Yes** | - | - |

---

### `VARIABLE` `body`

- **Line:** 11

---

### `VARIABLE` `db`

- **Line:** 18

---

### `VARIABLE` `sydneyFormatter`

- **Line:** 20

---

### `VARIABLE` `dateString`

- **Line:** 27
- **Signature:** `string`

---

### `VARIABLE` `now`

- **Line:** 32

---

### `VARIABLE` `parts`

- **Line:** 34

---

### `VARIABLE` `day`

- **Line:** 35

---

### `VARIABLE` `month`

- **Line:** 36

---

### `VARIABLE` `year`

- **Line:** 37

---

### `VARIABLE` `targetStart`

- **Line:** 43

---

### `VARIABLE` `targetEnd`

- **Line:** 44

---

### `VARIABLE` `threeDaysAgo`

- **Line:** 46

---

### `VARIABLE` `snapshot`

- **Line:** 49

---

### `VARIABLE` `tickets`

- **Line:** 53

---

### `VARIABLE` `snapshotTS`

- **Line:** 55

---

### `VARIABLE` `ticketsTS`

- **Line:** 59

---

### `VARIABLE` `allTicketsMap`

- **Line:** 61

---

### `VARIABLE` `allTickets`

- **Line:** 64

---

### `VARIABLE` `filteredTickets`

- **Line:** 66

---

### `VARIABLE` `createdDate`

- **Line:** 68
- **Signature:** `Date`

---

### `VARIABLE` `sourceCounts`

- **Line:** 80
- **Signature:** `Record<string, number>`

---

### `VARIABLE` `source`

- **Line:** 82

---

### `VARIABLE` `sourceReport`

- **Line:** 92

---

### `VARIABLE` `sourceRowsHtml`

- **Line:** 97

---

### `VARIABLE` `emailHtml`

- **Line:** 105

---

### `VARIABLE` `toStr`

- **Line:** 173

---

### `VARIABLE` `fromAddress`

- **Line:** 174

---

### `VARIABLE` `configDoc`

- **Line:** 176

---

### `VARIABLE` `result`

- **Line:** 184

---

