# Module: `src/components/marketing/campaign-analytics.tsx`

- **Language:** TypeScript
- **Total Lines:** 552
- **Direct Dependencies:** 9 modules imported

## Exported Symbols & API

### `INTERFACE` `DeliveryLog`

- **Line:** 13

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

- **Line:** 28

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

- **Line:** 41
- **Returns:** `void`

---

### `FUNCTION` `fetchAnalyticsData`

- **Line:** 55
- **Async:** Yes

---

### `VARIABLE` `dList`

- **Line:** 64

---

### `VARIABLE` `cList`

- **Line:** 70

---

### `VARIABLE` `jList`

- **Line:** 75

---

### `VARIABLE` `filteredDeliveries`

- **Line:** 95

---

### `VARIABLE` `uniqueCompanies`

- **Line:** 103

---

### `VARIABLE` `totalSent`

- **Line:** 106

---

### `VARIABLE` `totalBounced`

- **Line:** 107

---

### `VARIABLE` `totalDelivered`

- **Line:** 108

---

### `VARIABLE` `totalOpened`

- **Line:** 109

---

### `VARIABLE` `totalClicked`

- **Line:** 110

---

### `VARIABLE` `totalUnsubscribed`

- **Line:** 111

---

### `VARIABLE` `openRate`

- **Line:** 113

---

### `VARIABLE` `clickRate`

- **Line:** 114

---

### `VARIABLE` `bounceRate`

- **Line:** 115

---

### `VARIABLE` `unsubscribeRate`

- **Line:** 116

---

### `FUNCTION` `getTimelineData`

- **Line:** 119

---

### `VARIABLE` `groups`

- **Line:** 123
- **Signature:** `{ [key: string]: { opens: number; clicks: number; sends: number } }`

---

### `VARIABLE` `day`

- **Line:** 125

---

### `FUNCTION` `getOverviewData`

- **Line:** 142

---

### `FUNCTION` `handleTriggerSimulate`

- **Line:** 154
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `type` | `'open' | 'click' | 'unsubscribe'` | **Yes** | - | - |

---

### `VARIABLE` `target`

- **Line:** 156

---

### `VARIABLE` `endpoint`

- **Line:** 168

---

### `VARIABLE` `res`

- **Line:** 177

---

### `FUNCTION` `exportToCSV`

- **Line:** 200

---

### `VARIABLE` `headers`

- **Line:** 210

---

### `VARIABLE` `rows`

- **Line:** 222

---

### `VARIABLE` `csvContent`

- **Line:** 234

---

### `VARIABLE` `blob`

- **Line:** 239

---

### `VARIABLE` `url`

- **Line:** 240

---

### `VARIABLE` `link`

- **Line:** 241

---

### `VARIABLE` `hasOpened`

- **Line:** 491

---

### `VARIABLE` `hasClicked`

- **Line:** 492

---

