# Module: `src/components/product-quote-dialog.tsx`

- **Language:** TypeScript
- **Total Lines:** 752
- **Direct Dependencies:** 20 modules imported

## Exported Symbols & API

### `INTERFACE` `ProductQuoteDialogProps`

- **Line:** 31

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `isOpen` | `boolean` | No | - |
| `onClose` | `() => void` | No | - |
| `lead` | `Lead` | No | - |
| `products` | `any[]` | No | - |
| `surchargeRates` | `{ express: number; premium: number } | null` | No | - |

---

### `FUNCTION` `ProductQuoteDialog`

- **Line:** 39
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{
  isOpen,
  onClose,
  lead,
  products: rawProducts,
  surchargeRates,
}` | `ProductQuoteDialogProps` | **Yes** | - | - |

---

### `VARIABLE` `EXCLUDED_PRODUCTS`

- **Line:** 50

---

### `VARIABLE` `products`

- **Line:** 56

---

### `VARIABLE` `groupedUsers`

- **Line:** 60

---

### `VARIABLE` `filtered`

- **Line:** 61

---

### `VARIABLE` `loggedInRoles`

- **Line:** 63

---

### `FUNCTION` `hasRole`

- **Line:** 64

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `roleNames` | `string[]` | **Yes** | - | - |

---

### `VARIABLE` `isAccountManagerUser`

- **Line:** 68

---

### `VARIABLE` `isDialerUser`

- **Line:** 69

---

### `FUNCTION` `userHasRole`

- **Line:** 71

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `u` | `any` | **Yes** | - | - |
| `roleNames` | `string[]` | **Yes** | - | - |

---

### `VARIABLE` `normalizedNames`

- **Line:** 72

---

### `VARIABLE` `rolesToCheck`

- **Line:** 73

---

### `FUNCTION` `getGroupRoleName`

- **Line:** 84
- **Returns:** `string`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `u` | `any` | **Yes** | - | - |

---

### `VARIABLE` `primaryRole`

- **Line:** 85

---

### `VARIABLE` `lower`

- **Line:** 86

---

### `VARIABLE` `groups`

- **Line:** 101
- **Signature:** `Record<string, any[]>`

---

### `VARIABLE` `groupName`

- **Line:** 103

---

### `VARIABLE` `nameA`

- **Line:** 112

---

### `VARIABLE` `nameB`

- **Line:** 113

---

### `VARIABLE` `sortedGroupNames`

- **Line:** 118

---

### `FUNCTION` `resolveAmEmail`

- **Line:** 139
- **Async:** Yes

---

### `VARIABLE` `amAssigned`

- **Line:** 140

---

### `VARIABLE` `usersRef`

- **Line:** 146

---

### `VARIABLE` `docRef`

- **Line:** 148

---

### `VARIABLE` `docSnap`

- **Line:** 149

---

### `VARIABLE` `qDisplayName`

- **Line:** 155

---

### `VARIABLE` `snapDisplayName`

- **Line:** 156

---

### `VARIABLE` `qAll`

- **Line:** 162

---

### `VARIABLE` `snapAll`

- **Line:** 163

---

### `VARIABLE` `name`

- **Line:** 164

---

### `VARIABLE` `found`

- **Line:** 165

---

### `VARIABLE` `data`

- **Line:** 166

---

### `VARIABLE` `fullName`

- **Line:** 167

---

### `VARIABLE` `dispName`

- **Line:** 168

---

### `VARIABLE` `emailName`

- **Line:** 169

---

### `VARIABLE` `availableEmails`

- **Line:** 186

---

### `VARIABLE` `emails`

- **Line:** 187
- **Signature:** `{ email: string; label: string; name?: string }[]`

---

### `FUNCTION` `insertSubjectPlaceholder`

- **Line:** 212

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `placeholder` | `string` | **Yes** | - | - |

---

### `VARIABLE` `subjectInput`

- **Line:** 213

---

### `VARIABLE` `start`

- **Line:** 215

---

### `VARIABLE` `end`

- **Line:** 216

---

### `VARIABLE` `text`

- **Line:** 217

---

### `VARIABLE` `before`

- **Line:** 218

---

### `VARIABLE` `after`

- **Line:** 219

---

### `FUNCTION` `fetchUsersAndTemplate`

- **Line:** 229
- **Async:** Yes
- **Returns:** `void`

---

### `VARIABLE` `snap`

- **Line:** 231

---

### `VARIABLE` `list`

- **Line:** 232

---

### `VARIABLE` `amName`

- **Line:** 235

---

### `VARIABLE` `amUser`

- **Line:** 236

---

### `VARIABLE` `defaultSender`

- **Line:** 237

---

### `FUNCTION` `getSurchargeRate`

- **Line:** 251

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `speed` | `string` | **Yes** | - | - |

---

### `VARIABLE` `lowerSpeed`

- **Line:** 253

---

### `FUNCTION` `getProductValue`

- **Line:** 259

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `weightKey` | `string` | **Yes** | - | - |
| `type` | `'base' | 'surcharge'` | **Yes** | - | - |

---

### `VARIABLE` `num`

- **Line:** 260

---

### `VARIABLE` `p`

- **Line:** 261

---

### `VARIABLE` `pw`

- **Line:** 263

---

### `VARIABLE` `basePrice`

- **Line:** 269

---

### `VARIABLE` `surchargePerc`

- **Line:** 272

---

### `VARIABLE` `surchargeAmt`

- **Line:** 273

---

### `FUNCTION` `generateProductsTableHTML`

- **Line:** 277

---

### `VARIABLE` `html`

- **Line:** 280

---

### `VARIABLE` `sortedProducts`

- **Line:** 293

---

### `FUNCTION` `parseWeight`

- **Line:** 294

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `p` | `any` | **Yes** | - | - |

---

### `VARIABLE` `weightStr`

- **Line:** 295

---

### `VARIABLE` `match`

- **Line:** 296

---

### `VARIABLE` `basePrice`

- **Line:** 303

---

### `VARIABLE` `surchargePerc`

- **Line:** 304

---

### `VARIABLE` `surchargeAmt`

- **Line:** 305

---

### `VARIABLE` `total`

- **Line:** 306

---

### `FUNCTION` `fetchTemplate`

- **Line:** 325
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `usersList` | `any[]` | No | `[]` | - |
| `defaultSender` | `string` | No | `''` | - |

---

### `VARIABLE` `q`

- **Line:** 328

---

### `VARIABLE` `snap`

- **Line:** 329

---

### `VARIABLE` `rawSubject`

- **Line:** 331

---

### `VARIABLE` `rawBody`

- **Line:** 332

---

### `VARIABLE` `targetName`

- **Line:** 342

---

### `VARIABLE` `docMatch`

- **Line:** 343

---

### `VARIABLE` `data`

- **Line:** 344

---

### `VARIABLE` `templateData`

- **Line:** 349

---

### `VARIABLE` `firstName`

- **Line:** 356

---

### `VARIABLE` `productsTableHTML`

- **Line:** 357

---

### `VARIABLE` `currentSenderEmail`

- **Line:** 359

---

### `VARIABLE` `senderUser`

- **Line:** 360

---

### `VARIABLE` `senderNameVal`

- **Line:** 361

---

### `VARIABLE` `senderPhoneVal`

- **Line:** 362

---

### `VARIABLE` `senderSignatureVal`

- **Line:** 363

---

### `VARIABLE` `thermoguardLinkVal`

- **Line:** 370

---

### `VARIABLE` `encryptedId`

- **Line:** 376

---

### `VARIABLE` `sofPublicLink`

- **Line:** 377

---

### `VARIABLE` `finalBody`

- **Line:** 379

---

### `VARIABLE` `hasCustomTable`

- **Line:** 406

---

### `VARIABLE` `resolvedSubject`

- **Line:** 412

---

### `VARIABLE` `primaryContact`

- **Line:** 413

---

### `VARIABLE` `contactName`

- **Line:** 414

---

### `FUNCTION` `handleSend`

- **Line:** 436
- **Async:** Yes

---

### `VARIABLE` `toEmails`

- **Line:** 454

---

### `VARIABLE` `response`

- **Line:** 459

---

### `VARIABLE` `result`

- **Line:** 478

---

### `FUNCTION` `toggleToEmail`

- **Line:** 495

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `email` | `string` | **Yes** | - | - |

---

### `VARIABLE` `thermoguardLinkVal`

- **Line:** 683

---

### `VARIABLE` `senderUser`

- **Line:** 699

---

### `VARIABLE` `senderNameVal`

- **Line:** 700

---

### `VARIABLE` `senderPhoneVal`

- **Line:** 701

---

### `VARIABLE` `senderSignatureVal`

- **Line:** 702

---

