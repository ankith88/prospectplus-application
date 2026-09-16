# Module: `src/hooks/use-dialing-session.tsx`

- **Language:** TypeScript
- **Total Lines:** 230
- **Direct Dependencies:** 5 modules imported

## Exported Symbols & API

### `INTERFACE` `DialingSessionContextType`

- **Line:** 9

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `isSessionActive` | `boolean` | No | - |
| `startTime` | `string | null` | No | - |
| `elapsedTime` | `number` | No | - |
| `sessionLeadIds` | `string[]` | No | - |
| `leadsVisited` | `string[]` | No | - |
| `sessionReturnUrl` | `string | null` | No | - |
| `startSession` | `(leadIds: string[], returnUrl?: string) => Promise<void>` | No | - |
| `trackLeadVisit` | `(leadId: string) => Promise<void>` | No | - |
| `endSession` | `() => Promise<void>` | No | - |
| `removeLeadFromSession` | `(leadId: string) => void` | No | - |

---

### `VARIABLE` `DialingSessionContext`

- **Line:** 22

---

### `FUNCTION` `useDialingSession`

- **Line:** 35

---

### `FUNCTION` `DialingSessionProvider`

- **Line:** 37

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ children }` | `{ children: React.ReactNode }` | **Yes** | - | - |

---

### `VARIABLE` `sessionIdRef`

- **Line:** 46

---

### `VARIABLE` `timerRef`

- **Line:** 49

---

### `VARIABLE` `storedLeads`

- **Line:** 55

---

### `VARIABLE` `storedStartTime`

- **Line:** 56

---

### `VARIABLE` `storedVisited`

- **Line:** 57

---

### `VARIABLE` `storedSessionId`

- **Line:** 58

---

### `VARIABLE` `storedReturnUrl`

- **Line:** 59

---

### `VARIABLE` `startMs`

- **Line:** 70

---

### `VARIABLE` `nowMs`

- **Line:** 71

---

### `VARIABLE` `startMs`

- **Line:** 80

---

### `VARIABLE` `nowMs`

- **Line:** 81

---

### `VARIABLE` `startSession`

- **Line:** 98

---

### `VARIABLE` `generatedSessionId`

- **Line:** 102

---

### `VARIABLE` `nowIso`

- **Line:** 103

---

### `VARIABLE` `originUrl`

- **Line:** 104

---

### `VARIABLE` `sessionDocRef`

- **Line:** 122

---

### `VARIABLE` `trackLeadVisit`

- **Line:** 142

---

### `VARIABLE` `updated`

- **Line:** 147

---

### `VARIABLE` `sessionDocRef`

- **Line:** 152

---

### `VARIABLE` `endSession`

- **Line:** 163

---

### `VARIABLE` `finalSessionId`

- **Line:** 164

---

### `VARIABLE` `sessionDocRef`

- **Line:** 190

---

### `VARIABLE` `removeLeadFromSession`

- **Line:** 203

---

### `VARIABLE` `updated`

- **Line:** 205

---

