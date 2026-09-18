# Module: `src/components/signed-customers/page.tsx`

- **Language:** TypeScript
- **Total Lines:** 1498
- **Direct Dependencies:** 30 modules imported

## Exported Symbols & API

### `TYPE` `ProspectWithLeadInfo`

- **Line:** 57
- **Signature:** `{
    place: google.maps.places.PlaceResult;
    existingLead?: MapLead;
    isAdding?: boolean;
    classification?: 'B2B' | 'B2C' | 'Unknown';
    description?: string;
}`

---

### `TYPE` `SortableCompanyKeys`

- **Line:** 65
- **Signature:** `'entityId' | 'companyName' | 'franchisee' | 'lastProspected'`

---

### `VARIABLE` `containerStyle`

- **Line:** 67

---

### `VARIABLE` `center`

- **Line:** 73

---

### `FUNCTION` `SignedCustomersPage`

- **Line:** 78
- **Returns:** `void`

---

### `VARIABLE` `router`

- **Line:** 88

---

### `VARIABLE` `isFranchisee`

- **Line:** 90

---

### `VARIABLE` `isAdmin`

- **Line:** 91

---

### `VARIABLE` `autocompleteRef`

- **Line:** 100

---

### `VARIABLE` `geoSearchInputNodeRef`

- **Line:** 101

---

### `VARIABLE` `drawingManagerRef`

- **Line:** 119

---

### `VARIABLE` `geoSearchInputRef`

- **Line:** 127

---

### `VARIABLE` `autocomplete`

- **Line:** 130

---

### `VARIABLE` `place`

- **Line:** 137

---

### `FUNCTION` `fetchData`

- **Line:** 149
- **Async:** Yes

---

### `VARIABLE` `companyMapLeads`

- **Line:** 162

---

### `VARIABLE` `leadMapLeads`

- **Line:** 172

---

### `FUNCTION` `handleFilterChange`

- **Line:** 201

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `filterName` | `keyof typeof filters` | **Yes** | - | - |
| `value` | `any` | **Yes** | - | - |

---

### `FUNCTION` `clearFilters`

- **Line:** 206

---

### `VARIABLE` `uniqueFranchisees`

- **Line:** 219
- **Signature:** `Option[]`

---

### `VARIABLE` `franchisees`

- **Line:** 220

---

### `VARIABLE` `filteredCompanies`

- **Line:** 224

---

### `VARIABLE` `companyMatch`

- **Line:** 228

---

### `VARIABLE` `franchiseeMatch`

- **Line:** 229

---

### `VARIABLE` `prospectedStatusMatch`

- **Line:** 231

---

### `VARIABLE` `prospectedDateMatch`

- **Line:** 235

---

### `VARIABLE` `prospectedDate`

- **Line:** 237

---

### `VARIABLE` `fromDate`

- **Line:** 238

---

### `VARIABLE` `toDate`

- **Line:** 239

---

### `VARIABLE` `sortedCompanies`

- **Line:** 249

---

### `VARIABLE` `sortableItems`

- **Line:** 250

---

### `VARIABLE` `aValue`

- **Line:** 253
- **Signature:** `string | number | undefined`

---

### `VARIABLE` `bValue`

- **Line:** 254
- **Signature:** `string | number | undefined`

---

### `FUNCTION` `requestSort`

- **Line:** 279

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `key` | `SortableCompanyKeys` | **Yes** | - | - |

---

### `VARIABLE` `direction`

- **Line:** 280
- **Signature:** `'ascending' | 'descending'`

---

### `FUNCTION` `getSortIndicator`

- **Line:** 287

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `key` | `SortableCompanyKeys` | **Yes** | - | - |

---

### `VARIABLE` `paginatedCompanies`

- **Line:** 294

---

### `VARIABLE` `startIndex`

- **Line:** 295

---

### `VARIABLE` `totalPages`

- **Line:** 299

---

### `VARIABLE` `mapCompanies`

- **Line:** 301

---

### `VARIABLE` `getPlaceDetails`

- **Line:** 311

---

### `VARIABLE` `placesService`

- **Line:** 313

---

### `VARIABLE` `handleFindNearbyLeads`

- **Line:** 328

---

### `VARIABLE` `centerLatLng`

- **Line:** 330

---

### `VARIABLE` `nearby`

- **Line:** 332

---

### `VARIABLE` `itemLatLng`

- **Line:** 335

---

