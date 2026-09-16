# Module: `src/components/marketing/nurture-journeys.tsx`

- **Language:** TypeScript
- **Total Lines:** 1532
- **Direct Dependencies:** 14 modules imported

## Exported Symbols & API

### `INTERFACE` `Template`

- **Line:** 18

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | No | - |
| `name` | `string` | No | - |
| `subject` | `string` | No | - |

---

### `INTERFACE` `JourneyNode`

- **Line:** 24

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | No | - |
| `type` | `'trigger' | 'action' | 'wait' | 'condition' | 'email_open_condition' | 'action_button' | 'end_action'` | No | - |
| `config` | `Record<string, any>` | No | - |

---

### `INTERFACE` `JourneyEdge`

- **Line:** 30

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | No | - |
| `source` | `string` | No | - |
| `target` | `string` | No | - |
| `condition` | `string` | Yes | - |

---

### `INTERFACE` `Journey`

- **Line:** 37

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | No | - |
| `name` | `string` | No | - |
| `status` | `'draft' | 'active' | 'paused'` | No | - |
| `nodes` | `JourneyNode[]` | No | - |
| `edges` | `JourneyEdge[]` | No | - |
| `createdAt` | `string` | Yes | - |

---

### `VARIABLE` `AVAILABLE_STATUSES`

- **Line:** 46

---

### `VARIABLE` `AVAILABLE_BUCKETS`

- **Line:** 76

---

### `VARIABLE` `AVAILABLE_LEAD_SOURCES`

- **Line:** 86

---

### `VARIABLE` `AVAILABLE_CAMPAIGNS`

- **Line:** 99

---

### `FUNCTION` `getStepIcon`

- **Line:** 106

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `type` | `JourneyNode['type']` | **Yes** | - | - |
| `config` | `any` | No | - | - |

---

### `FUNCTION` `getStepDescription`

- **Line:** 129

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `type` | `JourneyNode['type']` | **Yes** | - | - |
| `config` | `any` | No | - | - |

---

### `FUNCTION` `getStepColorClass`

- **Line:** 148

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `type` | `JourneyNode['type']` | **Yes** | - | - |

---

### `FUNCTION` `MiniFlowPreview`

- **Line:** 167
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ nodes }` | `{ nodes: JourneyNode[] }` | **Yes** | - | - |

---

### `VARIABLE` `maxDisplay`

- **Line:** 170

---

### `VARIABLE` `displayedNodes`

- **Line:** 171

---

### `VARIABLE` `remainingCount`

- **Line:** 172

---

### `FUNCTION` `NurtureJourneys`

- **Line:** 206
- **Returns:** `void`

---

### `VARIABLE` `router`

- **Line:** 207

---

### `FUNCTION` `fetchJourneysAndTemplates`

- **Line:** 236
- **Async:** Yes

---

### `VARIABLE` `jList`

- **Line:** 247

---

### `VARIABLE` `tList`

- **Line:** 252

---

### `VARIABLE` `sList`

- **Line:** 258

---

### `VARIABLE` `cList`

- **Line:** 264

---

### `VARIABLE` `fetchedThemes`

- **Line:** 269

---

### `VARIABLE` `mergedHierarchy`

- **Line:** 270

---

### `VARIABLE` `whysSet`

- **Line:** 271

---

### `FUNCTION` `handleAddStep`

- **Line:** 295

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `type` | `'action' | 'wait' | 'condition' | 'email_open_condition' | 'action_button' | 'end_action'` | **Yes** | - | - |
| `insertIndex` | `number` | No | - | - |

---

### `VARIABLE` `nextId`

- **Line:** 296

---

### `VARIABLE` `newConfig`

- **Line:** 297
- **Signature:** `Record<string, any>`

---

### `VARIABLE` `newNode`

- **Line:** 323
- **Signature:** `JourneyNode`

---

### `VARIABLE` `newNodes`

- **Line:** 325

---

### `VARIABLE` `updatedEdges`

- **Line:** 333
- **Signature:** `JourneyEdge[]`

---

### `FUNCTION` `handleUpdateNodeConfig`

- **Line:** 346

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `string` | **Yes** | - | - |
| `key` | `string` | **Yes** | - | - |
| `val` | `any` | **Yes** | - | - |

---

### `FUNCTION` `handleRemoveNode`

- **Line:** 361

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `string` | **Yes** | - | - |

---

### `VARIABLE` `filteredNodes`

- **Line:** 365

---

### `VARIABLE` `updatedEdges`

- **Line:** 368
- **Signature:** `JourneyEdge[]`

---

### `FUNCTION` `handleEditJourney`

- **Line:** 381

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `journey` | `Journey` | **Yes** | - | - |

---

### `FUNCTION` `handleSaveJourney`

- **Line:** 389
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `e` | `React.FormEvent` | **Yes** | - | - |

---

### `VARIABLE` `journeyData`

- **Line:** 410

---

### `FUNCTION` `toggleJourneyStatus`

- **Line:** 435
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `string` | **Yes** | - | - |
| `currentStatus` | `Journey['status']` | **Yes** | - | - |

---

### `VARIABLE` `nextStatus`

- **Line:** 436

---

### `FUNCTION` `deleteJourney`

- **Line:** 446
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `string` | **Yes** | - | - |

---

### `FUNCTION` `resetForm`

- **Line:** 457

---

### `VARIABLE` `newGroups`

- **Line:** 611

---

### `VARIABLE` `newGroups`

- **Line:** 627

---

### `VARIABLE` `newGroups`

- **Line:** 656

---

### `VARIABLE` `valFrom`

- **Line:** 697

---

### `VARIABLE` `valTo`

- **Line:** 698

---

### `VARIABLE` `combined`

- **Line:** 699

---

### `VARIABLE` `newGroups`

- **Line:** 700

---

### `VARIABLE` `valFrom`

- **Line:** 713

---

### `VARIABLE` `valTo`

- **Line:** 714

---

### `VARIABLE` `combined`

- **Line:** 715

---

### `VARIABLE` `newGroups`

- **Line:** 716

---

### `VARIABLE` `val`

- **Line:** 729

---

### `VARIABLE` `newGroups`

- **Line:** 730

---

### `VARIABLE` `newGroups`

- **Line:** 740

---

### `VARIABLE` `newGroups`

- **Line:** 780

---

### `VARIABLE` `newGroups`

- **Line:** 790

---

### `VARIABLE` `newGroups`

- **Line:** 800

---

### `VARIABLE` `filteredJourneys`

- **Line:** 1340

---

### `VARIABLE` `camp`

- **Line:** 1345

---

### `VARIABLE` `isLinked`

- **Line:** 1347

---

### `VARIABLE` `groupedData`

- **Line:** 1366
- **Signature:** `{ campaignId: string; campaignName: string; journeys: Journey[] }[]`

---

### `VARIABLE` `campaignJourneys`

- **Line:** 1369

---

### `VARIABLE` `linkedJourneyIds`

- **Line:** 1379

---

### `VARIABLE` `unlinkedJourneys`

- **Line:** 1380

---

### `FUNCTION` `toggleGroup`

- **Line:** 1389

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `groupId` | `string` | **Yes** | - | - |

---

### `VARIABLE` `isCollapsed`

- **Line:** 1399

---

