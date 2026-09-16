# Module: `src/app/check-in/[leadId]/manual/page.tsx`

- **Language:** TypeScript
- **Total Lines:** 554
- **Direct Dependencies:** 32 modules imported

## Exported Symbols & API

### `VARIABLE` `checkinSchema`

- **Line:** 38

---

### `VARIABLE` `newContactSchema`

- **Line:** 50

---

### `VARIABLE` `TOTAL_STEPS`

- **Line:** 58

---

### `VARIABLE` `stepLabels`

- **Line:** 59

---

### `FUNCTION` `ResponsiveProgress`

- **Line:** 61

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ currentStep, totalSteps, labels, onStepClick }` | `{ currentStep: number; totalSteps: number; labels: string[]; onStepClick: (step: number) => void; }` | **Yes** | - | - |

---

### `VARIABLE` `step`

- **Line:** 65

---

### `VARIABLE` `isCompleted`

- **Line:** 66

---

### `VARIABLE` `isCurrent`

- **Line:** 67

---

### `FUNCTION` `ManualCheckinPage`

- **Line:** 96
- **Returns:** `void`

---

### `VARIABLE` `params`

- **Line:** 121

---

### `VARIABLE` `router`

- **Line:** 122

---

### `VARIABLE` `leadId`

- **Line:** 125

---

### `VARIABLE` `methods`

- **Line:** 127

---

### `VARIABLE` `newContactForm`

- **Line:** 131

---

### `FUNCTION` `fetchInitialData`

- **Line:** 137
- **Async:** Yes

---

### `VARIABLE` `formData`

- **Line:** 152
- **Signature:** `Partial<z.infer<typeof checkinSchema>>`

---

### `FUNCTION` `fetchUsers`

- **Line:** 179
- **Async:** Yes

---

### `VARIABLE` `users`

- **Line:** 181

---

### `FUNCTION` `handleSaveAndNext`

- **Line:** 193
- **Async:** Yes

---

### `VARIABLE` `formValues`

- **Line:** 195

---

### `VARIABLE` `questionsToSave`

- **Line:** 196
- **Signature:** `CheckinQuestion[]`

---

### `VARIABLE` `question`

- **Line:** 200

---

### `VARIABLE` `existingQuestions`

- **Line:** 219

---

### `VARIABLE` `newQuestions`

- **Line:** 220

---

### `VARIABLE` `updatedQuestions`

- **Line:** 221

---

### `FUNCTION` `handleBack`

- **Line:** 236

---

### `FUNCTION` `handleStepClick`

- **Line:** 237

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `step` | `number` | **Yes** | - | - |

---

### `FUNCTION` `handleMoveToOutbound`

- **Line:** 239
- **Async:** Yes

---

### `VARIABLE` `activeDialers`

- **Line:** 243

---

### `VARIABLE` `assignees`

- **Line:** 244

---

### `VARIABLE` `assignee`

- **Line:** 247

---

### `FUNCTION` `handleAddContact`

- **Line:** 272
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `values` | `z.infer<typeof newContactSchema>` | **Yes** | - | - |

---

### `VARIABLE` `firstName`

- **Line:** 276

---

### `VARIABLE` `lastName`

- **Line:** 277

---

### `VARIABLE` `fullName`

- **Line:** 278

---

### `VARIABLE` `payload`

- **Line:** 279

---

### `VARIABLE` `newContactId`

- **Line:** 285

---

### `VARIABLE` `newContact`

- **Line:** 286
- **Signature:** `Contact`

---

### `FUNCTION` `handleNoteLogged`

- **Line:** 297

---

### `FUNCTION` `handleRevisitScheduled`

- **Line:** 299

---

### `FUNCTION` `handleFindNearbyCustomers`

- **Line:** 304

---

### `VARIABLE` `leadLatLng`

- **Line:** 309

---

### `VARIABLE` `nearby`

- **Line:** 310

---

### `VARIABLE` `companyLatLng`

- **Line:** 312

---

### `FUNCTION` `renderStep`

- **Line:** 319

---

### `VARIABLE` `onNextAction`

- **Line:** 320

---

### `VARIABLE` `stepProps`

- **Line:** 322

---

### `FUNCTION` `StepWrapper`

- **Line:** 395

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ title, script, children, onNext, onBack, onOpenLogOutcome, onOpenLogNote, onOpenRevisitDialog, onMoveToOutbound, isSaving }` | `{ title: string, script?: string, children: React.ReactNode, onNext?: () => void; onBack?: () => void; onOpenLogOutcome: () => void; onOpenLogNote: () => void; onOpenRevisitDialog: () => void; onMoveToOutbound: () => void; isSaving?: boolean }` | **Yes** | - | - |

