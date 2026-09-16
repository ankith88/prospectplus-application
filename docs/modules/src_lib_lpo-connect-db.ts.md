# Module: `src/lib/lpo-connect-db.ts`

- **Language:** TypeScript
- **Total Lines:** 66
- **Direct Dependencies:** 2 modules imported

## Exported Symbols & API

### `FUNCTION` `getLpoConnectApp`

> Returns a named Firebase Admin App for project 'mp-lpo-connect'.

- **Line:** 7
- **Returns:** `admin.app.App`

---

### `VARIABLE` `existingApp`

- **Line:** 8

---

### `FUNCTION` `getLpoConnectDb`

> Returns a Google Firestore instance targeting project 'mp-lpo-connect', database 'lpoconnect'.
Checks for explicit environment service account credentials (LPO_CONNECT_SERVICE_ACCOUNT_KEY or 
LPO_CONNECT_CLIENT_EMAIL + LPO_CONNECT_PRIVATE_KEY) to support cross-project GCP access in App Hosting.

- **Line:** 29
- **Returns:** `GoogleFirestore`

---

### `VARIABLE` `serviceAccountJson`

- **Line:** 30

---

### `VARIABLE` `clientEmail`

- **Line:** 31

---

### `VARIABLE` `privateKey`

- **Line:** 32

---

### `VARIABLE` `parsed`

- **Line:** 36

---

