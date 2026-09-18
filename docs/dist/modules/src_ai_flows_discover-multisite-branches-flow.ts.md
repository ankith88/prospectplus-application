# Module: `src/ai/flows/discover-multisite-branches-flow.ts`

- **Language:** TypeScript
- **Total Lines:** 584
- **Direct Dependencies:** 2 modules imported

## Exported Symbols & API

### `VARIABLE` `DiscoveredBranchSchema`

- **Line:** 6

---

### `VARIABLE` `DiscoverBranchesOutputSchema`

- **Line:** 18

---

### `VARIABLE` `DiscoverBranchesInputSchema`

- **Line:** 27

---

### `VARIABLE` `discoverBranchesPrompt`

- **Line:** 33

---

### `FUNCTION` `extractMainWebsiteUrl`

- **Line:** 67
- **Returns:** `string`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `urlStr` | `string` | No | - | - |

---

### `VARIABLE` `cleanUrl`

- **Line:** 69

---

### `VARIABLE` `parsed`

- **Line:** 74

---

### `FUNCTION` `cleanHtmlText`

- **Line:** 81
- **Returns:** `string`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `html` | `string` | **Yes** | - | - |

---

### `FUNCTION` `searchWebForQuery`

- **Line:** 98
- **Async:** Yes
- **Returns:** `Promise<{ snippets: string[]; urls: string[] }>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `query` | `string` | **Yes** | - | - |

---

### `VARIABLE` `snippets`

- **Line:** 99
- **Signature:** `string[]`

---

### `VARIABLE` `urls`

- **Line:** 100
- **Signature:** `string[]`

---

### `VARIABLE` `headers`

- **Line:** 101

---

### `VARIABLE` `ddgUrl`

- **Line:** 109

---

### `VARIABLE` `ctrl`

- **Line:** 110

---

### `VARIABLE` `timeout`

- **Line:** 111

---

### `VARIABLE` `res`

- **Line:** 113

---

### `VARIABLE` `html`

- **Line:** 120

---

### `VARIABLE` `cleaned`

- **Line:** 122

---

### `VARIABLE` `urlRegex`

- **Line:** 125

---

### `VARIABLE` `match`

- **Line:** 126

---

### `VARIABLE` `url`

- **Line:** 128

---

### `VARIABLE` `actualUrl`

- **Line:** 130

---

### `VARIABLE` `bingUrl`

- **Line:** 146

---

### `VARIABLE` `bCtrl`

- **Line:** 147

---

### `VARIABLE` `bTimeout`

- **Line:** 148

---

### `VARIABLE` `bRes`

- **Line:** 150

---

### `VARIABLE` `bHtml`

- **Line:** 157

---

### `VARIABLE` `bCleaned`

- **Line:** 158

---

### `VARIABLE` `bUrlRegex`

- **Line:** 161

---

### `VARIABLE` `bMatch`

- **Line:** 162

---

### `VARIABLE` `u`

- **Line:** 164

---

### `VARIABLE` `discoverCompanyBranchesFlow`

- **Line:** 177

---

### `VARIABLE` `fetchedPages`

- **Line:** 184
- **Signature:** `string[]`

---

### `VARIABLE` `hunterBranches`

- **Line:** 185
- **Signature:** `z.infer<typeof DiscoveredBranchSchema>[]`

---

### `VARIABLE` `resolvedWebsiteUrl`

- **Line:** 186

---

### `VARIABLE` `coreName`

- **Line:** 188

---

### `VARIABLE` `searchQueries`

- **Line:** 191

---

### `VARIABLE` `searchUrls`

- **Line:** 196
- **Signature:** `string[]`

---

### `VARIABLE` `searchRes`

- **Line:** 198

---

### `VARIABLE` `mainDomain`

- **Line:** 208

---

### `VARIABLE` `targetUrl`

- **Line:** 214

---

### `VARIABLE` `clean`

- **Line:** 216

---

### `VARIABLE` `mainRootUrl`

- **Line:** 222

---

### `VARIABLE` `domainHost`

- **Line:** 223

---

### `VARIABLE` `domainQuery`

- **Line:** 230

---

### `VARIABLE` `domainRes`

- **Line:** 231

---

### `VARIABLE` `seedUrlsToFetch`

- **Line:** 240

---

### `VARIABLE` `candidatePaths`

- **Line:** 247

---

### `VARIABLE` `locationSubpageLinks`

- **Line:** 266

---

### `VARIABLE` `fetchHeaders`

- **Line:** 268

---

### `VARIABLE` `controller`

- **Line:** 277

---

### `VARIABLE` `timeout`

- **Line:** 278

---

### `VARIABLE` `res`

- **Line:** 280

---

### `VARIABLE` `html`

- **Line:** 287

---

### `VARIABLE` `pageText`

- **Line:** 288

---

### `VARIABLE` `linkRegex`

- **Line:** 294

---

### `VARIABLE` `match`

- **Line:** 295

---

### `VARIABLE` `rawLink`

- **Line:** 297

---

### `VARIABLE` `resolvedUrl`

- **Line:** 300

---

### `VARIABLE` `subpagePromises`

- **Line:** 322

---

### `VARIABLE` `subCtrl`

- **Line:** 325

---

### `VARIABLE` `subTimeout`

- **Line:** 326

---

### `VARIABLE` `subRes`

- **Line:** 327

---

### `VARIABLE` `subHtml`

- **Line:** 333

---

### `VARIABLE` `text`

- **Line:** 334

---

### `VARIABLE` `subpages`

- **Line:** 345

---

### `VARIABLE` `apiKey`

- **Line:** 351

---

### `VARIABLE` `targetDomain`

- **Line:** 353

---

### `VARIABLE` `domainMatch`

- **Line:** 354

---

### `VARIABLE` `hunterUrl`

- **Line:** 356

---

### `VARIABLE` `hCtrl`

- **Line:** 357

---

### `VARIABLE` `hTimeout`

- **Line:** 358

---

### `VARIABLE` `hRes`

- **Line:** 359

---

### `VARIABLE` `hData`

- **Line:** 362

---

### `VARIABLE` `org`

- **Line:** 363

---

### `VARIABLE` `city`

- **Line:** 364

---

### `VARIABLE` `state`

- **Line:** 365

---

### `VARIABLE` `street`

- **Line:** 366

---

### `VARIABLE` `postalCode`

- **Line:** 367

---

### `VARIABLE` `phone`

- **Line:** 368

---

### `VARIABLE` `email`

- **Line:** 369

---

### `VARIABLE` `pos`

- **Line:** 387

---

### `VARIABLE` `matchedCity`

- **Line:** 389

---

### `VARIABLE` `cityName`

- **Line:** 391

---

### `VARIABLE` `combinedContent`

- **Line:** 413

---

### `VARIABLE` `truncatedText`

- **Line:** 425

---

### `VARIABLE` `aiBranches`

- **Line:** 432

---

### `VARIABLE` `allBranches`

- **Line:** 438

---

### `VARIABLE` `uniqueBranches`

- **Line:** 439

---

### `FUNCTION` `discoverCompanyBranches`

- **Line:** 458
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `input` | `z.infer<typeof DiscoverBranchesInputSchema>` | **Yes** | - | - |

---

### `VARIABLE` `result`

- **Line:** 460

---

### `VARIABLE` `PUBLIC_EMAIL_DOMAINS`

- **Line:** 468

---

### `VARIABLE` `IGNORED_DIRECTORY_PATTERNS`

- **Line:** 474

---

### `FUNCTION` `findCompanyWebsite`

- **Line:** 483
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `companyName` | `string` | **Yes** | - | - |
| `companyEmail` | `string` | No | - | - |

---

### `VARIABLE` `emailDomain`

- **Line:** 487

---

### `VARIABLE` `rootUrl`

- **Line:** 489

---

### `VARIABLE` `cleanBrandName`

- **Line:** 499

---

### `VARIABLE` `apiKey`

- **Line:** 515

---

### `VARIABLE` `namesToSearch`

- **Line:** 517

---

### `VARIABLE` `hUrl`

- **Line:** 520

---

### `VARIABLE` `hCtrl`

- **Line:** 521

---

### `VARIABLE` `hTimeout`

- **Line:** 522

---

### `VARIABLE` `hRes`

- **Line:** 523

---

### `VARIABLE` `hData`

- **Line:** 526

---

### `VARIABLE` `domain`

- **Line:** 527

---

### `VARIABLE` `rootUrl`

- **Line:** 529

---

### `VARIABLE` `query`

- **Line:** 544

---

### `VARIABLE` `searchResults`

- **Line:** 545

---

### `VARIABLE` `foundUrl`

- **Line:** 547

---

### `VARIABLE` `rawName`

- **Line:** 555

---

### `VARIABLE` `rawQuery`

- **Line:** 556

---

### `VARIABLE` `rawResults`

- **Line:** 557

---

### `VARIABLE` `clean`

- **Line:** 566

---

### `VARIABLE` `mainWebsiteUrl`

- **Line:** 572

---

