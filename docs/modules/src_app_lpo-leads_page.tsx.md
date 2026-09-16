# Module: `src/app/lpo-leads/page.tsx`

- **Language:** TypeScript
- **Total Lines:** 1632
- **Direct Dependencies:** 21 modules imported

## Exported Symbols & API

### `INTERFACE` `LpoLead`

- **Line:** 68

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | No | - |
| `prospectPlusId` | `string` | No | - |
| `lpoName` | `string` | No | - |
| `lpoOwnerName` | `string` | No | - |
| `email` | `string` | No | - |
| `phone` | `string` | No | - |
| `city` | `string` | No | - |
| `state` | `string` | No | - |
| `postcode` | `string` | No | - |
| `status` | `string` | No | - |
| `notUsingLpoPlus` | `boolean` | Yes | - |
| `lpoCreatedDate` | `any` | Yes | - |
| `createdAt` | `any` | Yes | - |
| `lastPortalSyncAt` | `any` | Yes | - |
| `createdParentLeadId` | `string | null` | Yes | - |
| `createdChildLeadIds` | `string[] | null` | Yes | - |
| `linkedLeadId` | `string | null` | Yes | - |
| `linkedLeadCompanyName` | `string | null` | Yes | - |
| `linkedCustomerId` | `string | null` | Yes | - |
| `rawCustomerName` | `string | null` | Yes | - |
| `linkStatus` | `string | null` | Yes | - |
| `linkedPartnerLocationId` | `string | null` | Yes | - |
| `linkedPartnerLocationName` | `string | null` | Yes | - |
| `linkedNcl` | `string | null` | Yes | - |
| `linkedFranchiseeName` | `string | null` | Yes | - |
| `companyNameFranchise` | `string | null` | Yes | - |
| `franchisee` | `string | null` | Yes | - |
| `franchiseeName` | `string | null` | Yes | - |
| `assignedFranchisee` | `string | null` | Yes | - |
| `assignedFranchiseeName` | `string | null` | Yes | - |
| `linkedFranchisees` | `any[] | null` | Yes | - |
| `franchisees` | `any[] | null` | Yes | - |

---

### `INTERFACE` `PipelineProgress`

- **Line:** 105

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `currentStep` | `number` | No | - |
| `totalSteps` | `number` | No | - |
| `percentage` | `number` | No | - |
| `statusLabel` | `string` | No | - |
| `badgeClass` | `string` | No | - |
| `isLost` | `boolean` | No | - |
| `milestones` | `Array<{ name: string; completed: boolean }>` | No | - |

---

### `FUNCTION` `getPipelineProgress`

- **Line:** 115
- **Returns:** `PipelineProgress`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `statusStr` | `string` | **Yes** | - | - |

---

### `VARIABLE` `status`

- **Line:** 116

---

### `VARIABLE` `isLost`

- **Line:** 117

---

### `VARIABLE` `isNotUsing`

- **Line:** 118

---

### `VARIABLE` `milestonesList`

- **Line:** 120

---

### `VARIABLE` `currentStep`

- **Line:** 134

---

### `VARIABLE` `milestones`

- **Line:** 162

---

### `VARIABLE` `totalSteps`

- **Line:** 167

---

### `VARIABLE` `percentage`

- **Line:** 168

---

### `VARIABLE` `badgeClass`

- **Line:** 170

---

### `FUNCTION` `LpoLeadsListPage`

- **Line:** 202
- **Returns:** `void`

---

### `VARIABLE` `isFranchisee`

- **Line:** 204

---

### `FUNCTION` `parseDateValue`

- **Line:** 225
- **Returns:** `{ timestamp: number; formatted: string }`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `raw` | `any` | **Yes** | - | - |

---

### `VARIABLE` `date`

- **Line:** 229

---

### `VARIABLE` `date`

- **Line:** 237

---

### `VARIABLE` `str`

- **Line:** 252

---

### `VARIABLE` `dmyMatch`

- **Line:** 255

---

### `VARIABLE` `day`

- **Line:** 257

---

### `VARIABLE` `month`

- **Line:** 258

---

### `VARIABLE` `year`

- **Line:** 259

---

### `VARIABLE` `date`

- **Line:** 260

---

### `VARIABLE` `parsed`

- **Line:** 269

---

### `FUNCTION` `getLeadDateInfo`

- **Line:** 283

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `lead` | `LpoLead` | **Yes** | - | - |

---

### `VARIABLE` `parsed`

