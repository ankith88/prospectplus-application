# Module: `src/lib/leave-utils.ts`

- **Language:** TypeScript
- **Total Lines:** 43
- **Direct Dependencies:** 1 modules imported

## Exported Symbols & API

### `FUNCTION` `isAmActivelyOnLeave`

> Determines if a user (Account Manager) is currently on leave based on their leave profile
and the current date (checking against startDate and endDate if provided).

- **Line:** 7
- **Returns:** `boolean`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `user` | `UserProfile` | **Yes** | - | - |

---

### `VARIABLE` `todayStr`

- **Line:** 13

---

### `FUNCTION` `canAssignToAm`

> Determines if a lead can be assigned to this Account Manager.
Returns false if the AM is actively on leave and has "stopAssignment" enabled.

- **Line:** 37
- **Returns:** `boolean`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `user` | `UserProfile` | **Yes** | - | - |

---

