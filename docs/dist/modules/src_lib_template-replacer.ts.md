# Module: `src/lib/template-replacer.ts`

- **Language:** TypeScript
- **Total Lines:** 359

## Exported Symbols & API

### `INTERFACE` `AccountManagerInfo`

- **Line:** 1

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `name` | `string` | Yes | - |
| `mobile` | `string` | Yes | - |
| `email` | `string` | Yes | - |
| `calendly` | `string` | Yes | - |

---

### `INTERFACE` `FranchiseeInfo`

- **Line:** 8

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `name` | `string` | Yes | - |
| `mainContact` | `string` | Yes | - |
| `email` | `string` | Yes | - |
| `mobile` | `string` | Yes | - |

---

### `INTERFACE` `TemplateReplacementContext`

- **Line:** 15

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `lead` | `any` | Yes | - |
| `contact` | `any` | Yes | - |
| `accountManager` | `AccountManagerInfo` | Yes | - |
| `salesRep` | `string` | Yes | - |
| `franchisee` | `FranchiseeInfo` | Yes | - |
| `senderEmail` | `string` | Yes | - |
| `scheduledServiceDate` | `string` | Yes | - |
| `customLinks` | `{
    bookingUrlId?: string;
    generalBookingUrlId?: string;
    scfLink?: string;
    sofLink?: string;
    localMileLink?: string;
    localMileActivationLink?: string;
    localMileSecurityCode?: string;
    acceptUrl?: string;
    trialsRemaining?: number | string;
    ticketNumber?: string;
    trackingIdentifier?: string;
    packageCode?: string;
    connoteNumber?: string;
    receiverName?: string;
    receiverCompanyName?: string;
    receiverAddress?: string;
  }` | Yes | - |

---

### `FUNCTION` `formatMobileForDisplay`

- **Line:** 43
- **Returns:** `string`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `phone` | `string | null | undefined` | **Yes** | - | - |

---

### `VARIABLE` `trimmed`

- **Line:** 45

---

### `VARIABLE` `cleaned`

- **Line:** 49

---

### `FUNCTION` `extractUserMobile`

- **Line:** 71
- **Returns:** `string`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `user` | `any` | **Yes** | - | - |

---

### `VARIABLE` `raw`

- **Line:** 73

---

### `FUNCTION` `replaceTemplatePlaceholders`

> Replaces all placeholders in an email template or subject string.
Handles URL-encoded braces (%7B%7B / %7D%7D) created by rich-text editors inside href attributes,
prevents duplicate https:// prefixes in links, and provides fallbacks for missing data.

- **Line:** 91
- **Returns:** `string`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `templateText` | `string` | **Yes** | - | - |
| `context` | `TemplateReplacementContext` | **Yes** | - | - |

---

### `VARIABLE` `content`

- **Line:** 97

---

### `VARIABLE` `lead`

- **Line:** 105

---

### `VARIABLE` `contact`

- **Line:** 106

---

### `VARIABLE` `am`

- **Line:** 107

---

### `VARIABLE` `franchisee`

- **Line:** 108

---

### `VARIABLE` `links`

- **Line:** 109

---

### `VARIABLE` `contactName`

- **Line:** 112

---

### `VARIABLE` `contactFirstName`

- **Line:** 119

---

### `VARIABLE` `contactEmail`

- **Line:** 120

---

### `VARIABLE` `contactPhone`

- **Line:** 121

---

### `VARIABLE` `companyName`

- **Line:** 124

---

### `VARIABLE` `amName`

- **Line:** 127

---

### `VARIABLE` `rawAmMobile`

- **Line:** 128

---

### `VARIABLE` `amMobile`

- **Line:** 129

---

### `VARIABLE` `amEmail`

- **Line:** 130

---

### `VARIABLE` `amCalendly`

- **Line:** 131

---

### `VARIABLE` `salesRepName`

- **Line:** 134

---

### `VARIABLE` `leadCity`

- **Line:** 137

---

### `VARIABLE` `bookingId`

- **Line:** 140

---

### `VARIABLE` `generalBookingLink`

- **Line:** 141

---

### `VARIABLE` `contactBookingId`

- **Line:** 143

---

### `VARIABLE` `contactBookingLink`

- **Line:** 144

---

### `VARIABLE` `scfLink`

- **Line:** 147

---

### `VARIABLE` `sofLink`

- **Line:** 148

---

### `VARIABLE` `localMileLink`

- **Line:** 151

---

### `VARIABLE` `localMileActivationLink`

- **Line:** 152

---

### `VARIABLE` `localMileSecurityCode`

- **Line:** 153

---

### `VARIABLE` `trialsRemainingStr`

- **Line:** 156

---

### `VARIABLE` `franName`

- **Line:** 164

---

### `VARIABLE` `franMainContact`

- **Line:** 165

---

### `VARIABLE` `franEmail`

- **Line:** 166

---

### `VARIABLE` `rawFranMobile`

- **Line:** 167

---

### `VARIABLE` `franMobile`

- **Line:** 168

---

### `VARIABLE` `prospectPlusId`

- **Line:** 171

---

### `VARIABLE` `receiverName`

- **Line:** 174

---

### `VARIABLE` `receiverCompanyName`

- **Line:** 175

---

### `VARIABLE` `receiverAddress`

- **Line:** 176

---

### `VARIABLE` `ticketNumber`

- **Line:** 177

---

### `VARIABLE` `trackingId`

- **Line:** 178

---

### `VARIABLE` `packageCode`

- **Line:** 179

---

### `VARIABLE` `connoteNumber`

- **Line:** 180

---

### `VARIABLE` `acceptUrl`

- **Line:** 181

---

### `VARIABLE` `scheduledServiceDate`

- **Line:** 182

---

### `VARIABLE` `senderEmail`

- **Line:** 183

---

### `FUNCTION` `replaceUrlPlaceholder`

- **Line:** 186
- **Returns:** `string`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `str` | `string` | **Yes** | - | - |
| `patterns` | `RegExp[]` | **Yes** | - | - |
| `replacementUrl` | `string` | **Yes** | - | - |

---

### `VARIABLE` `httpPattern`

- **Line:** 194

---

