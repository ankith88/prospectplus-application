# Module: `src/components/discover-multisites-dialog.tsx`

- **Language:** TypeScript
- **Total Lines:** 1380
- **Direct Dependencies:** 16 modules imported

## Exported Symbols & API

### `INTERFACE` `DiscoveredLocation`

- **Line:** 48

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | No | - |
| `name` | `string` | No | - |
| `formattedAddress` | `string` | No | - |
| `street` | `string` | Yes | - |
| `suburb` | `string` | Yes | - |
| `state` | `string` | Yes | - |
| `postcode` | `string` | Yes | - |
| `phone` | `string` | Yes | - |
| `email` | `string` | Yes | - |
| `website` | `string` | Yes | - |
| `source` | `'AI / Website' | 'Hunter.io' | 'Google Maps'` | No | - |
| `status` | `'Signed Customer' | 'Lead' | 'Not in System'` | No | - |
| `existingRecord` | `MapLead` | Yes | - |
| `place` | `any` | Yes | - |
| `servicingFranchisee` | `{ name: string; internalId: string }` | Yes | - |
| `isCreatingLead` | `boolean` | Yes | - |
| `createdLeadId` | `string` | Yes | - |

---

### `INTERFACE` `DiscoverMultiSitesDialogProps`

- **Line:** 70

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `isOpen` | `boolean` | No | - |
| `onOpenChange` | `(open: boolean) => void` | No | - |
| `parentCompany` | `MapLead | Lead | null` | Yes | - |
| `allSystemRecords` | `MapLead[]` | Yes | - |
| `map` | `google.maps.Map | null` | Yes | - |
| `onAddMultiSiteLead` | `(location: DiscoveredLocation | google.maps.places.PlaceResult) => void` | Yes | - |
| `onLocationsUpdated` | `() => void` | Yes | - |

---

### `FUNCTION` `DiscoverMultiSitesDialog`

