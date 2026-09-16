# Module: `src/components/resolve-pending-items-modal.tsx`

- **Language:** TypeScript
- **Total Lines:** 369
- **Direct Dependencies:** 9 modules imported

## Exported Symbols & API

### `INTERFACE` `AppointmentResolution`

- **Line:** 19

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | No | - |
| `status` | `AppointmentStatus` | No | - |
| `notes` | `string` | Yes | - |

---

### `INTERFACE` `TaskResolution`

- **Line:** 25

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | No | - |
| `action` | `'complete' | 'cancel' | 'keep'` | No | - |

---

### `INTERFACE` `ResolvePendingItemsModalProps`

- **Line:** 30

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `isOpen` | `boolean` | No | - |
| `onClose` | `() => void` | No | - |
| `leadName` | `string` | No | - |
| `targetStatus` | `string` | Yes | - |
| `pendingAppointments` | `Appointment[]` | No | - |
| `pendingTasks` | `Task[]` | No | - |
| `onConfirm` | `(
    appointmentResolutions: AppointmentResolution[],
    taskResolutions: TaskResolution[]
  ) => Promise<void>` | No | - |

---

### `FUNCTION` `ResolvePendingItemsModal`

- **Line:** 43
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{
  isOpen,
  onClose,
  leadName,
  targetStatus = 'Lost',
  pendingAppointments,
  pendingTasks,
  onConfirm,
}` | `ResolvePendingItemsModalProps` | **Yes** | - | - |

---

### `VARIABLE` `initAppts`

- **Line:** 59
- **Signature:** `Record<string, { status: AppointmentStatus; notes: string }>`

---

### `VARIABLE` `initTasks`

- **Line:** 66
- **Signature:** `Record<string, 'complete' | 'cancel' | 'keep'>`

---

### `FUNCTION` `setAllApptsStatus`

- **Line:** 74

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `status` | `AppointmentStatus` | **Yes** | - | - |

---

### `VARIABLE` `updated`

- **Line:** 76

---

### `FUNCTION` `setAllTasksAction`

- **Line:** 84

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `action` | `'complete' | 'cancel' | 'keep'` | **Yes** | - | - |

---

### `VARIABLE` `updated`

- **Line:** 86

---

### `FUNCTION` `handleSubmit`

- **Line:** 94
- **Async:** Yes

---

### `VARIABLE` `apptResolutions`

- **Line:** 97
- **Signature:** `AppointmentResolution[]`

---

### `VARIABLE` `taskResolutionsList`

- **Line:** 103
- **Signature:** `TaskResolution[]`

---

### `VARIABLE` `hasAppts`

- **Line:** 119

---

### `VARIABLE` `hasTasks`

- **Line:** 120

---

### `VARIABLE` `dateStr`

- **Line:** 192

---

### `VARIABLE` `formattedDate`

- **Line:** 193

---

### `VARIABLE` `rep`

- **Line:** 202

---

### `VARIABLE` `formattedDueDate`

- **Line:** 298

---

