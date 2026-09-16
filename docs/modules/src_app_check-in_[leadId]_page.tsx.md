# Module: `src/app/check-in/[leadId]/page.tsx`

- **Language:** TypeScript
- **Total Lines:** 720
- **Direct Dependencies:** 34 modules imported

## Exported Symbols & API

### `VARIABLE` `discoverySchema`

- **Line:** 41

---

### `VARIABLE` `newContactSchema`

- **Line:** 49

---

### `VARIABLE` `TOTAL_STEPS`

- **Line:** 57

---

### `VARIABLE` `stepLabels`

- **Line:** 58

---

### `FUNCTION` `ResponsiveProgress`

- **Line:** 60

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ currentStep, totalSteps, labels, onStepClick }` | `{ currentStep: number; totalSteps: number; labels: string[]; onStepClick: (step: number) => void; }` | **Yes** | - | - |

---

### `VARIABLE` `step`

- **Line:** 64

---

### `VARIABLE` `isCompleted`

- **Line:** 65

---

### `VARIABLE` `isCurrent`

- **Line:** 66

---

### `FUNCTION` `UnifiedCheckinPage`

- **Line:** 95
- **Returns:** `void`

---

### `VARIABLE` `mediaRecorderRef`

- **Line:** 106

---

### `VARIABLE` `audioChunksRef`

- **Line:** 107

---

### `VARIABLE` `params`

- **Line:** 128

---

### `VARIABLE` `router`

- **Line:** 129

---

### `VARIABLE` `leadId`

- **Line:** 132

---

### `VARIABLE` `methods`

- **Line:** 134

---

### `VARIABLE` `newContactForm`

- **Line:** 138

---

### `VARIABLE` `populateFormFromAnalysis`

- **Line:** 143

---

### `FUNCTION` `fetchInitialData`

- **Line:** 155
- **Async:** Yes

---

### `FUNCTION` `getMicPermission`

- **Line:** 186
- **Async:** Yes

---

### `FUNCTION` `fetchUsers`

- **Line:** 197
- **Async:** Yes

---

### `VARIABLE` `users`

- **Line:** 199

---

### `FUNCTION` `handleSaveAndNext`

- **Line:** 212
- **Async:** Yes

---

### `VARIABLE` `formValues`

- **Line:** 214

---

### `VARIABLE` `discoveryData`

- **Line:** 218

---

### `FUNCTION` `startRecording`

- **Line:** 234
- **Async:** Yes

---

### `VARIABLE` `stream`

- **Line:** 240

---

### `VARIABLE` `audioBlob`

- **Line:** 249

---

### `VARIABLE` `reader`

- **Line:** 250

---

### `VARIABLE` `base64Audio`

- **Line:** 253

---

### `FUNCTION` `stopRecording`

- **Line:** 262

---

### `FUNCTION` `handleAnalyze`

- **Line:** 271
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `audioDataUri` | `string` | **Yes** | - | - |

---

### `VARIABLE` `leadProfile`

- **Line:** 275

---

### `VARIABLE` `result`

- **Line:** 276

---

### `FUNCTION` `handleBack`

- **Line:** 289

---

### `FUNCTION` `handleStepClick`

- **Line:** 290

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `step` | `number` | **Yes** | - | - |

---

### `FUNCTION` `handleMoveToOutbound`

- **Line:** 292
- **Async:** Yes

---

### `VARIABLE` `activeDialers`

- **Line:** 296

---

### `VARIABLE` `assignees`

- **Line:** 297

---

### `VARIABLE` `assignee`

- **Line:** 300

---

### `FUNCTION` `handleAddContact`

- **Line:** 325
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `values` | `z.infer<typeof newContactSchema>` | **Yes** | - | - |

---

### `VARIABLE` `firstName`

- **Line:** 329

---

### `VARIABLE` `lastName`

- **Line:** 330

---

### `VARIABLE` `fullName`

- **Line:** 331

---

### `VARIABLE` `payload`

- **Line:** 332

---

### `VARIABLE` `newContactId`

- **Line:** 338

---

### `VARIABLE` `newContact`

- **Line:** 339
- **Signature:** `Contact`

---

### `FUNCTION` `handleNoteLogged`

- **Line:** 350

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `newNote` | `Note` | **Yes** | - | - |

---

### `FUNCTION` `handleRevisitScheduled`

- **Line:** 355

---

### `FUNCTION` `handleFindNearbyCustomers`

- **Line:** 360

---

### `VARIABLE` `leadLatLng`

- **Line:** 365

---

### `VARIABLE` `nearby`

- **Line:** 366

---

### `VARIABLE` `companyLatLng`

- **Line:** 368

---

### `FUNCTION` `renderStep`

- **Line:** 375

---

### `VARIABLE` `onNextAction`

- **Line:** 376

---

### `VARIABLE` `stepProps`

- **Line:** 378

---

### `FUNCTION` `StepWrapper`

- **Line:** 482

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ title, script, children, onNext, onBack, onOpenLogOutcome, onOpenLogNote, onOpenRevisitDialog, onMoveToOutbound, isSaving }` | `{ title: string, script?: string, children: React.ReactNode, onNext?: () => void; onBack?: () => void; onOpenLogOutcome: () => void; onOpenLogNote: () => void; onOpenRevisitDialog: () => void; onMoveToOutbound: () => void; isSaving?: boolean }` | **Yes** | - | - |

