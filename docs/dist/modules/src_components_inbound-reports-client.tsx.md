# Module: `src/components/inbound-reports-client.tsx`

- **Language:** TypeScript
- **Total Lines:** 6195
- **Direct Dependencies:** 38 modules imported

## Exported Symbols & API

### `FUNCTION` `getLastAndThisWeekRange`

- **Line:** 55
- **Returns:** `DateRange`

---

### `VARIABLE` `today`

- **Line:** 56

---

### `VARIABLE` `startOfLastWeek`

- **Line:** 57

---

### `VARIABLE` `endOfThisWeek`

- **Line:** 58

---

### `VARIABLE` `COLORS`

- **Line:** 81

---

### `FUNCTION` `isLostLead`

- **Line:** 83

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `l` | `Lead` | **Yes** | - | - |

---

### `VARIABLE` `status`

- **Line:** 84

---

### `VARIABLE` `customerStatus`

- **Line:** 85

---

### `VARIABLE` `nsStatus`

- **Line:** 86

---

### `VARIABLE` `lostStatuses`

- **Line:** 87

---

### `FUNCTION` `isSignedLead`

- **Line:** 96

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `l` | `Lead` | **Yes** | - | - |

---

### `VARIABLE` `status`

- **Line:** 97

---

### `VARIABLE` `customerStatus`

- **Line:** 98

---

### `FUNCTION` `isActivePipelineLead`

- **Line:** 102

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `l` | `Lead` | **Yes** | - | - |
| `actionedSet` | `Set<string>` | No | - | - |
| `requireActioned` | `boolean` | No | `true` | - |

---

### `FUNCTION` `isActiveLocalMileLead`

- **Line:** 108

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `l` | `Lead` | **Yes** | - | - |

---

### `VARIABLE` `activeStatuses`

- **Line:** 110

---

### `VARIABLE` `status`

- **Line:** 114

---

### `FUNCTION` `isDirectOutOfTerritory`

- **Line:** 118
- **Returns:** `boolean`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `l` | `Lead` | **Yes** | - | - |

---

### `VARIABLE` `status`

- **Line:** 119

---

### `VARIABLE` `customerStatus`

- **Line:** 120

---

### `FUNCTION` `isLostOutOfTerritory`

- **Line:** 124
- **Returns:** `boolean`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `l` | `Lead` | **Yes** | - | - |

---

### `VARIABLE` `status`

- **Line:** 126

---

### `VARIABLE` `customerStatus`

- **Line:** 127

---

### `VARIABLE` `nsStatus`

- **Line:** 128

---

### `VARIABLE` `isLost`

- **Line:** 129

---

### `VARIABLE` `reason`

- **Line:** 138

---

### `FUNCTION` `isAnyOutOfTerritory`

- **Line:** 142
- **Returns:** `boolean`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `l` | `Lead` | **Yes** | - | - |

---

### `VARIABLE` `reason`

- **Line:** 143

---

### `FUNCTION` `SectionHelp`

- **Line:** 149

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ content }` | `{ content: React.ReactNode }` | **Yes** | - | - |

---

### `FUNCTION` `StatCard`

- **Line:** 166

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ title, value, icon: Icon, description, onClick, helpContent }` | `{ title: string; value: string | number | React.ReactNode; icon: React.ElementType; description?: React.ReactNode; onClick?: () => void; helpContent?: React.ReactNode }` | **Yes** | - | - |

---

### `FUNCTION` `parseDateString`

- **Line:** 182
- **Returns:** `Date | null`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `dateVal` | `any` | **Yes** | - | - |

---

### `VARIABLE` `d`

- **Line:** 187

---

### `VARIABLE` `d`

- **Line:** 195

---

### `VARIABLE` `d`

- **Line:** 200

---

### `VARIABLE` `cleaned`

- **Line:** 206

---

### `VARIABLE` `dateTimeParts`

- **Line:** 208

---

### `VARIABLE` `datePart`

- **Line:** 209

---

### `VARIABLE` `dateParts`

- **Line:** 210

---

### `VARIABLE` `fullYear`

- **Line:** 214

---

### `VARIABLE` `date`

- **Line:** 218

---

### `FUNCTION` `isManualEmail`

- **Line:** 225
- **Returns:** `boolean`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `email` | `{ campaignId?: string; sender?: string }` | **Yes** | - | - |

---

### `VARIABLE` `senderLower`

- **Line:** 229

---

### `VARIABLE` `isSystemSender`

- **Line:** 230

---

### `FUNCTION` `getSydneyDate`

- **Line:** 246
- **Returns:** `Date`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `date` | `Date` | **Yes** | - | - |

---

### `FUNCTION` `isBusinessHoursSydney`

- **Line:** 250
- **Returns:** `boolean`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `date` | `Date` | **Yes** | - | - |

---

### `VARIABLE` `sydDate`

- **Line:** 251

---

### `VARIABLE` `day`

- **Line:** 252

---

### `VARIABLE` `hour`

- **Line:** 253

---

### `FUNCTION` `calculateBusinessHoursSydney`

- **Line:** 259
- **Returns:** `number`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `start` | `Date` | **Yes** | - | - |
| `end` | `Date` | **Yes** | - | - |

---

### `FUNCTION` `getSydneyLocal`

- **Line:** 263
- **Returns:** `Date`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `d` | `Date` | **Yes** | - | - |

---

### `VARIABLE` `formatter`

- **Line:** 264

---

### `VARIABLE` `parts`

- **Line:** 274

---

### `VARIABLE` `partObj`

- **Line:** 275
- **Signature:** `Record<string, string>`

---

### `VARIABLE` `startSyd`

- **Line:** 289

---

### `VARIABLE` `endSyd`

- **Line:** 290

---

### `VARIABLE` `startDay`

- **Line:** 293

---

### `VARIABLE` `endDay`

- **Line:** 294

---

### `VARIABLE` `msPerDay`

- **Line:** 296

---

### `VARIABLE` `dayOfWeek`

- **Line:** 300

---

### `VARIABLE` `businessStart`

- **Line:** 303

---

### `VARIABLE` `businessEnd`

- **Line:** 305

---

### `VARIABLE` `clampedStart`

- **Line:** 308

---

### `VARIABLE` `clampedEnd`

- **Line:** 309

---

### `VARIABLE` `totalMs`

- **Line:** 314

---

### `VARIABLE` `startDayOfWeek`

- **Line:** 317

---

### `VARIABLE` `businessStart`

- **Line:** 319

---

### `VARIABLE` `businessEnd`

- **Line:** 321

---

### `VARIABLE` `clampedStart`

