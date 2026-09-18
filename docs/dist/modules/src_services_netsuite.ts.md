# Module: `src/services/netsuite.ts`

- **Language:** TypeScript
- **Total Lines:** 1161
- **Direct Dependencies:** 4 modules imported

## Exported Symbols & API

### `VARIABLE` `LEAD_SOURCE_ID_MAP`

- **Line:** 9
- **Signature:** `Record<string, string>`

---

### `VARIABLE` `TIMEOUT_DURATION`

- **Line:** 22

---

### `CLASS` `AbortError`

- **Line:** 24

---

### `FUNCTION` `getShorthandState`

- **Line:** 31
- **Returns:** `string`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `state` | `string` | **Yes** | - | - |

---

### `VARIABLE` `s`

- **Line:** 33

---

### `FUNCTION` `sendToNetSuite`

> Sends lead data to a mock NetSuite API endpoint for LPO referral.
In a real application, this would make an HTTP request to the actual NetSuite API.

- **Line:** 59
- **Async:** Yes
- **Returns:** `Promise<{ success: boolean; message: string }>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `lead` | `Lead` | **Yes** | - | - |

---

### `VARIABLE` `requestBody`

- **Line:** 64

---

### `INTERFACE` `NetSuiteOutcomePayload`

- **Line:** 81

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `leadId` | `string` | No | - |
| `outcome` | `string` | No | - |
| `reason` | `string` | No | - |
| `dialerAssigned` | `string` | No | - |
| `notes` | `string` | No | - |
| `salesRecordInternalId` | `string` | No | - |

---

### `FUNCTION` `sendToNetSuiteForOutcome`

> Sends a specific call outcome to a NetSuite scriptlet.

- **Line:** 95
- **Async:** Yes
- **Returns:** `Promise<{ success: boolean; message: string }>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `payload` | `NetSuiteOutcomePayload` | **Yes** | - | - |

---

### `VARIABLE` `baseUrl`

- **Line:** 98

---

### `VARIABLE` `params`

- **Line:** 99
- **Signature:** `URLSearchParams`

---

### `VARIABLE` `url`

- **Line:** 155

---

### `VARIABLE` `controller`

- **Line:** 161

---

### `VARIABLE` `timeout`

- **Line:** 162

---

### `VARIABLE` `response`

- **Line:** 166

---

### `VARIABLE` `errorBody`

- **Line:** 171

---

### `VARIABLE` `responseBody`

- **Line:** 175

---

### `INTERFACE` `NetSuiteDiscoveryPayload`

- **Line:** 189

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `leadId` | `string` | No | - |
| `discoveryData` | `DiscoveryData` | No | - |

---

### `FUNCTION` `sendDiscoveryDataToNetSuite`

> Sends discovery questions data to a NetSuite scriptlet.

- **Line:** 199
- **Async:** Yes
- **Returns:** `Promise<{ success: boolean, message: string }>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `payload` | `NetSuiteDiscoveryPayload` | **Yes** | - | - |

---

### `VARIABLE` `errorMsg`

- **Line:** 204

---

### `VARIABLE` `baseUrl`

- **Line:** 209

---

### `VARIABLE` `params`

- **Line:** 211

---

### `VARIABLE` `url`

- **Line:** 232

---

### `VARIABLE` `controller`

- **Line:** 238

---

### `VARIABLE` `timeout`

- **Line:** 239

---

### `VARIABLE` `response`

- **Line:** 243

---

### `VARIABLE` `errorBody`

- **Line:** 248

---

### `VARIABLE` `responseBody`

- **Line:** 253

---

### `INTERFACE` `NetSuiteContactPayload`

- **Line:** 268

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `leadId` | `string` | No | - |
| `contact` | `Partial<Contact>` | No | - |

---

### `FUNCTION` `sendContactToNetSuite`

> Sends contact data to a NetSuite scriptlet.

- **Line:** 278
- **Async:** Yes
- **Returns:** `Promise<{ success: boolean, message: string }>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `payload` | `NetSuiteContactPayload` | **Yes** | - | - |

---

### `VARIABLE` `errorMsg`

- **Line:** 282

---

### `VARIABLE` `baseUrl`

- **Line:** 287

---

### `VARIABLE` `name`

- **Line:** 289

---

