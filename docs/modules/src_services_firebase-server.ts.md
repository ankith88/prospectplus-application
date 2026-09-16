# Module: `src/services/firebase-server.ts`

- **Language:** TypeScript
- **Total Lines:** 350
- **Direct Dependencies:** 4 modules imported

## Exported Symbols & API

### `VARIABLE` `db`

- **Line:** 7

---

### `FUNCTION` `getPhoneVariations`

> Standardizes phone numbers into multiple Australian variations for matching.

- **Line:** 12
- **Returns:** `string[]`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `phoneNumber` | `string` | **Yes** | - | - |

---

### `VARIABLE` `digits`

- **Line:** 14

---

### `VARIABLE` `variations`

- **Line:** 15

---

### `VARIABLE` `local10`

- **Line:** 24

---

### `VARIABLE` `withoutLeadingZero`

- **Line:** 35

---

### `VARIABLE` `localPart`

- **Line:** 56

---

### `FUNCTION` `findLeadByPhoneNumberServer`

> Finds a lead or company by phone number searching leads, companies, and contacts.

- **Line:** 75
- **Async:** Yes
- **Returns:** `Promise<{ id: string, type: 'leads' | 'companies' } | null>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `phoneNumber` | `string` | **Yes** | - | - |

---

### `VARIABLE` `variations`

- **Line:** 77

---

### `VARIABLE` `collections`

- **Line:** 80

---

### `VARIABLE` `snap`

- **Line:** 85

---

### `VARIABLE` `contactsSnap`

- **Line:** 97

---

### `VARIABLE` `contactDoc`

- **Line:** 99

---

### `VARIABLE` `parentRef`

- **Line:** 100

---

### `VARIABLE` `collectionType`

- **Line:** 103

---

### `FUNCTION` `findAllLeadsByPhoneNumberServer`

> Finds all leads or companies by phone number, searching leads, companies, and contacts.

- **Line:** 117
- **Async:** Yes
- **Returns:** `Promise<{ id: string, type: 'leads' | 'companies' }[]>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `phoneNumber` | `string` | **Yes** | - | - |

---

### `VARIABLE` `variations`

- **Line:** 119

---

### `VARIABLE` `results`

- **Line:** 120
- **Signature:** `{ id: string, type: 'leads' | 'companies' }[]`

---

### `VARIABLE` `seen`

- **Line:** 121

---

### `VARIABLE` `collections`

- **Line:** 123

---

### `VARIABLE` `snap`

- **Line:** 128

---

### `VARIABLE` `key`

- **Line:** 130

---

### `VARIABLE` `contactsSnap`

- **Line:** 141

---

### `VARIABLE` `parentRef`

- **Line:** 143

---

### `VARIABLE` `collectionType`

- **Line:** 145

---

### `VARIABLE` `key`

- **Line:** 146

---

### `FUNCTION` `findActivityByCallIdServer`

> Checks if a call activity already exists by callId.

- **Line:** 161
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |
| `collectionType` | `'leads' | 'companies'` | **Yes** | - | - |
| `callId` | `string` | **Yes** | - | - |

---

### `VARIABLE` `snap`

- **Line:** 162

---

### `FUNCTION` `logActivityServer`

> Logs or updates a call activity.

- **Line:** 170
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |
| `collectionType` | `'leads' | 'companies'` | **Yes** | - | - |
| `activity` | `Partial<Activity>` | **Yes** | - | - |

---

### `VARIABLE` `activityRef`

- **Line:** 171

---

### `VARIABLE` `data`

- **Line:** 172

---

### `VARIABLE` `existing`

- **Line:** 179

---

### `VARIABLE` `docRef`

- **Line:** 186

---

### `FUNCTION` `logTranscriptActivityServer`

> Logs a transcript activity.

- **Line:** 193
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |
| `collectionType` | `'leads' | 'companies'` | **Yes** | - | - |
| `transcript` | `Partial<Transcript>` | **Yes** | - | - |

---

### `VARIABLE` `ref`

- **Line:** 194

---

### `VARIABLE` `snap`

- **Line:** 195

---

### `VARIABLE` `data`

- **Line:** 197

---

### `VARIABLE` `docRef`

- **Line:** 207

---

### `FUNCTION` `createUserNotificationServer`

> Creates a real-time notification for a specific user.

- **Line:** 214
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `userEmail` | `string` | **Yes** | - | - |
| `notification` | `{ title: string, message: string, type: 'call_sync' | 'transcript_sync', callId?: string }` | **Yes** | - | - |

---

### `VARIABLE` `usersSnap`

- **Line:** 216

---

### `VARIABLE` `userDoc`

- **Line:** 222

---

### `FUNCTION` `logEmailServer`

> Logs an email record to the new emails subcollection.

- **Line:** 238
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |
| `emailData` | `Partial<EmailRecord>` | **Yes** | - | - |
| `collectionType` | `'leads' | 'companies' | 'franchisees'` | No | `'leads'` | - |

---

### `VARIABLE` `emailRef`

- **Line:** 239

---

### `VARIABLE` `data`

- **Line:** 240

---

### `VARIABLE` `docRef`

- **Line:** 244

---

### `FUNCTION` `getLeadServer`

> Fetches a lead by ID on the server.

- **Line:** 251
- **Async:** Yes
- **Returns:** `Promise<Lead | null>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |

---

### `VARIABLE` `snap`

- **Line:** 252

---

### `FUNCTION` `getFranchiseeEmailServer`

> Fetches a franchisee email by its name.

- **Line:** 260
- **Async:** Yes
- **Returns:** `Promise<string | null>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `franchiseeName` | `string` | **Yes** | - | - |

---

### `VARIABLE` `snap`

- **Line:** 261

---

### `VARIABLE` `data`

- **Line:** 263

---

### `FUNCTION` `duplicateLeadToCompaniesServer`

> Duplicates a lead document and all its subcollections into the companies collection on the server.

- **Line:** 270
- **Async:** Yes
- **Returns:** `Promise<void>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |

---

### `VARIABLE` `leadRef`

- **Line:** 272

---

### `VARIABLE` `leadSnap`

- **Line:** 273

---

### `VARIABLE` `leadData`

- **Line:** 279

---

### `VARIABLE` `keywords`

- **Line:** 281

---

### `VARIABLE` `companyRef`

- **Line:** 282

---

### `VARIABLE` `collections`

- **Line:** 285

---

### `VARIABLE` `subName`

- **Line:** 288

---

### `VARIABLE` `sourceSnap`

- **Line:** 289

---

### `VARIABLE` `batch`

- **Line:** 291

---

### `VARIABLE` `destDocRef`

- **Line:** 293

---

### `FUNCTION` `updateTranscriptAnalysisServer`

> Updates a transcript document with its AI analysis.

- **Line:** 309
- **Async:** Yes
- **Returns:** `Promise<void>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |
| `transcriptId` | `string` | **Yes** | - | - |
| `analysis` | `TranscriptAnalysis` | **Yes** | - | - |

---

### `VARIABLE` `leadTranscriptRef`

- **Line:** 315

---

### `VARIABLE` `leadSnap`

- **Line:** 316

---

### `VARIABLE` `companyTranscriptRef`

- **Line:** 323

---

### `VARIABLE` `companySnap`

- **Line:** 324

---

### `VARIABLE` `groupSnap`

- **Line:** 332

---

### `VARIABLE` `matchingDoc`

- **Line:** 333

---