- **Line:** 324

---

### `VARIABLE` `currentDay`

- **Line:** 329

---

### `VARIABLE` `dayOfWeek`

- **Line:** 331

---

### `VARIABLE` `endDayOfWeek`

- **Line:** 339

---

### `VARIABLE` `businessStart`

- **Line:** 341

---

### `VARIABLE` `businessEnd`

- **Line:** 343

---

### `VARIABLE` `clampedEnd`

- **Line:** 346

---

### `INTERFACE` `InboundReportsClientPageProps`

- **Line:** 355

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `externalDateRange` | `DateRange` | Yes | - |
| `hideHeaderAndFilters` | `boolean` | Yes | - |
| `visibleSections` | `string[]` | Yes | - |

---

### `FUNCTION` `InboundReportsClientPage`

- **Line:** 361
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{
  externalDateRange,
  hideHeaderAndFilters = false,
  visibleSections,
}` | `InboundReportsClientPageProps` | **Yes** | - | - |

---

### `VARIABLE` `isSuperAdmin`

- **Line:** 369

---

### `VARIABLE` `isFranchiseeRole`

- **Line:** 370

---

### `VARIABLE` `hasAccess`

- **Line:** 371

---

### `VARIABLE` `cacheRef`

- **Line:** 379

---

### `VARIABLE` `lastFetchedStartISORef`

- **Line:** 380

---

### `VARIABLE` `hasUnappliedFilters`

- **Line:** 424

---

### `FUNCTION` `applyFilters`

- **Line:** 433

---

### `VARIABLE` `fetchData`

- **Line:** 466

---

### `VARIABLE` `startTimePerf`

- **Line:** 472

---

### `VARIABLE` `startISO`

- **Line:** 474

---

### `VARIABLE` `defaultLimit`

- **Line:** 478

---

### `VARIABLE` `isDateRangeChanged`

- **Line:** 483

---

### `VARIABLE` `leadMap`

- **Line:** 490

---

### `VARIABLE` `activityQuery`

- **Line:** 500

---

### `VARIABLE` `apptQuery`

- **Line:** 505

---

### `VARIABLE` `usersQuery`

- **Line:** 509

---

### `VARIABLE` `leadsQuery`

- **Line:** 511

---

### `VARIABLE` `companiesQuery`

- **Line:** 511

---

### `VARIABLE` `ninetyDaysAgo`

- **Line:** 535

---

### `VARIABLE` `fallbackISO`

- **Line:** 537

---

### `FUNCTION` `processRawDoc`

- **Line:** 571

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `doc` | `any` | **Yes** | - | - |

---

### `VARIABLE` `data`

- **Line:** 572

---

### `VARIABLE` `history`

- **Line:** 573

---

### `VARIABLE` `rawLeads`

- **Line:** 579

---

### `VARIABLE` `rawCompanies`

- **Line:** 580

---

### `FUNCTION` `isInbound`

- **Line:** 582

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `l` | `Lead` | **Yes** | - | - |

---

### `VARIABLE` `currentBucket`

- **Line:** 583

---

### `VARIABLE` `sourceStr`

- **Line:** 588

---

### `VARIABLE` `fetchedLeads`

- **Line:** 599

---

### `VARIABLE` `fetchedCompanies`

- **Line:** 600

---

### `VARIABLE` `userList`

- **Line:** 602

---

### `VARIABLE` `data`

- **Line:** 603

---

### `VARIABLE` `apptsList`

- **Line:** 607

---

### `VARIABLE` `activities`

- **Line:** 613

---

### `VARIABLE` `data`

- **Line:** 614

---

### `VARIABLE` `leadMap`

- **Line:** 630

---

### `FUNCTION` `applyPreset`

- **Line:** 658

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `preset` | `string` | **Yes** | - | - |

---

### `VARIABLE` `today`

- **Line:** 660

---

### `VARIABLE` `from`

- **Line:** 661
- **Signature:** `Date | undefined`

---

### `VARIABLE` `to`

- **Line:** 662
- **Signature:** `Date | undefined`

---

### `VARIABLE` `lastAndThisWeek`

- **Line:** 666

---

### `VARIABLE` `lastMonth`

- **Line:** 687

---

### `FUNCTION` `handleFilterChange`

- **Line:** 701

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `filterName` | `keyof typeof filters` | **Yes** | - | - |
| `value` | `any` | **Yes** | - | - |

---

### `FUNCTION` `clearFilters`

- **Line:** 708

---

### `VARIABLE` `defaultFilters`

- **Line:** 710

---

### `VARIABLE` `filteredLeads`

- **Line:** 722

---

### `VARIABLE` `statusMatch`

- **Line:** 726

---

### `VARIABLE` `amMatch`

- **Line:** 727

---

### `VARIABLE` `sourceMatch`

- **Line:** 728

---

### `VARIABLE` `franchiseeMatch`

- **Line:** 729

---

### `VARIABLE` `dateMatch`

- **Line:** 731

---

### `VARIABLE` `enteredDate`

- **Line:** 733

---

### `VARIABLE` `fromDate`

- **Line:** 735

---

### `VARIABLE` `toDate`

- **Line:** 736

---

### `VARIABLE` `campaignMatch`

- **Line:** 740

---

### `VARIABLE` `activitiesByLeadId`

- **Line:** 746

---

### `VARIABLE` `map`

- **Line:** 747

---

### `VARIABLE` `act`

- **Line:** 749

---

### `VARIABLE` `list`

- **Line:** 751

---

### `VARIABLE` `leadMap`

- **Line:** 761

---

### `VARIABLE` `map`

- **Line:** 762

---

### `VARIABLE` `stats`

- **Line:** 769

---

### `VARIABLE` `totalInbound`

- **Line:** 770

---

### `VARIABLE` `totalResponseTime`

- **Line:** 773

---

### `VARIABLE` `leadsWithResponseTime`

- **Line:** 774

---

### `VARIABLE` `staleLeadsList`

- **Line:** 776
- **Signature:** `Lead[]`

---

### `VARIABLE` `overdueHotLeadsList`

- **Line:** 777
- **Signature:** `Lead[]`

---

### `VARIABLE` `now`

- **Line:** 778

---

### `VARIABLE` `entered`

- **Line:** 781

---

### `VARIABLE` `normalizedCustomerStatus`

- **Line:** 782

---

### `VARIABLE` `isClosed`

- **Line:** 783

---

### `VARIABLE` `isHotLead`

- **Line:** 792

---

### `VARIABLE` `activityDates`

- **Line:** 795
- **Signature:** `Date[]`

---

### `VARIABLE` `leadActivities`

- **Line:** 796

---

### `VARIABLE` `manualEmails`

- **Line:** 801

---

### `VARIABLE` `firstAction`

- **Line:** 807

---

### `VARIABLE` `lastAction`

- **Line:** 808

---

### `VARIABLE` `hoursToResponse`

- **Line:** 811

---

### `VARIABLE` `avgResponseTime`

- **Line:** 834

---

### `VARIABLE` `wonLeads`

- **Line:** 836

---

### `VARIABLE` `hotLeadsCount`

- **Line:** 837

---

### `VARIABLE` `wonCount`

- **Line:** 839

---

### `VARIABLE` `quoteSentCount`

- **Line:** 840

---

### `VARIABLE` `conversionRate`

- **Line:** 841

---

### `VARIABLE` `hotLeadsRate`

- **Line:** 842

---

### `VARIABLE` `allQuotedLeads`

- **Line:** 845

---

### `VARIABLE` `st`

- **Line:** 846

---

### `VARIABLE` `leadActs`

- **Line:** 850

---

### `VARIABLE` `notes`

- **Line:** 852

---

### `VARIABLE` `quotedWonLeads`

- **Line:** 861

---

### `VARIABLE` `quotedLostLeads`

- **Line:** 862

---

### `VARIABLE` `quotedPendingLeads`

- **Line:** 863

---

### `VARIABLE` `totalQuotedCount`

- **Line:** 865

---

### `VARIABLE` `quotedWonCount`

- **Line:** 866

---

### `VARIABLE` `quotedLostCount`

- **Line:** 867

---

### `VARIABLE` `quotedPendingCount`

- **Line:** 868

---

### `VARIABLE` `quoteToWonConversionRate`

- **Line:** 870

---

### `VARIABLE` `quoteSentRate`

- **Line:** 871

---

### `VARIABLE` `totalDaysToQuote`

- **Line:** 873

---

### `VARIABLE` `leadsWithQuoteTime`

- **Line:** 874

---

### `VARIABLE` `entered`

- **Line:** 876

---

### `VARIABLE` `leadActs`

- **Line:** 878

---

### `VARIABLE` `quoteAct`

- **Line:** 879

---

### `VARIABLE` `notes`

- **Line:** 880

---

### `VARIABLE` `quoteDate`

- **Line:** 883

---

### `VARIABLE` `avgDaysToQuote`

- **Line:** 889

---

### `VARIABLE` `quoteDispositionData`

- **Line:** 891

---

### `VARIABLE` `quoteAmDist`

- **Line:** 897

---

### `VARIABLE` `am`

- **Line:** 898

---

### `VARIABLE` `quoteAmPerformanceData`

- **Line:** 904

---

### `VARIABLE` `won`

- **Line:** 905

---

### `VARIABLE` `lost`

- **Line:** 906

---

### `VARIABLE` `pending`

- **Line:** 907

---

### `VARIABLE` `convRate`

- **Line:** 908

---

### `VARIABLE` `netsuiteStatusDist`

- **Line:** 920

---

### `VARIABLE` `status`

- **Line:** 921

---

### `VARIABLE` `netsuiteStatusData`

- **Line:** 926

---

### `VARIABLE` `customerStatusDist`

- **Line:** 930

---

### `VARIABLE` `status`

- **Line:** 931

---

### `VARIABLE` `customerStatusData`

- **Line:** 936

---

### `VARIABLE` `leadTypeDist`

- **Line:** 940

---

### `VARIABLE` `type`

- **Line:** 941

---

### `VARIABLE` `leadTypeData`

- **Line:** 946

---

### `VARIABLE` `amDist`

- **Line:** 950

---

### `VARIABLE` `am`

- **Line:** 951

---

### `VARIABLE` `amPerformanceData`

- **Line:** 956

---

### `VARIABLE` `amLeads`

- **Line:** 958

---

### `VARIABLE` `amWon`

- **Line:** 959

---

### `VARIABLE` `amOverdue`

- **Line:** 960

---

### `VARIABLE` `sourceDist`

- **Line:** 965

---

### `VARIABLE` `source`

- **Line:** 966

---

### `VARIABLE` `sourceData`

- **Line:** 971

---

### `VARIABLE` `franchiseeDist`

- **Line:** 975

---

### `VARIABLE` `franchisee`

- **Line:** 976

---

### `VARIABLE` `status`

- **Line:** 977

---

### `VARIABLE` `franchiseeData`

- **Line:** 988

---

### `VARIABLE` `topFranchiseeData`

- **Line:** 1000

---

### `VARIABLE` `franchiseeStatuses`

- **Line:** 1001

---

### `VARIABLE` `leadsByDate`

- **Line:** 1004

---

### `VARIABLE` `date`

- **Line:** 1005

---

### `VARIABLE` `dateStr`

- **Line:** 1007

---

### `VARIABLE` `leadsOverTimeData`

- **Line:** 1013

---

### `VARIABLE` `funnelData`

- **Line:** 1022

---

### `VARIABLE` `totalCloseTime`

- **Line:** 1030

---

### `VARIABLE` `closedLeadsWithTime`

- **Line:** 1031

---

### `VARIABLE` `entered`

- **Line:** 1034

---

### `VARIABLE` `closeDate`

- **Line:** 1037
- **Signature:** `Date | null`

---

### `VARIABLE` `acceptedLinks`

- **Line:** 1041

---

### `VARIABLE` `daysToClose`

- **Line:** 1054

---

### `VARIABLE` `avgTimeToClose`

- **Line:** 1062

---

### `VARIABLE` `geoDist`

- **Line:** 1065

---

### `VARIABLE` `state`

- **Line:** 1066

---

### `VARIABLE` `geoDistData`

- **Line:** 1072

---

### `VARIABLE` `businessHoursCount`

- **Line:** 1078

---

### `VARIABLE` `offHoursCount`

- **Line:** 1079

---

### `VARIABLE` `entered`

- **Line:** 1081

---

### `VARIABLE` `arrivalTimeData`

- **Line:** 1091

---

### `FUNCTION` `isDateInRange`

- **Line:** 1097

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `dateStr` | `string | undefined` | **Yes** | - | - |

---

### `VARIABLE` `d`

- **Line:** 1099

---

### `VARIABLE` `fromDate`

- **Line:** 1102
- **Signature:** `Date`

---

### `VARIABLE` `toDate`

- **Line:** 1103
- **Signature:** `Date`

---

### `VARIABLE` `defaultStart`

- **Line:** 1114

---

### `VARIABLE` `shipmateTrialLeads`

- **Line:** 1122
- **Signature:** `Lead[]`

---

### `VARIABLE` `localmileTrialLeads`

- **Line:** 1123
- **Signature:** `Lead[]`

---

### `VARIABLE` `anyTrialLeads`

- **Line:** 1124
- **Signature:** `Lead[]`

---

### `VARIABLE` `leadActivities`

- **Line:** 1127

---

### `VARIABLE` `hasShipMateTrialActivity`

- **Line:** 1130

---

### `VARIABLE` `isCurrentlyShipMate`

- **Line:** 1134

---

### `VARIABLE` `startedShipMate`

- **Line:** 1135

---

### `VARIABLE` `hasLocalMileTrialActivity`

- **Line:** 1138

---

### `VARIABLE` `isCurrentlyLocalMile`

- **Line:** 1142

---

### `VARIABLE` `hasLocalMileFields`

- **Line:** 1143

---

### `VARIABLE` `startedLocalMile`

- **Line:** 1144

---

### `FUNCTION` `isDirectSignup`

- **Line:** 1157

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `l` | `Lead` | **Yes** | - | - |

---

### `VARIABLE` `sourceLower`

- **Line:** 1158

---

### `VARIABLE` `hasWebSource`

- **Line:** 1159

---

### `VARIABLE` `hasInboundDetails`

- **Line:** 1168

---

### `VARIABLE` `leadActivities`

- **Line:** 1170

---

### `VARIABLE` `hasPublicRegistrationNote`

- **Line:** 1171

---

### `VARIABLE` `hasAMTrialInitiation`

- **Line:** 1178

---

### `VARIABLE` `isAMAuthor`

- **Line:** 1179

---

### `VARIABLE` `isTrialNote`

- **Line:** 1180

---

### `VARIABLE` `humanAMActivities`

- **Line:** 1187

---

### `FUNCTION` `getJourneyBreakdown`

- **Line:** 1193

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leads` | `Lead[]` | **Yes** | - | - |

