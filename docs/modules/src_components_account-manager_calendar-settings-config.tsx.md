# Module: `src/components/account-manager/calendar-settings-config.tsx`

- **Language:** TypeScript
- **Total Lines:** 341
- **Direct Dependencies:** 14 modules imported

## Exported Symbols & API

### `VARIABLE` `DAYS_OF_WEEK`

- **Line:** 18

---

### `INTERFACE` `CalendarSettingsConfigProps`

- **Line:** 20

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `userId` | `string` | No | - |
| `isOwner` | `boolean` | No | - |

---

### `FUNCTION` `CalendarSettingsConfig`

- **Line:** 25
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ userId, isOwner }` | `CalendarSettingsConfigProps` | **Yes** | - | - |

---

### `VARIABLE` `searchParams`

- **Line:** 26

---

### `VARIABLE` `successParam`

- **Line:** 27

---

### `FUNCTION` `fetchUser`

- **Line:** 48
- **Async:** Yes
- **Returns:** `void`

---

### `VARIABLE` `userSnap`

- **Line:** 52

---

### `VARIABLE` `profile`

- **Line:** 54

---

### `VARIABLE` `defaultHours`

- **Line:** 57

---

### `FUNCTION` `handleConnectOutlook`

- **Line:** 83

---

### `FUNCTION` `handleSaveSettings`

- **Line:** 88
- **Async:** Yes

---

### `VARIABLE` `userRef`

- **Line:** 92

---

### `FUNCTION` `updateWorkingHour`

- **Line:** 110

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `day` | `string` | **Yes** | - | - |
| `field` | `'start' | 'end' | 'enabled'` | **Yes** | - | - |
| `value` | `any` | **Yes** | - | - |

---

### `VARIABLE` `isConnected`

- **Line:** 128

---

### `VARIABLE` `dayData`

- **Line:** 190

---