- **Line:** 80
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{
  isOpen,
  onOpenChange,
  parentCompany = null,
  allSystemRecords = [],
  map = null,
  onAddMultiSiteLead,
  onLocationsUpdated,
}` | `DiscoverMultiSitesDialogProps` | **Yes** | - | - |

---

### `FUNCTION` `handleOpenAddLocationModal`

- **Line:** 114

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `item` | `DiscoveredLocation` | **Yes** | - | - |

---

### `FUNCTION` `loadSystemRecords`

- **Line:** 122
- **Async:** Yes
- **Returns:** `void`

---

### `VARIABLE` `leadsData`

- **Line:** 129
- **Signature:** `MapLead[]`

---

### `VARIABLE` `data`

- **Line:** 130

---

### `VARIABLE` `companiesData`

- **Line:** 148
- **Signature:** `MapLead[]`

---

### `VARIABLE` `data`

- **Line:** 149

---

### `FUNCTION` `handleAutoFindWebsite`

- **Line:** 189
- **Async:** Yes

---

### `VARIABLE` `targetName`

- **Line:** 190

---

### `VARIABLE` `companyEmail`

- **Line:** 191

---

### `VARIABLE` `res`

- **Line:** 203

---

### `VARIABLE` `detailMsg`

- **Line:** 206

---

### `FUNCTION` `handleSaveWebsiteToRecord`

- **Line:** 225
- **Async:** Yes

---

### `VARIABLE` `rawUrl`

- **Line:** 226

---

### `VARIABLE` `targetRecord`

- **Line:** 243
- **Signature:** `MapLead | Lead | null`

---

### `VARIABLE` `targetId`

- **Line:** 244

---

### `VARIABLE` `targetName`

- **Line:** 245

---

### `VARIABLE` `recordsToSearch`

- **Line:** 247

---

### `VARIABLE` `cleanTargetName`

- **Line:** 251

---

### `VARIABLE` `matched`

- **Line:** 252

---

### `VARIABLE` `name`

- **Line:** 253

---

### `VARIABLE` `updatePayload`

- **Line:** 263

---

### `VARIABLE` `updatePromises`

- **Line:** 269
- **Signature:** `Promise<any>[]`

---

### `VARIABLE` `updatedCollections`

- **Line:** 270
- **Signature:** `string[]`

---

### `VARIABLE` `leadRef`

- **Line:** 273

---

### `VARIABLE` `companyRef`

- **Line:** 274

---

### `VARIABLE` `isComp`

- **Line:** 292

---

### `VARIABLE` `primaryRef`

- **Line:** 293

---

### `VARIABLE` `matchLocationToDatabase`

- **Line:** 365

---

### `VARIABLE` `activeName`

- **Line:** 369

---

### `VARIABLE` `parentCoreName`

- **Line:** 370

---

### `VARIABLE` `locNameClean`

- **Line:** 376

---

### `FUNCTION` `stripUnitAndLevel`

- **Line:** 382

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `addr` | `string` | **Yes** | - | - |

---

### `FUNCTION` `cleanAddressStr`

- **Line:** 390

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `addr` | `string` | **Yes** | - | - |

---

### `VARIABLE` `locSuburb`

- **Line:** 408

---

### `VARIABLE` `locPostcode`

- **Line:** 409

---

### `VARIABLE` `locStreetRaw`

- **Line:** 410

---

### `VARIABLE` `locStreetClean`

- **Line:** 411

---

### `VARIABLE` `locFullAddrClean`

- **Line:** 412

---

### `VARIABLE` `recordMap`

- **Line:** 415

---

### `VARIABLE` `recordsToSearch`

- **Line:** 420

---

### `VARIABLE` `matchedRecord`

- **Line:** 422

---

### `VARIABLE` `isParentOrChild`

- **Line:** 423

---

### `VARIABLE` `recNameClean`

- **Line:** 424

---

### `VARIABLE` `isNameMatch`

- **Line:** 430

---

### `VARIABLE` `recAddress`

- **Line:** 437

---

### `VARIABLE` `recCity`

- **Line:** 438

---

### `VARIABLE` `recZip`

- **Line:** 439

---

### `VARIABLE` `recStreetRaw`

- **Line:** 441

---

### `VARIABLE` `parts`

- **Line:** 449

---

### `VARIABLE` `pcMatch`

- **Line:** 453

---

### `VARIABLE` `recStreetClean`

- **Line:** 458

---

### `VARIABLE` `recFullAddrClean`

- **Line:** 459

---

### `VARIABLE` `p1`

- **Line:** 463

---

### `VARIABLE` `p2`

- **Line:** 464

---

### `VARIABLE` `dist`

- **Line:** 465

---

### `VARIABLE` `streetOverlap`

- **Line:** 471

---

### `VARIABLE` `suburbOverlap`

- **Line:** 472

---

### `VARIABLE` `zipOverlap`

- **Line:** 473

---

### `VARIABLE` `zipOverlap`

- **Line:** 494

---

### `VARIABLE` `suburbOverlap`

- **Line:** 495

---

### `VARIABLE` `performDiscovery`

- **Line:** 522

---

### `VARIABLE` `targetName`

- **Line:** 523

---

### `VARIABLE` `coreName`

- **Line:** 534

---

### `VARIABLE` `currentWebsiteStr`

- **Line:** 535

---

### `VARIABLE` `websiteUrl`

- **Line:** 536

---

### `VARIABLE` `rawDiscovered`

- **Line:** 537
- **Signature:** `DiscoveredLocation[]`

---

### `VARIABLE` `aiResult`

- **Line:** 541

---

### `VARIABLE` `match`

- **Line:** 555

---

### `VARIABLE` `dummyNode`

- **Line:** 597

---

### `VARIABLE` `placesService`

- **Line:** 598

---

### `VARIABLE` `request`

- **Line:** 602
- **Signature:** `google.maps.places.TextSearchRequest`

---

### `VARIABLE` `operationalResults`

- **Line:** 610

---

### `FUNCTION` `getComponent`

- **Line:** 613

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `type` | `string` | **Yes** | - | - |
| `useShort` | `any` | No | `false` | - |

---

### `VARIABLE` `comp`

- **Line:** 614

---

### `VARIABLE` `suburb`

- **Line:** 618

---

### `VARIABLE` `postcode`

- **Line:** 619

---

### `VARIABLE` `state`

- **Line:** 620

---

### `VARIABLE` `street`

- **Line:** 621

---

### `VARIABLE` `fmtAddr`

- **Line:** 625

---

### `VARIABLE` `pcMatch`

- **Line:** 627

---

### `VARIABLE` `parts`

- **Line:** 632

---

### `VARIABLE` `lat`

- **Line:** 643

---

### `VARIABLE` `lng`

- **Line:** 644

---

### `VARIABLE` `match`

- **Line:** 646

---

### `VARIABLE` `existingIndex`

- **Line:** 658

---

### `VARIABLE` `addrMatch`

- **Line:** 659

---

### `VARIABLE` `suburbMatch`

- **Line:** 660

---

### `VARIABLE` `existing`

- **Line:** 666

---

### `VARIABLE` `fullAddr`

- **Line:** 667

---

### `VARIABLE` `dummyNode`

- **Line:** 710

---

### `VARIABLE` `placesService`

- **Line:** 711

---

### `VARIABLE` `item`

- **Line:** 716

---

### `VARIABLE` `fullAddrStr`

- **Line:** 717

---

### `VARIABLE` `targetedQuery`

- **Line:** 719

---

### `VARIABLE` `place`

- **Line:** 723

---

### `FUNCTION` `getComp`

- **Line:** 724

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `type` | `string` | **Yes** | - | - |
| `useShort` | `any` | No | `false` | - |

---

### `VARIABLE` `comp`

- **Line:** 725

---

### `VARIABLE` `suburb`

- **Line:** 728

---

### `VARIABLE` `postcode`

- **Line:** 729

---

### `VARIABLE` `state`

- **Line:** 730

---

### `VARIABLE` `streetNumRoute`

- **Line:** 731

---

### `VARIABLE` `fullAddr`

- **Line:** 732

---

### `VARIABLE` `enrichedList`

- **Line:** 758

---

### `VARIABLE` `franchiseeInfo`

- **Line:** 761

---

### `FUNCTION` `handleCreateChildLeadInNetSuite`

- **Line:** 801
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `item` | `DiscoveredLocation` | **Yes** | - | - |

---

### `VARIABLE` `targetParentId`

- **Line:** 802

---

### `VARIABLE` `siteAddress`

- **Line:** 815
- **Signature:** `Address`

---

### `VARIABLE` `localManager`

- **Line:** 824

---

### `VARIABLE` `customFranchisee`

- **Line:** 832

---

### `VARIABLE` `copiedContacts`

- **Line:** 833

---

### `VARIABLE` `childLeadId`

- **Line:** 836

---

### `VARIABLE` `next`

- **Line:** 879

---

### `FUNCTION` `handleBatchCreateSelected`

- **Line:** 887
- **Async:** Yes

---

### `VARIABLE` `itemsToCreate`

- **Line:** 888

---

### `VARIABLE` `successCount`

- **Line:** 898

---

### `VARIABLE` `filteredLocations`

- **Line:** 917

---

### `VARIABLE` `q`

- **Line:** 924

---

### `VARIABLE` `nameMatch`

- **Line:** 925

---

### `VARIABLE` `addrMatch`

- **Line:** 926

---

### `VARIABLE` `suburbMatch`

- **Line:** 927

---

### `VARIABLE` `stateMatch`

- **Line:** 928

---

### `VARIABLE` `franchiseeMatch`

- **Line:** 929

---

### `VARIABLE` `countSigned`

- **Line:** 937

---

### `VARIABLE` `countLeads`

- **Line:** 938

---

### `VARIABLE` `countNew`

- **Line:** 939

---

### `VARIABLE` `allFilteredSelected`

- **Line:** 941

---

### `FUNCTION` `toggleSelectAll`

- **Line:** 943

---

### `VARIABLE` `newSet`

- **Line:** 947

---

### `FUNCTION` `toggleSelectLocation`

- **Line:** 957

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `string` | **Yes** | - | - |

---

### `VARIABLE` `next`

- **Line:** 959

---

### `VARIABLE` `isCreating`

- **Line:** 1172

---

### `VARIABLE` `isSelected`

- **Line:** 1173

---

