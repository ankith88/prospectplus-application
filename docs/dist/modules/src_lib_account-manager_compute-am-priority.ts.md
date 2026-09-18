# Module: `src/lib/account-manager/compute-am-priority.ts`

- **Language:** TypeScript
- **Total Lines:** 358
- **Direct Dependencies:** 1 modules imported

## Exported Symbols & API

### `INTERFACE` `AmQueueItem`

- **Line:** 3

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `lead` | `Lead` | No | - |
| `score` | `number` | No | - |
| `reasonChips` | `string[]` | No | - |
| `primaryReason` | `string` | No | - |
| `nextAction` | `{                  // one unambiguous action for the row
    kind: 'call' | 'email' | 'meeting' | 'save-call' | 'follow-up' | 'convert-trial';
    label: string;               // e.g. "Save call — cancellation requested"
  }` | No | - |
| `group` | `'overdue' | 'due_today' | 'at_risk' | 'suggested'` | No | - |
| `mrrAtStake` | `number` | Yes | - |

---

### `VARIABLE` `AM_QUEUE_CONFIG`

- **Line:** 16

---

### `FUNCTION` `getSydneyDateString`

> Formats a date to YYYY-MM-DD in Sydney timezone.

- **Line:** 43
- **Returns:** `string`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `date` | `Date` | **Yes** | - | - |

---

### `VARIABLE` `formatter`

- **Line:** 44

---

### `VARIABLE` `parts`

- **Line:** 50

---

### `VARIABLE` `day`

- **Line:** 51

---

### `VARIABLE` `month`

- **Line:** 52

---

### `VARIABLE` `year`

- **Line:** 53

---

### `FUNCTION` `getElapsedBusinessHours`

> Calculates business hours elapsed between start and end date in Sydney timezone.
Sydney business hours are Mon-Fri 09:00 - 17:00.

- **Line:** 61
- **Returns:** `number`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `start` | `Date` | **Yes** | - | - |
| `end` | `Date` | **Yes** | - | - |

---

### `VARIABLE` `realDiffHours`

- **Line:** 64

---

### `VARIABLE` `current`

- **Line:** 69

---

### `VARIABLE` `businessHours`

- **Line:** 70

---

### `VARIABLE` `stepMs`

- **Line:** 72

---

### `VARIABLE` `formatter`

- **Line:** 74

---

### `VARIABLE` `parts`

- **Line:** 81

---

### `VARIABLE` `wday`

- **Line:** 82

---

### `VARIABLE` `hourVal`

- **Line:** 83

---

### `VARIABLE` `isWeekend`

- **Line:** 85

---

### `VARIABLE` `isBizHour`

- **Line:** 86

---

### `FUNCTION` `computeAmPriority`

- **Line:** 96
- **Returns:** `AmQueueItem`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `lead` | `Lead` | **Yes** | - | - |
| `appointments` | `Appointment[]` | **Yes** | - | - |
| `now` | `Date` | **Yes** | - | - |

---

### `VARIABLE` `reasonChips`

- **Line:** 101
- **Signature:** `string[]`

---

### `VARIABLE` `matchedSignals`

- **Line:** 102
- **Signature:** `Array<{
    score: number;
    primaryReason: string;
    group: 'overdue' | 'due_today' | 'at_risk' | 'suggested';
    nextAction: AmQueueItem['nextAction'];
  }>`

---

### `VARIABLE` `mrr`

- **Line:** 110

---

### `VARIABLE` `servicesTotal`

- **Line:** 112

---

### `VARIABLE` `todayStr`

- **Line:** 116

---

### `VARIABLE` `isCancellation`

- **Line:** 119

---

### `VARIABLE` `reason`

- **Line:** 123

---

### `VARIABLE` `isHotLead`

- **Line:** 137

---

### `VARIABLE` `elapsedBizHours`

- **Line:** 140

---

### `VARIABLE` `enteredDate`

- **Line:** 142

---

### `VARIABLE` `isOverdue`

- **Line:** 147

---

### `VARIABLE` `reason`

- **Line:** 148

---

### `VARIABLE` `isTrial`

- **Line:** 167

---

### `VARIABLE` `daysSinceTrialStart`

- **Line:** 171

---

### `VARIABLE` `trialStart`

- **Line:** 173

---

### `VARIABLE` `daysRemaining`

- **Line:** 182

---

### `VARIABLE` `reason`

- **Line:** 184

---

### `VARIABLE` `activeApptsToday`

- **Line:** 201

---

### `VARIABLE` `d`

- **Line:** 202

---

### `VARIABLE` `status`

- **Line:** 204

---

### `VARIABLE` `apptDateStr`

- **Line:** 208

---

### `VARIABLE` `appt`

- **Line:** 216

---

### `VARIABLE` `reason`

- **Line:** 217

---

### `VARIABLE` `incompleteTasks`

- **Line:** 231

---

### `VARIABLE` `taskDateStr`

- **Line:** 234

---

### `VARIABLE` `isOverdue`

- **Line:** 235

---

### `VARIABLE` `isDueToday`

- **Line:** 236

---

### `VARIABLE` `reason`

- **Line:** 239

---

### `VARIABLE` `followUpDateStr`

- **Line:** 259

---

### `VARIABLE` `reason`

- **Line:** 261

---

### `VARIABLE` `lastContactStr`

- **Line:** 279

---

### `VARIABLE` `lastContactDate`

- **Line:** 282

---

### `VARIABLE` `daysCold`

- **Line:** 284

---

### `VARIABLE` `reason`

- **Line:** 286

---

### `VARIABLE` `highest`

- **Line:** 324

---

### `FUNCTION` `sortQueueItems`

- **Line:** 337
- **Returns:** `number`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `a` | `AmQueueItem` | **Yes** | - | - |
| `b` | `AmQueueItem` | **Yes** | - | - |

---

### `VARIABLE` `hasNbaA`

- **Line:** 342

---

### `VARIABLE` `hasNbaB`

- **Line:** 343

---

### `VARIABLE` `aiA`

- **Line:** 348

---

### `VARIABLE` `aiB`

- **Line:** 349

---

### `VARIABLE` `mrrA`

- **Line:** 354

---

### `VARIABLE` `mrrB`

- **Line:** 355

---