---

### `VARIABLE` `total`

- **Line:** 1194

---

### `VARIABLE` `signed`

- **Line:** 1195

---

### `VARIABLE` `lost`

- **Line:** 1196

---

### `VARIABLE` `activeTrialStatuses`

- **Line:** 1197

---

### `VARIABLE` `trialing`

- **Line:** 1198

---

### `VARIABLE` `currentStatus`

- **Line:** 1201

---

### `VARIABLE` `other`

- **Line:** 1204

---

### `VARIABLE` `directLeads`

- **Line:** 1206

---

### `VARIABLE` `amProcessedLeads`

- **Line:** 1207

---

### `VARIABLE` `shipmateJourney`

- **Line:** 1225

---

### `VARIABLE` `localmileJourney`

- **Line:** 1226

---

### `VARIABLE` `combinedJourney`

- **Line:** 1227

---

### `VARIABLE` `sumTimeToDropoff`

- **Line:** 1230

---

### `VARIABLE` `dropoffCount`

- **Line:** 1231

---

### `VARIABLE` `dropoffStages`

- **Line:** 1232
- **Signature:** `Record<string, { count: number; totalDays: number }>`

---

### `VARIABLE` `dropoffStageLeads`

- **Line:** 1233
- **Signature:** `Record<string, Lead[]>`

