# Module: `src/app/appointments/page.tsx`

- **Language:** TypeScript
- **Total Lines:** 790
- **Direct Dependencies:** 28 modules imported

## Exported Symbols & API

### `TYPE` `AppointmentWithLead`

- **Line:** 46
- **Signature:** `Appointment & { 
  leadId: string; 
  leadName: string; 
  dialerAssigned?: string; 
  leadStatus: LeadStatus; 
  discoveryData?: DiscoveryData;
  visitNoteID?: string;
  visitNoteCapturedBy?: string;
  visitNoteCreatedAt?: string;
  accountManagerAssigned?: string;
}`

---

### `TYPE` `SortableAppointmentKeys`

- **Line:** 58
- **Signature:** `'leadName' | 'leadStatus' | 'appointmentStatus' | 'appointmentDate' | 'dialerAssigned' | 'assignedTo' | 'duedate' | 'starttime' | 'discoveryScore' | 'visitNoteCreatedAt'`

---

### `FUNCTION` `AllAppointmentsPage`

- **Line:** 61
- **Returns:** `void`

---

### `VARIABLE` `router`

- **Line:** 79

---

### `VARIABLE` `hasAccess`

- **Line:** 83

---

### `FUNCTION` `fetchAppointments`

- **Line:** 86
- **Async:** Yes

---

### `VARIABLE` `visitNotesMap`

- **Line:** 95

---

### `VARIABLE` `leadsMap`

- **Line:** 96

---

### `VARIABLE` `enrichedAppointments`

- **Line:** 98

---

### `VARIABLE` `lead`

- **Line:** 99

---

### `VARIABLE` `visitNote`

- **Line:** 100

---

### `FUNCTION` `handleStatusChange`

- **Line:** 121
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `appointment` | `AppointmentWithLead` | **Yes** | - | - |
| `newStatus` | `AppointmentStatus` | **Yes** | - | - |

---

### `VARIABLE` `notes`

- **Line:** 122

---

### `VARIABLE` `updates`

- **Line:** 125

---

### `VARIABLE` `docRef`

- **Line:** 126

---

### `VARIABLE` `targetLead`

- **Line:** 129

---

### `VARIABLE` `newAppointments`

- **Line:** 131

---

### `FUNCTION` `handleFilterChange`

- **Line:** 159

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `filterName` | `keyof typeof filters` | **Yes** | - | - |
| `value` | `any` | **Yes** | - | - |

---

### `FUNCTION` `clearFilters`

- **Line:** 163

---

### `FUNCTION` `parseDateString`

- **Line:** 178
- **Returns:** `Date | null`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `dateStr` | `string | undefined` | **Yes** | - | - |

---

### `VARIABLE` `dateTimeParts`

- **Line:** 181

---

### `VARIABLE` `datePart`

- **Line:** 182

---

### `VARIABLE` `dateParts`

- **Line:** 183

---

### `VARIABLE` `fullYear`

- **Line:** 188

---

### `VARIABLE` `date`

- **Line:** 193

---

### `VARIABLE` `filteredAppointments`

- **Line:** 198

---

### `VARIABLE` `appointmentsToFilter`

- **Line:** 199

---

### `VARIABLE` `isAm`

- **Line:** 203

---

### `VARIABLE` `fieldSalesLeadIds`

- **Line:** 211

---

### `VARIABLE` `uniqueAppointmentsMap`

- **Line:** 218

---

### `VARIABLE` `key`

- **Line:** 220

---

### `VARIABLE` `uniqueAppointments`

- **Line:** 226

---

### `VARIABLE` `appointmentUserMatch`

- **Line:** 230

---

### `VARIABLE` `leadUserMatch`

- **Line:** 231

---

### `VARIABLE` `dateMatch`

- **Line:** 233

---

### `VARIABLE` `appointmentDate`

- **Line:** 235

---

### `VARIABLE` `fromDate`

- **Line:** 236

---

### `VARIABLE` `toDate`

- **Line:** 237

---

### `VARIABLE` `createdDateMatch`

- **Line:** 241

---

### `VARIABLE` `createdDate`

- **Line:** 243

---

### `VARIABLE` `fromDate`

- **Line:** 245

---

### `VARIABLE` `toDate`

- **Line:** 246

---

### `VARIABLE` `leadNameMatch`

- **Line:** 253

---

### `VARIABLE` `finalAppointmentUserMatch`

- **Line:** 255

---

### `VARIABLE` `finalLeadUserMatch`

- **Line:** 256

---

### `VARIABLE` `statusMatch`

- **Line:** 258

---

### `VARIABLE` `appointmentStatusMatch`

- **Line:** 260

---

### `VARIABLE` `hasNoteMatch`

- **Line:** 263

---

### `VARIABLE` `noteAuthorMatch`

- **Line:** 267

---

### `VARIABLE` `noteDateMatch`

- **Line:** 269

---

### `VARIABLE` `noteDate`

- **Line:** 271

---

### `VARIABLE` `fromDate`

- **Line:** 272

---

### `VARIABLE` `toDate`

- **Line:** 273

---

### `VARIABLE` `sortedAppointments`

- **Line:** 283

---

### `VARIABLE` `sortableItems`

- **Line:** 284

---

### `VARIABLE` `aValue`

- **Line:** 287
- **Signature:** `any`

---

### `VARIABLE` `bValue`

- **Line:** 287
- **Signature:** `any`

---

### `VARIABLE` `dateA`

- **Line:** 293

---

### `VARIABLE` `dateB`

- **Line:** 294

---

### `FUNCTION` `requestSort`

- **Line:** 320

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `key` | `SortableAppointmentKeys` | **Yes** | - | - |

---

### `VARIABLE` `direction`

- **Line:** 321
- **Signature:** `'ascending' | 'descending'`

---

### `FUNCTION` `getSortIndicator`

- **Line:** 328

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `key` | `SortableAppointmentKeys` | **Yes** | - | - |

---

### `VARIABLE` `allUsers`

- **Line:** 335

---

### `VARIABLE` `users`

- **Line:** 336

---

### `VARIABLE` `allLeadUsers`

- **Line:** 340

---

### `VARIABLE` `users`

- **Line:** 341

---

### `VARIABLE` `allNoteAuthors`

- **Line:** 345

---

### `VARIABLE` `authors`

- **Line:** 346

---

### `FUNCTION` `escapeCsvCell`

- **Line:** 350

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `cellData` | `any` | **Yes** | - | - |

---

### `VARIABLE` `stringData`

- **Line:** 354

---

### `FUNCTION` `handleExport`

- **Line:** 361

---

### `VARIABLE` `headers`

- **Line:** 362

---

### `VARIABLE` `rows`

- **Line:** 363

---

### `VARIABLE` `createdDate`

- **Line:** 364

---

### `VARIABLE` `csvContent`

- **Line:** 380

---

### `VARIABLE` `blob`

- **Line:** 381

---

### `VARIABLE` `link`

- **Line:** 382

---

### `VARIABLE` `url`

- **Line:** 383

---

### `VARIABLE` `hasActiveFilters`

- **Line:** 407

---

### `VARIABLE` `leadStatusOptions`

- **Line:** 409
- **Signature:** `Option[]`

---

### `VARIABLE` `appointmentStatusOptions`

- **Line:** 410
- **Signature:** `Option[]`

---

### `VARIABLE` `createdDate`

- **Line:** 677

---

