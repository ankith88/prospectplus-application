# Module: `src/components/manage-services-dialog.tsx`

- **Language:** TypeScript
- **Total Lines:** 526
- **Direct Dependencies:** 15 modules imported

## Exported Symbols & API

### `INTERFACE` `ManageServicesDialogProps`

- **Line:** 27

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `isOpen` | `boolean` | No | - |
| `onOpenChange` | `(open: boolean) => void` | No | - |
| `lead` | `Lead` | No | - |
| `onSuccess` | `() => void` | No | - |

---

### `VARIABLE` `DAYS`

- **Line:** 34

---

### `FUNCTION` `ManageServicesDialog`

- **Line:** 36
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ isOpen, onOpenChange, lead, onSuccess }` | `ManageServicesDialogProps` | **Yes** | - | - |

---

### `FUNCTION` `fetchServices`

- **Line:** 52
- **Async:** Yes

---

### `VARIABLE` `q`

- **Line:** 55

---

### `VARIABLE` `snap`

- **Line:** 56

---

### `VARIABLE` `list`

- **Line:** 57

---

### `VARIABLE` `data`

- **Line:** 58

---

### `VARIABLE` `name`

- **Line:** 59

---

### `FUNCTION` `fetchPartnerLocations`

- **Line:** 77
- **Async:** Yes

---

### `VARIABLE` `snap`

- **Line:** 79

---

### `VARIABLE` `locs`

- **Line:** 80

---

### `VARIABLE` `targetId`

- **Line:** 83

---

### `VARIABLE` `targetName`

- **Line:** 84

---

### `VARIABLE` `found`

- **Line:** 87

---

### `VARIABLE` `found`

- **Line:** 93

---

### `VARIABLE` `initialServices`

- **Line:** 106

---

### `FUNCTION` `handleAddService`

- **Line:** 110

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `serviceName` | `string` | **Yes** | - | - |

---

### `VARIABLE` `matchingActive`

- **Line:** 120

---

### `VARIABLE` `defaultRate`

- **Line:** 121

---

### `VARIABLE` `newService`

- **Line:** 123
- **Signature:** `ServiceSelection`

---

### `FUNCTION` `handleRemoveService`

- **Line:** 133

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `index` | `number` | **Yes** | - | - |

---

### `VARIABLE` `updated`

- **Line:** 134

---

### `FUNCTION` `handleFrequencyChange`

- **Line:** 139

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `index` | `number` | **Yes** | - | - |
| `day` | `'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri'` | **Yes** | - | - |
| `checked` | `boolean` | **Yes** | - | - |

---

### `VARIABLE` `updated`

- **Line:** 140

---

### `VARIABLE` `service`

- **Line:** 141

---

### `VARIABLE` `currentFreq`

- **Line:** 143

---

### `VARIABLE` `dayOrder`

- **Line:** 153

---

### `FUNCTION` `handleAdhocToggle`

- **Line:** 160

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `index` | `number` | **Yes** | - | - |
| `isAdhoc` | `boolean` | **Yes** | - | - |

---

### `VARIABLE` `updated`

- **Line:** 161

---

### `VARIABLE` `service`

- **Line:** 162

---

### `FUNCTION` `handleRateChange`

- **Line:** 171

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `index` | `number` | **Yes** | - | - |
| `val` | `string` | **Yes** | - | - |

---

### `VARIABLE` `updated`

- **Line:** 172

---

### `FUNCTION` `handleStartDateChange`

- **Line:** 177

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `index` | `number` | **Yes** | - | - |
| `val` | `string` | **Yes** | - | - |

---

### `VARIABLE` `updated`

- **Line:** 178

---

### `FUNCTION` `handleSave`

- **Line:** 183
- **Async:** Yes

---

### `VARIABLE` `bankLocId`

- **Line:** 207

---

### `VARIABLE` `bankLocName`

- **Line:** 208

---

### `VARIABLE` `unconfiguredActive`

- **Line:** 260

---

### `VARIABLE` `isAdhoc`

- **Line:** 318

---

### `VARIABLE` `freqList`

- **Line:** 351

---

### `VARIABLE` `isChecked`

- **Line:** 352

---

### `VARIABLE` `stateVal`

- **Line:** 405

---

### `VARIABLE` `nearbyBanks`

- **Line:** 406

---

### `VARIABLE` `query`

- **Line:** 407

---

### `VARIABLE` `displayBanks`

- **Line:** 409

---

### `VARIABLE` `isFallback`

- **Line:** 419

---

### `VARIABLE` `allStateBanks`

- **Line:** 421

---

### `VARIABLE` `activeBankId`

- **Line:** 430

---

### `VARIABLE` `matchingBank`

- **Line:** 431

---

### `VARIABLE` `effectiveValue`

- **Line:** 439

---

### `VARIABLE` `allLocs`

- **Line:** 467

---

### `VARIABLE` `found`

- **Line:** 468

---