---

### `FUNCTION` `parseDurationToMinutes`

- **Line:** 1235
- **Returns:** `number`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `durationStr` | `string` | No | - | - |

---

### `VARIABLE` `minutes`

- **Line:** 1237

---

### `VARIABLE` `mMatch`

- **Line:** 1238

---

### `VARIABLE` `sMatch`

- **Line:** 1240

---

### `VARIABLE` `parts`

- **Line:** 1244

---

### `VARIABLE` `amDataMap`

- **Line:** 1260
- **Signature:** `Record<string, {
        totalLeads: number;
        activitiesCount: number;
        totalResponseHours: number;
        responseCount: number;
        totalDaysToWin: number;
        winCount: number;
        totalDaysToLoss: number;
        lossCount: number;
        callsWithIdCount: number;
        totalCallDurationMinutes: number;
    }>`

---

### `VARIABLE` `rawActivities`

- **Line:** 1274

---

### `VARIABLE` `leadActivities`

- **Line:** 1275

---

### `VARIABLE` `enteredDate`

- **Line:** 1276

---

### `VARIABLE` `isLost`

- **Line:** 1277

---

### `VARIABLE` `am`

- **Line:** 1280

---

### `VARIABLE` `amStats`

- **Line:** 1295

---

### `VARIABLE` `leadEmailCount`

- **Line:** 1307

---

### `VARIABLE` `activityDates`

- **Line:** 1314
- **Signature:** `Date[]`

---

### `VARIABLE` `manualLeadActivities`

- **Line:** 1315

---

### `VARIABLE` `manualEmails`

- **Line:** 1320

---

### `VARIABLE` `firstAction`

- **Line:** 1325

---

### `VARIABLE` `hoursToResponse`

- **Line:** 1327

---

### `VARIABLE` `isWon`

- **Line:** 1334

---

### `VARIABLE` `closeDate`

- **Line:** 1336
- **Signature:** `Date | null`

---

### `VARIABLE` `acceptedLinks`

- **Line:** 1338

---

### `VARIABLE` `daysToClose`

- **Line:** 1348

---

### `VARIABLE` `lostDate`

- **Line:** 1357
- **Signature:** `Date | null`

---

### `VARIABLE` `priorStatus`

- **Line:** 1358
- **Signature:** `string`

---

### `VARIABLE` `lostActivityIndex`

- **Line:** 1360

---

### `VARIABLE` `lostActivity`

- **Line:** 1371

---

### `VARIABLE` `match`

- **Line:** 1375

---

### `VARIABLE` `status`

- **Line:** 1377

---

### `VARIABLE` `lastAct`

- **Line:** 1385

---

### `VARIABLE` `timeToDropoff`

- **Line:** 1389

---

### `VARIABLE` `stageLabel`

- **Line:** 1399

---

### `VARIABLE` `inboundJourneyStats`

- **Line:** 1413

---

### `VARIABLE` `amEfficiencyData`

- **Line:** 1424

---

### `VARIABLE` `statusTimes`

- **Line:** 1436
- **Signature:** `Record<string, { totalDays: number; count: number }>`

---

### `VARIABLE` `enteredDate`

- **Line:** 1439

---

### `VARIABLE` `currentStatus`

- **Line:** 1442

---

### `VARIABLE` `leadActivities`

- **Line:** 1444

---

### `VARIABLE` `statusActivities`

- **Line:** 1449

---

### `VARIABLE` `match`