### `VARIABLE` `nameParts`

- **Line:** 290

---

### `VARIABLE` `firstName`

- **Line:** 291

---

### `VARIABLE` `lastName`

- **Line:** 292

---

### `VARIABLE` `params`

- **Line:** 294

---

### `VARIABLE` `url`

- **Line:** 327

---

### `VARIABLE` `controller`

- **Line:** 333

---

### `VARIABLE` `timeout`

- **Line:** 334

---

### `VARIABLE` `response`

- **Line:** 338

---

### `VARIABLE` `errorBody`

- **Line:** 343

---

### `VARIABLE` `responseBody`

- **Line:** 348

---

### `INTERFACE` `NetSuiteNotePayload`

- **Line:** 362

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `leadId` | `string` | No | - |
| `noteId` | `string` | No | - |
| `author` | `string` | No | - |
| `content` | `string` | No | - |

---

### `FUNCTION` `sendNoteToNetSuite`

> Sends note data to a NetSuite scriptlet.

- **Line:** 374
- **Async:** Yes
- **Returns:** `Promise<{ success: boolean, message: string }>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `payload` | `NetSuiteNotePayload` | **Yes** | - | - |

---

### `VARIABLE` `errorMsg`

- **Line:** 378

---

### `VARIABLE` `baseUrl`

- **Line:** 383

---

### `VARIABLE` `params`

- **Line:** 384
- **Signature:** `URLSearchParams`

---

### `VARIABLE` `url`

- **Line:** 433

---

### `VARIABLE` `controller`

- **Line:** 439

---

### `VARIABLE` `timeout`

- **Line:** 440

---

### `VARIABLE` `response`

- **Line:** 444

---

### `VARIABLE` `errorBody`

- **Line:** 449

---

### `VARIABLE` `responseBody`

- **Line:** 454

---

### `INTERFACE` `NetSuiteActivityPayload`

- **Line:** 468

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `leadId` | `string` | No | - |
| `activity` | `Partial<Activity>` | No | - |

---

### `FUNCTION` `sendActivityToNetSuite`

> Sends activity data to a NetSuite scriptlet.

- **Line:** 478
- **Async:** Yes
- **Returns:** `Promise<{ success: boolean, message: string }>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `payload` | `NetSuiteActivityPayload` | **Yes** | - | - |

---

### `VARIABLE` `errorMsg`

- **Line:** 482

---

### `VARIABLE` `baseUrl`

- **Line:** 487

---

### `VARIABLE` `params`

- **Line:** 489

---

### `VARIABLE` `url`

- **Line:** 505

---

### `VARIABLE` `controller`

- **Line:** 511

---

### `VARIABLE` `timeout`

- **Line:** 512

---

### `VARIABLE` `response`

- **Line:** 516

---

### `VARIABLE` `errorBody`

- **Line:** 521

---

### `VARIABLE` `responseBody`

- **Line:** 526

---

### `INTERFACE` `NetSuiteLeadUpdatePayload`

- **Line:** 540

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `leadId` | `string` | No | - |
| `companyName` | `string` | Yes | - |
| `email` | `string` | Yes | - |
| `phone` | `string` | Yes | - |
| `website` | `string` | Yes | - |
| `industry` | `string` | Yes | - |
| `abn` | `string` | Yes | - |
| `address` | `Partial<Address>` | Yes | - |
| `franchiseeName` | `string` | Yes | - |
| `franchiseeInternalId` | `string` | Yes | - |

---

### `FUNCTION` `sendLeadUpdateToNetSuite`

> Sends updated lead details to a NetSuite scriptlet.

