# Module: `src/services/lpo-plus-service.ts`

- **Language:** TypeScript
- **Total Lines:** 637
- **Direct Dependencies:** 2 modules imported

## Exported Symbols & API

### `INTERFACE` `LpoPlusProvisionPayload`

- **Line:** 4

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `netsuiteId` | `string` | No | - |
| `lpoName` | `string` | No | - |
| `contactFirstName` | `string` | No | - |
| `contactLastName` | `string` | No | - |
| `contactEmail` | `string` | No | - |
| `contactPhone` | `string` | No | - |
| `defaultPassword` | `string` | Yes | - |
| `address1` | `string` | Yes | - |
| `street` | `string` | Yes | - |
| `city` | `string` | Yes | - |
| `state` | `string` | Yes | - |
| `zip` | `string` | Yes | - |
| `latitude` | `string | number` | Yes | - |
| `longitude` | `string | number` | Yes | - |
| `ampoRate` | `number | string` | Yes | - |
| `pmpoRate` | `number | string` | Yes | - |
| `packageRate` | `number | string` | Yes | - |
| `additionalBagRate` | `number | string` | Yes | - |
| `territorySuburbs` | `any[]` | Yes | - |

---

### `FUNCTION` `provisionLpoPlusAccount`

> Provisions an LPO.Plus account in Firebase Auth and lpoconnect Firestore database.
Derived from NetSuite script mp_ss2.0_sync_lpo_to_firebase.js.

- **Line:** 30
- **Async:** Yes
- **Returns:** `Promise<{ success: boolean; authId?: string; message: string }>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `payload` | `LpoPlusProvisionPayload` | **Yes** | - | - |

---

### `VARIABLE` `lpoConnectDb`

- **Line:** 32

---

### `VARIABLE` `authID`

- **Line:** 62

---

### `VARIABLE` `lpoApp`

- **Line:** 64

---

### `VARIABLE` `auth`

- **Line:** 65

---

### `VARIABLE` `displayName`

- **Line:** 66

---

### `VARIABLE` `existingUser`

- **Line:** 69

---

### `VARIABLE` `newUser`

- **Line:** 79

---

### `VARIABLE` `authResponse`

- **Line:** 94

---

### `VARIABLE` `authData`

- **Line:** 107

---

### `VARIABLE` `userSnap`

- **Line:** 114

---

### `VARIABLE` `signInRes`

- **Line:** 122

---

### `VARIABLE` `signInData`

- **Line:** 130

---

### `VARIABLE` `formattedTerritory`

- **Line:** 154
- **Signature:** `string[]`

---

### `VARIABLE` `subName`

- **Line:** 156

---

### `VARIABLE` `subState`

- **Line:** 157

---

### `VARIABLE` `subPostcode`

- **Line:** 158

---

### `VARIABLE` `cleanLpoName`

- **Line:** 163

---

### `VARIABLE` `lpoDocId`

- **Line:** 164

---

### `VARIABLE` `lpoData`

- **Line:** 167
- **Signature:** `Record<string, any>`

---

### `VARIABLE` `userData`

- **Line:** 190

---

### `VARIABLE` `year`

- **Line:** 206

---

### `VARIABLE` `emailToLPOSubject`

- **Line:** 207

---

### `VARIABLE` `emailToLPOBody`

- **Line:** 208

---

### `VARIABLE` `emailPayload`

- **Line:** 272

---

### `VARIABLE` `emailRes`

- **Line:** 282

---

### `FUNCTION` `disableLpoPlusAccount`

> Disables an LPO.Plus account in Firebase Auth and lpoconnect Firestore database when marked as Lost.

- **Line:** 316
- **Async:** Yes
- **Returns:** `Promise<{ success: boolean; message: string }>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `netsuiteId` | `string` | **Yes** | - | - |
| `contactEmail` | `string` | No | - | - |

---

### `VARIABLE` `lpoConnectDb`

- **Line:** 318

---

### `VARIABLE` `userAuthId`

- **Line:** 325

---

### `VARIABLE` `userQuerySnaps`

- **Line:** 326
- **Signature:** `any[]`

---

### `VARIABLE` `qEmail`

- **Line:** 329

---

### `VARIABLE` `qLpo`

- **Line:** 333

---

### `VARIABLE` `docDirect`

- **Line:** 337

---

### `VARIABLE` `updatedUserDocIds`

- **Line:** 342

---

### `INTERFACE` `LpoPlusResetPasswordPayload`

- **Line:** 396

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `netsuiteId` | `string` | No | - |
| `contactEmail` | `string` | No | - |
| `newPassword` | `string` | Yes | - |
| `contactFirstName` | `string` | Yes | - |

---

### `FUNCTION` `resetLpoPlusPassword`

> Resets/Updates an LPO.Plus account password in Firebase Auth and emails the user the updated credentials.

- **Line:** 406
- **Async:** Yes
- **Returns:** `Promise<{ success: boolean; message: string }>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `payload` | `LpoPlusResetPasswordPayload` | **Yes** | - | - |

---

### `VARIABLE` `userUid`

- **Line:** 422

---

### `VARIABLE` `lpoApp`

- **Line:** 424

---

### `VARIABLE` `auth`

- **Line:** 425

---

### `VARIABLE` `existingUser`

- **Line:** 426

---

### `VARIABLE` `signInRes`

- **Line:** 437

---

### `VARIABLE` `signInData`

- **Line:** 445

---

### `VARIABLE` `lpoConnectDb`

- **Line:** 472

---

### `VARIABLE` `year`

- **Line:** 481

---

### `VARIABLE` `emailToLPOSubject`

- **Line:** 482

---

### `VARIABLE` `emailToLPOBody`

- **Line:** 483

---

### `INTERFACE` `LpoPlusSyncTerritoryPayload`

- **Line:** 579

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `netsuiteId` | `string` | No | - |
| `territorySuburbs` | `any[]` | No | - |

---

### `FUNCTION` `syncLpoTerritorySuburbs`

> Syncs/Updates franchisee territory suburb mapping into 'franchiseeTerritoryJSON' in lpoconnect Firestore database.

- **Line:** 587
- **Async:** Yes
- **Returns:** `Promise<{ success: boolean; message: string; count?: number }>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `payload` | `LpoPlusSyncTerritoryPayload` | **Yes** | - | - |

---

### `VARIABLE` `formattedTerritory`

- **Line:** 595
- **Signature:** `string[]`

---

### `VARIABLE` `subName`

- **Line:** 600

---

### `VARIABLE` `subState`

- **Line:** 601

---

### `VARIABLE` `subPostcode`

- **Line:** 602

---

### `VARIABLE` `lpoConnectDb`

- **Line:** 609

---

### `VARIABLE` `lpoDocId`

- **Line:** 610

---

