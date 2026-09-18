# Module: `src/components/appointments/page.tsx`

- **Language:** TypeScript
- **Total Lines:** 570
- **Direct Dependencies:** 24 modules imported

## Exported Symbols & API

### `TYPE` `AppointmentWithLead`

- **Line:** 44
- **Signature:** `Appointment & { leadId: string; leadName: string; dialerAssigned?: string; leadStatus: LeadStatus; discoveryData?: DiscoveryData; }`

---

### `TYPE` `SortableAppointmentKeys`

- **Line:** 45
- **Signature:** `'leadName' | 'leadStatus' | 'appointmentStatus' | 'appointmentDate' | 'dialerAssigned' | 'assignedTo' | 'duedate' | 'starttime' | 'discoveryScore'`

---

### `VARIABLE` `leadStatuses`

- **Line:** 46
- **Signature:** `LeadStatus[]`

---

### `VARIABLE` `appointmentStatuses`

- **Line:** 47
- **Signature:** `(AppointmentStatus | 'Pending')[]`

---

### `FUNCTION` `AllAppointmentsPage`

- **Line:** 50
- **Returns:** `void`

---

### `VARIABLE` `router`

- **Line:** 64

---

### `FUNCTION` `fetchAppointments`

- **Line:** 68
- **Async:** Yes

---

### `VARIABLE` `fetchedAppointments`

- **Line:** 71

---

### `FUNCTION` `handleFilterChange`

- **Line:** 92

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `filterName` | `keyof typeof filters` | **Yes** | - | - |
| `value` | `any` | **Yes** | - | - |

---

### `FUNCTION` `clearFilters`

- **Line:** 96

---

### `FUNCTION` `parseDateString`

- **Line:** 100
- **Returns:** `Date | null`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `dateStr` | `string | undefined` | **Yes** | - | - |

---

### `VARIABLE` `dateTimeParts`

- **Line:** 103

---

### `VARIABLE` `datePart`

- **Line:** 104

---

### `VARIABLE` `dateParts`

- **Line:** 105

---

### `VARIABLE` `fullYear`

- **Line:** 110

---

### `VARIABLE` `date`

- **Line:** 115

---

### `VARIABLE` `filteredAppointments`

- **Line:** 120

---

### `VARIABLE` `appointmentsToFilter`

- **Line:** 121

---

### `VARIABLE` `uniqueAppointmentsMap`

- **Line:** 129

---

### `VARIABLE` `key`

- **Line:** 131

---

### `VARIABLE` `uniqueAppointments`

- **Line:** 137

---

### `VARIABLE` `appointmentUserMatch`

- **Line:** 141

---

### `VARIABLE` `leadUserMatch`

- **Line:** 142

---

### `VARIABLE` `dateMatch`

- **Line:** 144

---

### `VARIABLE` `appointmentDate`

- **Line:** 146

---

### `VARIABLE` `fromDate`

- **Line:** 147

---

### `VARIABLE` `toDate`

- **Line:** 148

---

### `VARIABLE` `createdDateMatch`

- **Line:** 152

---

### `VARIABLE` `createdDate`

- **Line:** 154

---

### `VARIABLE` `fromDate`

- **Line:** 156

---

### `VARIABLE` `toDate`

- **Line:** 157

---

### `VARIABLE` `leadNameMatch`

- **Line:** 164

---

### `VARIABLE` `finalAppointmentUserMatch`

- **Line:** 166

---

### `VARIABLE` `finalLeadUserMatch`

- **Line:** 167

---

### `VARIABLE` `statusMatch`

- **Line:** 169

---

### `VARIABLE` `appointmentStatusMatch`

- **Line:** 171

---

### `VARIABLE` `sortedAppointments`

- **Line:** 177

---

### `VARIABLE` `sortableItems`

- **Line:** 178

---

### `VARIABLE` `aValue`

- **Line:** 181

---

### `VARIABLE` `bValue`

- **Line:** 181

---

### `FUNCTION` `requestSort`

- **Line:** 212

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `key` | `SortableAppointmentKeys` | **Yes** | - | - |

---

### `VARIABLE` `direction`

- **Line:** 213
- **Signature:** `'ascending' | 'descending'`

---

### `FUNCTION` `getSortIndicator`

- **Line:** 220

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `key` | `SortableAppointmentKeys` | **Yes** | - | - |

---

### `VARIABLE` `allUsers`

- **Line:** 227

---

### `VARIABLE` `users`

- **Line:** 228

---

### `VARIABLE` `allLeadUsers`

- **Line:** 232

---

### `VARIABLE` `users`

- **Line:** 233

---

### `FUNCTION` `escapeCsvCell`

- **Line:** 237

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `cellData` | `any` | **Yes** | - | - |

---

### `VARIABLE` `stringData`

- **Line:** 241

---

### `FUNCTION` `handleExport`

- **Line:** 248

---

### `VARIABLE` `headers`

- **Line:** 249

---

### `VARIABLE` `rows`

- **Line:** 250

---

### `VARIABLE` `createdDate`

- **Line:** 251

---

### `VARIABLE` `csvContent`

- **Line:** 265

---

### `VARIABLE` `blob`

- **Line:** 266

---

### `VARIABLE` `link`

- **Line:** 267

---

### `VARIABLE` `url`

- **Line:** 268

---

### `VARIABLE` `hasActiveFilters`

- **Line:** 285

---

### `VARIABLE` `leadStatusOptions`

- **Line:** 287
- **Signature:** `Option[]`

---

### `VARIABLE` `appointmentStatusOptions`

- **Line:** 288
- **Signature:** `Option[]`

---

### `VARIABLE` `createdDate`

- **Line:** 490

---

