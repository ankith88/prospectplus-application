# Module: `src/components/marketing/campaign-analytics 2.tsx`

- **Language:** TypeScript
- **Total Lines:** 426
- **Direct Dependencies:** 8 modules imported

## Exported Symbols & API

### `INTERFACE` `DeliveryLog`

- **Line:** 12

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | No | - |
| `campaignId` | `string` | No | - |
| `leadId` | `string` | No | - |
| `leadEmail` | `string` | No | - |
| `leadName` | `string` | No | - |
| `companyName` | `string` | No | - |
| `sentAt` | `string` | No | - |
| `status` | `'delivered' | 'bounced'` | No | - |
| `bounceType` | `'hard' | 'soft' | null` | Yes | - |
| `openedAt` | `string[]` | Yes | - |
| `clickedAt` | `string[]` | Yes | - |
| `unsubscribedAt` | `string | null` | Yes | - |

---

### `INTERFACE` `Campaign`

- **Line:** 27

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | No | - |
| `name` | `string` | No | - |
| `metrics` | `{
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
    unsubscribed: number;
  }` | Yes | - |

---

### `FUNCTION` `CampaignAnalytics`

- **Line:** 40
- **Returns:** `void`

---

### `FUNCTION` `fetchAnalyticsData`

- **Line:** 52
- **Async:** Yes

---

### `VARIABLE` `dList`

- **Line:** 60

---

### `VARIABLE` `cList`

- **Line:** 66

---

### `VARIABLE` `totalSent`

- **Line:** 85

---

### `VARIABLE` `totalBounced`

- **Line:** 86

---

### `VARIABLE` `totalDelivered`

- **Line:** 87

---

### `VARIABLE` `totalOpened`

- **Line:** 88

---

### `VARIABLE` `totalClicked`

- **Line:** 89

---

### `VARIABLE` `totalUnsubscribed`

- **Line:** 90

---

### `VARIABLE` `openRate`

- **Line:** 92

---

### `VARIABLE` `clickRate`

- **Line:** 93

---

### `VARIABLE` `bounceRate`

- **Line:** 94

---

### `VARIABLE` `unsubscribeRate`

- **Line:** 95

---

### `FUNCTION` `getTimelineData`

- **Line:** 98

---

### `VARIABLE` `groups`

- **Line:** 102
- **Signature:** `{ [key: string]: { opens: number; clicks: number; sends: number } }`

---

### `VARIABLE` `day`

- **Line:** 104

---

### `FUNCTION` `getOverviewData`

- **Line:** 121

---

### `FUNCTION` `handleTriggerSimulate`

- **Line:** 133
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `type` | `'open' | 'click' | 'unsubscribe'` | **Yes** | - | - |

---

### `VARIABLE` `target`

- **Line:** 135

---

### `VARIABLE` `endpoint`

- **Line:** 147

---

### `VARIABLE` `res`

- **Line:** 156

---

### `VARIABLE` `hasOpened`

- **Line:** 365

---

### `VARIABLE` `hasClicked`

- **Line:** 366

---