### `VARIABLE` `distance`

- **Line:** 336

---

### `VARIABLE` `findProspects`

- **Line:** 350

---

### `VARIABLE` `placesService`

- **Line:** 357

---

### `VARIABLE` `coreName`

- **Line:** 360

---

### `FUNCTION` `handleResults`

- **Line:** 362
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `results` | `google.maps.places.PlaceResult[] | null` | **Yes** | - | - |
| `status` | `any` | **Yes** | - | - |

---

### `VARIABLE` `openProspects`

- **Line:** 364

---

### `VARIABLE` `detailedProspectsPromises`

- **Line:** 366

---

### `VARIABLE` `detailedPlace`

- **Line:** 369

---

### `FUNCTION` `getComponent`

- **Line:** 372

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `type` | `string` | **Yes** | - | - |

---

### `VARIABLE` `prospectSuburb`

- **Line:** 373

---

### `VARIABLE` `prospectPostcode`

- **Line:** 374

---

### `VARIABLE` `isDuplicate`

- **Line:** 376

---

### `VARIABLE` `existingNameLower`

- **Line:** 377

---

### `VARIABLE` `coreNameToMatch`

- **Line:** 379

---

### `VARIABLE` `existingCity`

- **Line:** 384

---

### `VARIABLE` `existingZip`

- **Line:** 385

---

### `VARIABLE` `isSuburbMatch`

- **Line:** 389

---

### `VARIABLE` `isPostcodeMatch`

- **Line:** 390

---

### `VARIABLE` `existingLead`

- **Line:** 396

---

### `VARIABLE` `existingNameLower`

- **Line:** 397

---

### `VARIABLE` `existingCity`

- **Line:** 400

---

### `VARIABLE` `existingZip`

- **Line:** 401

---

### `VARIABLE` `isSuburbMatch`

- **Line:** 405

---

### `VARIABLE` `isPostcodeMatch`

- **Line:** 406

---

### `VARIABLE` `description`

- **Line:** 413

---

### `VARIABLE` `prospectResult`

- **Line:** 416

---

### `VARIABLE` `b2cTypes`

- **Line:** 427

---

### `VARIABLE` `classification`

- **Line:** 428

---

### `VARIABLE` `resolvedProspects`

- **Line:** 433

---

### `VARIABLE` `request`

- **Line:** 451
- **Signature:** `google.maps.places.TextSearchRequest`

---

### `VARIABLE` `request`

- **Line:** 457
- **Signature:** `google.maps.places.PlaceSearchRequest`

---

### `VARIABLE` `handleBulkFindSimilar`

- **Line:** 467

---

### `VARIABLE` `allFoundProspects`

- **Line:** 473

---

### `VARIABLE` `updatedCompanyIds`

- **Line:** 474
- **Signature:** `string[]`

---

### `VARIABLE` `company`

- **Line:** 477

---

### `VARIABLE` `searchKeywords`

- **Line:** 480
- **Signature:** `string[]`

---

### `VARIABLE` `prospectResult`

- **Line:** 483

---

### `VARIABLE` `placesService`

- **Line:** 499

---

### `VARIABLE` `request`

- **Line:** 500
- **Signature:** `google.maps.places.PlaceSearchRequest`

---

### `VARIABLE` `prospectPromises`

- **Line:** 507

---

### `VARIABLE` `isDuplicate`

- **Line:** 509

---

### `VARIABLE` `detailedPlace`

- **Line:** 511

---

### `VARIABLE` `newProspects`

- **Line:** 515

---

### `VARIABLE` `finalProspects`

- **Line:** 528

---

### `VARIABLE` `handleFindSimilar`

- **Line:** 541

---

### `VARIABLE` `handleFindMultiSites`

- **Line:** 547

---

### `FUNCTION` `escapeCsvCell`

- **Line:** 553

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `cellData` | `any` | **Yes** | - | - |

---

### `VARIABLE` `stringData`

- **Line:** 557

---

### `FUNCTION` `handleExportProspects`

- **Line:** 564

---

### `VARIABLE` `headers`

- **Line:** 570

---

### `VARIABLE` `rows`

- **Line:** 571

---

### `VARIABLE` `csvContent`

- **Line:** 582

---

### `VARIABLE` `blob`

- **Line:** 583

---

### `VARIABLE` `link`

- **Line:** 584

---

### `VARIABLE` `url`

- **Line:** 585

---

