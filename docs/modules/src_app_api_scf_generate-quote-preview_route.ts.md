# Module: `src/app/api/scf/generate-quote-preview/route.ts`

- **Language:** TypeScript
- **Total Lines:** 296
- **Direct Dependencies:** 4 modules imported

## Exported Symbols & API

### `VARIABLE` `db`

- **Line:** 6

---

### `FUNCTION` `POST`

- **Line:** 8
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `request` | `Request` | **Yes** | - | - |

---

### `VARIABLE` `body`

- **Line:** 10

---

### `VARIABLE` `colName`

- **Line:** 18
- **Signature:** `'companies' | 'leads'`

---

### `VARIABLE` `leadSnap`

- **Line:** 19

---

### `VARIABLE` `contactIds`

- **Line:** 30

---

### `VARIABLE` `contactsData`

- **Line:** 31

---

### `VARIABLE` `trimmedId`

- **Line:** 33

---

### `VARIABLE` `contactSnap`

- **Line:** 35

---

### `VARIABLE` `altCol`

- **Line:** 37

---

### `VARIABLE` `contactEmails`

- **Line:** 49

---

### `VARIABLE` `contactName`

- **Line:** 50

---

### `VARIABLE` `contactFirstName`

- **Line:** 51

---

### `VARIABLE` `contactEmail`

- **Line:** 56

---

### `VARIABLE` `leadData`

- **Line:** 58

---

### `VARIABLE` `companyName`

- **Line:** 59

---

### `VARIABLE` `salesRepName`

- **Line:** 60

---

### `VARIABLE` `franchiseeName`

- **Line:** 61

---

### `VARIABLE` `brandSnap`

- **Line:** 64

---

### `VARIABLE` `brandData`

- **Line:** 65

---

### `VARIABLE` `primaryColor`

- **Line:** 66

---

### `VARIABLE` `fontFamily`

- **Line:** 67

---

### `VARIABLE` `logoUrl`

- **Line:** 68

---

### `VARIABLE` `templatesSnap`

- **Line:** 71

---

### `VARIABLE` `templateHtml`

- **Line:** 72

---

### `VARIABLE` `templateSubject`

- **Line:** 73

---

### `VARIABLE` `templateData`

- **Line:** 76

---

### `VARIABLE` `serviceDetailsHtml`

- **Line:** 99

---

### `VARIABLE` `freqStr`

- **Line:** 112

---

### `VARIABLE` `productsDetailsHtml`

- **Line:** 125

---

### `VARIABLE` `hasProducts`

- **Line:** 126

---

### `VARIABLE` `hasServices`

- **Line:** 127

---

### `VARIABLE` `surchargeRates`

- **Line:** 145

---

### `VARIABLE` `snap`

- **Line:** 147

---

### `VARIABLE` `sData`

- **Line:** 149

---

### `VARIABLE` `EXCLUDED_PRODUCTS`

- **Line:** 157

---

### `VARIABLE` `basePrice`

- **Line:** 166

---

### `VARIABLE` `speed`

- **Line:** 167

---

### `VARIABLE` `surchargePerc`

- **Line:** 168

---

### `VARIABLE` `surchargeAmt`

- **Line:** 169

---

### `VARIABLE` `total`

- **Line:** 170

---

### `VARIABLE` `surchargeText`

- **Line:** 172

---

### `VARIABLE` `combinedDetailsHtml`

- **Line:** 188

---

### `VARIABLE` `amMobile`

- **Line:** 203

---

### `VARIABLE` `amCalendly`

- **Line:** 204

---

### `VARIABLE` `usersSnap`

- **Line:** 206

---

### `VARIABLE` `targetRep`

- **Line:** 207

---

### `VARIABLE` `matchedUser`

- **Line:** 208

---

### `VARIABLE` `d`

- **Line:** 209

---

### `VARIABLE` `fullName`

- **Line:** 210

---

### `VARIABLE` `dispName`

- **Line:** 211

---

### `VARIABLE` `name`

- **Line:** 212

---

### `VARIABLE` `email`

- **Line:** 213

---

### `VARIABLE` `d`

- **Line:** 217

---

### `VARIABLE` `serviceNames`

- **Line:** 260

---

### `VARIABLE` `serviceFrequencies`

- **Line:** 261

---

### `VARIABLE` `serviceRates`

- **Line:** 262

---

### `VARIABLE` `plainList`

- **Line:** 275

---