- **Line:** 285

---

### `FUNCTION` `getLinkedCrmLead`

- **Line:** 294
- **Returns:** `any`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `l` | `LpoLead` | **Yes** | - | - |

---

### `VARIABLE` `candidateIds`

- **Line:** 296

---

### `FUNCTION` `isLeadOrLinkedSigned`

- **Line:** 312
- **Returns:** `boolean`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `l` | `LpoLead` | **Yes** | - | - |

---

### `VARIABLE` `crmData`

- **Line:** 314

---

### `VARIABLE` `st`

- **Line:** 316

---

### `FUNCTION` `isLeadOrLinkedScfAccepted`

- **Line:** 325
- **Returns:** `boolean`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `l` | `LpoLead` | **Yes** | - | - |

---

### `VARIABLE` `crmData`

- **Line:** 327

---

### `VARIABLE` `st`

- **Line:** 329

---

### `FUNCTION` `isLeadOrLinkedScfSent`

- **Line:** 338
- **Returns:** `boolean`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `l` | `LpoLead` | **Yes** | - | - |

---

### `VARIABLE` `crmData`

- **Line:** 348

---

### `VARIABLE` `st`

- **Line:** 350

---

### `FUNCTION` `getEffectiveLeadStatus`

- **Line:** 368
- **Returns:** `string`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `l` | `LpoLead` | **Yes** | - | - |

---

### `VARIABLE` `wipLeadsRaw`

- **Line:** 389

---

### `VARIABLE` `scfSentLeadsRaw`

- **Line:** 402

---

### `VARIABLE` `scfAcceptedLeadsRaw`

- **Line:** 409

---

### `VARIABLE` `signedLeadsRaw`

- **Line:** 415

---

### `VARIABLE` `accessSentLeadsRaw`

- **Line:** 418

---

### `VARIABLE` `loggedInLeadsRaw`

- **Line:** 421

---

### `VARIABLE` `notUsingLpoPlusLeadsRaw`

- **Line:** 428

---

### `VARIABLE` `activeLeadsRaw`

- **Line:** 431

---

### `VARIABLE` `lostLeadsRaw`

- **Line:** 434

---

### `VARIABLE` `partnerLocationsMap`

- **Line:** 438

---

### `VARIABLE` `map`

- **Line:** 439

---

### `FUNCTION` `getLeadFranchiseeName`

- **Line:** 447
- **Returns:** `string`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `lead` | `LpoLead` | **Yes** | - | - |

---

### `VARIABLE` `zeesArray`

- **Line:** 471

---

### `VARIABLE` `names`

- **Line:** 473

---

### `VARIABLE` `partnerId`

- **Line:** 490

---

### `VARIABLE` `partnerName`

- **Line:** 491

---

### `VARIABLE` `partner`

- **Line:** 493

---

### `VARIABLE` `partnerFran`

- **Line:** 499

---

### `VARIABLE` `pNames`

- **Line:** 509

---

### `VARIABLE` `targetLeadId`

- **Line:** 515

---

### `VARIABLE` `crmLead`

- **Line:** 517

---

### `VARIABLE` `crmFran`

- **Line:** 519

---

### `VARIABLE` `uniqueFranchisees`

- **Line:** 530

---

### `FUNCTION` `handleSyncPortalStatus`

- **Line:** 538
- **Async:** Yes

---

### `VARIABLE` `res`

- **Line:** 541

---

### `VARIABLE` `data`

- **Line:** 545

---

### `FUNCTION` `filterLeadsList`

