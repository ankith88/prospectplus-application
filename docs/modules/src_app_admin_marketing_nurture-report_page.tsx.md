# Module: `src/app/admin/marketing/nurture-report/page.tsx`

- **Language:** TypeScript
- **Total Lines:** 532
- **Direct Dependencies:** 14 modules imported

## Exported Symbols & API

### `FUNCTION` `NurtureReportPage`

- **Line:** 18
- **Returns:** `void`

---

### `VARIABLE` `router`

- **Line:** 20

---

### `FUNCTION` `handleTriggerStep`

- **Line:** 33
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `e` | `React.MouseEvent` | **Yes** | - | - |
| `leadId` | `string` | **Yes** | - | - |
| `journeyId` | `string` | **Yes** | - | - |

---

### `VARIABLE` `res`

- **Line:** 37

---

### `VARIABLE` `data`

- **Line:** 42

---

### `VARIABLE` `refreshRes`

- **Line:** 46

---

### `VARIABLE` `refreshData`

- **Line:** 47

---

### `VARIABLE` `updatedJ`

- **Line:** 50

---

### `FUNCTION` `handleRemoveLead`

- **Line:** 66
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `e` | `React.MouseEvent` | **Yes** | - | - |
| `leadId` | `string` | **Yes** | - | - |
| `journeyId` | `string` | **Yes** | - | - |

---

### `VARIABLE` `stateRef`

- **Line:** 71

---

### `VARIABLE` `leadRef`

- **Line:** 72

---

### `VARIABLE` `nowStr`

- **Line:** 73

---

### `VARIABLE` `res`

- **Line:** 86

---

### `VARIABLE` `data`

- **Line:** 87

---

### `VARIABLE` `updatedJ`

- **Line:** 90

---

### `VARIABLE` `isAllowed`

- **Line:** 103

---

### `FUNCTION` `fetchCampaigns`

- **Line:** 118
- **Async:** Yes

---

### `VARIABLE` `campaignsSnap`

- **Line:** 120

---

### `VARIABLE` `cList`

- **Line:** 121

---

### `FUNCTION` `fetchReport`

- **Line:** 131
- **Async:** Yes

---

### `VARIABLE` `res`

- **Line:** 134

---

### `VARIABLE` `data`

- **Line:** 135

---

### `VARIABLE` `filteredReportData`

- **Line:** 158

---

### `VARIABLE` `camp`

- **Line:** 163

---

### `VARIABLE` `isLinked`

- **Line:** 165

---

### `VARIABLE` `totalEnrolled`

- **Line:** 175

---

### `VARIABLE` `totalActive`

- **Line:** 176

---

### `VARIABLE` `totalCompleted`

- **Line:** 177

---

### `VARIABLE` `totalInteractions`

- **Line:** 178

---

### `VARIABLE` `groupedData`

- **Line:** 411
- **Signature:** `{ campaignId: string; campaignName: string; journeys: any[] }[]`

---

### `VARIABLE` `campaignJourneys`

- **Line:** 414

---

### `VARIABLE` `linkedJourneyIds`

- **Line:** 424

---

### `VARIABLE` `unlinkedJourneys`

- **Line:** 425

---

### `FUNCTION` `toggleGroup`

- **Line:** 434

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `groupId` | `string` | **Yes** | - | - |

---

### `VARIABLE` `isCollapsed`

- **Line:** 444

---

