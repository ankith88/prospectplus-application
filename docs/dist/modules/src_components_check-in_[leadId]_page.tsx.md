# Module: `src/components/check-in/[leadId]/page.tsx`

- **Language:** TypeScript
- **Total Lines:** 799
- **Direct Dependencies:** 38 modules imported

## Exported Symbols & API

### `VARIABLE` `discoverySchema`

- **Line:** 44

---

### `VARIABLE` `newContactSchema`

- **Line:** 52

---

### `VARIABLE` `TOTAL_STEPS`

- **Line:** 60

---

### `VARIABLE` `stepLabels`

- **Line:** 61

---

### `FUNCTION` `ResponsiveProgress`

- **Line:** 63

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ currentStep, totalSteps, labels, onStepClick }` | `{ currentStep: number; totalSteps: number; labels: string[]; onStepClick: (step: number) => void; }` | **Yes** | - | - |

---

### `VARIABLE` `step`

- **Line:** 67

---

### `VARIABLE` `isCompleted`

- **Line:** 68

---

### `VARIABLE` `isCurrent`

- **Line:** 69

---

### `FUNCTION` `UnifiedCheckinPage`

- **Line:** 98
- **Returns:** `void`

---

### `FUNCTION` `ensureFranchiseeIdField`

- **Line:** 102
- **Async:** Yes

---

### `VARIABLE` `fId`

- **Line:** 104

---

### `VARIABLE` `mediaRecorderRef`

- **Line:** 119

---

### `VARIABLE` `audioChunksRef`

- **Line:** 120

---

### `VARIABLE` `params`

- **Line:** 145

---

### `VARIABLE` `router`

- **Line:** 146

---

### `VARIABLE` `leadId`

- **Line:** 149

---

### `VARIABLE` `methods`

- **Line:** 151

---

### `VARIABLE` `newContactForm`

- **Line:** 155

---

### `VARIABLE` `populateFormFromAnalysis`

- **Line:** 160

---

### `FUNCTION` `fetchInitialData`

- **Line:** 172
- **Async:** Yes

---

### `FUNCTION` `getMicPermission`

- **Line:** 203
- **Async:** Yes

---

### `FUNCTION` `handleSaveAndNext`

- **Line:** 219
- **Async:** Yes

---

### `VARIABLE` `formValues`

- **Line:** 221

---

### `VARIABLE` `discoveryData`

- **Line:** 225

---

### `FUNCTION` `startRecording`

- **Line:** 241
- **Async:** Yes

---

### `VARIABLE` `stream`

- **Line:** 247

---

### `VARIABLE` `audioBlob`

- **Line:** 256

---

### `VARIABLE` `reader`

- **Line:** 257

---

### `VARIABLE` `base64Audio`

- **Line:** 260

---

### `FUNCTION` `stopRecording`

- **Line:** 269

---

### `FUNCTION` `handleAnalyze`

- **Line:** 278
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `audioDataUri` | `string` | **Yes** | - | - |

---

### `VARIABLE` `leadProfile`

- **Line:** 282

---

### `VARIABLE` `result`

- **Line:** 283

---

### `FUNCTION` `handleBack`

- **Line:** 296

---

### `FUNCTION` `handleStepClick`

- **Line:** 297

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `step` | `number` | **Yes** | - | - |

---

### `FUNCTION` `handleMoveToOutbound`

- **Line:** 299
- **Async:** Yes

---

### `VARIABLE` `assignees`

- **Line:** 303

---

### `VARIABLE` `assignee`

- **Line:** 304

---

### `FUNCTION` `handleAddContact`

- **Line:** 329
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `values` | `z.infer<typeof newContactSchema>` | **Yes** | - | - |

---

### `VARIABLE` `firstName`

- **Line:** 333

---

### `VARIABLE` `lastName`

- **Line:** 334

---

### `VARIABLE` `fullName`

- **Line:** 335

---

### `VARIABLE` `payload`

- **Line:** 336

---

### `VARIABLE` `newContactId`

- **Line:** 342

---

### `VARIABLE` `newContact`

- **Line:** 343
- **Signature:** `Contact`

---

### `FUNCTION` `handleNoteLogged`

- **Line:** 354

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `newNote` | `Note` | **Yes** | - | - |

---

### `FUNCTION` `handleRevisitScheduled`

- **Line:** 359

---

### `FUNCTION` `handleFindNearbyCustomers`

- **Line:** 364

---

### `VARIABLE` `leadLatLng`

- **Line:** 369

---

### `VARIABLE` `nearby`

- **Line:** 370

---

### `VARIABLE` `companyLatLng`

- **Line:** 372

---

### `FUNCTION` `handleLocalMileConfirm`

- **Line:** 379
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `serviceType` | `string` | **Yes** | - | - |
| `rate` | `number` | **Yes** | - | - |

---

### `VARIABLE` `result`

- **Line:** 381

---

### `FUNCTION` `handleShipMateConfirm`

- **Line:** 403
- **Async:** Yes

---

### `VARIABLE` `result`

- **Line:** 404

---

### `FUNCTION` `renderStep`

- **Line:** 414

---

### `VARIABLE` `onNextAction`

- **Line:** 415

---

### `VARIABLE` `stepProps`

- **Line:** 417

---

### `FUNCTION` `StepWrapper`

- **Line:** 549

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ title, script, children, onNext, onBack, onOpenLogOutcome, onOpenLogNote, onOpenRevisitDialog, onMoveToOutbound, isSaving }` | `{ title: string, script?: string, children: React.ReactNode, onNext?: () => void; onBack?: () => void; onOpenLogOutcome: () => void; onOpenLogNote: () => void; onOpenRevisitDialog: () => void; onMoveToOutbound: () => void; isSaving?: boolean }` | **Yes** | - | - |

