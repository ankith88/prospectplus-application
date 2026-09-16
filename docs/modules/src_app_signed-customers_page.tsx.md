# Module: `src/app/signed-customers/page.tsx`

- **Language:** TypeScript
- **Total Lines:** 1772
- **Direct Dependencies:** 36 modules imported

## Exported Symbols & API

### `TYPE` `ProspectWithLeadInfo`

- **Line:** 63
- **Signature:** `{
    place: google.maps.places.PlaceResult;
    existingLead?: MapLead;
    isAdding?: boolean;
    classification?: 'B2B' | 'B2C' | 'Unknown';
    description?: string;
}`

---

### `TYPE` `SortableCompanyKeys`

- **Line:** 71
- **Signature:** `'prospectPlusId' | 'entityId' | 'companyName' | 'franchisee' | 'lastProspected'`

---

### `VARIABLE` `containerStyle`

- **Line:** 73

---

### `VARIABLE` `center`

- **Line:** 79

---

### `FUNCTION` `SignedCustomersPage`

- **Line:** 84
- **Returns:** `void`

---

### `VARIABLE` `router`

- **Line:** 94

---

### `VARIABLE` `isFranchisee`

- **Line:** 96

---

### `VARIABLE` `isAdmin`

- **Line:** 97

---

### `VARIABLE` `autocompleteRef`

- **Line:** 110

---

### `VARIABLE` `geoSearchInputNodeRef`

- **Line:** 111

---

### `VARIABLE` `drawingManagerRef`

- **Line:** 129

---

### `VARIABLE` `geoSearchInputRef`

- **Line:** 149

---

### `VARIABLE` `autocomplete`

- **Line:** 152

---

### `VARIABLE` `place`

- **Line:** 159

---

### `FUNCTION` `fetchData`

- **Line:** 171
- **Async:** Yes

---

### `VARIABLE` `companyMapLeads`

- **Line:** 184

---

### `VARIABLE` `leadMapLeads`

- **Line:** 195

---

### `VARIABLE` `hasAccess`

- **Line:** 214

---

### `FUNCTION` `handleFilterChange`

- **Line:** 231

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `filterName` | `keyof typeof filters` | **Yes** | - | - |
| `value` | `any` | **Yes** | - | - |

---

### `FUNCTION` `clearFilters`

- **Line:** 236

---

### `VARIABLE` `uniqueFranchisees`

- **Line:** 249
- **Signature:** `Option[]`

---

### `VARIABLE` `franchisees`

- **Line:** 250

---

### `VARIABLE` `filteredCompanies`

- **Line:** 254

---

### `VARIABLE` `companyMatch`

- **Line:** 258

---

### `VARIABLE` `franchiseeMatch`

- **Line:** 259

---

### `VARIABLE` `prospectedStatusMatch`

- **Line:** 261

---

### `VARIABLE` `prospectedDateMatch`

- **Line:** 265

---

### `VARIABLE` `prospectedDate`

- **Line:** 267

---

### `VARIABLE` `fromDate`

- **Line:** 268

---

### `VARIABLE` `toDate`

- **Line:** 269

---

### `VARIABLE` `sortedCompanies`

- **Line:** 279

---

### `VARIABLE` `sortableItems`

- **Line:** 280

---

### `VARIABLE` `aValue`

- **Line:** 283
- **Signature:** `string | number | undefined`

---

### `VARIABLE` `bValue`

- **Line:** 284
- **Signature:** `string | number | undefined`

---

### `VARIABLE` `totalPages`

- **Line:** 312

---

### `FUNCTION` `requestSort`

- **Line:** 314

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `key` | `SortableCompanyKeys` | **Yes** | - | - |

---

### `VARIABLE` `direction`

- **Line:** 315
- **Signature:** `'ascending' | 'descending'`

---

### `FUNCTION` `getSortIndicator`

- **Line:** 322

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `key` | `SortableCompanyKeys` | **Yes** | - | - |

---

### `VARIABLE` `paginatedCompanies`

- **Line:** 329

---

### `VARIABLE` `startIndex`

- **Line:** 330

---

### `VARIABLE` `missingIds`

- **Line:** 337

---

### `VARIABLE` `next`

- **Line:** 344

---

### `VARIABLE` `next`

- **Line:** 352

---

### `VARIABLE` `next`

- **Line:** 359

---

### `FUNCTION` `renderServicesCell`

- **Line:** 366

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `services` | `any[]` | No | - | - |

---

### `VARIABLE` `serviceNames`

- **Line:** 371

---

### `VARIABLE` `visibleServices`

- **Line:** 376

---

### `VARIABLE` `remainingServices`

- **Line:** 377

---

### `FUNCTION` `renderLastInvoiceCell`

- **Line:** 410

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `companyId` | `string` | **Yes** | - | - |
| `companyName` | `string` | **Yes** | - | - |

---

### `VARIABLE` `invoice`

- **Line:** 420

---

### `VARIABLE` `statusStr`

- **Line:** 425

---

### `VARIABLE` `lowerStatus`

- **Line:** 426

---

