# Module: `src/services/sms-service.ts`

- **Language:** TypeScript
- **Total Lines:** 89

## Exported Symbols & API

### `VARIABLE` `MAILPLUS_SMS_API_URL`

> Service for sending SMS messages via the MailPlus Driver SMS API.

- **Line:** 7

---

### `FUNCTION` `formatAustralianMobile`

> Normalizes an Australian mobile number to international format (+61...)
Handles spaces, typical prefixes (04, +61, 61), and non-numeric characters.

- **Line:** 13
- **Async:** Yes
- **Returns:** `Promise<string | null>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `phone` | `string` | **Yes** | - | - |

---

### `VARIABLE` `cleaned`

- **Line:** 17

---

### `FUNCTION` `sendSms`

> Sends an SMS using the MailPlus Driver API.

- **Line:** 41
- **Async:** Yes
- **Returns:** `Promise<{ success: boolean; message?: string }>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `phone` | `string` | **Yes** | - | - |
| `text` | `string` | **Yes** | - | - |
| `senderRole` | `string` | No | - | - |

---

### `VARIABLE` `formattedPhone`

- **Line:** 46

---

### `VARIABLE` `apiKey`

- **Line:** 56

---

### `VARIABLE` `response`

- **Line:** 63

---

### `VARIABLE` `errorText`

- **Line:** 76

---

### `VARIABLE` `data`

- **Line:** 81

---

