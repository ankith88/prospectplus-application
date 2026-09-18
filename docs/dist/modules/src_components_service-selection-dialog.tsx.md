# Module: `src/components/service-selection-dialog.tsx`

- **Language:** TypeScript
- **Total Lines:** 3551
- **Direct Dependencies:** 42 modules imported

## Exported Symbols & API

### `INTERFACE` `Template`

- **Line:** 61

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | No | - |
| `name` | `string` | No | - |
| `subject` | `string` | Yes | - |
| `body` | `string` | Yes | - |
| `htmlContent` | `string` | Yes | - |
| `content` | `string` | Yes | - |

---

### `FUNCTION` `getSuffixedName`

- **Line:** 70

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `baseName` | `string` | **Yes** | - | - |
| `currentSelections` | `string[]` | **Yes** | - | - |

---

### `VARIABLE` `count`

- **Line:** 71

---

### `VARIABLE` `suffix`

- **Line:** 75

---

### `VARIABLE` `days`

- **Line:** 84

---

### `VARIABLE` `VALID_ACCOUNT_MANAGERS`

- **Line:** 86

---

### `VARIABLE` `formSchema`

- **Line:** 88

---

### `TYPE` `FormValues`

- **Line:** 104
- **Signature:** `z.infer<typeof formSchema>`

---

### `INTERFACE` `ServiceSelectionDialogProps`

- **Line:** 106

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `isOpen` | `boolean` | No | - |
| `onOpenChange` | `(open: boolean) => void` | No | - |
| `lead` | `Lead | null` | No | - |
| `mode` | `'Free Trial' | 'Signup' | 'Quote' | 'Resend SCF' | 'Confirm Signup' | 'Resell'` | No | - |
| `onSuccess` | `() => void` | Yes | - |
| `scfId` | `string` | Yes | - |

---

### `FUNCTION` `ServiceSelectionDialog`

