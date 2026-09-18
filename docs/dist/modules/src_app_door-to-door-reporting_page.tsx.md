# Module: `src/app/door-to-door-reporting/page.tsx`

- **Language:** TypeScript
- **Total Lines:** 410
- **Direct Dependencies:** 21 modules imported

## Exported Symbols & API

### `FUNCTION` `DoorToDoorReportingPage`

- **Line:** 27
- **Returns:** `void`

---

### `VARIABLE` `router`

- **Line:** 35

---

### `VARIABLE` `hasAccess`

- **Line:** 49

---

### `FUNCTION` `fetchData`

- **Line:** 51
- **Async:** Yes

---

### `VARIABLE` `fieldSalesLeads`

- **Line:** 62

---

### `FUNCTION` `handleFilterChange`

- **Line:** 84

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `filterName` | `keyof typeof filters` | **Yes** | - | - |
| `value` | `any` | **Yes** | - | - |

---

### `FUNCTION` `clearFilters`

- **Line:** 88

---

### `VARIABLE` `filteredRoutes`

- **Line:** 96

---

### `VARIABLE` `dateMatch`

- **Line:** 98

---

### `VARIABLE` `routeDate`

- **Line:** 100

---

### `VARIABLE` `fromDate`

- **Line:** 101

---

### `VARIABLE` `toDate`

- **Line:** 102

---

### `VARIABLE` `userMatch`

- **Line:** 107

---

### `VARIABLE` `filteredActivities`

- **Line:** 112

---

### `VARIABLE` `dateMatch`

- **Line:** 114

---

### `VARIABLE` `activityDate`

- **Line:** 116

---

### `VARIABLE` `fromDate`

- **Line:** 117

---

### `VARIABLE` `toDate`

- **Line:** 118

---

### `VARIABLE` `userMatch`

- **Line:** 121

---

### `VARIABLE` `filteredLeads`

- **Line:** 126

---

### `VARIABLE` `userMatch`

- **Line:** 133

---

### `VARIABLE` `dateMatch`

- **Line:** 135

---

### `VARIABLE` `campaignMatch`

- **Line:** 140

---

### `VARIABLE` `stats`

- **Line:** 145

---

### `VARIABLE` `checkInActivities`

- **Line:** 146

---

### `VARIABLE` `totalCheckIns`

- **Line:** 147

---

### `VARIABLE` `signedUpLeads`

- **Line:** 149

---

### `VARIABLE` `trialingLeads`

- **Line:** 150

---

### `VARIABLE` `totalSignups`

- **Line:** 152

---

### `VARIABLE` `totalTrials`

- **Line:** 153

---

### `VARIABLE` `conversionRate`

- **Line:** 155

---

### `FUNCTION` `parseDurationToMinutes`

- **Line:** 157
- **Returns:** `number`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `durationStr` | `string | null | undefined` | **Yes** | - | - |

---

### `VARIABLE` `hoursMatch`

- **Line:** 159

---

### `VARIABLE` `minutesMatch`

- **Line:** 160

---

### `VARIABLE` `hours`

- **Line:** 161

---

### `VARIABLE` `minutes`

- **Line:** 162

---

### `VARIABLE` `totalDistance`

- **Line:** 166

---

### `VARIABLE` `dist`

- **Line:** 167

---

### `VARIABLE` `totalDurationInMinutes`

- **Line:** 171

---

### `VARIABLE` `performanceData`

- **Line:** 175

---

### `VARIABLE` `userName`

- **Line:** 176

---

### `VARIABLE` `userCheckins`

- **Line:** 177

---

### `VARIABLE` `userSignups`

- **Line:** 178

---

### `VARIABLE` `userTrials`

- **Line:** 179

---

### `VARIABLE` `user_routes`

- **Line:** 181

---

### `VARIABLE` `userTotalDistance`

- **Line:** 182

---

### `VARIABLE` `userTotalDuration`

- **Line:** 183

---

### `VARIABLE` `checkInsByDate`

- **Line:** 195

---

### `VARIABLE` `date`

- **Line:** 196

---

### `VARIABLE` `checkInsTrendData`

- **Line:** 201

---

### `FUNCTION` `StatCard`

- **Line:** 216

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ title, value, icon: Icon, description }` | `{ title: string; value: string | number; icon: React.ElementType; description?: string; }` | **Yes** | - | - |

---

### `VARIABLE` `hasActiveFilters`

- **Line:** 229

---

### `VARIABLE` `userOptions`

- **Line:** 230
- **Signature:** `Option[]`

---

### `VARIABLE` `uniqueNames`

- **Line:** 231

---