- **Line:** 558
- **Async:** Yes
- **Returns:** `Promise<{ success: boolean, message: string }>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `payload` | `NetSuiteLeadUpdatePayload` | **Yes** | - | - |

---

### `VARIABLE` `errorMsg`

- **Line:** 562

---

### `VARIABLE` `baseUrl`

- **Line:** 567

---

### `VARIABLE` `params`

- **Line:** 569

---

### `VARIABLE` `url`

- **Line:** 599

---

### `VARIABLE` `controller`

- **Line:** 605

---

### `VARIABLE` `timeout`

- **Line:** 606

---

### `VARIABLE` `response`

- **Line:** 610

---

### `VARIABLE` `errorBody`

- **Line:** 615

---

### `VARIABLE` `responseBody`

- **Line:** 620

---

### `INTERFACE` `NetSuiteUpdateCustomerPayload`

- **Line:** 634

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `internalId` | `string` | No | - |
| `companyName` | `string` | No | - |
| `email` | `string` | No | - |
| `phone` | `string` | No | - |
| `franchiseeId` | `string` | No | - |
| `prospectPlusId` | `string` | No | - |
| `abn` | `string` | Yes | - |

---

### `FUNCTION` `sendCompanyCustomerUpdateToNetSuite`

> Sends updated customer/company details to NetSuite Scriptlet 1900 with operation 'updateCustomer'.

- **Line:** 649
- **Async:** Yes
- **Returns:** `Promise<{ success: boolean; message: string }>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `payload` | `NetSuiteUpdateCustomerPayload` | **Yes** | - | - |

---

### `VARIABLE` `errorMsg`

- **Line:** 653

---

### `VARIABLE` `baseUrl`

- **Line:** 658

---

### `VARIABLE` `requestData`

- **Line:** 660

---

### `VARIABLE` `url`

- **Line:** 673

---

### `VARIABLE` `controller`

- **Line:** 680

---

### `VARIABLE` `timeout`

- **Line:** 681

---

### `VARIABLE` `response`

- **Line:** 685

---

### `VARIABLE` `errorBody`

- **Line:** 690

---

### `VARIABLE` `responseBody`

- **Line:** 695

---

### `INTERFACE` `NetSuiteAddressUpdatePayload`

- **Line:** 710

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `leadId` | `string` | No | - |
| `address` | `Partial<Address>` | Yes | - |
| `postalAddress` | `Partial<Address>` | Yes | - |
| `tag` | `string` | Yes | - |
| `partnerLocationId` | `string` | Yes | - |

---

### `FUNCTION` `runAddressSyncInBackground`

- **Line:** 718
- **Async:** Yes
- **Returns:** `Promise<void>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |

---

### `VARIABLE` `db`

- **Line:** 721

---

### `VARIABLE` `docSnap`

- **Line:** 723

---

### `VARIABLE` `isCompany`

- **Line:** 724

---

### `VARIABLE` `data`

- **Line:** 735

---

### `VARIABLE` `pathPrefix`

- **Line:** 736

---

### `VARIABLE` `siteAddress`

- **Line:** 738

---

### `VARIABLE` `postalAddress`

- **Line:** 749

---

### `VARIABLE` `addressesSnap`

- **Line:** 751

---

### `VARIABLE` `additionalAddresses`

- **Line:** 752

---

### `VARIABLE` `tasks`

- **Line:** 757
- **Signature:** `{ type: 'site' | 'postal' | 'additional'; tag?: string; address: any; partnerLocationId?: string }[]`

---

### `VARIABLE` `baseUrl`

- **Line:** 785

---

### `VARIABLE` `params`

- **Line:** 788

---

### `VARIABLE` `addr`

- **Line:** 805

---

### `VARIABLE` `addr`

- **Line:** 815

---

### `VARIABLE` `url`

- **Line:** 826

---

### `VARIABLE` `controller`

- **Line:** 830

---

### `VARIABLE` `timeout`

- **Line:** 831

---

### `VARIABLE` `response`

- **Line:** 832

---

### `VARIABLE` `errorText`

- **Line:** 836

---

### `VARIABLE` `resultText`

- **Line:** 839

---

### `FUNCTION` `sendAddressUpdateToNetSuite`

- **Line:** 852
- **Async:** Yes
- **Returns:** `Promise<{ success: boolean, message: string }>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `payload` | `NetSuiteAddressUpdatePayload` | **Yes** | - | - |

---

### `VARIABLE` `errorMsg`

- **Line:** 856

---

### `INTERFACE` `NewLeadData`

- **Line:** 869

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `companyName` | `string` | No | - |
| `websiteUrl` | `string` | Yes | - |
| `customerPhone` | `string` | Yes | - |
| `customerServiceEmail` | `string` | Yes | - |
| `abn` | `string` | Yes | - |
| `industryCategory` | `string` | Yes | - |
| `campaign` | `string` | Yes | - |
| `address` | `Address` | No | - |
| `contact` | `{
    firstName?: string;
    lastName?: string;
    title?: string;
    email?: string;
    phone?: string;
  }` | No | - |