---

### `FUNCTION` `CompanyDetailsStep`

- **Line:** 582

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ lead, onNext, onFindNearby, isSaving, onOpenLogOutcome, onOpenLogNote, onOpenRevisitDialog, onMoveToOutbound }` | `{ lead: Lead; onNext: () => void; onFindNearby: () => void; isSaving?: boolean; onOpenLogOutcome: () => void; onOpenLogNote: () => void; onOpenRevisitDialog: () => void; onMoveToOutbound: () => void; }` | **Yes** | - | - |

---

### `FUNCTION` `ContactDetailsStep`

- **Line:** 592

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ contacts, onAddContact, form, isAddingContact, onNext, onBack, isSaving, onOpenLogOutcome, onOpenLogNote, onOpenRevisitDialog, onMoveToOutbound }` | `{ contacts: Contact[], onAddContact: (values: any) => void, form: any, isAddingContact: boolean, onNext: () => void; onBack: () => void; isSaving?: boolean; onOpenLogOutcome: () => void; onOpenLogNote: () => void; onOpenRevisitDialog: () => void; onMoveToOutbound: () => void; }` | **Yes** | - | - |

---

### `VARIABLE` `discoverySignals`

- **Line:** 604

---

### `FUNCTION` `FieldDiscoveryStep`

- **Line:** 615

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ onNext, onBack, isSaving, onOpenLogOutcome, onOpenLogNote, onOpenRevisitDialog, onMoveToOutbound }` | `{ onNext: () => void; onBack: () => void; isSaving?: boolean; onOpenLogOutcome: () => void; onOpenLogNote: () => void; onOpenRevisitDialog: () => void; onMoveToOutbound: () => void; }` | **Yes** | - | - |

---

### `VARIABLE` `isSelected`

- **Line:** 630

---

### `VARIABLE` `newValue`

- **Line:** 638

---

### `FUNCTION` `FinishStep`

- **Line:** 716

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ onBack, lead, onOpenScheduleAppointment, onOpenLogOutcome, onOpenRevisitDialog, onMoveToOutbound, onOpenServiceDialog, onOpenLocalMileDialog, onOpenShipMateDialog }` | `{ onBack: () => void; lead: Lead; onOpenScheduleAppointment: () => void; onOpenLogOutcome: () => void; onOpenRevisitDialog: () => void; onMoveToOutbound: () => void; onOpenServiceDialog: (mode: 'Free Trial' | 'Signup') => void; onOpenLocalMileDialog: () => void; onOpenShipMateDialog: () => void; }` | **Yes** | - | - |

---

### `VARIABLE` `router`

- **Line:** 717

---

### `VARIABLE` `isScfAccepted`

- **Line:** 718

---

### `FUNCTION` `NearbyCustomersDialog`

- **Line:** 773

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ isOpen, onOpenChange, customers }` | `{ isOpen: boolean, onOpenChange: (open: boolean) => void, customers: Lead[] }` | **Yes** | - | - |

---