### `FUNCTION` `handleExportCompanies`

- **Line:** 593

---

### `VARIABLE` `headers`

- **Line:** 599

---

### `VARIABLE` `rows`

- **Line:** 600

---

### `VARIABLE` `csvContent`

- **Line:** 613

---

### `VARIABLE` `blob`

- **Line:** 614

---

### `VARIABLE` `link`

- **Line:** 615

---

### `VARIABLE` `url`

- **Line:** 616

---

### `FUNCTION` `formatAddress`

- **Line:** 625

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `address` | `Address` | No | - | - |

---

### `VARIABLE` `onMarkerClick`

- **Line:** 630

---

### `VARIABLE` `onInfoWindowClose`

- **Line:** 642

---

### `FUNCTION` `handleAddLeadClick`

- **Line:** 646
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `place` | `google.maps.places.PlaceResult` | **Yes** | - | - |

---

### `VARIABLE` `prospectResult`

- **Line:** 653

---

### `VARIABLE` `hasEmail`

- **Line:** 654

---

### `VARIABLE` `hasPhone`

- **Line:** 655

---

### `VARIABLE` `formattedContacts`

- **Line:** 657
- **Signature:** `Contact[] | undefined`

---

### `FUNCTION` `openCreateLeadPage`

- **Line:** 677

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `place` | `google.maps.places.PlaceResult` | **Yes** | - | - |
| `contacts` | `Contact[]` | No | - | - |

---

### `VARIABLE` `params`

- **Line:** 678

---

### `FUNCTION` `get`

- **Line:** 684

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `type` | `string` | **Yes** | - | - |

---

### `VARIABLE` `street_number`

- **Line:** 685

---

### `VARIABLE` `route`

- **Line:** 686

---

### `VARIABLE` `primaryContact`

- **Line:** 700

---

### `FUNCTION` `handleCreateLeadFromProspect`

- **Line:** 710
- **Async:** Yes

---

### `VARIABLE` `place`

- **Line:** 713

---

### `VARIABLE` `placeId`

- **Line:** 719

---

### `VARIABLE` `duplicateId`

- **Line:** 725

---

### `VARIABLE` `leadCampaign`

- **Line:** 735

---

### `VARIABLE` `primaryContact`

- **Line:** 746
- **Signature:** `Omit<Contact, 'id'> | null`

---

### `VARIABLE` `hunterResult`

- **Line:** 749

---

### `VARIABLE` `firstContact`

- **Line:** 751

---

### `VARIABLE` `websiteDomain`

- **Line:** 764

---

### `VARIABLE` `nameParts`

- **Line:** 772

---

### `VARIABLE` `addressData`

- **Line:** 774
- **Signature:** `Partial<Address>`

---

### `FUNCTION` `get`

- **Line:** 776

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `type` | `string` | **Yes** | - | - |
| `useShortName` | `any` | No | `false` | - |

---

### `VARIABLE` `comp`

- **Line:** 777

---

### `VARIABLE` `newLeadData`

- **Line:** 786

---

### `VARIABLE` `result`

- **Line:** 808

---

### `VARIABLE` `newMapLead`

- **Line:** 812
- **Signature:** `MapLead`

---

### `FUNCTION` `handleSelectAllTable`

- **Line:** 844

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `checked` | `boolean` | **Yes** | - | - |

---

### `FUNCTION` `handleSelectTableCompany`

- **Line:** 848

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `companyId` | `string` | **Yes** | - | - |
| `checked` | `boolean` | **Yes** | - | - |

---

### `FUNCTION` `isToday`

- **Line:** 854

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `dateString` | `string` | **Yes** | - | - |

---

### `VARIABLE` `date`

- **Line:** 855

---

### `VARIABLE` `today`

- **Line:** 856

---

### `FUNCTION` `onDrawingComplete`

- **Line:** 862

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `overlay` | `google.maps.Circle | google.maps.Rectangle | google.maps.Polygon` | **Yes** | - | - |

---

### `VARIABLE` `companiesInShape`

- **Line:** 863

---

### `VARIABLE` `companyLatLng`

- **Line:** 865

---

### `FUNCTION` `startDrawing`

- **Line:** 892

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `mode` | `google.maps.drawing.OverlayType` | **Yes** | - | - |

---

### `FUNCTION` `cancelDrawing`

- **Line:** 901

---

### `VARIABLE` `hasActiveFilters`

- **Line:** 914

---

