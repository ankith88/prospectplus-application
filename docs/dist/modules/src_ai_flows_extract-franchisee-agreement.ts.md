# Module: `src/ai/flows/extract-franchisee-agreement.ts`

- **Language:** TypeScript
- **Total Lines:** 113
- **Direct Dependencies:** 2 modules imported

## Overview
@fileOverview Genkit AI flow to scrape and extract key information from Franchisee Agreement PDFs.

## Exported Symbols & API

### `VARIABLE` `ExtractFranchiseeAgreementInputSchema`

- **Line:** 7

---

### `TYPE` `ExtractFranchiseeAgreementInput`

- **Line:** 11
- **Signature:** `z.infer<typeof ExtractFranchiseeAgreementInputSchema>`

---

### `VARIABLE` `GuarantorDetailSchema`

- **Line:** 13

---

### `VARIABLE` `ManagerDetailSchema`

- **Line:** 19

---

### `VARIABLE` `ExtractFranchiseeAgreementOutputSchema`

- **Line:** 25

---

### `TYPE` `ExtractFranchiseeAgreementOutput`

- **Line:** 56
- **Signature:** `z.infer<typeof ExtractFranchiseeAgreementOutputSchema>`

---

### `VARIABLE` `extractFranchiseeAgreementPrompt`

- **Line:** 58

---

### `VARIABLE` `extractFranchiseeAgreementFlow`

- **Line:** 90

---

### `FUNCTION` `extractFranchiseeAgreement`

- **Line:** 108
- **Async:** Yes
- **Returns:** `Promise<ExtractFranchiseeAgreementOutput>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `input` | `ExtractFranchiseeAgreementInput` | **Yes** | - | - |

---

