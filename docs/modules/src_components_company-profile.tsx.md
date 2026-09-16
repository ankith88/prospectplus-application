# Module: `src/components/company-profile.tsx`

- **Language:** TypeScript
- **Total Lines:** 2829
- **Direct Dependencies:** 44 modules imported

## Exported Symbols & API

### `INTERFACE` `CompanyProfileProps`

- **Line:** 97

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `initialCompany` | `Lead` | No | - |
| `onNoteLogged` | `(newNote: Note) => void` | No | - |

---

### `FUNCTION` `formatAddressString`

- **Line:** 102

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `address` | `Address` | No | - | - |

---

### `VARIABLE` `parts`

- **Line:** 104

---

### `FUNCTION` `CompanyProfile`

- **Line:** 116
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ initialCompany, onNoteLogged }` | `CompanyProfileProps` | **Yes** | - | - |

---

### `VARIABLE` `isAdmin`

- **Line:** 123

---

### `FUNCTION` `fetchThemes`

- **Line:** 139
- **Async:** Yes

---

### `VARIABLE` `snap`

- **Line:** 141

---

### `VARIABLE` `resolvedCancellation`

- **Line:** 152

---

### `VARIABLE` `isLostStatus`

- **Line:** 155

---

### `VARIABLE` `activeHierarchy`

- **Line:** 163

---

### `VARIABLE` `autoMatch`

- **Line:** 164

---

### `VARIABLE` `themeName`

- **Line:** 167

---

### `VARIABLE` `foundTheme`

- **Line:** 169

---

### `VARIABLE` `categoryName`

- **Line:** 177

---

### `VARIABLE` `foundWhy`

- **Line:** 180

---

### `VARIABLE` `reasonName`

- **Line:** 193

---

### `VARIABLE` `foundReason`

- **Line:** 197

---

### `VARIABLE` `hasSpecificDetails`

- **Line:** 214

---

### `VARIABLE` `cancellationDateStr`

- **Line:** 229

---

### `VARIABLE` `typeInfo`

- **Line:** 231

---

### `VARIABLE` `sortedNotes`

- **Line:** 249

---

### `VARIABLE` `timeA`

- **Line:** 251

---

### `VARIABLE` `timeB`

- **Line:** 252

---

### `VARIABLE` `sortedCalls`

- **Line:** 257

---

### `VARIABLE` `calls`

- **Line:** 258

---

### `VARIABLE` `timeA`

- **Line:** 260

---

### `VARIABLE` `timeB`

- **Line:** 261

---

### `VARIABLE` `sortedActivities`

- **Line:** 266

---

### `VARIABLE` `timeA`

- **Line:** 268

---

### `VARIABLE` `timeB`

- **Line:** 269

---

### `VARIABLE` `sortedEmails`

- **Line:** 274

---

### `VARIABLE` `timeA`

- **Line:** 276

---

### `VARIABLE` `timeB`

- **Line:** 277

---

### `VARIABLE` `q`

- **Line:** 284

---

### `VARIABLE` `unsubscribe`

- **Line:** 285

---

### `VARIABLE` `jobsList`

- **Line:** 286

---

### `VARIABLE` `validJobsCount`

- **Line:** 290

---

### `VARIABLE` `computedTrials`

- **Line:** 291

---

### `VARIABLE` `computedJobCount`

- **Line:** 292

---

### `VARIABLE` `q`

- **Line:** 315

---

### `VARIABLE` `unsubscribe`

- **Line:** 316

---

### `VARIABLE` `jobsList`

- **Line:** 317

---

### `VARIABLE` `aTime`

- **Line:** 319

---

### `VARIABLE` `bTime`

- **Line:** 320

---

### `VARIABLE` `filteredShipMateJobs`

- **Line:** 332

---

### `VARIABLE` `matchesSearch`

- **Line:** 334

---

### `VARIABLE` `matchesStatus`

- **Line:** 338

---

### `VARIABLE` `oneYearAgo`

- **Line:** 345

---

### `VARIABLE` `cutoffTime`

- **Line:** 347

---

### `VARIABLE` `recent`

- **Line:** 349
- **Signature:** `Invoice[]`

---

### `VARIABLE` `older`

- **Line:** 350
- **Signature:** `Invoice[]`

---

### `VARIABLE` `invTime`

- **Line:** 357

---

### `VARIABLE` `displayedInvoices`

- **Line:** 368

---

### `VARIABLE` `isLpoParentAccount`

- **Line:** 396

---

### `FUNCTION` `checkLpoSuburbs`

- **Line:** 409
- **Async:** Yes
- **Returns:** `void`

---

### `VARIABLE` `franchiseeRefs`

- **Line:** 412

---

### `VARIABLE` `parentLpoId`

- **Line:** 413

---

### `VARIABLE` `extractedSuburbs`

- **Line:** 414
- **Signature:** `any[]`

---

### `VARIABLE` `linkedFrans`

- **Line:** 421

---

### `VARIABLE` `embedded`

- **Line:** 431

---

### `VARIABLE` `linkedFranIds`

- **Line:** 442

---

### `VARIABLE` `parentIdSet`

- **Line:** 450

---

### `VARIABLE` `childQueries`

- **Line:** 460
- **Signature:** `any[]`

---

### `VARIABLE` `childSnaps`

- **Line:** 474

---

### `VARIABLE` `d`

- **Line:** 478

---

### `VARIABLE` `embedded`

- **Line:** 496

---

### `VARIABLE` `allFranchisees`

- **Line:** 509

---

### `VARIABLE` `cleanRef`

- **Line:** 513

---

### `VARIABLE` `fData`

- **Line:** 516

---

### `VARIABLE` `suburbs`

- **Line:** 528

---

### `FUNCTION` `handleProvisionLpoPlus`

- **Line:** 549
- **Async:** Yes

---

### `VARIABLE` `primaryContact`

- **Line:** 561

---

### `VARIABLE` `nameParts`

- **Line:** 562

---

### `VARIABLE` `firstName`

- **Line:** 563

---

### `VARIABLE` `lastName`

- **Line:** 564

---

### `VARIABLE` `email`

- **Line:** 565

---

### `VARIABLE` `phone`

- **Line:** 566

---

### `VARIABLE` `res`

- **Line:** 568

---

### `VARIABLE` `data`

- **Line:** 594

---

### `VARIABLE` `updatedFields`

- **Line:** 596

---

### `VARIABLE` `compRef`

- **Line:** 604

---

### `VARIABLE` `leadRef`

- **Line:** 605

---

### `VARIABLE` `leadSnap`

- **Line:** 609

---

### `FUNCTION` `handleSyncLpoSuburbs`

- **Line:** 650
- **Async:** Yes

---

### `VARIABLE` `res`

- **Line:** 664

---

### `VARIABLE` `data`

- **Line:** 673

---

### `FUNCTION` `handleResetLpoPlusPassword`

- **Line:** 709
- **Async:** Yes

---

### `VARIABLE` `primaryContact`

- **Line:** 712

---

### `VARIABLE` `email`

- **Line:** 713

---

### `VARIABLE` `res`

- **Line:** 724

---

### `VARIABLE` `data`

- **Line:** 735

---

### `VARIABLE` `updatedFields`

- **Line:** 737

---

### `VARIABLE` `autoVerifiedCompanyRef`

- **Line:** 781

---

### `FUNCTION` `handleManageAdditionalAddresses`

- **Line:** 783

---

### `FUNCTION` `handleFranchiseeLookup`

- **Line:** 787
- **Async:** Yes

---

### `VARIABLE` `snap`

- **Line:** 802

---

### `VARIABLE` `franchisees`

- **Line:** 803

---

### `VARIABLE` `matches`

- **Line:** 804

---

### `VARIABLE` `companyCity`

- **Line:** 806

---

### `VARIABLE` `companyState`

- **Line:** 807

---

### `VARIABLE` `companyZip`

- **Line:** 808

---

### `FUNCTION` `handleFranchiseeSelection`

- **Line:** 826
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `franchisee` | `any` | **Yes** | - | - |

---

### `VARIABLE` `franchiseeId`

- **Line:** 836

---

### `VARIABLE` `oldFranchisee`

- **Line:** 837

---

### `VARIABLE` `newFranchisee`

- **Line:** 838

---

### `VARIABLE` `compRef`

- **Line:** 839

---

### `VARIABLE` `leadRef`

- **Line:** 859

---

### `FUNCTION` `handleVerifySingleEmail`

- **Line:** 882
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `contact` | `any` | **Yes** | - | - |

---

### `VARIABLE` `normEmail`

- **Line:** 884

---

### `VARIABLE` `results`

- **Line:** 888

---

### `VARIABLE` `res`

- **Line:** 896

---

### `VARIABLE` `unverifiedContacts`

- **Line:** 932

---

### `VARIABLE` `emailList`

- **Line:** 939

---

### `VARIABLE` `next`

- **Line:** 942

---

### `VARIABLE` `norm`

- **Line:** 960

---

### `VARIABLE` `match`

- **Line:** 961

---

### `VARIABLE` `next`

- **Line:** 980

---

### `FUNCTION` `handleSaveWebsite`

- **Line:** 993
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `urlOverride` | `string` | No | - | - |

---

### `VARIABLE` `rawVal`

- **Line:** 994

---

### `VARIABLE` `formattedUrl`

- **Line:** 999

---

### `VARIABLE` `compRef`

- **Line:** 1006

---

### `VARIABLE` `leadRef`

- **Line:** 1007

---

### `FUNCTION` `handleCheckShipmateStatus`

- **Line:** 1033
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `contact` | `any` | **Yes** | - | - |

---

### `VARIABLE` `res`

- **Line:** 1037

---

### `VARIABLE` `data`

- **Line:** 1048

---

### `FUNCTION` `fetchOperators`

- **Line:** 1099
- **Async:** Yes

---

### `VARIABLE` `snap`

- **Line:** 1101

---

### `VARIABLE` `mapping`

- **Line:** 1102
- **Signature:** `Record<string, string>`

---

### `VARIABLE` `data`

- **Line:** 1104

---

### `VARIABLE` `fullName`

- **Line:** 1105

---

### `FUNCTION` `fetchFranchiseeData`

- **Line:** 1120
- **Async:** Yes

---

### `VARIABLE` `franchiseeDoc`

- **Line:** 1127

---

### `VARIABLE` `fDoc`

- **Line:** 1131

---

### `VARIABLE` `q`

- **Line:** 1136

---

### `VARIABLE` `qSnap`

- **Line:** 1137

---

### `VARIABLE` `q`

- **Line:** 1146

---

### `VARIABLE` `qSnap`

- **Line:** 1147

---

### `FUNCTION` `handleViewOperators`

- **Line:** 1164
- **Async:** Yes

---

### `VARIABLE` `fId`

- **Line:** 1166

---

### `VARIABLE` `ops`

- **Line:** 1170

---

### `FUNCTION` `handleAddAdditionalAddress`

- **Line:** 1188

---

### `FUNCTION` `handleEditAdditionalAddress`

- **Line:** 1193

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `addr` | `TaggedAddress` | **Yes** | - | - |

---

### `FUNCTION` `handleDeleteAdditionalAddress`

- **Line:** 1198
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `addrId` | `string` | **Yes** | - | - |

---

### `VARIABLE` `updatedCompany`

- **Line:** 1206

---

### `FUNCTION` `handleAddressSaved`

- **Line:** 1218
- **Async:** Yes

---

### `VARIABLE` `updatedCompany`

- **Line:** 1219

---

### `VARIABLE` `router`

- **Line:** 1223

---

### `VARIABLE` `visitNoteId`

- **Line:** 1230

---

### `VARIABLE` `noteRef`

- **Line:** 1233

---

### `FUNCTION` `fetchInvoices`

- **Line:** 1243
- **Async:** Yes

---

### `VARIABLE` `invoicesRef`

- **Line:** 1247

---

### `VARIABLE` `invoicesSnapshot`

- **Line:** 1248

---

### `VARIABLE` `invoicesData`

- **Line:** 1249

---

### `FUNCTION` `handleNoteLoggedAndClose`

- **Line:** 1268

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `newNote` | `Note` | **Yes** | - | - |

---

### `FUNCTION` `handleCopy`

- **Line:** 1274

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `text` | `string | null | undefined` | **Yes** | - | - |
| `fieldName` | `string` | **Yes** | - | - |

---

### `FUNCTION` `handleBackToLeads`

- **Line:** 1280

---

### `FUNCTION` `executeCall`

- **Line:** 1288

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `phoneNumber` | `string` | **Yes** | - | - |

---

### `FUNCTION` `handleInitiateCall`

- **Line:** 1300

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `phoneNumber` | `string` | **Yes** | - | - |

---

### `VARIABLE` `opener`

- **Line:** 1303

---

### `VARIABLE` `personalisation`

- **Line:** 1304

---

### `VARIABLE` `apRel`

- **Line:** 1305

---

### `VARIABLE` `hasInsights`

- **Line:** 1307

---

### `FUNCTION` `formatDate`

- **Line:** 1330

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `dateStr` | `string` | No | - | - |

---

### `VARIABLE` `date`

- **Line:** 1332

---

### `FUNCTION` `DetailItem`

- **Line:** 1336

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ icon: Icon, label, value, copyable, isLink, linkUrl, isWebsite, callable, leadId, emailClickable, actionIcon: ActionIcon, onActionClick, isActionLoading, actionClassName }` | `any` | **Yes** | - | - |

