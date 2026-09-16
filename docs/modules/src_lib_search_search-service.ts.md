# Module: `src/lib/search/search-service.ts`

- **Language:** TypeScript
- **Total Lines:** 73
- **Direct Dependencies:** 1 modules imported

## Overview
Pluggable Search Service for Prospect+ Universal Lookup Supports: - Native Firestore + SearchKeywords & Fuzzy Scoring (Default) - Typesense / Algolia Full-Text Engine (Pluggable via env vars)

## Exported Symbols & API

### `INTERFACE` `SearchOptions`

- **Line:** 10

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `query` | `string` | No | - |
| `searchType` | `string` | Yes | - |
| `limit` | `number` | Yes | - |

---

### `CLASS` `SearchService`

- **Line:** 16

#### Methods

##### `isExternalProviderConfigured()`
> Check if an external search provider is configured

- **Returns:** `boolean`

##### `search()`
> Main search method

- **Returns:** `void`

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `options` | `SearchOptions` | **Yes** | - | - |

##### `searchExternal()`
> External Full-Text Provider implementation placeholder (Typesense / Algolia)

- **Returns:** `void`

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `options` | `SearchOptions` | **Yes** | - | - |

---

### `VARIABLE` `host`

- **Line:** 55

---

### `VARIABLE` `apiKey`

- **Line:** 56

---

### `VARIABLE` `res`

- **Line:** 57

---

### `VARIABLE` `data`

- **Line:** 61

---

