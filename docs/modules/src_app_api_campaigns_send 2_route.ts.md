# Module: `src/app/api/campaigns/send 2/route.ts`

- **Language:** TypeScript
- **Total Lines:** 244
- **Direct Dependencies:** 3 modules imported

## Exported Symbols & API

### `VARIABLE` `db`

- **Line:** 5

---

### `FUNCTION` `POST`

- **Line:** 7
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `request` | `Request` | **Yes** | - | - |

---

### `VARIABLE` `body`

- **Line:** 9

---

### `VARIABLE` `urlObj`

- **Line:** 19

---

### `VARIABLE` `baseUrl`

- **Line:** 20

---

### `VARIABLE` `campaignRef`

- **Line:** 26

---

### `VARIABLE` `campaignDoc`

- **Line:** 27

---

### `VARIABLE` `campaignData`

- **Line:** 36

---

### `VARIABLE` `templateId`

- **Line:** 48

---

### `VARIABLE` `templateDoc`

- **Line:** 49

---

### `VARIABLE` `templateData`

- **Line:** 59

---

### `VARIABLE` `templateBody`

- **Line:** 60

---

### `VARIABLE` `filters`

- **Line:** 63

---

### `VARIABLE` `leadsQuery`

- **Line:** 64
- **Signature:** `any`

---

### `VARIABLE` `leadsSnapshot`

- **Line:** 81

---

### `VARIABLE` `suppressionSnap`

- **Line:** 84

---

### `VARIABLE` `suppressedEmails`

- **Line:** 85

---

### `VARIABLE` `totalSent`

- **Line:** 87

---

### `VARIABLE` `totalDelivered`

- **Line:** 88

---

### `VARIABLE` `totalBounced`

- **Line:** 89

---

### `VARIABLE` `nowStr`

- **Line:** 91

---

### `VARIABLE` `leadId`

- **Line:** 95

---

### `VARIABLE` `leadData`

- **Line:** 96

---

### `VARIABLE` `companyName`

- **Line:** 97

---

### `VARIABLE` `salesRepAssigned`

- **Line:** 98

---

### `VARIABLE` `contactsSnap`

- **Line:** 101

---

### `VARIABLE` `recipients`

- **Line:** 102
- **Signature:** `{ email: string; name: string; contactId?: string }[]`

---

### `VARIABLE` `cData`

- **Line:** 106

---

### `VARIABLE` `email`

- **Line:** 107

---

### `VARIABLE` `name`

- **Line:** 108

---

### `VARIABLE` `email`

- **Line:** 116

---

### `VARIABLE` `emailLower`

- **Line:** 124

---

### `VARIABLE` `deliveryRef`

- **Line:** 132

---

### `VARIABLE` `deliveryId`

- **Line:** 133

---

### `VARIABLE` `compiledBody`

- **Line:** 136

---

### `VARIABLE` `wrappedBody`

- **Line:** 142

---

### `VARIABLE` `footerUnsubscribe`

- **Line:** 145

---

### `VARIABLE` `finalHtml`

- **Line:** 155

---

### `VARIABLE` `trackingPixel`

- **Line:** 158

---

### `VARIABLE` `isBounced`

- **Line:** 162

---

### `VARIABLE` `status`

- **Line:** 163

---

### `FUNCTION` `wrapLinks`

> Parses HTML body and wraps hyperlinks in tracking redirects.

- **Line:** 231
- **Returns:** `string`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `html` | `string` | **Yes** | - | - |
| `deliveryId` | `string` | **Yes** | - | - |
| `baseUrl` | `string` | **Yes** | - | - |

---

### `VARIABLE` `anchorRegex`

- **Line:** 233

---

### `VARIABLE` `trackingUrl`

- **Line:** 240

---

