# Module: `src/components/account-manager/am-queue-view.tsx`

- **Language:** TypeScript
- **Total Lines:** 477
- **Direct Dependencies:** 12 modules imported

## Exported Symbols & API

### `INTERFACE` `AmQueueViewProps`

- **Line:** 24

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `leads` | `Lead[]` | No | - |
| `appointments` | `Appointment[]` | No | - |
| `onCall` | `(leadId: string, phone: string) => void` | No | - |
| `onEmail` | `(lead: Lead) => void` | No | - |
| `onNotes` | `(lead: Lead) => void` | No | - |
| `onClickLead` | `(leadId: string) => void` | No | - |
| `setLeads` | `React.Dispatch<React.SetStateAction<Lead[]>>` | No | - |

---

### `FUNCTION` `AmQueueView`

- **Line:** 34
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{
  leads,
  appointments,
  onCall,
  onEmail,
  onNotes,
  onClickLead,
  setLeads
}` | `AmQueueViewProps` | **Yes** | - | - |

---

### `VARIABLE` `now`

- **Line:** 46

---

### `VARIABLE` `queueItems`

- **Line:** 48

---

### `VARIABLE` `leadAppts`

- **Line:** 51

---

### `VARIABLE` `snoozeDate`

- **Line:** 58

---

### `VARIABLE` `grouped`

- **Line:** 71

---

### `VARIABLE` `overdue`

- **Line:** 72
- **Signature:** `AmQueueItem[]`

---

### `VARIABLE` `due_today`

- **Line:** 73
- **Signature:** `AmQueueItem[]`

---

### `VARIABLE` `at_risk`

- **Line:** 74
- **Signature:** `AmQueueItem[]`

---

### `VARIABLE` `suggested`

- **Line:** 75
- **Signature:** `AmQueueItem[]`

---

### `VARIABLE` `totalCount`

- **Line:** 94

---

### `VARIABLE` `overdueCount`

- **Line:** 95

---

### `VARIABLE` `dueTodayCount`

- **Line:** 96

---

### `VARIABLE` `atRiskCount`

- **Line:** 97

---

### `VARIABLE` `suggestedCount`

- **Line:** 98

---

### `FUNCTION` `handleSnooze`

- **Line:** 100
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `lead` | `Lead` | **Yes** | - | - |
| `days` | `number` | **Yes** | - | - |

---

### `VARIABLE` `snoozeDate`

- **Line:** 101

---

### `VARIABLE` `snoozeISO`

- **Line:** 102

---

### `FUNCTION` `handleClearSnooze`

- **Line:** 122
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `lead` | `Lead` | **Yes** | - | - |

---

### `FUNCTION` `handleCompleteTask`

- **Line:** 138
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `lead` | `Lead` | **Yes** | - | - |
| `taskId` | `string` | **Yes** | - | - |
| `taskTitle` | `string` | **Yes** | - | - |

---

### `FUNCTION` `handleClearCancellation`

- **Line:** 163
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `lead` | `Lead` | **Yes** | - | - |

---

### `FUNCTION` `handleFollowUpScheduled`

- **Line:** 179
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `lead` | `Lead` | **Yes** | - | - |
| `dateStr` | `string` | **Yes** | - | - |

---

### `FUNCTION` `handleAction`

- **Line:** 195
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `item` | `AmQueueItem` | **Yes** | - | - |

---

### `VARIABLE` `phone`

- **Line:** 198

---

### `VARIABLE` `phone`

- **Line:** 207

---

### `FUNCTION` `renderSection`

- **Line:** 223

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `title` | `string` | **Yes** | - | - |
| `items` | `AmQueueItem[]` | **Yes** | - | - |
| `borderClass` | `string` | **Yes** | - | - |
| `badgeBg` | `string` | **Yes** | - | - |
| `badgeText` | `string` | **Yes** | - | - |

---

### `VARIABLE` `lead`

- **Line:** 236

---

### `VARIABLE` `primaryContact`

- **Line:** 237

---

### `VARIABLE` `contactName`

- **Line:** 238

---

### `VARIABLE` `lastContactLabel`

- **Line:** 241

---

### `VARIABLE` `lastContactStr`

- **Line:** 242

---

### `VARIABLE` `lastDate`

- **Line:** 244

---

### `VARIABLE` `daysDiff`

- **Line:** 246

---