---

### `VARIABLE` `fullAddressStr`

- **Line:** 1404

---

### `VARIABLE` `hasCancellationDetails`

- **Line:** 1405

---

### `VARIABLE` `b`

- **Line:** 1455

---

### `VARIABLE` `actualJobCount`

- **Line:** 1467

---

### `VARIABLE` `validJobsCount`

- **Line:** 1468

---

### `VARIABLE` `actualTrialsRemaining`

- **Line:** 1469

---

### `VARIABLE` `hasJobs`

- **Line:** 1470

---

### `VARIABLE` `isSignedUp`

- **Line:** 1605

---

### `VARIABLE` `addrStr`

- **Line:** 2103

---

### `VARIABLE` `statusStr`

- **Line:** 2219

---

### `VARIABLE` `lower`

- **Line:** 2221

---

### `VARIABLE` `badgeClass`

- **Line:** 2222

---

### `VARIABLE` `statusLower`

- **Line:** 2334

---

### `VARIABLE` `statusBadgeStyle`

- **Line:** 2335

---

### `VARIABLE` `jsonField`

- **Line:** 2623

---

### `VARIABLE` `list`

- **Line:** 2627

---

### `VARIABLE` `ops`

- **Line:** 2656

---

### `VARIABLE` `sec`

- **Line:** 2664

---

### `VARIABLE` `snap`

- **Line:** 2768

---

