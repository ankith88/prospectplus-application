# Module: `src/lib/lodgement-helpers.ts`

- **Language:** TypeScript
- **Total Lines:** 179

## Exported Symbols & API

### `INTERFACE` `LodgementPoint`

- **Line:** 1

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `depotId` | `string` | No | - |
| `ncl_id` | `string` | Yes | - |
| `name` | `string` | No | - |
| `ncl_name` | `string` | Yes | - |
| `suburb` | `string` | No | - |
| `postcode` | `string` | No | - |
| `state` | `string` | No | - |
| `address` | `string` | Yes | - |
| `operators` | `string[]` | No | - |
| `op_primary_id` | `string[]` | Yes | - |
| `operatorId` | `string` | Yes | - |
| `matchedLocation` | `any` | Yes | - |

---

### `FUNCTION` `parseAndEnrichLodgementPoints`

> Robustly parses lodgement points (which may be JSON strings, objects, or arrays)
and enriches them with Partner Location details (matched by ncl_name, e.g. 'Kennards - Moore Park', or depotId/ncl_id)
and Operator names (matched by op_primary_id against operators collection).

- **Line:** 21
- **Returns:** `LodgementPoint[]`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `pts` | `any` | **Yes** | - | - |
| `partnerLocations` | `any[]` | No | `[]` | - |
| `operatorsList` | `any[]` | No | `[]` | - |

---

### `VARIABLE` `parsed`

- **Line:** 28
- **Signature:** `any`

---

### `VARIABLE` `trimmed`

- **Line:** 32

---

### `VARIABLE` `arrayData`

- **Line:** 45
- **Signature:** `any[]`

---

### `VARIABLE` `values`

- **Line:** 54

---

### `VARIABLE` `locationByNameMap`

- **Line:** 63

---

### `VARIABLE` `locationByIdMap`

- **Line:** 64

---

### `VARIABLE` `id`

- **Line:** 73

---

### `VARIABLE` `operatorMap`

- **Line:** 80

---

### `VARIABLE` `fullName`

- **Line:** 82

---

### `VARIABLE` `rawNclId`

- **Line:** 106

---

### `VARIABLE` `rawNclName`

- **Line:** 107

---

### `VARIABLE` `matchedLocation`

- **Line:** 111

---

### `VARIABLE` `name`

- **Line:** 115

---

### `VARIABLE` `suburb`

- **Line:** 116

---

### `VARIABLE` `postcode`

- **Line:** 117

---

### `VARIABLE` `state`

- **Line:** 118

---

### `VARIABLE` `address`

- **Line:** 119

---

### `VARIABLE` `parts`

- **Line:** 123

---

### `VARIABLE` `lastPart`

- **Line:** 125

---

### `VARIABLE` `statePostMatch`

- **Line:** 126

---

### `VARIABLE` `rawOpIds`

- **Line:** 138
- **Signature:** `string[]`

---

### `VARIABLE` `opRaw`

- **Line:** 139

---

### `VARIABLE` `parsedOps`

- **Line:** 144

---

### `VARIABLE` `resolvedOperatorNames`

- **Line:** 158

---

### `VARIABLE` `foundName`

- **Line:** 159

---

