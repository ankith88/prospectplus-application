# Module: `src/lib/welcome-email-template.ts`

- **Language:** TypeScript
- **Total Lines:** 135

## Exported Symbols & API

### `INTERFACE` `WelcomeEmailOptions`

- **Line:** 1

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `recipientName` | `string` | No | - |
| `email` | `string` | No | - |
| `password` | `string` | Yes | - |
| `signInLink` | `string` | Yes | - |
| `isPasswordReset` | `boolean` | Yes | - |

---

### `FUNCTION` `generateWelcomeEmailHtml`

- **Line:** 9
- **Returns:** `string`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{
  recipientName,
  email,
  password,
  signInLink = 'https://prospectplus.mailplus.com.au/signin',
  isPasswordReset = false,
}` | `WelcomeEmailOptions` | **Yes** | - | - |

---

### `VARIABLE` `cleanEmail`

- **Line:** 16

---

### `VARIABLE` `displayPassword`

- **Line:** 17

---

### `VARIABLE` `name`

- **Line:** 18

---

### `VARIABLE` `emailSubject`

- **Line:** 20

---

### `VARIABLE` `emailHeading`

- **Line:** 24

---

### `VARIABLE` `emailIntroText`

- **Line:** 28

---

### `VARIABLE` `credentialsBoxTitle`

- **Line:** 32

---

### `VARIABLE` `passwordLabel`

- **Line:** 36

---

### `VARIABLE` `emailFooterNotice`

- **Line:** 38

---

