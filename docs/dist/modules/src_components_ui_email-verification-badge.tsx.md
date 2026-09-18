# Module: `src/components/ui/email-verification-badge.tsx`

- **Language:** TypeScript
- **Total Lines:** 172
- **Direct Dependencies:** 6 modules imported

## Exported Symbols & API

### `INTERFACE` `EmailVerificationBadgeProps`

- **Line:** 15

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `status` | `EmailVerificationStatus` | Yes | - |
| `score` | `number` | Yes | - |
| `verifiedAt` | `string` | Yes | - |
| `onVerify` | `() => void` | Yes | - |
| `loading` | `boolean` | Yes | - |
| `size` | `'sm' | 'default'` | Yes | - |
| `showVerifyButton` | `boolean` | Yes | - |

---

### `FUNCTION` `EmailVerificationBadge`

- **Line:** 25
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{
  status,
  score,
  verifiedAt,
  onVerify,
  loading = false,
  size = 'default',
  showVerifyButton = true,
}` | `EmailVerificationBadgeProps` | **Yes** | - | - |

---

### `VARIABLE` `badgeConfig`

- **Line:** 85

---

### `VARIABLE` `dateFormatted`

- **Line:** 115

---

