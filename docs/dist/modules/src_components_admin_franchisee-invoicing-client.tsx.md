# Module: `src/components/admin/franchisee-invoicing-client.tsx`

- **Language:** TypeScript
- **Total Lines:** 1246
- **Direct Dependencies:** 16 modules imported

## Exported Symbols & API

### `VARIABLE` `THEME`

- **Line:** 63

---

### `INTERFACE` `ExtendedInvoice`

- **Line:** 75

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `parentId` | `string` | Yes | - |
| `franchiseeName` | `string` | Yes | - |
| `companyName` | `string` | Yes | - |

---

### `INTERFACE` `FranchiseeMonthlyMetric`

- **Line:** 81

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `franchiseeName` | `string` | No | - |
| `franchiseeId` | `string` | Yes | - |
| `month` | `string` | No | - |
| `servicesRevenue` | `number` | No | - |
| `productsRevenue` | `number` | No | - |
| `bothRevenue` | `number` | No | - |
| `totalRevenue` | `number` | No | - |
| `signedCount` | `number` | No | - |
| `signedCustomers` | `{ id: string; name: string; date: string; services?: string }[]` | No | - |
| `lostCount` | `number` | No | - |
| `lostCustomers` | `{ id: string; name: string; date: string; reason?: string }[]` | No | - |

---

### `INTERFACE` `FranchiseeSummary`

- **Line:** 95

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `franchiseeName` | `string` | No | - |
| `activeCount` | `number` | No | - |
| `signedCount` | `number` | No | - |
| `lostCount` | `number` | No | - |
| `netGrowth` | `number` | No | - |
| `servicesRevenue` | `number` | No | - |
| `productsRevenue` | `number` | No | - |
| `bothRevenue` | `number` | No | - |
| `totalRevenue` | `number` | No | - |
| `monthlyTrend` | `{ month: string; revenue: number; services: number; products: number; signed: number; lost: number }[]` | No | - |
| `signedCustomersList` | `{ id: string; name: string; date: string }[]` | No | - |
| `lostCustomersList` | `{ id: string; name: string; date: string; reason?: string }[]` | No | - |

---

### `FUNCTION` `classifyInvoiceItem`

- **Line:** 111
- **Returns:** `'service' | 'product'`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `serviceName` | `string` | **Yes** | - | - |
| `invoiceType` | `string` | No | - | - |

---

### `VARIABLE` `text`

- **Line:** 112

---

### `VARIABLE` `productKeywords`

- **Line:** 114

---

### `FUNCTION` `parseYearMonth`

- **Line:** 127
- **Returns:** `string | null`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `dateStr` | `string` | No | - | - |

---

### `VARIABLE` `str`

- **Line:** 129

---

### `VARIABLE` `parts`

- **Line:** 133

---

### `VARIABLE` `year`

- **Line:** 135

---

### `VARIABLE` `month`

- **Line:** 136

---

### `VARIABLE` `parts`

- **Line:** 143

---

### `VARIABLE` `year`

- **Line:** 145

---

### `VARIABLE` `month`

- **Line:** 146

---

### `VARIABLE` `dateObj`

- **Line:** 151

---

### `VARIABLE` `y`

- **Line:** 153

---

### `VARIABLE` `m`

- **Line:** 154

---

### `FUNCTION` `FranchiseeInvoicingClient`

- **Line:** 161
- **Returns:** `void`

---

### `FUNCTION` `fetchData`

- **Line:** 180
- **Async:** Yes

---

### `VARIABLE` `invoicesSnap`

- **Line:** 184

---

### `VARIABLE` `companiesSnap`

- **Line:** 190

---

### `VARIABLE` `leadsSnap`

- **Line:** 196

---

### `VARIABLE` `scfsSnap`

- **Line:** 202

---

### `VARIABLE` `companiesList`

- **Line:** 207
- **Signature:** `Lead[]`

---

### `VARIABLE` `leadsList`

- **Line:** 208
- **Signature:** `Lead[]`

---

### `VARIABLE` `scfList`