---

### `FUNCTION` `CompanyDetailsStep`

- **Line:** 426

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ lead, onNext, onFindNearby, isSaving, onOpenLogOutcome, onOpenLogNote, onOpenRevisitDialog, onMoveToOutbound }` | `{ lead: Lead; onNext: () => void; onFindNearby: () => void; isSaving?: boolean; onOpenLogOutcome: () => void; onOpenLogNote: () => void; onOpenRevisitDialog: () => void; onMoveToOutbound: () => void; }` | **Yes** | - | - |

---

### `FUNCTION` `ContactDetailsStep`

- **Line:** 436

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ contacts, onAddContact, form, isAddingContact, onNext, onBack, isSaving, onOpenLogOutcome, onOpenLogNote, onOpenRevisitDialog, onMoveToOutbound }` | `{ contacts: Contact[], onAddContact: (values: any) => void, form: any, isAddingContact: boolean, onNext: () => void; onBack: () => void; isSaving?: boolean; onOpenLogOutcome: () => void; onOpenLogNote: () => void; onOpenRevisitDialog: () => void; onMoveToOutbound: () => void; }` | **Yes** | - | - |

---

### `FUNCTION` `AusPostStep`

- **Line:** 449

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ onNext, onBack, isSaving, onOpenLogOutcome, onOpenLogNote, onOpenRevisitDialog, onMoveToOutbound }` | `any` | **Yes** | - | - |

---

### `VARIABLE` `auspostRelationship`

- **Line:** 451

---

### `VARIABLE` `couriers`

- **Line:** 468

---

### `FUNCTION` `OtherCouriersStep`

- **Line:** 469

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ onNext, onBack, isSaving, onOpenLogOutcome, onOpenLogNote, onOpenRevisitDialog, onMoveToOutbound }` | `any` | **Yes** | - | - |

---

### `VARIABLE` `otherCouriers`

- **Line:** 471

---

### `VARIABLE` `reasonsToLeave`

- **Line:** 487

---

### `FUNCTION` `OfficeErrandsStep`

- **Line:** 488

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ onNext, onBack, isSaving, onOpenLogOutcome, onOpenLogNote, onOpenRevisitDialog, onMoveToOutbound }` | `any` | **Yes** | - | - |

---

### `VARIABLE` `peopleLeaveOffice`

- **Line:** 490

---

### `FUNCTION` `FinishStep`

- **Line:** 505

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ onBack, lead, onOpenScheduleAppointment, onOpenLogOutcome, onOpenRevisitDialog, onMoveToOutbound }` | `{ onBack: () => void; lead: Lead; onOpenScheduleAppointment: () => void; onOpenLogOutcome: () => void; onOpenRevisitDialog: () => void; onMoveToOutbound: () => void; }` | **Yes** | - | - |

---

### `VARIABLE` `router`

- **Line:** 506

---

### `VARIABLE` `isScfAccepted`

- **Line:** 507

---

### `FUNCTION` `NearbyCustomersDialog`

- **Line:** 529

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ isOpen, onOpenChange, customers }` | `{ isOpen: boolean, onOpenChange: (open: boolean) => void, customers: Lead[] }` | **Yes** | - | - |

---

