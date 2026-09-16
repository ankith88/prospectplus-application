# Module: `src/app/api/territory/check/route.ts`

- **Language:** TypeScript
- **Total Lines:** 108
- **Direct Dependencies:** 3 modules imported

## Exported Symbols & API

### `INTERFACE` `CachedTerritoryData`

- **Line:** 5

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `territoryMap` | `Map<string, { ids: string[]; names: string[] }>` | No | - |
| `lastUpdated` | `number` | No | - |

---

### `VARIABLE` `cache`

- **Line:** 10
- **Signature:** `CachedTerritoryData | null`

---

### `VARIABLE` `isRefreshing`

- **Line:** 11

---

### `VARIABLE` `CACHE_TTL_MS`

- **Line:** 12

---

### `FUNCTION` `getTerritoryMap`

- **Line:** 14
- **Async:** Yes
- **Returns:** `Promise<Map<string, { ids: string[]; names: string[] }>>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `forceRefresh` | `any` | No | `false` | - |

---

### `VARIABLE` `now`

- **Line:** 15

---

### `VARIABLE` `db`

- **Line:** 27

---

### `VARIABLE` `franchiseesSnap`

- **Line:** 28

---

### `VARIABLE` `newMap`

- **Line:** 30

---

### `VARIABLE` `data`

- **Line:** 33

---

### `VARIABLE` `fId`

- **Line:** 34

---

### `VARIABLE` `fName`

- **Line:** 35

---

### `VARIABLE` `territories`

- **Line:** 36

---

### `VARIABLE` `zip`

- **Line:** 40

---

### `VARIABLE` `city`

- **Line:** 41

---

### `VARIABLE` `key`

- **Line:** 42

---

### `VARIABLE` `entry`

- **Line:** 44

---

### `FUNCTION` `POST`

- **Line:** 67
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `req` | `NextRequest` | **Yes** | - | - |

---

### `VARIABLE` `apiKeyHeader`

- **Line:** 68

---

### `VARIABLE` `API_KEY`

- **Line:** 69

---

### `VARIABLE` `body`

- **Line:** 76

---

### `VARIABLE` `zipTrimmed`

- **Line:** 83

---

### `VARIABLE` `cityTrimmed`

- **Line:** 84

---

### `VARIABLE` `map`

- **Line:** 86

---

### `VARIABLE` `key`

- **Line:** 87

---

### `VARIABLE` `matched`

- **Line:** 88

---

### `VARIABLE` `serviceable`

- **Line:** 90

---

