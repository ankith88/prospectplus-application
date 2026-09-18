# Module: `src/lib/duplicate-detector.ts`

- **Language:** TypeScript
- **Total Lines:** 253
- **Direct Dependencies:** 1 modules imported

## Exported Symbols & API

### `TYPE` `MatchConfidence`

- **Line:** 3
- **Signature:** `'High' | 'Medium' | 'Low' | 'None'`

---

### `INTERFACE` `DuplicateMatchResult`

- **Line:** 5

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `isMatch` | `boolean` | No | - |
| `score` | `number` | No | - |
| `confidence` | `MatchConfidence` | No | - |
| `matchedCriteria` | `string[]` | No | - |

---

### `VARIABLE` `GENERIC_EMAIL_DOMAINS`

- **Line:** 12

---

### `FUNCTION` `cleanAbn`

> Normalizes ABN string by retaining only digits

- **Line:** 35
- **Returns:** `string`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `abn` | `string | null` | No | - | - |

---

### `FUNCTION` `extractEmailDomain`

> Extracts and normalizes the email domain from an email address

- **Line:** 43
- **Returns:** `string | null`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `email` | `string | null` | No | - | - |

---

### `VARIABLE` `trimmed`

- **Line:** 45

---

### `VARIABLE` `parts`

- **Line:** 46

---

### `VARIABLE` `domain`

- **Line:** 48

---

### `FUNCTION` `normalizeCompanyName`

> Normalizes company names for comparison (strips punctuation, common corporate entity suffixes, and extra spaces)

- **Line:** 58
- **Returns:** `string`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `name` | `string | null` | No | - | - |

---

### `VARIABLE` `cleaned`

- **Line:** 60

---

### `FUNCTION` `extractCoreBrandName`

> Extracts the primary brand word (e.g. "MailPlus" from "MailPlus Pty. Ltd. - Waterloo")

- **Line:** 73
- **Returns:** `string`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `name` | `string | null` | No | - | - |

---

### `VARIABLE` `norm`

- **Line:** 74

---

### `VARIABLE` `words`

- **Line:** 76

---

### `FUNCTION` `cleanPhone`

> Normalizes phone numbers to digits only (stripping country codes / formatting)

- **Line:** 83
- **Returns:** `string`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `phone` | `string | null` | No | - | - |

---

### `VARIABLE` `digits`

- **Line:** 85

---

### `FUNCTION` `normalizeAddress`

> Normalizes address for comparison

- **Line:** 93
- **Returns:** `{ street: string; suburb: string; state: string; zip: string }`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `address` | `any` | No | - | - |

---

### `VARIABLE` `streetRaw`

- **Line:** 96

---

### `VARIABLE` `street`

- **Line:** 97

---

### `VARIABLE` `suburb`

- **Line:** 103

---

### `VARIABLE` `state`

- **Line:** 104

---

### `VARIABLE` `zip`

- **Line:** 105

---

### `FUNCTION` `evaluateDuplicateScore`

> Evaluates duplicate match tier and confidence score between two lead entities

- **Line:** 113
- **Returns:** `DuplicateMatchResult`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadA` | `Partial<Lead> & { contacts?: any[] }` | **Yes** | - | - |
| `leadB` | `Partial<Lead> & { contacts?: any[] }` | **Yes** | - | - |

---

### `VARIABLE` `matchedCriteria`

- **Line:** 117
- **Signature:** `string[]`

---

### `VARIABLE` `abnA`

- **Line:** 120

---

### `VARIABLE` `abnB`

- **Line:** 121

---

### `VARIABLE` `isAbnMatch`

- **Line:** 122

---

### `VARIABLE` `compA`

- **Line:** 135

---

### `VARIABLE` `compB`

- **Line:** 136

---

### `VARIABLE` `isCompMatch`

- **Line:** 137

---

### `VARIABLE` `domainA`

- **Line:** 144

---

### `VARIABLE` `domainB`

- **Line:** 146

---

### `VARIABLE` `isDomainMatch`

- **Line:** 149

---

### `VARIABLE` `addrA`

- **Line:** 155

---

### `VARIABLE` `addrB`

- **Line:** 156

---

### `VARIABLE` `isStreetMatch`

- **Line:** 158

---

### `VARIABLE` `isZipOrSuburbMatch`

- **Line:** 159

---

### `VARIABLE` `isAddressMatch`

- **Line:** 160

---

### `VARIABLE` `phoneA`

- **Line:** 167

---

### `VARIABLE` `phoneB`

- **Line:** 168

---

### `VARIABLE` `isPhoneMatch`

- **Line:** 169

---

