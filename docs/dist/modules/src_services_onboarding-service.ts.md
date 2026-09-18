# Module: `src/services/onboarding-service.ts`

- **Language:** TypeScript
- **Total Lines:** 302
- **Direct Dependencies:** 4 modules imported

## Exported Symbols & API

### `VARIABLE` `DEFAULT_LIAM_UID`

- **Line:** 23

---

### `VARIABLE` `DEFAULT_LIAM_NAME`

- **Line:** 24

---

### `INTERFACE` `CreateOnboardingRequestPayload`

- **Line:** 26

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `leadId` | `string` | No | - |
| `companyId` | `string` | Yes | - |
| `companyName` | `string` | No | - |
| `contactName` | `string` | No | - |
| `contactEmail` | `string` | Yes | - |
| `contactPhone` | `string` | Yes | - |
| `requestedByUid` | `string` | No | - |
| `requestedByName` | `string` | No | - |
| `priority` | `OnboardingRequestPriority` | Yes | - |
| `assignedToUid` | `string` | Yes | - |
| `assignedToName` | `string` | Yes | - |
| `preferredTimeframe` | `string` | Yes | - |
| `notes` | `string` | Yes | - |
| `isLpoPlus` | `boolean` | Yes | - |

---

### `FUNCTION` `sanitize`

- **Line:** 43

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `data` | `any` | **Yes** | - | - |

---

### `VARIABLE` `sanitized`

- **Line:** 44

---

### `FUNCTION` `createOnboardingRequest`

> Creates a new onboarding request doc in Firestore collection `onboardingRequests`

- **Line:** 56
- **Async:** Yes
- **Returns:** `Promise<string>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `payload` | `CreateOnboardingRequestPayload` | **Yes** | - | - |

---

### `VARIABLE` `now`

- **Line:** 57

---

### `VARIABLE` `requestData`

- **Line:** 59

---

### `VARIABLE` `docRef`

- **Line:** 80

---

### `FUNCTION` `getOnboardingRequests`

> Fetches all onboarding requests from Firestore

- **Line:** 124
- **Async:** Yes
- **Returns:** `Promise<OnboardingRequest[]>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `options` | `{
  assignedToUid?: string;
  status?: OnboardingRequestStatus;
  leadId?: string;
}` | No | - | - |

---

### `VARIABLE` `q`

- **Line:** 130

---

### `VARIABLE` `snap`

- **Line:** 136

---

### `VARIABLE` `results`

- **Line:** 137
- **Signature:** `OnboardingRequest[]`

---

### `VARIABLE` `filtered`

- **Line:** 143

---

### `FUNCTION` `getOnboardingRequestByLeadId`

> Gets active onboarding request for a specific lead / company if any exists

- **Line:** 161
- **Async:** Yes
- **Returns:** `Promise<OnboardingRequest | null>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |

---

### `VARIABLE` `q`

- **Line:** 163

---

### `VARIABLE` `snap`

- **Line:** 164

---

### `VARIABLE` `docs`

- **Line:** 168

---

### `FUNCTION` `bookOnboardingAppointment`

> Organises/books an onboarding appointment for a request

- **Line:** 180
- **Async:** Yes
- **Returns:** `Promise<void>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `requestId` | `string` | **Yes** | - | - |
| `appointment` | `{
    appointmentDate: string;
    appointmentType?: string;
    locationOrLink?: string;
    notes?: string;
    scheduledByUid: string;
    scheduledByName: string;
  }` | **Yes** | - | - |

---

### `VARIABLE` `now`

- **Line:** 191

---

### `VARIABLE` `reqRef`

- **Line:** 192

---

### `VARIABLE` `snap`

- **Line:** 193

---

### `VARIABLE` `reqData`

- **Line:** 199

---

### `VARIABLE` `appointmentDetails`

- **Line:** 201
- **Signature:** `OnboardingAppointmentDetails`

---

### `FUNCTION` `updateOnboardingRequestStatus`

> Updates status of an onboarding request (e.g. Mark Completed, Cancel)

- **Line:** 233
- **Async:** Yes
- **Returns:** `Promise<void>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `requestId` | `string` | **Yes** | - | - |
| `status` | `OnboardingRequestStatus` | **Yes** | - | - |
| `metadata` | `{
    userUid: string;
    userName: string;
    reason?: string;
  }` | No | - | - |

---

### `VARIABLE` `now`

- **Line:** 242

---

### `VARIABLE` `reqRef`

- **Line:** 243

---

### `VARIABLE` `updatePayload`

- **Line:** 245
- **Signature:** `any`

---

### `FUNCTION` `reassignOnboardingRequest`

> Reassigns an onboarding request to another CS team member

- **Line:** 265
- **Async:** Yes
- **Returns:** `Promise<void>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `requestId` | `string` | **Yes** | - | - |
| `assignedToUid` | `string` | **Yes** | - | - |
| `assignedToName` | `string` | **Yes** | - | - |

---

### `VARIABLE` `now`

- **Line:** 270

---

### `VARIABLE` `reqRef`

- **Line:** 271

---

### `FUNCTION` `calculateOnboardingMetrics`

> Calculates top reporting metrics summary from onboarding requests

- **Line:** 282
- **Returns:** `OnboardingMetricsSummary`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `requests` | `OnboardingRequest[]` | **Yes** | - | - |

---

### `VARIABLE` `totalRequests`

- **Line:** 283

---

### `VARIABLE` `pendingCount`

- **Line:** 284

---

### `VARIABLE` `bookedCount`

- **Line:** 285

---

### `VARIABLE` `completedCount`

- **Line:** 286

---

### `VARIABLE` `cancelledCount`

- **Line:** 287

---

### `VARIABLE` `bookingRatePercentage`

- **Line:** 289

---

