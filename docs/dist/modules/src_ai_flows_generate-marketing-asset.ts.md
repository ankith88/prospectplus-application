# Module: `src/ai/flows/generate-marketing-asset.ts`

- **Language:** TypeScript
- **Total Lines:** 106
- **Direct Dependencies:** 4 modules imported

## Exported Symbols & API

### `VARIABLE` `GenerateMarketingAssetInputSchema`

- **Line:** 8

---

### `TYPE` `GenerateMarketingAssetInput`

- **Line:** 15
- **Signature:** `z.infer<typeof GenerateMarketingAssetInputSchema>`

---

### `VARIABLE` `GenerateMarketingAssetOutputSchema`

- **Line:** 17

---

### `TYPE` `GenerateMarketingAssetOutput`

- **Line:** 23
- **Signature:** `z.infer<typeof GenerateMarketingAssetOutputSchema>`

---

### `VARIABLE` `prompt`

- **Line:** 25

---

### `VARIABLE` `generateMarketingAssetFlow`

- **Line:** 70

---

### `VARIABLE` `brandProfile`

- **Line:** 78
- **Signature:** `BrandProfile | null`

---

### `VARIABLE` `docSnap`

- **Line:** 80

---

### `FUNCTION` `generateMarketingAsset`

- **Line:** 101
- **Async:** Yes
- **Returns:** `Promise<GenerateMarketingAssetOutput>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `input` | `GenerateMarketingAssetInput` | **Yes** | - | - |

---

