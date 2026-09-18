# Module: `src/app/localmile-registration/[token]/page.tsx`

- **Language:** TypeScript
- **Total Lines:** 652
- **Direct Dependencies:** 11 modules imported

## Exported Symbols & API

### `INTERFACE` `Contact`

- **Line:** 15

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | No | - |
| `name` | `string` | No | - |
| `email` | `string` | No | - |
| `phone` | `string` | No | - |
| `isPrimary` | `boolean` | No | - |
| `accessToLocalMile` | `string` | Yes | - |

---

### `INTERFACE` `Address`

- **Line:** 24

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `street` | `string` | Yes | - |
| `city` | `string` | Yes | - |
| `state` | `string` | Yes | - |
| `zip` | `string` | Yes | - |
| `country` | `string` | Yes | - |

---

### `FUNCTION` `PublicLocalMileRegistrationPage`

- **Line:** 32
- **Returns:** `void`

---

### `VARIABLE` `params`

- **Line:** 33

---

### `VARIABLE` `token`

- **Line:** 34

---

### `FUNCTION` `loadData`

- **Line:** 66
- **Async:** Yes
- **Returns:** `void`

---

### `VARIABLE` `res`

- **Line:** 69

---

### `VARIABLE` `data`

- **Line:** 70

---

### `VARIABLE` `primary`

- **Line:** 85

---

### `VARIABLE` `firstAvailable`

- **Line:** 86

---

### `FUNCTION` `validateEmail`

- **Line:** 104

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `emailStr` | `string` | **Yes** | - | - |

---

### `FUNCTION` `handleRegister`

- **Line:** 108
- **Async:** Yes

---

### `VARIABLE` `selectedContact`

- **Line:** 120

---

### `VARIABLE` `normalizedEmail`

- **Line:** 136

---

### `VARIABLE` `existingWithAccess`

- **Line:** 137

---

### `VARIABLE` `res`

- **Line:** 146

---

### `VARIABLE` `data`

- **Line:** 162

---

### `FUNCTION` `formatAddress`

- **Line:** 178

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `addr` | `Address` | **Yes** | - | - |

---

### `VARIABLE` `parts`

- **Line:** 179

---

### `VARIABLE` `hasAccess`

- **Line:** 391

---

### `FUNCTION` `Loader2`

- **Line:** 593
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ className, ...props }` | `React.ComponentProps<'svg'>` | **Yes** | - | - |

---

### `FUNCTION` `Star`

- **Line:** 613
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `props` | `any` | **Yes** | - | - |

---

### `FUNCTION` `HelpCircle`

- **Line:** 632
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `props` | `any` | **Yes** | - | - |

---