---

### `FUNCTION` `CompanyDetailsStep`

- **Line:** 513

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ lead, onNext, onFindNearby, isSaving, onOpenLogOutcome, onOpenLogNote, onOpenRevisitDialog, onMoveToOutbound }` | `{ lead: Lead; onNext: () => void; onFindNearby: () => void; isSaving?: boolean; onOpenLogOutcome: () => void; onOpenLogNote: () => void; onOpenRevisitDialog: () => void; onMoveToOutbound: () => void; }` | **Yes** | - | - |

---

### `FUNCTION` `ContactDetailsStep`

- **Line:** 523

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ contacts, onAddContact, form, isAddingContact, onNext, onBack, isSaving, onOpenLogOutcome, onOpenLogNote, onOpenRevisitDialog, onMoveToOutbound }` | `{ contacts: Contact[], onAddContact: (values: any) => void, form: any, isAddingContact: boolean, onNext: () => void; onBack: () => void; isSaving?: boolean; onOpenLogOutcome: () => void; onOpenLogNote: () => void; onOpenRevisitDialog: () => void; onMoveToOutbound: () => void; }` | **Yes** | - | - |

---

### `VARIABLE` `discoverySignals`

- **Line:** 535

---

### `FUNCTION` `FieldDiscoveryStep`

- **Line:** 546

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ onNext, onBack, isSaving, onOpenLogOutcome, onOpenLogNote, onOpenRevisitDialog, onMoveToOutbound }` | `{ onNext: () => void; onBack: () => void; isSaving?: boolean; onOpenLogOutcome: () => void; onOpenLogNote: () => void; onOpenRevisitDialog: () => void; onMoveToOutbound: () => void; }` | **Yes** | - | - |

---

### `VARIABLE` `isSelected`

- **Line:** 561

---

### `VARIABLE` `newValue`

- **Line:** 569

---

### `FUNCTION` `FinishStep`

- **Line:** 647

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ onBack, lead, onOpenScheduleAppointment, onOpenLogOutcome, onOpenRevisitDialog, onMoveToOutbound }` | `{ onBack: () => void; lead: Lead; onOpenScheduleAppointment: () => void; onOpenLogOutcome: () => void; onOpenRevisitDialog: () => void; onMoveToOutbound: () => void; }` | **Yes** | - | - |

---

### `VARIABLE` `router`

- **Line:** 648

---

### `VARIABLE` `isScfAccepted`

- **Line:** 649

---

### `FUNCTION` `NearbyCustomersDialog`

- **Line:** 694

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ isOpen, onOpenChange, customers }` | `{ isOpen: boolean, onOpenChange: (open: boolean) => void, customers: Lead[] }` | **Yes** | - | - |

---