- **Line:** 115
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{
  isOpen,
  onOpenChange,
  lead,
  mode,
  onSuccess,
  scfId,
}` | `ServiceSelectionDialogProps` | **Yes** | - | - |

---

### `FUNCTION` `initSelectionType`

- **Line:** 133
- **Async:** Yes
- **Returns:** `void`

---

### `VARIABLE` `scfs`

- **Line:** 144

---

### `VARIABLE` `latest`

- **Line:** 147

---

### `VARIABLE` `hasProds`

- **Line:** 148

---

### `VARIABLE` `hasServs`

- **Line:** 149

---

### `VARIABLE` `isLpoProcessLead`

- **Line:** 211

---

### `VARIABLE` `isLpoNetworkBucket`

- **Line:** 221

---

### `FUNCTION` `resolveLpoCcEmails`

- **Line:** 223
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `baseCc` | `string` | **Yes** | - | - |

---

### `VARIABLE` `ccList`

- **Line:** 224

---

### `VARIABLE` `parentId`

- **Line:** 229

---

### `VARIABLE` `childDocs`

- **Line:** 230
- **Signature:** `any[]`

---

### `VARIABLE` `qChild`

- **Line:** 233

---

### `VARIABLE` `childSnap`

- **Line:** 234

---

### `VARIABLE` `createdChildIds`

- **Line:** 238

---

### `VARIABLE` `cSnap`

- **Line:** 243

---

### `VARIABLE` `franSnap`

- **Line:** 250

---

### `VARIABLE` `franchiseesList`

- **Line:** 251

---

### `VARIABLE` `emailFound`

- **Line:** 256

---

### `VARIABLE` `childZeeId`

- **Line:** 259

---

### `VARIABLE` `childZeeName`

- **Line:** 260

---

### `VARIABLE` `matchedZee`

- **Line:** 262

---

### `FUNCTION` `triggerNetSuiteQuoteForChildLeads`

- **Line:** 287
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `parentLead` | `Lead` | **Yes** | - | - |
| `quotePayload` | `{
      operation: string;
      services: any[];
      commDateVal: string;
      amNameVal: string;
      salesRepId: string;
      contactIdVal: string;
      salesRecordIdVal: string;
      createShipMateAccount?: boolean;
    }` | **Yes** | - | - |

---

### `VARIABLE` `parentId`

- **Line:** 301

---

### `VARIABLE` `childDocs`

- **Line:** 302
- **Signature:** `any[]`

---

### `VARIABLE` `qChild`

- **Line:** 304

---

### `VARIABLE` `childSnap`

- **Line:** 305

---

### `VARIABLE` `cSnap`

- **Line:** 312

---

### `VARIABLE` `childNsId`

- **Line:** 324

---

### `FUNCTION` `fetchPartnerLocations`

- **Line:** 382
- **Async:** Yes
- **Returns:** `void`

---

### `VARIABLE` `snap`

- **Line:** 384

---

### `VARIABLE` `locs`

- **Line:** 385

---

### `VARIABLE` `currentLead`

- **Line:** 388

---

### `VARIABLE` `targetId`

- **Line:** 389

---

### `VARIABLE` `targetName`

- **Line:** 390

---

### `VARIABLE` `pre`

- **Line:** 393

---

### `VARIABLE` `pre`

- **Line:** 399

---

### `FUNCTION` `resolveAmEmail`

- **Line:** 413
- **Async:** Yes

---

### `VARIABLE` `amAssigned`

- **Line:** 414

---

### `VARIABLE` `usersRef`

- **Line:** 420

---

### `VARIABLE` `docRef`

- **Line:** 422

---

### `VARIABLE` `docSnap`

- **Line:** 423

---

### `VARIABLE` `qDisplayName`

- **Line:** 429

---

### `VARIABLE` `snapDisplayName`

- **Line:** 430

---

### `VARIABLE` `qAll`

- **Line:** 436

---

### `VARIABLE` `snapAll`

- **Line:** 437

---

### `VARIABLE` `name`

- **Line:** 438

---

### `VARIABLE` `found`

- **Line:** 439

---

### `VARIABLE` `data`

- **Line:** 440

---

### `VARIABLE` `fullName`

- **Line:** 441

---

### `VARIABLE` `dispName`

- **Line:** 442

---

### `VARIABLE` `emailName`

- **Line:** 443

---

### `VARIABLE` `groupedTemplates`

- **Line:** 466

---

### `VARIABLE` `groups`

- **Line:** 467
- **Signature:** `{ campaignId: string; campaignName: string; templates: Template[] }[]`

---

### `VARIABLE` `campTemplates`

- **Line:** 470

---

### `VARIABLE` `linkedTemplateIds`

- **Line:** 480

---

### `VARIABLE` `unlinkedTemplates`

- **Line:** 484

---

### `VARIABLE` `groupedUsers`

- **Line:** 496

---

### `VARIABLE` `filtered`

- **Line:** 497

---

### `VARIABLE` `loggedInRoles`

- **Line:** 499

---

### `FUNCTION` `hasRole`

- **Line:** 500

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `roleNames` | `string[]` | **Yes** | - | - |

---

### `VARIABLE` `isAccountManagerUser`

- **Line:** 504

---

### `VARIABLE` `isDialerUser`

- **Line:** 505

---

### `FUNCTION` `userHasRole`

- **Line:** 507

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `u` | `any` | **Yes** | - | - |
| `roleNames` | `string[]` | **Yes** | - | - |

---

### `VARIABLE` `normalizedNames`

- **Line:** 508

---

### `VARIABLE` `rolesToCheck`

- **Line:** 509

---

### `FUNCTION` `getGroupRoleName`

- **Line:** 524
- **Returns:** `string`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `u` | `any` | **Yes** | - | - |

---

### `VARIABLE` `primaryRole`

- **Line:** 525

---

### `VARIABLE` `lower`

- **Line:** 526

---

### `VARIABLE` `groups`

- **Line:** 541
- **Signature:** `Record<string, any[]>`

---

### `VARIABLE` `groupName`

- **Line:** 543

---

### `VARIABLE` `nameA`

- **Line:** 552

---

### `VARIABLE` `nameB`

- **Line:** 553

---

### `VARIABLE` `sortedGroupNames`

- **Line:** 558

---

### `VARIABLE` `form`

- **Line:** 574

---

### `VARIABLE` `currentServices`

- **Line:** 590

---

### `VARIABLE` `currentRates`

- **Line:** 594

---

### `VARIABLE` `currentFreqs`

- **Line:** 598

---

### `FUNCTION` `fetchFran`

- **Line:** 608
- **Async:** Yes

---

### `VARIABLE` `f`

- **Line:** 609
- **Signature:** `Franchisee | null`

---

### `VARIABLE` `fIdStr`

- **Line:** 612

---

### `VARIABLE` `fDoc`

- **Line:** 613

---

### `VARIABLE` `q1`

- **Line:** 617

---

### `VARIABLE` `snap1`

- **Line:** 618

---

### `VARIABLE` `q2`

- **Line:** 622

---

### `VARIABLE` `snap2`

- **Line:** 623

---

### `VARIABLE` `eligible`

- **Line:** 639

---

### `VARIABLE` `formattedServices`

- **Line:** 657

---

### `FUNCTION` `fetchSurcharge`

- **Line:** 667
- **Async:** Yes

---

### `VARIABLE` `res`

- **Line:** 669

---

### `VARIABLE` `data`

- **Line:** 670

---

### `FUNCTION` `fetchProducts`

- **Line:** 680
- **Async:** Yes

---

### `VARIABLE` `q`

- **Line:** 683

---

### `VARIABLE` `snapshot`

- **Line:** 688

---

### `VARIABLE` `EXCLUDED_PRODUCTS`

- **Line:** 689

---

### `VARIABLE` `fetchedProducts`

- **Line:** 694

---

### `VARIABLE` `plans`

- **Line:** 698

---

### `VARIABLE` `defaultPlanProds`

- **Line:** 710

---

### `FUNCTION` `fetchTemplates`

- **Line:** 723
- **Async:** Yes
- **Returns:** `void`

---

### `VARIABLE` `list`

- **Line:** 729

---

### `FUNCTION` `fetchUsers`

- **Line:** 736
- **Async:** Yes
- **Returns:** `void`

---

### `VARIABLE` `snap`

- **Line:** 738

---

### `VARIABLE` `list`

- **Line:** 739

---

### `VARIABLE` `initialSelectedServices`

- **Line:** 749
- **Signature:** `string[]`

---

### `VARIABLE` `initialFrequencies`

- **Line:** 750
- **Signature:** `Record<string, any>`

---

### `VARIABLE` `initialRates`

- **Line:** 751
- **Signature:** `Record<string, any>`

---

### `VARIABLE` `startDate`

- **Line:** 752

---

### `VARIABLE` `hasLocalMile`

- **Line:** 763

---

### `VARIABLE` `currentSelectionType`

- **Line:** 772

---

### `VARIABLE` `validContacts`

- **Line:** 779

---

### `VARIABLE` `defaultContact`

- **Line:** 780

---

### `VARIABLE` `defaultContactId`

- **Line:** 781

---

### `VARIABLE` `hasExistingLocalMileAccess`

- **Line:** 783

---

### `FUNCTION` `generateServiceTableHtml`

- **Line:** 818

---

### `VARIABLE` `values`

- **Line:** 819

---

### `VARIABLE` `selectedServices`

- **Line:** 820

---

### `VARIABLE` `html`

- **Line:** 823

---

### `VARIABLE` `rawFreq`

- **Line:** 836

---

### `VARIABLE` `freqDisplay`

- **Line:** 837

---

### `VARIABLE` `rate`

- **Line:** 838

---

### `VARIABLE` `cleanName`

- **Line:** 840

---

### `VARIABLE` `matchedService`

- **Line:** 841

---

### `VARIABLE` `displayName`

- **Line:** 846

---

### `FUNCTION` `generateProductTableHtml`

- **Line:** 861

---

### `VARIABLE` `html`

- **Line:** 864

---

### `VARIABLE` `sortedSelected`

- **Line:** 877

---

### `FUNCTION` `parseWeight`

- **Line:** 878

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `p` | `any` | **Yes** | - | - |

---

### `VARIABLE` `weightStr`

- **Line:** 879

---

### `VARIABLE` `match`

- **Line:** 880

---

### `VARIABLE` `basePrice`

- **Line:** 887

---

### `VARIABLE` `surchargePerc`

- **Line:** 888

---

### `VARIABLE` `surchargeAmt`

- **Line:** 889

---

### `VARIABLE` `totalVal`

- **Line:** 890

---

### `FUNCTION` `resolvePlaceholders`

- **Line:** 906

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `text` | `string` | **Yes** | - | - |

---

### `VARIABLE` `selectedContactIds`

- **Line:** 908

---

### `VARIABLE` `primaryContact`

- **Line:** 909

---

### `VARIABLE` `contactName`

- **Line:** 910

---

### `VARIABLE` `firstName`

- **Line:** 911

---

### `VARIABLE` `salesRepName`

- **Line:** 912

---

### `VARIABLE` `scfUrl`

- **Line:** 913

---

### `VARIABLE` `amUser`

- **Line:** 916

---

### `VARIABLE` `fullName`

- **Line:** 917

---

### `VARIABLE` `dispName`

- **Line:** 918

---

### `VARIABLE` `emailName`

- **Line:** 919

---

### `VARIABLE` `amAssigned`

- **Line:** 920

---

### `VARIABLE` `amMobile`

- **Line:** 923

---

### `VARIABLE` `amCalendly`

- **Line:** 924

---

### `VARIABLE` `startDateVal`

- **Line:** 927

---

### `VARIABLE` `formattedStartDate`

- **Line:** 928

---

### `VARIABLE` `resolved`

- **Line:** 930

---

### `VARIABLE` `franName`

- **Line:** 932

---

### `VARIABLE` `franContact`

- **Line:** 933

---

### `VARIABLE` `franEmailVal`

- **Line:** 934

---

### `VARIABLE` `franMobileVal`

- **Line:** 935

---

### `VARIABLE` `localMileLink`

- **Line:** 937

---

### `VARIABLE` `localMileActivationLink`

- **Line:** 938

---

### `VARIABLE` `localMileSecurityCode`

- **Line:** 939

---

### `VARIABLE` `sofPublicLink`

- **Line:** 940

---

### `VARIABLE` `currentSenderEmail`

- **Line:** 972

---

### `VARIABLE` `senderUser`

- **Line:** 973

---

### `VARIABLE` `senderNameVal`

- **Line:** 974

---

### `VARIABLE` `senderPhoneVal`

- **Line:** 975

---

### `VARIABLE` `senderSignatureVal`

- **Line:** 976

---

### `VARIABLE` `thermoguardLinkVal`

- **Line:** 984

---

### `VARIABLE` `tableHtml`

- **Line:** 992

---

### `VARIABLE` `prodTableHtml`

- **Line:** 997

---

### `FUNCTION` `insertContent`

- **Line:** 1006

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `htmlContent` | `string` | **Yes** | - | - |

---

### `VARIABLE` `subjectInput`

- **Line:** 1007

---

### `VARIABLE` `start`

- **Line:** 1009

---

### `VARIABLE` `end`

- **Line:** 1010

---

### `VARIABLE` `text`

- **Line:** 1011

---

### `VARIABLE` `before`

- **Line:** 1012

---

### `VARIABLE` `after`

- **Line:** 1013

---

### `VARIABLE` `newSubject`

- **Line:** 1014

---

### `FUNCTION` `applyTemplate`

- **Line:** 1025

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `templateId` | `string` | **Yes** | - | - |

---

### `VARIABLE` `template`

- **Line:** 1035

---

### `VARIABLE` `parsedBody`

- **Line:** 1037

---

### `VARIABLE` `resolvedBody`

- **Line:** 1038

---

### `VARIABLE` `resolvedSubject`

- **Line:** 1039

---

### `FUNCTION` `handleSendEmail`

- **Line:** 1049
- **Async:** Yes

---

### `VARIABLE` `finalHtml`

- **Line:** 1053

---

### `VARIABLE` `finalSubject`

- **Line:** 1054

---

### `VARIABLE` `res`

- **Line:** 1057

---

### `VARIABLE` `data`

- **Line:** 1078

---

### `VARIABLE` `isCompanyOrSignedCustomer`

- **Line:** 1081

---

### `VARIABLE` `isResendingQuote`

- **Line:** 1087

---

### `VARIABLE` `response`

- **Line:** 1101

---

### `VARIABLE` `result`

- **Line:** 1119

---

### `VARIABLE` `activityNotes`

- **Line:** 1126

---

### `FUNCTION` `handleCompleteWithoutEmail`

- **Line:** 1150
- **Async:** Yes

---

### `VARIABLE` `isCompanyOrSignedCustomer`

- **Line:** 1155

---

### `VARIABLE` `isResendingQuote`

- **Line:** 1161

---

### `VARIABLE` `activityNotes`

- **Line:** 1179

---

### `VARIABLE` `selectedServices`

- **Line:** 1204

---

### `VARIABLE` `selectedContactId`

- **Line:** 1205

---

### `VARIABLE` `primaryContactRender`

- **Line:** 1206

---

### `VARIABLE` `watchCreateLocalMileAccount`

- **Line:** 1207

---

### `VARIABLE` `hasLocalMileAccessRender`

- **Line:** 1208

---

### `VARIABLE` `watchedStartDate`

- **Line:** 1216

---

### `VARIABLE` `watchedContactIds`

- **Line:** 1217

---

### `VARIABLE` `hasAmpoService`

- **Line:** 1225

---

### `FUNCTION` `handleDateSelect`

- **Line:** 1227

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `range` | `DateRange | undefined` | **Yes** | - | - |
| `onChange` | `(...event: any[]) => void` | **Yes** | - | - |

---

### `FUNCTION` `handleContactAdded`

- **Line:** 1244

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `newContact` | `Contact` | **Yes** | - | - |

---

### `VARIABLE` `currentIds`

- **Line:** 1248

---

### `FUNCTION` `handleSubmit`

- **Line:** 1254
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `values` | `FormValues` | **Yes** | - | - |

---

### `VARIABLE` `validC`

- **Line:** 1258

---

### `VARIABLE` `defC`

- **Line:** 1261

---

### `VARIABLE` `defId`

- **Line:** 1262

---

### `VARIABLE` `selectedContacts`

- **Line:** 1289

---

### `VARIABLE` `contactEmails`

- **Line:** 1290

---

### `VARIABLE` `emailTo`

- **Line:** 1291

---

### `VARIABLE` `amUser`

- **Line:** 1293

---

### `VARIABLE` `defaultSenderEmail`

- **Line:** 1294

---

### `VARIABLE` `invalidRateService`

- **Line:** 1328

---

### `VARIABLE` `r`

- **Line:** 1329

---

### `VARIABLE` `hasAmpo`

- **Line:** 1345

---

### `VARIABLE` `validC`

- **Line:** 1384

---

### `VARIABLE` `defC`

- **Line:** 1387

---

### `VARIABLE` `defId`

- **Line:** 1388

---

### `FUNCTION` `handleConfirm`

- **Line:** 1441
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `values` | `FormValues` | **Yes** | - | - |

---

### `VARIABLE` `isLpoProcessLead`

- **Line:** 1444

---

### `VARIABLE` `serviceSelections`

- **Line:** 1465

---

### `VARIABLE` `svc`

- **Line:** 1466
- **Signature:** `any`

---

### `VARIABLE` `trialDates`

- **Line:** 1483

---

### `VARIABLE` `nsResponse`

- **Line:** 1488

---

### `VARIABLE` `premiumPlan`

- **Line:** 1508

---

### `VARIABLE` `expressPlan`

- **Line:** 1509

---

### `VARIABLE` `pricingTable`

- **Line:** 1510

---

### `VARIABLE` `suburbMapping`

- **Line:** 1511

---

### `VARIABLE` `collectionName`

- **Line:** 1513

---

### `VARIABLE` `salesRepIdMap`

- **Line:** 1522
- **Signature:** `Record<string, string>`

---

### `VARIABLE` `selectedAm`

- **Line:** 1531

---

### `VARIABLE` `isValidAmAssigned`

- **Line:** 1532

---

### `VARIABLE` `usersRef`

- **Line:** 1535

---

### `VARIABLE` `q`

- **Line:** 1536

---

### `VARIABLE` `snap`

- **Line:** 1537

---

### `VARIABLE` `ams`

- **Line:** 1538

---

### `VARIABLE` `poolNames`

- **Line:** 1540

---

### `VARIABLE` `pool`

- **Line:** 1541

---

### `VARIABLE` `availableAms`

- **Line:** 1543

---

### `VARIABLE` `backups`

- **Line:** 1546

---

### `VARIABLE` `randomIndex`

- **Line:** 1553

---

### `VARIABLE` `assignedUser`

- **Line:** 1554

---

### `VARIABLE` `salesRepId`

- **Line:** 1563

---

### `VARIABLE` `mappedServices`

- **Line:** 1565

---

### `VARIABLE` `matchingService`

- **Line:** 1566

---

### `VARIABLE` `freqStr`

- **Line:** 1568

---

### `VARIABLE` `daysMap`

- **Line:** 1572

---

### `VARIABLE` `boolArr`

- **Line:** 1573

---

### `VARIABLE` `opName`

- **Line:** 1585

---

### `VARIABLE` `customerIdVal`

- **Line:** 1586

---

### `VARIABLE` `rawSelContactId`

- **Line:** 1588

---

### `VARIABLE` `matchedContactObj`

- **Line:** 1589

---

### `VARIABLE` `candidateContactId`

- **Line:** 1590

---

### `VARIABLE` `contactIdVal`

- **Line:** 1591

---

### `VARIABLE` `salesRecordIdVal`

- **Line:** 1592

---

### `VARIABLE` `commDateVal`

- **Line:** 1593

---

### `VARIABLE` `amNameVal`

- **Line:** 1594

---

### `VARIABLE` `expectedPayload`

- **Line:** 1596

---

### `VARIABLE` `expectedUrl`

- **Line:** 1612

---

### `VARIABLE` `existingScfsForQuote`

- **Line:** 1616

---

### `VARIABLE` `latestScfForQuote`

- **Line:** 1617

---

### `VARIABLE` `priorServicesListForQuote`

- **Line:** 1618

---

### `FUNCTION` `isServiceModifiedOrNew`

- **Line:** 1622

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `s` | `any` | **Yes** | - | - |
| `priorList` | `any[]` | **Yes** | - | - |

---

### `VARIABLE` `sName`

- **Line:** 1623

---

### `VARIABLE` `priorMatch`

- **Line:** 1624

---

### `VARIABLE` `newPrice`

- **Line:** 1626

---

### `VARIABLE` `oldPrice`

- **Line:** 1627

---

### `FUNCTION` `formatFreq`

- **Line:** 1629

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `f` | `any` | **Yes** | - | - |

---

### `VARIABLE` `modifiedOrNewServicesForQuote`

- **Line:** 1633

---

### `VARIABLE` `hasPriorQuote`

- **Line:** 1635

---

### `VARIABLE` `servicesToPassToQuote`

- **Line:** 1639

---

### `VARIABLE` `expectedPayloadQuote`

- **Line:** 1645

---

### `VARIABLE` `expectedUrlQuote`

- **Line:** 1661

---

### `VARIABLE` `scfProducts`

- **Line:** 1736

---

### `VARIABLE` `basePrice`

- **Line:** 1737

---

### `VARIABLE` `speed`

- **Line:** 1738

---

### `VARIABLE` `surchargePerc`

- **Line:** 1739

---

### `VARIABLE` `surchargeAmt`

- **Line:** 1740

---

### `VARIABLE` `totalVal`

- **Line:** 1741

---

### `VARIABLE` `existingScfs`

- **Line:** 1754

---

### `VARIABLE` `scfId`

- **Line:** 1755
- **Signature:** `string`

---

### `VARIABLE` `currentUserName`

- **Line:** 1757

---

### `VARIABLE` `currentUserEmail`

- **Line:** 1758

---

### `VARIABLE` `createdByString`

- **Line:** 1759

---

### `VARIABLE` `scfData`

- **Line:** 1763

---

### `VARIABLE` `activeScfs`

- **Line:** 1777

---

### `VARIABLE` `latestScf`

- **Line:** 1781

---

### `VARIABLE` `isSignedOrAccepted`

- **Line:** 1782

---

### `VARIABLE` `scfUrl`

- **Line:** 1794

---

### `VARIABLE` `res`

- **Line:** 1801

---

### `VARIABLE` `data`

- **Line:** 1813

---

### `VARIABLE` `isCompanyOrSignedCustomer`

- **Line:** 1816

---

### `VARIABLE` `isResendingQuote`

- **Line:** 1822

---

### `VARIABLE` `amUser`

- **Line:** 1841

---

### `VARIABLE` `defaultSenderEmail`

- **Line:** 1842

---

### `VARIABLE` `lpoCcEmails`

- **Line:** 1843

---

### `VARIABLE` `existingScfs`

- **Line:** 1874

---

### `VARIABLE` `scfProducts`

- **Line:** 1876

---

### `VARIABLE` `basePrice`

- **Line:** 1877

---

### `VARIABLE` `speed`

- **Line:** 1878

---

### `VARIABLE` `surchargePerc`

- **Line:** 1879

---

### `VARIABLE` `surchargeAmt`

- **Line:** 1880

---

### `VARIABLE` `totalVal`

- **Line:** 1881

---

### `VARIABLE` `currentUserName`

- **Line:** 1890

---

### `VARIABLE` `currentUserEmail`

- **Line:** 1891

---

### `VARIABLE` `createdByString`

- **Line:** 1892

---

### `VARIABLE` `scfId`

- **Line:** 1896

---

### `VARIABLE` `scfUrl`

- **Line:** 1910

---

### `VARIABLE` `latestScf`

- **Line:** 1921

---

### `VARIABLE` `priorServicesList`

- **Line:** 1922

---

### `FUNCTION` `isServiceModifiedOrNewSignup`

- **Line:** 1926

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `s` | `any` | **Yes** | - | - |
| `priorList` | `any[]` | **Yes** | - | - |

---

### `VARIABLE` `sName`

- **Line:** 1927

---

### `VARIABLE` `priorMatch`

- **Line:** 1928

---

### `VARIABLE` `newPrice`

- **Line:** 1930

---

### `VARIABLE` `oldPrice`

- **Line:** 1931

---

### `FUNCTION` `formatFreq`

- **Line:** 1933

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `f` | `any` | **Yes** | - | - |

---

### `VARIABLE` `modifiedOrNewServices`

- **Line:** 1937

---

### `VARIABLE` `hasPriorQuote`

- **Line:** 1939

---

### `VARIABLE` `signupServices`

- **Line:** 1943

---

### `VARIABLE` `nsResponse`

- **Line:** 1949

---

### `VARIABLE` `shouldCreateLocalMile`

- **Line:** 1967

---

### `VARIABLE` `shouldCreateShipMate`

- **Line:** 1968

---

### `VARIABLE` `bankLocId`

- **Line:** 1992

---

### `VARIABLE` `bankLocName`

- **Line:** 1993

---

### `VARIABLE` `locUpdates`

- **Line:** 2005

---

### `VARIABLE` `selectedContacts`

- **Line:** 2028

---

### `VARIABLE` `contactEmails`

- **Line:** 2029

---

### `VARIABLE` `signupEmailsString`

- **Line:** 2030

---

### `VARIABLE` `hasLocalMileAccess`

- **Line:** 2033

---

### `VARIABLE` `isPmpo`

- **Line:** 2036

---

### `VARIABLE` `isRecurring`

- **Line:** 2037

---

### `VARIABLE` `freqArr`

- **Line:** 2040

---

### `VARIABLE` `signupDesc`

- **Line:** 2089

---

### `VARIABLE` `amUser`

- **Line:** 2107

---

### `VARIABLE` `defaultSenderEmail`

- **Line:** 2108

---

### `VARIABLE` `lpoCcEmails`

- **Line:** 2109

---

### `VARIABLE` `signupDesc`

- **Line:** 2128

---

### `VARIABLE` `bankLocId`

- **Line:** 2147

---

### `VARIABLE` `bankLocName`

- **Line:** 2148

---

### `VARIABLE` `locUpdates`

- **Line:** 2160

---

### `VARIABLE` `actionDesc`

- **Line:** 2183

---

### `VARIABLE` `isExpanded`

- **Line:** 2334

---

### `VARIABLE` `isSelected`

- **Line:** 2672

---

### `VARIABLE` `IconComponent`

- **Line:** 2673

---

### `VARIABLE` `newType`

- **Line:** 2680

---

### `VARIABLE` `currentServices`

- **Line:** 2683

---

### `VARIABLE` `currentRates`

- **Line:** 2686

---

### `VARIABLE` `currentFreqs`

- **Line:** 2688

---

### `VARIABLE` `contactVal`

- **Line:** 2772

---

### `VARIABLE` `currentValue`

- **Line:** 2779

---

### `VARIABLE` `isChecked`

- **Line:** 2780

---

### `VARIABLE` `nextContactIds`

- **Line:** 2790

---

### `VARIABLE` `newName`

- **Line:** 2912

---

### `VARIABLE` `isChecked`

- **Line:** 3002

---

### `VARIABLE` `current`

- **Line:** 3011

---

### `VARIABLE` `next`

- **Line:** 3012

---

### `VARIABLE` `val`

- **Line:** 3045

---

### `VARIABLE` `newSelected`

- **Line:** 3094

---

### `VARIABLE` `freqs`

- **Line:** 3097

---

### `VARIABLE` `rates`

- **Line:** 3101

---

### `VARIABLE` `schedules`

- **Line:** 3107

---

### `VARIABLE` `stateVal`

- **Line:** 3127

---

### `VARIABLE` `nearbyBanks`

- **Line:** 3128

---

### `VARIABLE` `query`

- **Line:** 3129

---

### `VARIABLE` `displayBanks`

- **Line:** 3131

---

### `VARIABLE` `isFallback`

- **Line:** 3141

---

### `VARIABLE` `allStateBanks`

- **Line:** 3143

---

### `VARIABLE` `activeBankId`

- **Line:** 3152

---

### `VARIABLE` `matchingBank`

- **Line:** 3153

---

### `VARIABLE` `effectiveValue`

- **Line:** 3161

---

### `VARIABLE` `allLocs`

- **Line:** 3189

---

### `VARIABLE` `found`

- **Line:** 3190

---

### `VARIABLE` `planProds`

- **Line:** 3238

---

### `VARIABLE` `filtered`

- **Line:** 3270

---

### `VARIABLE` `sorted`

- **Line:** 3271

---

### `FUNCTION` `parseWeight`

- **Line:** 3272

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `p` | `any` | **Yes** | - | - |

---

### `VARIABLE` `weightStr`

- **Line:** 3273

---

### `VARIABLE` `match`

- **Line:** 3274

---

### `VARIABLE` `isChecked`

- **Line:** 3280

---

### `VARIABLE` `basePrice`

- **Line:** 3281

---

### `VARIABLE` `surchargePerc`

- **Line:** 3282

---

### `VARIABLE` `surchargeAmt`

- **Line:** 3283

---

### `VARIABLE` `totalVal`

- **Line:** 3284

---

