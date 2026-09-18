# Module: `src/components/bucket-breakdown-bar.tsx`

- **Language:** TypeScript
- **Total Lines:** 155
- **Direct Dependencies:** 5 modules imported

## Exported Symbols & API

### `FUNCTION` `LeadBucketBadge`

- **Line:** 7
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ bucket, className }` | `{ bucket?: string | null; className?: string }` | **Yes** | - | - |

---

### `VARIABLE` `normalized`

- **Line:** 8

---

### `VARIABLE` `label`

- **Line:** 9

---

### `VARIABLE` `badgeStyle`

- **Line:** 10

---

### `INTERFACE` `BucketBreakdownBarProps`

- **Line:** 76

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `items` | `T[]` | No | - |
| `selectedBucket` | `string | null` | No | - |
| `onSelectBucket` | `(bucket: string | null) => void` | No | - |
| `getBucket` | `(item: T) => string` | Yes | - |
| `className` | `string` | Yes | - |
| `title` | `string` | Yes | - |
| `unitLabel` | `string` | Yes | - |

---

### `FUNCTION` `BucketBreakdownBar`

- **Line:** 86
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{
  items,
  selectedBucket,
  onSelectBucket,
  getBucket = (item: any) => item.bucket || item.leadBucket || (item.fieldSales ? 'field_sales' : 'outbound'),
  className,
  title = "Bucket Breakdown",
  unitLabel = "lead",
}` | `BucketBreakdownBarProps<T>` | **Yes** | - | - |

---

### `VARIABLE` `bucketBreakdown`

- **Line:** 95

---

### `VARIABLE` `counts`

- **Line:** 97
- **Signature:** `Record<string, number>`

---

### `VARIABLE` `rawBucket`

- **Line:** 99

---

### `VARIABLE` `b`

- **Line:** 100

---

### `VARIABLE` `isSelected`

- **Line:** 130

---

### `VARIABLE` `percentage`

- **Line:** 131

---

