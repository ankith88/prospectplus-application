# Module: `src/services/LocationService.ts`

- **Language:** TypeScript
- **Total Lines:** 93
- **Direct Dependencies:** 2 modules imported

## Exported Symbols & API

### `CLASS` `LocationService`

- **Line:** 4

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `watchId` | `number | null` | No | - |
| `GEOFENCE_RADIUS_METERS` | `any` | No | - |
| `checkInState` | `Record<string, boolean>` | No | - |

#### Methods

##### `calculateDistance()`
- **Returns:** `number`

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `lat1` | `number` | **Yes** | - | - |
| `lon1` | `number` | **Yes** | - | - |
| `lat2` | `number` | **Yes** | - | - |
| `lon2` | `number` | **Yes** | - | - |

##### `startBackgroundTracking()`
- **Returns:** `void`

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `userId` | `string` | **Yes** | - | - |
| `activeLeads` | `{ id: string; lat: number; lng: number; radius?: number }[]` | **Yes** | - | - |

##### `stopTracking()`
- **Returns:** `void`

##### `checkGeofences()`
- **Returns:** `void`

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `userId` | `string` | **Yes** | - | - |
| `currentLat` | `number` | **Yes** | - | - |
| `currentLng` | `number` | **Yes** | - | - |
| `leads` | `{ id: string; lat: number; lng: number; radius?: number }[]` | **Yes** | - | - |

##### `logVisitEvent()`
- **Returns:** `void`

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `userId` | `string` | **Yes** | - | - |
| `leadId` | `string` | **Yes** | - | - |
| `lat` | `number` | **Yes** | - | - |
| `lng` | `number` | **Yes** | - | - |
| `eventType` | `'check-in' | 'check-out'` | **Yes** | - | - |

---

### `VARIABLE` `R`

- **Line:** 11

---

### `VARIABLE` `p1`

- **Line:** 12

---

### `VARIABLE` `p2`

- **Line:** 13

---

### `VARIABLE` `dp`

- **Line:** 14

---

### `VARIABLE` `dl`

- **Line:** 15

---

### `VARIABLE` `a`

- **Line:** 17

---

### `VARIABLE` `c`

- **Line:** 20

---

### `VARIABLE` `distance`

- **Line:** 57

---

### `VARIABLE` `radius`

- **Line:** 58

---

### `VARIABLE` `isInside`

- **Line:** 60

---

### `VARIABLE` `wasInside`

- **Line:** 61

---

### `VARIABLE` `visitEventsRef`

- **Line:** 77

---

### `VARIABLE` `locationService`

- **Line:** 92

---