- **Line:** 209
- **Signature:** `ScfRecord[]`

---

### `VARIABLE` `accountMap`

- **Line:** 212

---

### `VARIABLE` `invoiceList`

- **Line:** 218
- **Signature:** `ExtendedInvoice[]`

---

### `VARIABLE` `data`

- **Line:** 219

---

### `VARIABLE` `parentId`

- **Line:** 220

---

### `VARIABLE` `parentAcc`

- **Line:** 221

---

### `VARIABLE` `rawFranchisee`

- **Line:** 223

---

### `VARIABLE` `companyName`

- **Line:** 224

---

### `VARIABLE` `franchiseeOptions`

- **Line:** 252

---

### `VARIABLE` `set`

- **Line:** 253

---

### `VARIABLE` `monthsRange`

- **Line:** 268

---

### `VARIABLE` `now`

- **Line:** 269

---

### `VARIABLE` `currentYear`

- **Line:** 270

---

### `VARIABLE` `currentMonth`

- **Line:** 271

---

### `VARIABLE` `count`

- **Line:** 273

---

### `VARIABLE` `list`

- **Line:** 280
- **Signature:** `string[]`

---

### `VARIABLE` `d`

- **Line:** 282

---

### `VARIABLE` `y`

- **Line:** 283

---

### `VARIABLE` `m`

- **Line:** 284

---

### `VARIABLE` `processedData`

- **Line:** 291

---

### `VARIABLE` `allAccounts`

- **Line:** 292

---

### `VARIABLE` `accountFranchiseeMap`

- **Line:** 295

---

### `VARIABLE` `signedByFranMonth`

- **Line:** 303

---

### `VARIABLE` `lostByFranMonth`

- **Line:** 304

---

### `VARIABLE` `fran`

- **Line:** 307

---

### `VARIABLE` `name`

- **Line:** 308

---

### `VARIABLE` `accId`

- **Line:** 309

---

### `VARIABLE` `accStatus`

- **Line:** 310

---

### `VARIABLE` `custStatus`

- **Line:** 311

---

### `VARIABLE` `isSigned`

- **Line:** 314

---

### `VARIABLE` `signedDateStr`

- **Line:** 316

---

### `VARIABLE` `ym`

- **Line:** 317

---

### `VARIABLE` `key`

- **Line:** 319

---

### `VARIABLE` `list`

- **Line:** 320

---

### `VARIABLE` `isLost`

- **Line:** 327

---

### `VARIABLE` `lostDateStr`

- **Line:** 329

---

### `VARIABLE` `ym`

- **Line:** 330

---

### `VARIABLE` `key`

- **Line:** 332

---

### `VARIABLE` `list`

- **Line:** 333

---

### `VARIABLE` `reason`

- **Line:** 334

---

### `VARIABLE` `signedDate`

- **Line:** 344

---

### `VARIABLE` `ym`

- **Line:** 345

---

### `VARIABLE` `fran`

- **Line:** 347

---

### `VARIABLE` `key`

- **Line:** 348

---

### `VARIABLE` `list`

- **Line:** 349

---

### `VARIABLE` `invoiceMetricsMap`

- **Line:** 360

---

### `VARIABLE` `invDate`

- **Line:** 363

---

### `VARIABLE` `ym`

- **Line:** 364

---

### `VARIABLE` `fran`

- **Line:** 367

---

### `VARIABLE` `key`

- **Line:** 368

---

### `VARIABLE` `totalVal`

- **Line:** 370

---

### `VARIABLE` `serviceAmt`

- **Line:** 374

---

### `VARIABLE` `productAmt`

- **Line:** 375

---

### `VARIABLE` `itemTotal`

- **Line:** 379

---

### `VARIABLE` `cat`

- **Line:** 380

---

### `VARIABLE` `cat`

- **Line:** 385

---

### `VARIABLE` `existing`

- **Line:** 390

---

### `VARIABLE` `summaryMap`

- **Line:** 406

---

### `VARIABLE` `allFranchiseeNames`

- **Line:** 409