### `VARIABLE` `badgeClass`

- **Line:** 427

---

### `VARIABLE` `totalNum`

- **Line:** 436

---

### `VARIABLE` `mapCompanies`

- **Line:** 463

---

### `VARIABLE` `groupedMapCompanies`

- **Line:** 473

---

### `VARIABLE` `groups`

- **Line:** 474

---

### `VARIABLE` `key`

- **Line:** 476

---

### `VARIABLE` `getPlaceDetails`

- **Line:** 483

---

### `VARIABLE` `placesService`

- **Line:** 485

---

### `VARIABLE` `handleFindNearbyLeads`

- **Line:** 500

---

### `VARIABLE` `selected`

- **Line:** 501

---

### `VARIABLE` `centerLatLng`

- **Line:** 503

---

### `VARIABLE` `nearby`

- **Line:** 505

---

### `VARIABLE` `itemLatLng`

- **Line:** 508

---

### `VARIABLE` `distance`

- **Line:** 509

---

### `VARIABLE` `findProspects`

- **Line:** 523

---

### `VARIABLE` `placesService`

- **Line:** 530

---

### `VARIABLE` `coreName`

- **Line:** 533

---

### `FUNCTION` `handleResults`

- **Line:** 535
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `results` | `google.maps.places.PlaceResult[] | null` | **Yes** | - | - |
| `status` | `any` | **Yes** | - | - |

---

### `VARIABLE` `openProspects`

- **Line:** 537

---

### `VARIABLE` `detailedProspectsPromises`

- **Line:** 539

---

### `VARIABLE` `detailedPlace`

- **Line:** 542

---

### `FUNCTION` `getComponent`

- **Line:** 545

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `type` | `string` | **Yes** | - | - |

---

### `VARIABLE` `prospectSuburb`

- **Line:** 546

---

### `VARIABLE` `prospectPostcode`

- **Line:** 547

---

### `VARIABLE` `isDuplicate`

- **Line:** 549

---

### `VARIABLE` `existingNameLower`

- **Line:** 550

---

### `VARIABLE` `coreNameToMatch`

- **Line:** 552

---

### `VARIABLE` `existingCity`

- **Line:** 557

---

### `VARIABLE` `existingZip`

- **Line:** 558

---

### `VARIABLE` `isSuburbMatch`

- **Line:** 562

---

### `VARIABLE` `isPostcodeMatch`

- **Line:** 563

---

### `VARIABLE` `existingLead`

- **Line:** 569

---

### `VARIABLE` `existingNameLower`

- **Line:** 570

---

### `VARIABLE` `existingCity`

- **Line:** 573

---

### `VARIABLE` `existingZip`

- **Line:** 574

---

### `VARIABLE` `isSuburbMatch`

- **Line:** 578

---

### `VARIABLE` `isPostcodeMatch`

- **Line:** 579

---

### `VARIABLE` `description`

- **Line:** 586

---

### `VARIABLE` `prospectResult`

- **Line:** 589

---

### `VARIABLE` `b2cTypes`

- **Line:** 600

---

### `VARIABLE` `classification`

- **Line:** 601

---

### `VARIABLE` `resolvedProspects`

- **Line:** 606

---

### `VARIABLE` `request`

- **Line:** 624
- **Signature:** `google.maps.places.TextSearchRequest`

---

### `VARIABLE` `request`

- **Line:** 630
- **Signature:** `google.maps.places.PlaceSearchRequest`

---

### `VARIABLE` `handleBulkFindSimilar`

- **Line:** 640

---

### `VARIABLE` `allFoundProspects`

- **Line:** 646

---

### `VARIABLE` `updatedCompanyIds`

- **Line:** 647
- **Signature:** `string[]`

---

### `VARIABLE` `company`

- **Line:** 650

---

### `VARIABLE` `searchKeywords`

- **Line:** 653
- **Signature:** `string[]`

---

### `VARIABLE` `prospectResult`

- **Line:** 656

---

### `VARIABLE` `placesService`

- **Line:** 671

---

### `VARIABLE` `request`

- **Line:** 672
- **Signature:** `google.maps.places.PlaceSearchRequest`

---

### `VARIABLE` `prospectPromises`

- **Line:** 679

---

### `VARIABLE` `isDuplicate`

- **Line:** 681

---

### `VARIABLE` `detailedPlace`

- **Line:** 683

---

### `VARIABLE` `newProspects`

- **Line:** 687

---

### `VARIABLE` `finalProspects`

- **Line:** 700

---

### `VARIABLE` `handleFindSimilar`

- **Line:** 713

---

### `VARIABLE` `selected`

- **Line:** 714

---

### `VARIABLE` `handleFindMultiSites`

- **Line:** 720

---

### `VARIABLE` `selected`

- **Line:** 721

---

### `FUNCTION` `escapeCsvCell`

- **Line:** 728

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `cellData` | `any` | **Yes** | - | - |

---

### `VARIABLE` `stringData`

- **Line:** 732

---

### `FUNCTION` `handleExportProspects`

- **Line:** 739

---

