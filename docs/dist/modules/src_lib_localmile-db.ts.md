# Module: `src/lib/localmile-db.ts`

- **Language:** TypeScript
- **Total Lines:** 87
- **Direct Dependencies:** 1 modules imported

## Exported Symbols & API

### `VARIABLE` `localMilePlusDbInstance`

- **Line:** 3
- **Signature:** `Firestore | null`

---

### `FUNCTION` `getLocalMilePlusDb`

> Returns a Google Firestore instance targeting project 'localmile-plus' (default database).
Checks for explicit environment service account credentials if configured,
otherwise defaults to standard Application Default Credentials (ADC).

- **Line:** 10
- **Returns:** `Firestore`

---

### `VARIABLE` `serviceAccountJson`

- **Line:** 13

---

### `VARIABLE` `clientEmail`

- **Line:** 14

---

### `VARIABLE` `privateKey`

- **Line:** 15

---

### `VARIABLE` `parsed`

- **Line:** 19

---

### `FUNCTION` `checkLocalMileCompanyExists`

> Checks if a company document exists in the LocalMile application database (companies collection in localmile-plus project).
Supports polling retries to accommodate asynchronous company creation in NetSuite during signup flows.

- **Line:** 58
- **Async:** Yes
- **Returns:** `Promise<boolean>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `companyId` | `string` | **Yes** | - | - |
| `maxRetries` | `number` | No | `1` | - |
| `delayMs` | `number` | No | `1000` | - |

---

### `VARIABLE` `db`

- **Line:** 67

---

### `VARIABLE` `snap`

- **Line:** 68

---