- **Line:** 1452

---

### `VARIABLE` `cleanStatus`

- **Line:** 1454

---

### `VARIABLE` `timeline`

- **Line:** 1460
- **Signature:** `{ status: string; date: Date }[]`

---

### `VARIABLE` `lastDate`

- **Line:** 1478

---

### `VARIABLE` `start`

- **Line:** 1488

---

### `VARIABLE` `end`

- **Line:** 1489

---

### `VARIABLE` `diffMs`

- **Line:** 1491

---

### `VARIABLE` `diffDays`

- **Line:** 1492

---

### `VARIABLE` `avgDurationByStatusData`

- **Line:** 1502

---

### `VARIABLE` `normalized`

- **Line:** 1508

---

### `VARIABLE` `isLost`

- **Line:** 1509

---

### `VARIABLE` `isWonSigned`

- **Line:** 1510

---

### `VARIABLE` `connectedOutcomes`

- **Line:** 1515

---

### `VARIABLE` `leadMapForCalls`

- **Line:** 1522

---

### `VARIABLE` `filteredLeadIds`

- **Line:** 1523

---

### `VARIABLE` `seenTeamCallIds`

- **Line:** 1525

---

### `VARIABLE` `filteredCalls`

- **Line:** 1526

---

### `VARIABLE` `cleanCallId`

- **Line:** 1533

---

### `VARIABLE` `notesLower`

- **Line:** 1536

---

### `VARIABLE` `eventLower`

- **Line:** 1537

---

### `VARIABLE` `allInboundLeadIds`

- **Line:** 1544

---

### `VARIABLE` `filteredAppointments`

- **Line:** 1545

---

### `VARIABLE` `isForFilteredLead`

- **Line:** 1547

---

### `VARIABLE` `apptDateStr`

- **Line:** 1548

---

### `VARIABLE` `isApptInDateRange`

- **Line:** 1549

---

### `FUNCTION` `getLeadAM`

- **Line:** 1553

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `l` | `Lead` | **Yes** | - | - |

---

### `VARIABLE` `val`

- **Line:** 1554

---

### `VARIABLE` `allAMs`

- **Line:** 1561

---

### `VARIABLE` `amActionedLeadIdsMap`

- **Line:** 1569

---

### `VARIABLE` `seenCallIdsForPerf`

- **Line:** 1572

---

### `VARIABLE` `cleanCallId`

- **Line:** 1580

---

### `VARIABLE` `notesLower`

- **Line:** 1582

---

### `VARIABLE` `eventLower`

- **Line:** 1583

---

### `VARIABLE` `author`

- **Line:** 1588

---

### `VARIABLE` `matchedAM`

- **Line:** 1590

---

### `VARIABLE` `leadObj`

- **Line:** 1592

---

### `VARIABLE` `assignedAM`

- **Line:** 1593

---

### `VARIABLE` `senderName`

- **Line:** 1606

---

### `VARIABLE` `author`

- **Line:** 1607

---

### `VARIABLE` `matchedAM`

- **Line:** 1609

---

### `VARIABLE` `assignedAM`

- **Line:** 1611

---

### `VARIABLE` `perfNow`

- **Line:** 1622

---

### `VARIABLE` `perfFromDate`

- **Line:** 1623
- **Signature:** `Date`

---

### `VARIABLE` `perfToDate`

- **Line:** 1624
- **Signature:** `Date`

---

### `VARIABLE` `perfFilteredCalls`

- **Line:** 1636

---

### `VARIABLE` `lead`

- **Line:** 1637

---

### `VARIABLE` `cDate`

- **Line:** 1642

---

### `VARIABLE` `perfFilteredAppointments`

- **Line:** 1646

---

### `VARIABLE` `lead`

- **Line:** 1648

---

### `VARIABLE` `aDate`

- **Line:** 1650

---

### `VARIABLE` `perfActionedLeadIdsMap`

- **Line:** 1654

---

### `VARIABLE` `allCalledLeadIdsSet`

- **Line:** 1655

---

### `VARIABLE` `amCalledLeadIdsMap`

- **Line:** 1656

---

### `VARIABLE` `author`

- **Line:** 1663

---

### `VARIABLE` `matchedAM`

- **Line:** 1664

---

### `VARIABLE` `actDate`

- **Line:** 1673

---

### `VARIABLE` `author`

- **Line:** 1675

---

### `VARIABLE` `matchedAM`

- **Line:** 1676

---

### `VARIABLE` `sentDate`

- **Line:** 1686

---

### `VARIABLE` `senderName`

- **Line:** 1688

---

### `VARIABLE` `author`

- **Line:** 1689

---

### `VARIABLE` `matchedAM`

- **Line:** 1691

---

### `VARIABLE` `assignedAM`

- **Line:** 1693

---

### `VARIABLE` `teamPerformanceData`

- **Line:** 1704

---

### `VARIABLE` `dialerInboundLeads`

- **Line:** 1705

---

### `VARIABLE` `dialerInboundLeadIds`

- **Line:** 1706

---

### `VARIABLE` `dialerCallsList`

- **Line:** 1708

---

### `VARIABLE` `dialerCalls`

- **Line:** 1709

---

### `VARIABLE` `dialerLeadsCalled`

- **Line:** 1710

---

### `VARIABLE` `avgAttempts`

- **Line:** 1711

---

### `VARIABLE` `dialerConnectedCalls`

- **Line:** 1713

---

### `VARIABLE` `connectRate`

- **Line:** 1714

---

### `VARIABLE` `dialerActionedSet`

- **Line:** 1716

---

### `FUNCTION` `isDateInTimeframe`

- **Line:** 1718

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `dateVal` | `any` | No | - | - |

---

### `VARIABLE` `d`

- **Line:** 1720

---

### `FUNCTION` `isDateBeforeOrInTimeframe`

- **Line:** 1724

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `dateVal` | `any` | No | - | - |

---

### `VARIABLE` `d`

- **Line:** 1726

---

### `VARIABLE` `lmOppLeads`

- **Line:** 1730

---

### `VARIABLE` `lmOppCount`

- **Line:** 1731

---

### `VARIABLE` `lmOppCallRate`

- **Line:** 1732

---

### `VARIABLE` `lmPendingLeads`

- **Line:** 1734

---

### `VARIABLE` `lmPendingCount`

- **Line:** 1735

---

### `VARIABLE` `lmPendingCallRate`

- **Line:** 1736

---

### `VARIABLE` `trialingLMLeads`

- **Line:** 1738

---

### `VARIABLE` `trialingLMCount`

- **Line:** 1739

---