---

### `VARIABLE` `franAccounts`

- **Line:** 420

---

### `VARIABLE` `activeCount`

- **Line:** 421

---

### `VARIABLE` `totalServices`

- **Line:** 423

---

### `VARIABLE` `totalProducts`

- **Line:** 424

---

### `VARIABLE` `totalBoth`

- **Line:** 425

---

### `VARIABLE` `totalRev`

- **Line:** 426

---

### `VARIABLE` `totalSigned`

- **Line:** 427

---

### `VARIABLE` `totalLost`

- **Line:** 428

---

### `VARIABLE` `monthlyTrend`

- **Line:** 430
- **Signature:** `FranchiseeSummary['monthlyTrend']`

---

### `VARIABLE` `signedCustomersList`

- **Line:** 431
- **Signature:** `FranchiseeSummary['signedCustomersList']`

---

### `VARIABLE` `lostCustomersList`

- **Line:** 432
- **Signature:** `FranchiseeSummary['lostCustomersList']`

---

### `VARIABLE` `key`

- **Line:** 435

---

### `VARIABLE` `invMetric`

- **Line:** 436

---

### `VARIABLE` `signedList`

- **Line:** 437

---

### `VARIABLE` `lostList`

- **Line:** 438

---

### `VARIABLE` `filteredSummaries`

- **Line:** 480

---

### `VARIABLE` `result`

- **Line:** 481

---

### `VARIABLE` `q`

- **Line:** 488

---

### `VARIABLE` `overallKPIs`

- **Line:** 496

---

### `VARIABLE` `totalRev`

- **Line:** 497

---

### `VARIABLE` `servicesRev`

- **Line:** 498

---

### `VARIABLE` `productsRev`

- **Line:** 499

---

### `VARIABLE` `totalSigned`

- **Line:** 500

---

### `VARIABLE` `totalLost`

- **Line:** 501

---

### `VARIABLE` `netGrowth`

- **Line:** 511

---

### `VARIABLE` `servicesPercent`

- **Line:** 512

---

### `VARIABLE` `productsPercent`

- **Line:** 513

---

### `VARIABLE` `monthlyTrendChartData`

- **Line:** 528

---

### `VARIABLE` `services`

- **Line:** 530

---

### `VARIABLE` `products`

- **Line:** 531

---

### `VARIABLE` `total`

- **Line:** 532

---

### `VARIABLE` `signed`

- **Line:** 533

---

### `VARIABLE` `lost`

- **Line:** 534

---

### `VARIABLE` `m`

- **Line:** 537

---

### `VARIABLE` `dateParts`

- **Line:** 548

---

### `VARIABLE` `monthNames`

- **Line:** 549

---

### `VARIABLE` `monthLabel`

- **Line:** 550

---

### `VARIABLE` `filteredInvoices`

- **Line:** 566

---

### `VARIABLE` `list`

- **Line:** 567

---

### `VARIABLE` `q`

- **Line:** 574

---

### `VARIABLE` `dA`

- **Line:** 583

---

### `VARIABLE` `dB`

- **Line:** 584

---

### `FUNCTION` `handleExportCSV`

- **Line:** 590

---

### `VARIABLE` `headers`

- **Line:** 591

---

### `VARIABLE` `rows`

- **Line:** 602

---

### `VARIABLE` `csvContent`

- **Line:** 613

---

### `VARIABLE` `encodedUri`

- **Line:** 614

---

### `VARIABLE` `link`

- **Line:** 615

---

### `VARIABLE` `isHighLost`

- **Line:** 877

---

### `VARIABLE` `isGrowing`

- **Line:** 878

---

### `VARIABLE` `docId`

- **Line:** 1155

---

### `VARIABLE` `totalVal`

- **Line:** 1156

---

### `VARIABLE` `hasServices`

- **Line:** 1160

---

### `VARIABLE` `hasProducts`

- **Line:** 1161

---

### `VARIABLE` `cat`

- **Line:** 1164

---

### `VARIABLE` `cat`

- **Line:** 1169

---