### `VARIABLE` `headers`

- **Line:** 745

---

### `VARIABLE` `rows`

- **Line:** 746

---

### `VARIABLE` `csvContent`

- **Line:** 757

---

### `VARIABLE` `blob`

- **Line:** 758

---

### `VARIABLE` `link`

- **Line:** 759

---

### `VARIABLE` `url`

- **Line:** 760

---

### `FUNCTION` `handleExportCompanies`

- **Line:** 768

---

### `VARIABLE` `headers`

- **Line:** 774

---

### `VARIABLE` `rows`

- **Line:** 775

---

### `VARIABLE` `inv`

- **Line:** 776

---

### `VARIABLE` `servicesStr`

- **Line:** 777

---

### `VARIABLE` `csvContent`

- **Line:** 790

---

### `VARIABLE` `blob`

- **Line:** 791

---

### `VARIABLE` `link`

- **Line:** 792

---

### `VARIABLE` `url`

- **Line:** 793

---

### `FUNCTION` `formatAddress`

- **Line:** 802

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `address` | `Address` | No | - | - |

---

### `VARIABLE` `onMarkerClick`

- **Line:** 807

---

### `VARIABLE` `groupIds`

- **Line:** 810

---

### `VARIABLE` `allSelected`

- **Line:** 811

---

### `VARIABLE` `onInfoWindowClose`

- **Line:** 823

---

### `FUNCTION` `handleAddLeadClick`

- **Line:** 827
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `place` | `google.maps.places.PlaceResult` | **Yes** | - | - |

---

### `VARIABLE` `prospectResult`

- **Line:** 834

---

### `VARIABLE` `hasEmail`

- **Line:** 835

---

### `VARIABLE` `hasPhone`

- **Line:** 836

---

### `VARIABLE` `formattedContacts`

- **Line:** 838
- **Signature:** `Contact[] | undefined`

---

### `FUNCTION` `openCreateLeadPage`

- **Line:** 858

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `place` | `google.maps.places.PlaceResult` | **Yes** | - | - |
| `contacts` | `Contact[]` | No | - | - |

---

### `VARIABLE` `params`

- **Line:** 859

---

### `FUNCTION` `get`

- **Line:** 865

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `type` | `string` | **Yes** | - | - |

---

### `VARIABLE` `street_number`

- **Line:** 866

---

### `VARIABLE` `route`

- **Line:** 867

---

### `VARIABLE` `primaryContact`

- **Line:** 881

---

### `FUNCTION` `handleCreateLeadFromProspect`

- **Line:** 891
- **Async:** Yes

---

### `VARIABLE` `place`

- **Line:** 894

---

### `VARIABLE` `placeId`

- **Line:** 900

---

### `VARIABLE` `duplicateId`

- **Line:** 906

---

### `VARIABLE` `leadCampaign`

- **Line:** 916

---

### `VARIABLE` `primaryContact`

- **Line:** 927
- **Signature:** `Omit<Contact, 'id'> | null`

---

### `VARIABLE` `hunterResult`

- **Line:** 930

---

### `VARIABLE` `firstContact`

- **Line:** 932

---

### `VARIABLE` `websiteDomain`

- **Line:** 945

---

### `VARIABLE` `nameParts`

- **Line:** 953

---

### `VARIABLE` `addressData`

- **Line:** 955
- **Signature:** `Partial<Address>`

---

### `FUNCTION` `get`

- **Line:** 957

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `type` | `string` | **Yes** | - | - |
| `useShortName` | `any` | No | `false` | - |

---

### `VARIABLE` `comp`

- **Line:** 958

---

### `VARIABLE` `newLeadData`

- **Line:** 967

---

### `VARIABLE` `result`

- **Line:** 989

---

### `VARIABLE` `newMapLead`

- **Line:** 993
- **Signature:** `MapLead`

---

### `FUNCTION` `handleSelectAllTable`

- **Line:** 1029

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `checked` | `boolean` | **Yes** | - | - |

---

### `FUNCTION` `handleSelectTableCompany`

- **Line:** 1033

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `companyId` | `string` | **Yes** | - | - |
| `checked` | `boolean` | **Yes** | - | - |

---

### `FUNCTION` `isToday`

- **Line:** 1039

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `dateString` | `string` | **Yes** | - | - |

---

### `VARIABLE` `date`

- **Line:** 1040

---

### `VARIABLE` `today`

- **Line:** 1041

---

### `FUNCTION` `onDrawingComplete`

- **Line:** 1047

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `overlay` | `google.maps.Circle | google.maps.Rectangle | google.maps.Polygon` | **Yes** | - | - |

---

### `VARIABLE` `companiesInShape`

- **Line:** 1048

---

### `VARIABLE` `companyLatLng`

- **Line:** 1050

---

### `FUNCTION` `startDrawing`

- **Line:** 1077

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `mode` | `google.maps.drawing.OverlayType` | **Yes** | - | - |

---

### `FUNCTION` `cancelDrawing`

- **Line:** 1086

---

### `VARIABLE` `hasActiveFilters`

- **Line:** 1108

---