### `VARIABLE` `trialingLMCallRate`

- **Line:** 1740

---

### `VARIABLE` `dialerAppointments`

- **Line:** 1742

---

### `VARIABLE` `dialerQuotes`

- **Line:** 1743

---

### `VARIABLE` `dialerShipmateTrials`

- **Line:** 1744

---

### `VARIABLE` `dialerWonLeads`

- **Line:** 1746

---

### `VARIABLE` `dialerWon`

- **Line:** 1747

---

### `VARIABLE` `dialerLostPipelineLeads`

- **Line:** 1749

---

### `VARIABLE` `dialerLostPipeline`

- **Line:** 1750

---

### `VARIABLE` `dialerActivePipelineLeads`

- **Line:** 1752

---

### `VARIABLE` `dialerActivePipeline`

- **Line:** 1753

---

### `VARIABLE` `dialerUnactionedPipelineLeads`

- **Line:** 1755

---

### `VARIABLE` `dialerUnactionedPipeline`

- **Line:** 1756

---

### `VARIABLE` `dialerLeads`

- **Line:** 1758

---

### `VARIABLE` `totalTeamCalls`

- **Line:** 1797

---

### `VARIABLE` `totalAssignedLeads`

- **Line:** 1798

---

### `VARIABLE` `totalUnactionedPipeline`

- **Line:** 1799

---

### `VARIABLE` `totalActivePipeline`

- **Line:** 1800

---

### `VARIABLE` `totalLostPipeline`

- **Line:** 1801

---

### `VARIABLE` `totalWon`

- **Line:** 1802

---

### `VARIABLE` `totalLeadsProcessed`

- **Line:** 1804

---

### `VARIABLE` `totalAvgAttempts`

- **Line:** 1805

---

### `VARIABLE` `totalConnectedCalls`

- **Line:** 1806

---

### `VARIABLE` `dialerCallsList`

- **Line:** 1807

---

### `VARIABLE` `totalConnectRate`

- **Line:** 1810

---

### `VARIABLE` `totalAppts`

- **Line:** 1811

---

### `VARIABLE` `totalQuotes`

- **Line:** 1812

---

### `VARIABLE` `totalLMOpp`

- **Line:** 1813

---

### `VARIABLE` `totalLMOppRate`

- **Line:** 1814

---

### `VARIABLE` `totalLMPending`

- **Line:** 1815

---

### `VARIABLE` `totalLMPendingRate`

- **Line:** 1816

---

### `VARIABLE` `totalTrialingLM`

- **Line:** 1817

---

### `VARIABLE` `totalTrialingLMRate`

- **Line:** 1818

---

### `VARIABLE` `totalShipmateTrials`

- **Line:** 1819

---

### `VARIABLE` `teamPerformanceTotals`

- **Line:** 1821

---

### `VARIABLE` `activeAMsList`

- **Line:** 1846

---

### `VARIABLE` `actStartDate`

- **Line:** 1853
- **Signature:** `Date`

---

### `VARIABLE` `actEndDate`

- **Line:** 1854
- **Signature:** `Date`

---

### `VARIABLE` `defaultStart`

- **Line:** 1865

---

### `VARIABLE` `dailyAMDates`

- **Line:** 1870
- **Signature:** `Date[]`

---

### `VARIABLE` `currAMDate`

- **Line:** 1871

---

### `VARIABLE` `dailyAMMap`

- **Line:** 1881

---

### `VARIABLE` `key`

- **Line:** 1890

---

### `FUNCTION` `recordAMActivity`

- **Line:** 1900

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `dateStr` | `string | undefined` | **Yes** | - | - |
| `type` | `string` | **Yes** | - | - |
| `authorName` | `string | undefined` | **Yes** | - | - |
| `leadId` | `string` | **Yes** | - | - |

---

### `VARIABLE` `actDate`

- **Line:** 1902

---

### `VARIABLE` `dateKey`

- **Line:** 1904

---

### `VARIABLE` `dayData`

- **Line:** 1905

---

### `VARIABLE` `author`

- **Line:** 1908

---

### `VARIABLE` `matchedAM`

- **Line:** 1913

---

### `VARIABLE` `leadObj`

- **Line:** 1916

---

### `VARIABLE` `assignedAM`

- **Line:** 1917

---

### `VARIABLE` `prevAMCount`

- **Line:** 1933

---

### `VARIABLE` `categoryType`

- **Line:** 1936

---

### `VARIABLE` `prevTypeCount`

- **Line:** 1940

---

### `VARIABLE` `seenCallIds`

- **Line:** 1944

---

### `VARIABLE` `cleanCallId`

- **Line:** 1954

---

### `VARIABLE` `notesLower`

- **Line:** 1957

---

### `VARIABLE` `eventLower`

- **Line:** 1958

---

### `VARIABLE` `senderName`

- **Line:** 1971

---

### `VARIABLE` `dailyAMActivityChartData`

- **Line:** 1978

---

### `VARIABLE` `key`

- **Line:** 1979

---

### `VARIABLE` `displayDate`

- **Line:** 1980

---

### `VARIABLE` `fullFormattedDate`

- **Line:** 1981

---

### `VARIABLE` `dayData`

- **Line:** 1982

---

### `VARIABLE` `row`

- **Line:** 1984
- **Signature:** `Record<string, any>`

---

### `VARIABLE` `leadSet`

- **Line:** 1997

---

### `VARIABLE` `amPeriodTotalsMap`

- **Line:** 2007

---

### `VARIABLE` `count`

- **Line:** 2011

---

### `VARIABLE` `totalAMActionsPeriod`

- **Line:** 2016

---

### `VARIABLE` `totalCallsPeriod`

- **Line:** 2017

---

### `VARIABLE` `totalEmailsPeriod`

- **Line:** 2018

---

### `VARIABLE` `totalMeetingsPeriod`

- **Line:** 2019

---

### `VARIABLE` `totalUpdatesPeriod`

- **Line:** 2020

---

### `VARIABLE` `totalUniqueLeadsPeriod`

- **Line:** 2022

---

### `VARIABLE` `activeAMsWithActivity`

- **Line:** 2025

---

### `VARIABLE` `activeDaysCount`

- **Line:** 2027

---

### `VARIABLE` `key`

- **Line:** 2028

---

### `VARIABLE` `avgDailyActionsPerAM`

- **Line:** 2032

---

### `VARIABLE` `avgDailyUniqueLeadsPerAM`

- **Line:** 2036

---

### `VARIABLE` `amPeriodUniqueLeadsMap`

- **Line:** 2040

---

### `VARIABLE` `leadIds`