- **Line:** 566

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadList` | `LpoLead[]` | **Yes** | - | - |

---

### `VARIABLE` `isLpoLoggedIn`

- **Line:** 572

---

### `VARIABLE` `isLost`

- **Line:** 575

---

### `VARIABLE` `leadFran`

- **Line:** 584

---

### `VARIABLE` `term`

- **Line:** 590

---

### `VARIABLE` `formattedCreated`

- **Line:** 591

---

### `VARIABLE` `franName`

- **Line:** 592

---

### `FUNCTION` `handleToggleNotUsingLpoPlus`

- **Line:** 611
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `lead` | `LpoLead` | **Yes** | - | - |

---

### `VARIABLE` `isCurrentlyNotUsing`

- **Line:** 612

---

### `VARIABLE` `newNotUsingState`

- **Line:** 613

---

### `VARIABLE` `newStatus`

- **Line:** 614

---

### `VARIABLE` `docRef`

- **Line:** 617

---

### `VARIABLE` `filteredWipLeads`

- **Line:** 647

---

### `VARIABLE` `filteredScfSentLeads`

- **Line:** 648

---

### `VARIABLE` `filteredScfAcceptedLeads`

- **Line:** 649

---

### `VARIABLE` `filteredSignedLeads`

- **Line:** 650

---

### `VARIABLE` `filteredAccessSentLeads`

- **Line:** 651

---

### `VARIABLE` `filteredLoggedInLeads`

- **Line:** 652

---

### `VARIABLE` `filteredNotUsingLeads`

- **Line:** 653

---

### `VARIABLE` `filteredActiveLeads`

- **Line:** 654

---

### `VARIABLE` `filteredLostLeads`

- **Line:** 655

---

### `VARIABLE` `hasActiveFilters`

- **Line:** 657

---

### `FUNCTION` `handleClearFilters`

- **Line:** 659

---

### `VARIABLE` `autocompleteService`

- **Line:** 670

---

### `VARIABLE` `placesService`

- **Line:** 671

---

### `FUNCTION` `handleAddressInputChange`

- **Line:** 687

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `value` | `string` | **Yes** | - | - |

---

### `FUNCTION` `handleAddressPredictionSelect`

- **Line:** 705

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `prediction` | `google.maps.places.AutocompletePrediction` | **Yes** | - | - |

---

### `VARIABLE` `components`

- **Line:** 716

---

### `VARIABLE` `streetNum`

- **Line:** 717

---

### `VARIABLE` `route`

- **Line:** 718

---

### `VARIABLE` `sub`

- **Line:** 719

---

### `VARIABLE` `st`

- **Line:** 720

---

### `VARIABLE` `pc`

- **Line:** 721

---

### `FUNCTION` `handlePartnerLocationChange`

- **Line:** 741

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `partnerId` | `string` | **Yes** | - | - |

---

### `VARIABLE` `partner`

- **Line:** 744

---

### `FUNCTION` `handleCreateLpoLead`

- **Line:** 773
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `e` | `React.FormEvent` | **Yes** | - | - |

---

### `VARIABLE` `chars`

- **Line:** 786

---

### `VARIABLE` `randomStr`

- **Line:** 787

---

### `VARIABLE` `prospectPlusId`

- **Line:** 791

---

### `VARIABLE` `selectedPartner`

- **Line:** 793

---

### `VARIABLE` `partnerFranName`

- **Line:** 794

---

### `VARIABLE` `newLeadData`

- **Line:** 798

---

### `VARIABLE` `q`

- **Line:** 859

---

### `VARIABLE` `unsubscribe`

- **Line:** 860

---

### `VARIABLE` `leadsData`

- **Line:** 861
- **Signature:** `LpoLead[]`

---

### `VARIABLE` `docsToUpdate`

- **Line:** 862
- **Signature:** `any[]`

---

### `VARIABLE` `data`

- **Line:** 865

---

### `VARIABLE` `status`

- **Line:** 866

---

### `VARIABLE` `batch`

- **Line:** 885

---

### `FUNCTION` `fetchPartners`

- **Line:** 899
- **Async:** Yes

---

### `VARIABLE` `snap`

- **Line:** 901

---

### `VARIABLE` `locs`

- **Line:** 902
- **Signature:** `any[]`

---

### `FUNCTION` `fetchCrmLeads`

- **Line:** 912
- **Async:** Yes

---

### `VARIABLE` `snap`

- **Line:** 914

---

### `VARIABLE` `map`

- **Line:** 915

---

### `VARIABLE` `data`

- **Line:** 917

---

### `FUNCTION` `renderLeadsTable`

- **Line:** 947

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadList` | `LpoLead[]` | **Yes** | - | - |
| `emptyMessage` | `string` | **Yes** | - | - |

---

### `VARIABLE` `effectiveStatus`

- **Line:** 975

---

### `VARIABLE` `progress`

- **Line:** 976

---

### `VARIABLE` `isLost`

- **Line:** 977

---

### `VARIABLE` `isLpoLoggedIn`

- **Line:** 978

---

### `VARIABLE` `isLpoAccessSent`

- **Line:** 979

---

### `VARIABLE` `targetLeadId`

- **Line:** 980

---

### `VARIABLE` `hasLinkedCustomer`

- **Line:** 981

---

### `VARIABLE` `franchiseeName`

- **Line:** 982

---

