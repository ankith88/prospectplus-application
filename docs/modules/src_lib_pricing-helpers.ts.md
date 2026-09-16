# Module: `src/lib/pricing-helpers.ts`

- **Language:** TypeScript
- **Total Lines:** 117
- **Direct Dependencies:** 2 modules imported

## Exported Symbols & API

### `VARIABLE` `PREMIUM_PLANS`

- **Line:** 4

---

### `VARIABLE` `EXPRESS_PLANS`

- **Line:** 8

---

### `VARIABLE` `DEFAULT_PREMIUM_PRICING`

- **Line:** 12
- **Signature:** `PricingTableRow[]`

---

### `VARIABLE` `DEFAULT_EXPRESS_PRICING`

- **Line:** 25
- **Signature:** `PricingTableRow[]`

---

### `FUNCTION` `generatePricingTable`

- **Line:** 38
- **Returns:** `PricingTableRow[]`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `premiumPlan` | `string` | **Yes** | - | - |
| `expressPlan` | `string` | **Yes** | - | - |

---

### `VARIABLE` `table`

- **Line:** 39
- **Signature:** `PricingTableRow[]`

---

### `FUNCTION` `parseLodgementPoints`

- **Line:** 51
- **Returns:** `any[]`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `points` | `any[] | string | undefined | null` | **Yes** | - | - |

---

### `FUNCTION` `generateSuburbMapping`

- **Line:** 55
- **Returns:** `LeadSuburbMapping[]`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `lead` | `Lead` | **Yes** | - | - |
| `franchisee` | `Franchisee | null` | **Yes** | - | - |

---

### `VARIABLE` `postcode`

- **Line:** 58

---

### `VARIABLE` `suburb`

- **Line:** 59

---

### `VARIABLE` `state`

- **Line:** 60

---

### `VARIABLE` `customer_ns_id`

- **Line:** 61

---

### `VARIABLE` `couriers`

- **Line:** 63

---

### `VARIABLE` `starTrackPts`

- **Line:** 66

---

### `VARIABLE` `mpExpressPts`

- **Line:** 67

---

### `FUNCTION` `findMatch`

- **Line:** 70

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `pts` | `any` | **Yes** | - | - |

---

### `VARIABLE` `premiumMatch`

- **Line:** 78

---

### `VARIABLE` `expressMatch`

- **Line:** 79

---

### `VARIABLE` `isPremiumCourier`

- **Line:** 83

---

### `VARIABLE` `match`

- **Line:** 84

---

### `VARIABLE` `depot_id`

- **Line:** 87

---

### `VARIABLE` `drivers`

- **Line:** 90
- **Signature:** `{ ns_id: string; is_primary: boolean }[]`

---

### `VARIABLE` `opId`

- **Line:** 92

---