- **Line:** 2044
- **Signature:** `string[]`

---

### `VARIABLE` `amSet`

- **Line:** 2045

---

### `VARIABLE` `topAMName`

- **Line:** 2052

---

### `VARIABLE` `maxAMUniqueLeadsCount`

- **Line:** 2053

---

### `VARIABLE` `maxAMActionsCount`

- **Line:** 2054

---

### `VARIABLE` `dailyAMActivity`

- **Line:** 2068

---

### `VARIABLE` `repShipmateLeadsMap`

- **Line:** 2086

---

### `VARIABLE` `repLocalmileLeadsMap`

- **Line:** 2087

---

### `VARIABLE` `am`

- **Line:** 2094

---

### `VARIABLE` `am`

- **Line:** 2100

---

### `VARIABLE` `allActionedLeadIdsSet`

- **Line:** 2105

---

### `VARIABLE` `directOutOfTerritoryLeads`

- **Line:** 2110

---

### `VARIABLE` `lostOutOfTerritoryLeads`

- **Line:** 2111

---

### `VARIABLE` `totalOutOfTerritoryLeads`

- **Line:** 2112

---

### `VARIABLE` `amOutOfTerritoryMap`

- **Line:** 2114

---

### `VARIABLE` `am`

- **Line:** 2120

---

### `VARIABLE` `item`

- **Line:** 2124

---

### `VARIABLE` `outOfTerritoryByAM`

- **Line:** 2134

---

### `VARIABLE` `outOfTerritoryData`

- **Line:** 2136

---

### `VARIABLE` `webpageMap`

- **Line:** 2144
- **Signature:** `Record<string, {
        url: string;
        displayUrl: string;
        referrer: string;
        leads: Lead[];
        total: number;
        active: number;
        signed: number;
        lost: number;
    }>`

---

### `VARIABLE` `rawUrl`

- **Line:** 2156

---

### `VARIABLE` `cleanUrl`

- **Line:** 2157

---

### `VARIABLE` `displayUrl`

- **Line:** 2159

---

### `VARIABLE` `parsed`

- **Line:** 2162

---

### `VARIABLE` `rawReferrer`

- **Line:** 2169

---

### `VARIABLE` `referrerDisplay`

- **Line:** 2170

---

### `VARIABLE` `parsedRef`

- **Line:** 2173

---

### `VARIABLE` `key`

- **Line:** 2180

---

### `VARIABLE` `item`

- **Line:** 2194

---

### `VARIABLE` `webpageDataList`

- **Line:** 2206

---

### `VARIABLE` `topWebpagesChartData`

- **Line:** 2213

---

### `VARIABLE` `trackedWebpagesCount`

- **Line:** 2221

---

### `VARIABLE` `trackedWebpagesPercent`

- **Line:** 2222

---

### `VARIABLE` `topWebpageName`

- **Line:** 2223

---

### `VARIABLE` `bestConvertingWebpageObj`

- **Line:** 2224

---

### `VARIABLE` `bestConvertingWebpageName`

- **Line:** 2227

---

### `VARIABLE` `interestMap`

- **Line:** 2230
- **Signature:** `Record<string, {
        interest: string;
        leads: Lead[];
        total: number;
        active: number;
        signed: number;
        lost: number;
    }>`

---

### `VARIABLE` `rawInterest`

- **Line:** 2240

---

### `VARIABLE` `interestItems`

- **Line:** 2249

---

### `VARIABLE` `key`

- **Line:** 2253

---

### `VARIABLE` `item`

- **Line:** 2265

---

### `VARIABLE` `interestDataList`

- **Line:** 2278

---

### `VARIABLE` `topInterestName`

- **Line:** 2286

---

### `VARIABLE` `bestConvertingInterestObj`

- **Line:** 2287

---

### `VARIABLE` `bestConvertingInterestName`

- **Line:** 2290

---

### `VARIABLE` `totalExplicitInterestsCount`

- **Line:** 2291

---

### `VARIABLE` `weeklyParcelsMap`

- **Line:** 2294
- **Signature:** `Record<string, {
        tier: string;
        leads: Lead[];
        total: number;
        active: number;
        signed: number;
        lost: number;
    }>`

---

### `VARIABLE` `rawParcelStr`

- **Line:** 2304

---

### `VARIABLE` `tierLabel`

- **Line:** 2305

---

### `VARIABLE` `key`

- **Line:** 2308

---

### `VARIABLE` `item`

- **Line:** 2320

---

### `VARIABLE` `weeklyParcelsDataList`

- **Line:** 2332

---

### `VARIABLE` `topWeeklyParcelsTierName`

- **Line:** 2340

---

### `VARIABLE` `bestConvertingWeeklyParcelsObj`

- **Line:** 2341

---

### `VARIABLE` `bestConvertingWeeklyParcelsName`

- **Line:** 2344

---

### `VARIABLE` `totalWeeklyParcelsLoggedCount`

- **Line:** 2345

---

### `VARIABLE` `totalWeeklyParcelsLoggedPercent`

- **Line:** 2346

---

### `VARIABLE` `BUCKET_NAME_MAP`

- **Line:** 2349
- **Signature:** `Record<string, { label: string; description: string }>`

---

### `VARIABLE` `bucketProgressionCounts`

- **Line:** 2361
- **Signature:** `Record<string, Lead[]>`

---

### `VARIABLE` `currentBucket`

- **Line:** 2364

---

### `VARIABLE` `totalInboundCohort`

- **Line:** 2371

---

### `VARIABLE` `bucketProgressionData`

- **Line:** 2373

---

### `VARIABLE` `info`

- **Line:** 2374

---

### `VARIABLE` `count`

- **Line:** 2378

---

### `VARIABLE` `percentage`

- **Line:** 2379

---

### `VARIABLE` `statusDist`

- **Line:** 2381

---

### `VARIABLE` `s`

- **Line:** 2382

---

### `VARIABLE` `anyTrialLeadsList`

- **Line:** 2398

---

### `VARIABLE` `trialWonLeads`

- **Line:** 2399

---

### `VARIABLE` `trialQuotedLeads`

- **Line:** 2400

---

### `VARIABLE` `trialLostLeads`

- **Line:** 2401

---

### `VARIABLE` `trialActiveLeads`

- **Line:** 2402

---

### `VARIABLE` `nonTrialQuotedLeads`

- **Line:** 2404

---

### `VARIABLE` `directQuotedWonLeads`

- **Line:** 2405

---

### `VARIABLE` `directQuotedActiveLeads`

- **Line:** 2406

---

### `VARIABLE` `directQuotedLostLeads`

- **Line:** 2407

