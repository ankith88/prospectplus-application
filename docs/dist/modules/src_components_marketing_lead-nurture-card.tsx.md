# Module: `src/components/marketing/lead-nurture-card.tsx`

- **Language:** TypeScript
- **Total Lines:** 582
- **Direct Dependencies:** 10 modules imported

## Exported Symbols & API

### `INTERFACE` `LeadNurtureCardProps`

- **Line:** 14

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `leadId` | `string` | No | - |
| `leadData` | `any` | No | - |
| `onRefreshLead` | `() => void` | No | - |

---

### `FUNCTION` `LeadNurtureCard`

- **Line:** 20
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ leadId, leadData, onRefreshLead }` | `LeadNurtureCardProps` | **Yes** | - | - |

---

### `FUNCTION` `updateMinutes`

- **Line:** 33

---

### `VARIABLE` `now`

- **Line:** 34

---

### `VARIABLE` `interval`

- **Line:** 38

---

### `FUNCTION` `fetchNurtureData`

- **Line:** 46
- **Async:** Yes

---

### `VARIABLE` `jList`

- **Line:** 56

---

### `VARIABLE` `sList`

- **Line:** 60

---

### `VARIABLE` `tList`

- **Line:** 61

---

### `VARIABLE` `stList`

- **Line:** 62

---

### `FUNCTION` `handleEnroll`

- **Line:** 75
- **Async:** Yes

---

### `VARIABLE` `journey`

- **Line:** 79

---

### `VARIABLE` `startNode`

- **Line:** 82

---

### `VARIABLE` `firstEdge`

- **Line:** 83

---

### `VARIABLE` `initialNodeId`

- **Line:** 84

---

### `VARIABLE` `nowStr`

- **Line:** 86

---

### `VARIABLE` `stateRef`

- **Line:** 89

---

### `VARIABLE` `leadRef`

- **Line:** 108

---

### `VARIABLE` `author`

- **Line:** 114

---

### `VARIABLE` `activityRef`

- **Line:** 115

---

### `FUNCTION` `handleStatusChange`

- **Line:** 142
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `journeyId` | `string` | **Yes** | - | - |
| `nextStatus` | `'active' | 'paused' | 'stopped'` | **Yes** | - | - |

---

### `VARIABLE` `stateRef`

- **Line:** 145

---

### `VARIABLE` `leadRef`

- **Line:** 146

---

### `VARIABLE` `nowStr`

- **Line:** 147

---

### `VARIABLE` `updates`

- **Line:** 149
- **Signature:** `any`

---

### `FUNCTION` `handleTriggerStep`

- **Line:** 184
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `journeyId` | `string` | **Yes** | - | - |

---

### `VARIABLE` `res`

- **Line:** 187

---

### `VARIABLE` `data`

- **Line:** 192

---

### `FUNCTION` `getRemainingSteps`

- **Line:** 208

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `currentNodeId` | `string` | **Yes** | - | - |
| `journey` | `any` | **Yes** | - | - |
| `lastExecTimeStr` | `string | null` | **Yes** | - | - |

---

### `VARIABLE` `steps`

- **Line:** 209
- **Signature:** `Array<{
      nodeId: string;
      type: string;
      description: string;
      estimatedTime?: Date;
      config: any;
    }>`

---

### `VARIABLE` `currentId`

- **Line:** 217

---

### `VARIABLE` `simulatedTime`

- **Line:** 218

---

### `VARIABLE` `visited`

- **Line:** 219

---

### `VARIABLE` `node`

- **Line:** 223

---

### `VARIABLE` `description`

- **Line:** 226

---

### `VARIABLE` `config`

- **Line:** 229

---

### `VARIABLE` `duration`

- **Line:** 230

---

### `VARIABLE` `unit`

- **Line:** 231

---

### `VARIABLE` `delayMs`

- **Line:** 232

---

### `VARIABLE` `config`

- **Line:** 236

---

### `VARIABLE` `day`

- **Line:** 241

---

### `VARIABLE` `nextTime`

- **Line:** 252

---

### `VARIABLE` `actionType`

- **Line:** 261

---

### `VARIABLE` `template`

- **Line:** 263

---

### `VARIABLE` `smsTemplate`

- **Line:** 266

---

### `VARIABLE` `config`

- **Line:** 270

---

### `VARIABLE` `field`

- **Line:** 271

---

### `VARIABLE` `val`

- **Line:** 272

---

### `VARIABLE` `config`

- **Line:** 275

---

### `VARIABLE` `config`

- **Line:** 278

---

### `VARIABLE` `config`

- **Line:** 294

---

### `VARIABLE` `field`

- **Line:** 295

---

### `VARIABLE` `val`

- **Line:** 296

---

### `VARIABLE` `leadVal`

- **Line:** 299

---

### `VARIABLE` `isMatch`

- **Line:** 300

---

### `VARIABLE` `matchingEdge`

- **Line:** 302

---

### `VARIABLE` `cond`

- **Line:** 304

---

### `VARIABLE` `defaultEdge`

- **Line:** 311

---

### `VARIABLE` `nextEdge`

- **Line:** 315

---

### `VARIABLE` `activeJourneyIds`

- **Line:** 333

---

### `VARIABLE` `pendingJourneyIds`

- **Line:** 334

---

### `VARIABLE` `jDef`

- **Line:** 381

---

### `VARIABLE` `name`

- **Line:** 382

---

### `VARIABLE` `jDef`

- **Line:** 400

---

### `VARIABLE` `name`

- **Line:** 401

---

### `VARIABLE` `currentNode`

- **Line:** 421

---

### `VARIABLE` `nodeName`

- **Line:** 422

---

### `VARIABLE` `remaining`

- **Line:** 486

---

### `VARIABLE` `isCurrent`

- **Line:** 491

---

### `FUNCTION` `getTimelineStepIcon`

- **Line:** 493

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `type` | `string` | **Yes** | - | - |

---

