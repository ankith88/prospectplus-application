# Module: `src/app/admin/brand-bot/page.tsx`

- **Language:** TypeScript
- **Total Lines:** 344
- **Direct Dependencies:** 12 modules imported

## Exported Symbols & API

### `FUNCTION` `BrandBotPage`

- **Line:** 16
- **Returns:** `void`

---

### `VARIABLE` `isAdmin`

- **Line:** 22

---

### `FUNCTION` `fetchBrandProfile`

- **Line:** 56
- **Async:** Yes

---

### `VARIABLE` `docRef`

- **Line:** 59

---

### `VARIABLE` `docSnap`

- **Line:** 60

---

### `VARIABLE` `data`

- **Line:** 63

---

### `FUNCTION` `handleSave`

- **Line:** 78
- **Async:** Yes

---

### `VARIABLE` `now`

- **Line:** 90

---

### `VARIABLE` `updatedProfile`

- **Line:** 91

---

### `FUNCTION` `updateStrategy`

- **Line:** 115

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `key` | `keyof BrandProfile['strategy']` | **Yes** | - | - |
| `value` | `any` | **Yes** | - | - |

---

### `FUNCTION` `updateVoice`

- **Line:** 125

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `key` | `keyof BrandProfile['voice']` | **Yes** | - | - |
| `value` | `any` | **Yes** | - | - |

---

### `FUNCTION` `updateDesign`

- **Line:** 135

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `key` | `keyof BrandProfile['designTokens']` | **Yes** | - | - |
| `value` | `any` | **Yes** | - | - |

---