---

### `VARIABLE` `preQuoteActiveLeads`

- **Line:** 2409

---

### `VARIABLE` `directLostNoQuoteNoTrialLeads`

- **Line:** 2410

---

### `VARIABLE` `allInboundLeadMap`

- **Line:** 2492

---

### `FUNCTION` `getLeadsForAppts`

- **Line:** 2493

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `appts` | `Appointment[]` | **Yes** | - | - |

---

### `VARIABLE` `leadIds`

- **Line:** 2494

---

### `VARIABLE` `completedAppts`

- **Line:** 2497

---

### `VARIABLE` `rescheduledAppts`

- **Line:** 2498

---

### `VARIABLE` `cancelledAppts`

- **Line:** 2499

---

### `VARIABLE` `noShowAppts`

- **Line:** 2500

---

### `VARIABLE` `pendingAppts`

- **Line:** 2501

---

### `VARIABLE` `overduePendingAppts`

- **Line:** 2502

---

### `VARIABLE` `status`

- **Line:** 2503

---

### `VARIABLE` `apptDateStr`

- **Line:** 2505

---

### `VARIABLE` `apptDate`

- **Line:** 2507

---

### `VARIABLE` `drillDownAvailableStatuses`

- **Line:** 2530

---

### `VARIABLE` `statuses`

- **Line:** 2532

---

### `VARIABLE` `filteredDrillDownLeads`

- **Line:** 2536

---

### `VARIABLE` `leads`

- **Line:** 2538

---

### `VARIABLE` `status`

- **Line:** 2541

---

### `VARIABLE` `bucket`

- **Line:** 2547

---

### `VARIABLE` `isOverdue`

- **Line:** 2553

---

### `VARIABLE` `query`

- **Line:** 2560

---

### `FUNCTION` `handleExportData`

- **Line:** 2568

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `data` | `any[]` | **Yes** | - | - |
| `filename` | `string` | **Yes** | - | - |

---

### `VARIABLE` `headers`

- **Line:** 2573

---

### `FUNCTION` `escapeCsv`

- **Line:** 2574

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `val` | `any` | **Yes** | - | - |

---

### `VARIABLE` `csvRows`

- **Line:** 2575

---

### `VARIABLE` `csvContent`

- **Line:** 2576

---

### `VARIABLE` `blob`

- **Line:** 2577

---

### `VARIABLE` `link`

- **Line:** 2578

---

### `VARIABLE` `customerStatusOptions`

- **Line:** 2586
- **Signature:** `Option[]`

---

### `VARIABLE` `statuses`

- **Line:** 2587

---

### `VARIABLE` `amOptions`

- **Line:** 2591
- **Signature:** `Option[]`

---

### `VARIABLE` `ams`

- **Line:** 2592

---

### `VARIABLE` `sourceOptions`

- **Line:** 2596
- **Signature:** `Option[]`

---

### `VARIABLE` `sources`

- **Line:** 2597

---

### `VARIABLE` `franchiseeOptions`

- **Line:** 2601
- **Signature:** `Option[]`

---

### `VARIABLE` `franchisees`

- **Line:** 2602

---

### `VARIABLE` `entered`

- **Line:** 2864

---

### `VARIABLE` `activityDates`

- **Line:** 2867
- **Signature:** `Date[]`

---

### `VARIABLE` `leadActivities`

- **Line:** 2868

---

### `VARIABLE` `manualEmails`

- **Line:** 2873

---

### `VARIABLE` `firstAction`

- **Line:** 2879

---

### `VARIABLE` `entered`

- **Line:** 3110

---

### `VARIABLE` `activityDates`

- **Line:** 3113
- **Signature:** `Date[]`

---

### `VARIABLE` `leadActivities`

- **Line:** 3114

---

### `VARIABLE` `manualEmails`

- **Line:** 3119

---

### `VARIABLE` `firstAction`

- **Line:** 3125

---

### `VARIABLE` `exportData`

- **Line:** 4304

---

### `VARIABLE` `exportRow`

- **Line:** 4305
- **Signature:** `Record<string, any>`

---

### `VARIABLE` `val`

- **Line:** 4389

---

### `VARIABLE` `leadIds`

- **Line:** 4390

---

### `VARIABLE` `matchedLeads`

- **Line:** 4398

---

### `VARIABLE` `calledSet`

- **Line:** 4619

---

### `VARIABLE` `list`

- **Line:** 4640

---

### `VARIABLE` `list`

- **Line:** 4652

---

### `VARIABLE` `allCalledSet`

- **Line:** 4740

---

### `VARIABLE` `entered`

- **Line:** 5392

---

### `VARIABLE` `activityDates`

- **Line:** 5395
- **Signature:** `Date[]`

---

### `VARIABLE` `leadActivities`

- **Line:** 5396

---

### `VARIABLE` `manualEmails`

- **Line:** 5401

---

### `VARIABLE` `firstAction`

- **Line:** 5407

---

### `VARIABLE` `pct`

- **Line:** 5481

---

### `VARIABLE` `index`

- **Line:** 5581

---

### `VARIABLE` `index`

- **Line:** 5643

---

### `VARIABLE` `data`

- **Line:** 5812

---

### `VARIABLE` `percentage`

- **Line:** 5856

---

### `VARIABLE` `exportData`

- **Line:** 5943

---

### `VARIABLE` `dateLabel`

- **Line:** 5944

---

### `VARIABLE` `dateVal`

- **Line:** 5945

---

### `VARIABLE` `firstActivityDetail`

- **Line:** 6057
- **Signature:** `{ date: Date; type: string; details: string; author: string } | null`

---

### `VARIABLE` `displayDateVal`

- **Line:** 6058

---

### `VARIABLE` `entered`

- **Line:** 6059

---

### `VARIABLE` `activitiesAndEmails`

- **Line:** 6061
- **Signature:** `Array<{ date: Date; type: string; details: string; author: string }>`

---

### `VARIABLE` `leadActivities`

- **Line:** 6063

---

### `VARIABLE` `d`

- **Line:** 6065

---

### `VARIABLE` `manualEmails`

- **Line:** 6077

---

### `VARIABLE` `d`

- **Line:** 6079

---

### `VARIABLE` `hoursToResponseStr`

- **Line:** 6091

---

### `VARIABLE` `calcBreakdownStr`

- **Line:** 6092

---

### `VARIABLE` `first`

- **Line:** 6095

---

### `VARIABLE` `hours`

- **Line:** 6097

---

### `VARIABLE` `startStr`

- **Line:** 6101

---

### `VARIABLE` `endStr`

- **Line:** 6102

---