| `initialNotes` | `string` | Yes | - |
| `dialerAssigned` | `string` | Yes | - |
| `salesRepAssigned` | `string` | Yes | - |
| `fieldRepAssigned` | `string` | Yes | - |
| `accountManagerAssigned` | `string` | Yes | - |
| `discoveryData` | `Partial<DiscoveryData>` | Yes | - |
| `visitNoteID` | `string` | Yes | - |
| `franchiseeInternalId` | `string` | Yes | - |
| `franchiseeName` | `string` | Yes | - |
| `leadSource` | `string` | Yes | - |
| `bucket` | `LeadBucket` | Yes | - |
| `noFranchisees` | `boolean` | Yes | - |
| `selectedServiceOption` | `string` | Yes | - |
| `droppedOffBrochures` | `boolean` | Yes | - |
| `hadConversationWithContact` | `boolean` | Yes | - |
| `isPriority` | `boolean` | Yes | - |
| `isZeeCreated` | `boolean` | Yes | - |
| `franchiseeReviewPending` | `boolean` | Yes | - |
| `parentLeadId` | `string` | Yes | - |
| `parentId` | `string` | Yes | - |
| `parentCustomer` | `string` | Yes | - |
| `lpoLeadId` | `string` | Yes | - |
| `linkedLpoLeadId` | `string` | Yes | - |
| `pageUrl` | `string` | Yes | - |
| `attribution` | `Record<string, any>` | Yes | - |

---

### `FUNCTION` `sendNewLeadToNetSuite`

- **Line:** 912
- **Async:** Yes
- **Returns:** `Promise<{ success: boolean; leadId?: string; salesRecordInternalId?: string; message: string; }>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `payload` | `NewLeadData` | **Yes** | - | - |

---

### `VARIABLE` `isChildLead`

- **Line:** 918

---

### `VARIABLE` `effectivePhone`

- **Line:** 919

---

### `VARIABLE` `effectiveEmail`

- **Line:** 920

---

### `VARIABLE` `effectiveContactPhone`

- **Line:** 921

---

### `VARIABLE` `effectiveContactEmail`

- **Line:** 922

---

### `VARIABLE` `baseUrl`

- **Line:** 924

---

### `VARIABLE` `params`

- **Line:** 925

---

### `VARIABLE` `effectiveParentId`

- **Line:** 967

---

### `VARIABLE` `effectiveLpoLeadId`

- **Line:** 975

---

### `VARIABLE` `discoveryString`

- **Line:** 1002

---

### `VARIABLE` `formattedKey`

- **Line:** 1005

---

### `VARIABLE` `formattedValue`

- **Line:** 1006

---

### `VARIABLE` `attrLines`

- **Line:** 1013

---

### `VARIABLE` `leadSourceText`

- **Line:** 1040

---

### `VARIABLE` `url`

- **Line:** 1080

---

### `VARIABLE` `controller`

- **Line:** 1085

---

### `VARIABLE` `timeout`

- **Line:** 1086

---

### `VARIABLE` `response`

- **Line:** 1088

---

### `VARIABLE` `errorBody`

- **Line:** 1093

---

### `VARIABLE` `responseBody`

- **Line:** 1098

---

### `VARIABLE` `jsonResponse`

- **Line:** 1102

---

### `VARIABLE` `returnedId`

- **Line:** 1106

---

### `VARIABLE` `salesRecordId`

- **Line:** 1107

---

### `FUNCTION` `prospectWebsiteTool`

- **Line:** 1132
- **Async:** Yes
- **Returns:** `Promise<{ searchKeywords?: string[], contacts?: Contact[], companyDescription?: string, logoUrl?: string }>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `input` | `{ leadId: string; websiteUrl: string; }` | **Yes** | - | - |

---

### `VARIABLE` `result`

- **Line:** 1133

---

### `FUNCTION` `sendLpoConversionToNetSuite`

> Sends converted LPO lead information to NetSuite.
Logs the full payload for integration debugging.

- **Line:** 1152
- **Async:** Yes
- **Returns:** `Promise<{ success: boolean; message: string }>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |
| `conversionData` | `any` | **Yes** | - | - |

---

