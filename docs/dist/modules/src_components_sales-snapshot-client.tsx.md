# Module: `src/components/sales-snapshot-client.tsx`

- **Language:** TypeScript
- **Total Lines:** 2493
- **Direct Dependencies:** 35 modules imported

## Exported Symbols & API

### `VARIABLE` `COLORS`

- **Line:** 48

---

### `VARIABLE` `leadStatuses`

- **Line:** 50
- **Signature:** `LeadStatus[]`

---

### `FUNCTION` `SectionHelp`

- **Line:** 57

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ content }` | `{ content: React.ReactNode }` | **Yes** | - | - |

---

### `FUNCTION` `getStageHelpContent`

- **Line:** 74

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `stageName` | `string` | **Yes** | - | - |
| `count` | `number` | **Yes** | - | - |
| `totalLeads` | `number` | **Yes** | - | - |
| `percentage` | `number` | **Yes** | - | - |

---

### `FUNCTION` `isSignedStatus`

- **Line:** 138
- **Returns:** `boolean`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `status` | `string` | **Yes** | - | - |

---

### `VARIABLE` `s`

- **Line:** 139

---

### `FUNCTION` `isRecentlySignedUp`

- **Line:** 144
- **Returns:** `boolean`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `lead` | `Lead` | **Yes** | - | - |
| `leadActivities` | `Activity[]` | **Yes** | - | - |
| `dateRange` | `DateRange` | No | - | - |
| `dateFilterType` | `string` | No | - | - |

---

### `VARIABLE` `status`

- **Line:** 150

---

### `VARIABLE` `isWonStatus`

- **Line:** 151

---

### `VARIABLE` `fromDate`

- **Line:** 157

---

### `VARIABLE` `toDate`

- **Line:** 158

---

### `VARIABLE` `parsedSignedUp`

- **Line:** 162

---

### `VARIABLE` `signedActivity`

- **Line:** 169

---

### `VARIABLE` `parsedActDate`

- **Line:** 173

---

### `VARIABLE` `parsedEntered`

- **Line:** 184

---

### `FUNCTION` `getPipelinePhase`

- **Line:** 194
- **Returns:** `string`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `status` | `string` | **Yes** | - | - |

---

### `VARIABLE` `s`

- **Line:** 195

---

### `VARIABLE` `BUCKET_DISPLAY_NAMES`

- **Line:** 223
- **Signature:** `Record<string, string>`

---

### `FUNCTION` `getLeadBucketLabel`

- **Line:** 236
- **Returns:** `string`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `lead` | `Lead` | **Yes** | - | - |

---

### `VARIABLE` `b`

- **Line:** 237

---

### `FUNCTION` `isFranchiseeGeneratedLead`

- **Line:** 241
- **Returns:** `boolean`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `lead` | `Lead` | **Yes** | - | - |
| `userProfile` | `any` | No | - | - |

---

### `VARIABLE` `STAGE_COLOR_STYLES`

- **Line:** 249
- **Signature:** `Record<string, {
  cardBg: string;
  cardBorder: string;
  titleColor: string;
  countColor: string;
  barBg: string;
  badgeBg: string;
}>`

---

### `FUNCTION` `getUserInCharge`

- **Line:** 315
- **Returns:** `string`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `lead` | `Lead` | **Yes** | - | - |

---

### `VARIABLE` `b`

- **Line:** 316

---

### `VARIABLE` `amUsersCache`

- **Line:** 333
- **Signature:** `Set<string> | null`

---

### `VARIABLE` `amUsersCacheTime`

- **Line:** 334

---

### `VARIABLE` `USER_CACHE_TTL_MS`

- **Line:** 335

---

### `FUNCTION` `SalesSnapshotClient`

- **Line:** 337
- **Returns:** `void`

---

### `VARIABLE` `cacheRef`

- **Line:** 363

---

### `VARIABLE` `isFranchisee`

- **Line:** 367

---

### `VARIABLE` `hasUnappliedFilters`

- **Line:** 407

---

### `FUNCTION` `applyFilters`

- **Line:** 420

---

### `FUNCTION` `clearFilters`

- **Line:** 424

---

### `VARIABLE` `defaultFilters`

- **Line:** 425

---

### `VARIABLE` `fetchData`

- **Line:** 440

---

### `VARIABLE` `startTimePerf`

- **Line:** 445

---

### `VARIABLE` `startISO`

- **Line:** 449

---

### `VARIABLE` `dateFilterType`

- **Line:** 457

---

### `VARIABLE` `cacheKey`

- **Line:** 458

---

### `VARIABLE` `cached`

- **Line:** 462

---

### `VARIABLE` `endISO`

- **Line:** 473

---

### `VARIABLE` `activityQuery`

- **Line:** 474

---

### `VARIABLE` `apptQuery`

- **Line:** 479

---

### `VARIABLE` `zeeLeads`

- **Line:** 491
- **Signature:** `Lead[]`

---

### `VARIABLE` `zeeLeadIdSet`

- **Line:** 492

---

### `VARIABLE` `actList`

- **Line:** 502

---

### `VARIABLE` `apptList`

- **Line:** 506

---

### `VARIABLE` `endISO`

- **Line:** 523

---

### `VARIABLE` `activityQuery`

- **Line:** 526

---

### `VARIABLE` `apptQuery`

- **Line:** 531

---

### `VARIABLE` `invoiceDateMin`

- **Line:** 538

---

### `VARIABLE` `boundedInvoiceQuery`

- **Line:** 539

---

### `VARIABLE` `boundedScfQuery`

- **Line:** 543

---

### `VARIABLE` `fetchAMUsersPromise`

- **Line:** 549

---

### `VARIABLE` `now`

- **Line:** 550

---

### `VARIABLE` `usersSnap`

- **Line:** 554

---

### `VARIABLE` `set`

- **Line:** 555

---

### `VARIABLE` `u`

- **Line:** 557

---

### `VARIABLE` `firstName`

- **Line:** 560

---

### `VARIABLE` `lastName`

- **Line:** 561

---

### `VARIABLE` `fullName`

- **Line:** 562

---

### `VARIABLE` `actList`

- **Line:** 592

---

### `VARIABLE` `leadId`

- **Line:** 593

---

### `VARIABLE` `author`

- **Line:** 597

---

### `VARIABLE` `apptList`

- **Line:** 604

---

### `VARIABLE` `leadId`

- **Line:** 605

---

### `VARIABLE` `invoiceList`

- **Line:** 609
- **Signature:** `ExtendedInvoice[]`

---

### `VARIABLE` `activeLeadIds`

- **Line:** 616

---

### `VARIABLE` `leadsList`

- **Line:** 620
- **Signature:** `Lead[]`

---

### `VARIABLE` `leadMap`

- **Line:** 621

---

### `VARIABLE` `leadIdArray`

- **Line:** 624

---

### `VARIABLE` `chunks`

- **Line:** 627
- **Signature:** `string[][]`

---

### `VARIABLE` `leadQueries`

- **Line:** 632

---

### `VARIABLE` `companyQueries`

- **Line:** 635

---

### `VARIABLE` `querySnaps`

- **Line:** 639

---

### `VARIABLE` `isCompany`

- **Line:** 642

---

### `VARIABLE` `leadsQuery`

- **Line:** 691

---

### `VARIABLE` `companiesQuery`

- **Line:** 695

---

### `FUNCTION` `mapDocs`

- **Line:** 705

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `snap` | `any` | **Yes** | - | - |
| `isCompany` | `boolean` | **Yes** | - | - |

---

### `VARIABLE` `rawLeads`

- **Line:** 713

---

### `VARIABLE` `rawCompanies`

- **Line:** 714

---

### `VARIABLE` `scfsByParentMap`

- **Line:** 723

---

### `VARIABLE` `parentId`

- **Line:** 725

---

### `VARIABLE` `existing`

- **Line:** 727

---

### `VARIABLE` `parentScfs`

- **Line:** 734

---

### `VARIABLE` `filteredLeads`

- **Line:** 765

---

### `VARIABLE` `statusMatch`

- **Line:** 775

---

### `VARIABLE` `franchiseeMatch`

- **Line:** 779

---

### `VARIABLE` `resolvedBucket`

- **Line:** 783

---

### `VARIABLE` `bucketMatch`

- **Line:** 784

---

### `VARIABLE` `amMatch`

- **Line:** 787

---

### `VARIABLE` `dialerMatch`

- **Line:** 791

---

### `VARIABLE` `dateMatch`

- **Line:** 795

---

### `VARIABLE` `fromDateVal`

- **Line:** 797

---

### `VARIABLE` `toDateVal`

- **Line:** 798

---

### `VARIABLE` `fromDate`

- **Line:** 799

---

### `VARIABLE` `toDate`

- **Line:** 800

---

### `VARIABLE` `leadActivities`

- **Line:** 803

---

### `VARIABLE` `hasActivityInWindow`

- **Line:** 804

---

### `VARIABLE` `date`

- **Line:** 805

---

### `VARIABLE` `parsedEntered`

- **Line:** 808

---

### `VARIABLE` `isEnteredInWindow`

- **Line:** 809

---

### `VARIABLE` `dateVal`

- **Line:** 813

---

### `VARIABLE` `parsedDate`

- **Line:** 814

---

### `VARIABLE` `campaignMatch`

- **Line:** 821

---

### `VARIABLE` `filteredLeadIds`

- **Line:** 827

---

### `VARIABLE` `filteredActivities`

- **Line:** 830

---

### `VARIABLE` `date`

- **Line:** 835

---

### `VARIABLE` `fromDate`

- **Line:** 836

---

### `VARIABLE` `toDate`

- **Line:** 837

---

### `VARIABLE` `filteredAppointments`

- **Line:** 844

---

### `VARIABLE` `date`

- **Line:** 848

---

### `VARIABLE` `fromDate`

- **Line:** 849

---

### `VARIABLE` `toDate`

- **Line:** 850

---

### `VARIABLE` `metrics`

- **Line:** 858

---

### `VARIABLE` `totalLeads`

- **Line:** 859

---

### `VARIABLE` `quotesCount`

- **Line:** 861

---

### `VARIABLE` `scfsCount`

- **Line:** 862

---

### `VARIABLE` `trialsCount`

- **Line:** 863

---

### `VARIABLE` `wonCount`

- **Line:** 864

---

### `VARIABLE` `lostCount`

- **Line:** 865

---

### `VARIABLE` `sourceMap`

- **Line:** 868
- **Signature:** `Record<string, { total: number; won: number }>`

---

### `VARIABLE` `assignmentMap`

- **Line:** 872
- **Signature:** `Record<string, Record<string, number>>`

---

### `VARIABLE` `volumeMap`

- **Line:** 884
- **Signature:** `Record<string, number>`

---

### `VARIABLE` `statusDurations`

- **Line:** 887
- **Signature:** `Record<string, { totalDays: number; count: number }>`

---

### `VARIABLE` `typeValueMap`

- **Line:** 890
- **Signature:** `Record<string, number>`

---

### `VARIABLE` `bucketValueMap`

- **Line:** 891
- **Signature:** `Record<string, number>`

---

### `VARIABLE` `totalPipelineMRR`

- **Line:** 894

---

### `VARIABLE` `totalSignedMRR`

- **Line:** 895

---

### `VARIABLE` `mrrStatusMap`

- **Line:** 896
- **Signature:** `Record<string, number>`

---

### `VARIABLE` `mrrLeadsList`

- **Line:** 898
- **Signature:** `Lead[]`

---

### `VARIABLE` `signedMrrLeadsList`

- **Line:** 899
- **Signature:** `Lead[]`

---

### `VARIABLE` `weeklyMrrMap`

- **Line:** 902
- **Signature:** `Record<string, { weekKey: string; weekLabel: string; sortDate: string; pipelineMRR: number; signedMRR: number }>`

---

### `VARIABLE` `leadApptCounts`

- **Line:** 905
- **Signature:** `Record<string, number>`

---

### `VARIABLE` `status`

- **Line:** 908

---

### `VARIABLE` `leadActivities`

- **Line:** 909

---

### `VARIABLE` `isSignedUp`

- **Line:** 910

---

### `VARIABLE` `isSigned`

- **Line:** 911

---

### `VARIABLE` `src`

- **Line:** 920

---

### `VARIABLE` `b`

- **Line:** 926

---

### `VARIABLE` `assignedUser`

- **Line:** 927

---

### `VARIABLE` `createdDateVal`

- **Line:** 935

---

### `VARIABLE` `parsedCreated`

- **Line:** 936

---

### `VARIABLE` `dateStr`

- **Line:** 938

---

### `VARIABLE` `enteredDate`

- **Line:** 943

---

### `VARIABLE` `leadActivities`

- **Line:** 945

---

### `VARIABLE` `statusChanges`

- **Line:** 948

---

### `VARIABLE` `match`

- **Line:** 951

---

### `VARIABLE` `dateVal`

- **Line:** 952

---

### `VARIABLE` `cleanStage`

- **Line:** 954

---

### `VARIABLE` `explicitTransitions`

- **Line:** 960

---

### `VARIABLE` `timelineMap`

- **Line:** 969

---

### `VARIABLE` `existing`

- **Line:** 971

---

### `VARIABLE` `timeline`

- **Line:** 977

---

### `VARIABLE` `start`

- **Line:** 982

---

### `VARIABLE` `end`

- **Line:** 983

---

### `VARIABLE` `diffMs`

- **Line:** 984

---

### `VARIABLE` `diffDays`

- **Line:** 985

---

### `VARIABLE` `mrr`

- **Line:** 996

---

### `VARIABLE` `bucketLabel`

- **Line:** 1007

---

### `VARIABLE` `leadType`

- **Line:** 1008

---

### `VARIABLE` `targetDateVal`

- **Line:** 1013

---

### `VARIABLE` `parsedDate`

- **Line:** 1017

---

### `VARIABLE` `weekMon`

- **Line:** 1019

---

### `VARIABLE` `sortDate`

- **Line:** 1020

---

### `VARIABLE` `weekLabel`

- **Line:** 1021

---

### `VARIABLE` `quoteRate`

- **Line:** 1042

---

### `VARIABLE` `winRate`

- **Line:** 1043

---

### `VARIABLE` `sourceData`

- **Line:** 1044

---

### `VARIABLE` `volumeData`

- **Line:** 1052

---

### `VARIABLE` `avgDaysData`

- **Line:** 1059

---

### `VARIABLE` `normalized`

- **Line:** 1065

---

### `VARIABLE` `isLost`

- **Line:** 1066

---

### `VARIABLE` `isWonSigned`

- **Line:** 1067

---

### `VARIABLE` `typeValueData`

- **Line:** 1073

---

### `VARIABLE` `bucketValueData`

- **Line:** 1079

---

### `VARIABLE` `mrrStatusData`

- **Line:** 1085

---

### `VARIABLE` `actLeaderboardMap`

- **Line:** 1091
- **Signature:** `Record<string, { name: string; Calls: number; Emails: number; Meetings: number; Updates: number; Total: number }>`

---

### `VARIABLE` `author`

- **Line:** 1095

---

### `VARIABLE` `activityLeaderboard`

- **Line:** 1106

---

### `VARIABLE` `uniqueLeadsWithAppointments`

- **Line:** 1113

---

### `VARIABLE` `totalAppointments`

- **Line:** 1114

---

### `VARIABLE` `apptWon`

- **Line:** 1118

---

### `VARIABLE` `apptTrial`

- **Line:** 1119

---

### `VARIABLE` `apptQuote`

- **Line:** 1120

---

### `VARIABLE` `apptLost`

- **Line:** 1121

---

### `VARIABLE` `status`

- **Line:** 1124

---

### `VARIABLE` `leadActivities`

- **Line:** 1125

---

### `VARIABLE` `isSignedUp`

- **Line:** 1126

---

### `VARIABLE` `appointmentEfficiency`

- **Line:** 1134

---

### `VARIABLE` `pipelinePhasesMap`

- **Line:** 1142
- **Signature:** `Record<string, number>`

---

### `VARIABLE` `phase`

- **Line:** 1152

---

### `VARIABLE` `pipelineStagesData`

- **Line:** 1156

---

### `VARIABLE` `franchiseePerf`

- **Line:** 1163

---

### `VARIABLE` `f`

- **Line:** 1164

---

### `VARIABLE` `status`

- **Line:** 1169

---

### `VARIABLE` `leadActivities`

- **Line:** 1170

---

### `VARIABLE` `isSignedUp`

- **Line:** 1171

---

### `VARIABLE` `franchiseeData`

- **Line:** 1179

---

### `VARIABLE` `weeklyMrrData`

- **Line:** 1182

---

### `VARIABLE` `cohortFilteredLeads`

- **Line:** 1214

---

### `VARIABLE` `statusMatch`

- **Line:** 1224

---

### `VARIABLE` `franchiseeMatch`

- **Line:** 1228

---

### `VARIABLE` `resolvedBucket`

- **Line:** 1232

---

### `VARIABLE` `bucketMatch`

- **Line:** 1233

---

### `VARIABLE` `amMatch`

- **Line:** 1236

---

### `VARIABLE` `dialerMatch`

- **Line:** 1240

---

### `VARIABLE` `campaignMatch`

- **Line:** 1243

---

### `VARIABLE` `prevMonthSummary`

- **Line:** 1249

---

### `VARIABLE` `activeDrilldownLeads`

- **Line:** 1258

---

### `VARIABLE` `status`

- **Line:** 1261

---

### `VARIABLE` `isSigned`

- **Line:** 1262

---

### `VARIABLE` `leadActs`

- **Line:** 1275

---

### `VARIABLE` `statusBreakdown`

- **Line:** 1285

---

### `VARIABLE` `counts`

- **Line:** 1286
- **Signature:** `Record<string, number>`

---

### `VARIABLE` `s`

- **Line:** 1288

---

### `VARIABLE` `franchiseeLeadsList`

- **Line:** 1296

---

### `VARIABLE` `zeeGeneratedLeads`

- **Line:** 1298

---

### `VARIABLE` `q`

- **Line:** 1300

---

### `VARIABLE` `franchiseeOptions`

- **Line:** 1310

---

### `VARIABLE` `franchisees`

- **Line:** 1311

---

### `VARIABLE` `amOptions`

- **Line:** 1315

---

### `VARIABLE` `ams`

- **Line:** 1316

---

### `VARIABLE` `dialerOptions`

- **Line:** 1320

---

### `VARIABLE` `dialers`

- **Line:** 1321

---

### `VARIABLE` `statusOptions`

- **Line:** 1325

---

### `VARIABLE` `bucketOptions`

- **Line:** 1329

---

### `FUNCTION` `handleExportDrilldown`

- **Line:** 1338

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `data` | `Lead[]` | **Yes** | - | - |
| `filename` | `string` | **Yes** | - | - |

---

### `VARIABLE` `headers`

- **Line:** 1343

---

### `VARIABLE` `csvContent`

- **Line:** 1344

---

### `VARIABLE` `blob`

- **Line:** 1360

---

### `VARIABLE` `link`

- **Line:** 1361

---

### `FUNCTION` `triggerPdfExport`

- **Line:** 1370

---

### `VARIABLE` `style`

- **Line:** 1653

---

### `VARIABLE` `currentStatus`

- **Line:** 1851

---

### `VARIABLE` `phase`

- **Line:** 1852

---

### `VARIABLE` `mrr`

- **Line:** 1853

---

### `VARIABLE` `dateVal`

- **Line:** 1854

---

### `VARIABLE` `parsedDate`

- **Line:** 1855

---

### `VARIABLE` `formattedDate`

- **Line:** 1856

---

### `VARIABLE` `repInCharge`

- **Line:** 1857

---

### `VARIABLE` `item`

- **Line:** 1937

---

### `VARIABLE` `displayName`

- **Line:** 2178

---

### `VARIABLE` `rate`

- **Line:** 2238

---

### `VARIABLE` `isSelected`

- **Line:** 2338

---

### `VARIABLE` `percentage`

- **Line:** 2339

---

### `VARIABLE` `listToExport`

- **Line:** 2385
- **Signature:** `Lead[]`

---

### `VARIABLE` `q`

- **Line:** 2393

---

### `VARIABLE` `filename`

- **Line:** 2404

---

### `VARIABLE` `filteredList`

- **Line:** 2429

---

### `VARIABLE` `q`

- **Line:** 2444

---

