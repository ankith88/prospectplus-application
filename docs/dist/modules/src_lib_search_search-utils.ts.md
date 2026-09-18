# Module: `src/lib/search/search-utils.ts`

- **Language:** TypeScript
- **Total Lines:** 228

## Overview
Search Utilities for Prospect+ Universal Lookup

## Exported Symbols & API

### `FUNCTION` `generateSearchKeywords`

> Search Utilities for Prospect+ Universal Lookup

- **Line:** 6
- **Returns:** `string[]`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `data` | `any` | **Yes** | - | - |

---

### `VARIABLE` `keywords`

- **Line:** 9

---

### `FUNCTION` `addText`

- **Line:** 11

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `val` | `any` | **Yes** | - | - |

---

### `VARIABLE` `str`

- **Line:** 13

---

### `VARIABLE` `words`

- **Line:** 22

---

### `VARIABLE` `cleanWords`

- **Line:** 23
- **Signature:** `string[]`

---

### `VARIABLE` `cleanWord`

- **Line:** 25

---

### `VARIABLE` `raw`

- **Line:** 40

---

### `VARIABLE` `tasMatch`

- **Line:** 44

---

### `VARIABLE` `parenMatch`

- **Line:** 50

---

### `VARIABLE` `dashParts`

- **Line:** 56

---

### `VARIABLE` `rawPhone`

- **Line:** 82

---

### `VARIABLE` `digits`

- **Line:** 84

---

### `FUNCTION` `levenshteinDistance`

- **Line:** 118
- **Returns:** `number`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `a` | `string` | **Yes** | - | - |
| `b` | `string` | **Yes** | - | - |

---

### `VARIABLE` `matrix`

- **Line:** 122
- **Signature:** `number[][]`

---

### `FUNCTION` `scoreSearchResult`

- **Line:** 150
- **Returns:** `number`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `item` | `{ id: string; type: string; data: any }` | **Yes** | - | - |
| `queryWords` | `string[]` | **Yes** | - | - |
| `queryRaw` | `string` | **Yes** | - | - |
| `possibleIds` | `string[]` | **Yes** | - | - |

---

### `VARIABLE` `data`

- **Line:** 151

---

### `VARIABLE` `score`

- **Line:** 152

---

### `VARIABLE` `rawLower`

- **Line:** 154

---

### `VARIABLE` `companyNameLower`

- **Line:** 155

---

### `VARIABLE` `prospectPlusIdLower`

- **Line:** 156

---

### `VARIABLE` `internalidLower`

- **Line:** 157

---

### `VARIABLE` `entityIdLower`

- **Line:** 158

---

### `VARIABLE` `isDirectId`

- **Line:** 161

---

### `VARIABLE` `cleanId`

- **Line:** 162

---

### `VARIABLE` `allWordsInCompany`

- **Line:** 191

---

### `VARIABLE` `compWords`

- **Line:** 198

---

### `VARIABLE` `fuzzyMatches`

- **Line:** 199

---

### `VARIABLE` `matched`

- **Line:** 203

---

### `VARIABLE` `dist`

- **Line:** 206

---

