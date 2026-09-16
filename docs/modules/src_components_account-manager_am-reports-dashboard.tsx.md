# Module: `src/components/account-manager/am-reports-dashboard.tsx`

- **Language:** TypeScript
- **Total Lines:** 4664
- **Direct Dependencies:** 38 modules imported

## Exported Symbols & API

### `TYPE` `ExtendedAppointment`

- **Line:** 10
- **Signature:** `Appointment & { 
    lead?: Lead; 
    leadName?: string; 
    leadStatus?: string; 
    dialerAssigned?: string; 
    discoveryData?: any;
    prospectPlusId?: string;
    duetime?: string;
}`

---

### `FUNCTION` `SectionHelp`

- **Line:** 49

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ content }` | `{ content: React.ReactNode }` | **Yes** | - | - |

---

### `FUNCTION` `StatCard`

- **Line:** 65

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ title, value, icon: Icon, description, onClick, helpContent, className }` | `{ title: string; value: string | number | React.ReactNode; icon: React.ElementType; description?: React.ReactNode; onClick?: () => void; helpContent?: React.ReactNode; className?: string }` | **Yes** | - | - |

---

### `INTERFACE` `FlatActivity`

- **Line:** 96

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | No | - |
| `leadId` | `string` | No | - |
| `leadName` | `string` | No | - |
| `type` | `string` | No | - |
| `date` | `string` | No | - |
| `notes` | `string` | No | - |
| `author` | `string` | No | - |
| `durationMinutes` | `number` | No | - |
| `callId` | `string` | Yes | - |

---

### `INTERFACE` `SummaryGroup`

- **Line:** 108

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `key` | `string` | No | - |
| `totalLeads` | `number` | No | - |
| `totalValue` | `number` | No | - |
| `totalActivities` | `number` | No | - |
| `totalDurationMinutes` | `number` | No | - |
| `leads` | `{ id: string; name: string; value: number; status: string; leadType: string; activityCount: number; durationMinutes: number; lastContacted: string | null }[]` | No | - |

---

### `INTERFACE` `AmResponsivenessDetail`

- **Line:** 117

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `leadId` | `string` | No | - |
| `companyName` | `string` | No | - |
| `assignmentDate` | `Date | null` | No | - |
| `firstActivityDate` | `Date | null` | No | - |
| `timeToInteractHours` | `number | null` | No | - |
| `hasActivity` | `boolean` | No | - |

---

### `INTERFACE` `AmResponsivenessMetric`

- **Line:** 126

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `amName` | `string` | No | - |
| `totalLeads` | `number` | No | - |
| `leadsWithActivity` | `number` | No | - |
| `leadsWithoutActivity` | `number` | No | - |
| `avgTimeToInteractHours` | `number | null` | No | - |
| `leadsDetails` | `AmResponsivenessDetail[]` | No | - |

---

### `FUNCTION` `parseDurationToMinutes`

- **Line:** 135
- **Returns:** `number`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `durationStr` | `string` | No | - | - |

---

### `VARIABLE` `minutes`

- **Line:** 137

---

### `VARIABLE` `mMatch`

- **Line:** 138

---

### `VARIABLE` `sMatch`

- **Line:** 140

---

### `VARIABLE` `parts`

- **Line:** 144

---

### `FUNCTION` `AMReportsDashboard`

- **Line:** 154
- **Returns:** `void`

---

### `VARIABLE` `isFranchiseeRole`

- **Line:** 156

---

### `FUNCTION` `handleExportAppointments`

- **Line:** 179

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `appsToExport` | `ExtendedAppointment[]` | **Yes** | - | - |
| `filename` | `string` | **Yes** | - | - |

---

### `VARIABLE` `exportData`

- **Line:** 184

---

### `VARIABLE` `primaryContact`

- **Line:** 185

---

### `VARIABLE` `headers`

- **Line:** 196

---

### `FUNCTION` `escapeCsv`

- **Line:** 197

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `val` | `any` | **Yes** | - | - |

---

### `VARIABLE` `csvRows`

- **Line:** 198

---

### `VARIABLE` `csvContent`

- **Line:** 199

---

### `VARIABLE` `blob`

- **Line:** 200

---

### `VARIABLE` `link`

- **Line:** 201

---

### `VARIABLE` `filteredDrillDownAppointments`

- **Line:** 209

---

### `VARIABLE` `list`

- **Line:** 211

---

### `VARIABLE` `b`

- **Line:** 217

---

### `VARIABLE` `queryVal`

- **Line:** 222

---

### `VARIABLE` `leadName`

- **Line:** 224

---

### `VARIABLE` `primaryContact`

- **Line:** 225

---

### `VARIABLE` `contactName`

- **Line:** 226

---

### `FUNCTION` `handleExportData`

- **Line:** 233

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadsToExport` | `Lead[]` | **Yes** | - | - |
| `filename` | `string` | **Yes** | - | - |

---

### `VARIABLE` `exportData`

- **Line:** 238

---

### `VARIABLE` `primaryContact`

- **Line:** 239

---

### `VARIABLE` `headers`

- **Line:** 254

---

### `FUNCTION` `escapeCsv`

- **Line:** 255

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `val` | `any` | **Yes** | - | - |

---

### `VARIABLE` `csvRows`

- **Line:** 256

---

### `VARIABLE` `csvContent`

- **Line:** 257

---

### `VARIABLE` `blob`

- **Line:** 258

---

### `VARIABLE` `link`

- **Line:** 259

---

### `VARIABLE` `filteredDrillDownLeads`

- **Line:** 267

---

### `VARIABLE` `list`

- **Line:** 269

---

### `VARIABLE` `b`

- **Line:** 275

---

### `VARIABLE` `queryVal`

- **Line:** 280

---

### `VARIABLE` `primaryContact`

- **Line:** 282

---

### `VARIABLE` `drillDownAvailableStatuses`

- **Line:** 293

---

### `VARIABLE` `statuses`

- **Line:** 295

---

### `VARIABLE` `hasUnappliedFilters`

- **Line:** 338

---

### `FUNCTION` `applyFilters`

- **Line:** 360

---

### `FUNCTION` `toggleAuthor`

- **Line:** 385

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `author` | `string` | **Yes** | - | - |

---

### `FUNCTION` `toggleLead`

- **Line:** 389

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadKey` | `string` | **Yes** | - | - |

---

### `FUNCTION` `toggleAmResponsiveness`

- **Line:** 393

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `amName` | `string` | **Yes** | - | - |

---

### `VARIABLE` `isAdmin`

- **Line:** 397

---

### `VARIABLE` `isAm`

- **Line:** 398

---

### `FUNCTION` `getAmName`

- **Line:** 400

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `am` | `UserProfile` | **Yes** | - | - |

---

### `VARIABLE` `loggedInAmName`

- **Line:** 404

---

### `FUNCTION` `fetchAMs`

- **Line:** 408
- **Async:** Yes
- **Returns:** `void`

---

### `VARIABLE` `usersRef`

- **Line:** 411

---

### `VARIABLE` `q1`

- **Line:** 412

---

### `VARIABLE` `q2`

- **Line:** 413

---

### `VARIABLE` `q3`

- **Line:** 414

---

### `VARIABLE` `amMap`

- **Line:** 422

---

### `FUNCTION` `fetchPipeline`

- **Line:** 444
- **Async:** Yes
- **Returns:** `void`

---

### `VARIABLE` `startTimePerf`

- **Line:** 447

---

### `VARIABLE` `leadsRef`

- **Line:** 449

---

### `VARIABLE` `companiesRef`

- **Line:** 450

---

### `VARIABLE` `buckets`

- **Line:** 451

---

### `VARIABLE` `qLeads`

- **Line:** 453

---

### `VARIABLE` `qCompanies`

- **Line:** 454

---

### `VARIABLE` `activitiesQuery`

- **Line:** 457

---

### `VARIABLE` `fromDateStr`

- **Line:** 459

---

### `VARIABLE` `toDateStr`

- **Line:** 461

---

### `VARIABLE` `threeMonthsAgo`

- **Line:** 474

---

### `VARIABLE` `fromDateStr`

- **Line:** 482

---

### `VARIABLE` `toDateStr`

- **Line:** 483

---

### `VARIABLE` `fetchedInvoices`

- **Line:** 500
- **Signature:** `ExtendedInvoice[]`

---

### `VARIABLE` `rawCompanies`

- **Line:** 507

---

### `VARIABLE` `data`

- **Line:** 509

---

### `VARIABLE` `companyIds`

- **Line:** 520

---

### `VARIABLE` `rawLeads`

- **Line:** 522

---

### `VARIABLE` `fetchedLeads`

- **Line:** 527

---

### `VARIABLE` `scfsByParentMap`

- **Line:** 531

---

### `VARIABLE` `parentId`

- **Line:** 533

---

### `VARIABLE` `existing`

- **Line:** 535

---

### `VARIABLE` `parentScfs`

- **Line:** 542

---

### `VARIABLE` `activities`

- **Line:** 550

---

### `VARIABLE` `data`

- **Line:** 551

---

### `VARIABLE` `activitiesMap`

- **Line:** 560
- **Signature:** `Record<string, Activity[]>`

---

### `VARIABLE` `leadsWithActivities`

- **Line:** 569

---

### `VARIABLE` `amNames`

- **Line:** 574

---

### `VARIABLE` `filteredLeads`

- **Line:** 576

---

### `VARIABLE` `isDirectlyAm`

- **Line:** 578

---

### `VARIABLE` `wasInAm`

- **Line:** 579

---

### `VARIABLE` `hasAnyAmActivity`

- **Line:** 580

---

### `VARIABLE` `qualifiesForAmReport`

- **Line:** 582

---

### `VARIABLE` `targetAm`

- **Line:** 586

---

### `VARIABLE` `isAssignedToTargetAm`

- **Line:** 588

---

### `VARIABLE` `hasTargetAmActivity`

- **Line:** 589

---

### `FUNCTION` `isSignedStatus`

- **Line:** 610
- **Returns:** `boolean`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `status` | `string` | No | - | - |

---

### `VARIABLE` `s`

- **Line:** 612

---

### `FUNCTION` `isSignedLead`

- **Line:** 616
- **Returns:** `boolean`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `lead` | `Lead` | **Yes** | - | - |

---

### `VARIABLE` `status`

- **Line:** 619

---

### `FUNCTION` `isSignedUpInDateRange`

- **Line:** 623
- **Returns:** `boolean`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `lead` | `Lead` | **Yes** | - | - |
| `dateRange` | `DateRange` | No | - | - |

---

### `VARIABLE` `fromDate`

- **Line:** 629

---

### `VARIABLE` `toDate`

- **Line:** 630

---

### `VARIABLE` `rawSignedDate`

- **Line:** 633

---

### `VARIABLE` `parsedSigned`

- **Line:** 635

---

### `VARIABLE` `signedActivity`

- **Line:** 643

---

### `VARIABLE` `notes`

- **Line:** 644

---

### `VARIABLE` `isSignNote`

- **Line:** 645

---

### `VARIABLE` `parsedActDate`

- **Line:** 648

---

### `VARIABLE` `rawCreatedDate`

- **Line:** 657

---

### `VARIABLE` `parsedCreated`

- **Line:** 659

---

### `FUNCTION` `calculateRawLeadValue`

- **Line:** 669
- **Returns:** `number`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `lead` | `Lead` | **Yes** | - | - |

---

### `FUNCTION` `calculateMonthlyValue`

- **Line:** 674

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `lead` | `Lead` | **Yes** | - | - |

---

### `VARIABLE` `applicableStatuses`

- **Line:** 678

---

### `VARIABLE` `currentStatus`

- **Line:** 679

---

### `FUNCTION` `isActivityDateInRange`

- **Line:** 689

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `dateStr` | `string` | **Yes** | - | - |

---

### `VARIABLE` `date`

- **Line:** 691

---

### `VARIABLE` `fromDate`

- **Line:** 693

---

### `VARIABLE` `toDate`

- **Line:** 694

---

### `VARIABLE` `uniqueFranchisees`

- **Line:** 698

---

### `VARIABLE` `STANDARD_AM_BUCKETS`

- **Line:** 699

---

### `VARIABLE` `uniqueBuckets`

- **Line:** 700

---

### `VARIABLE` `uniqueLeadTypes`

- **Line:** 701

---

### `VARIABLE` `uniqueStatuses`

- **Line:** 702

---

### `VARIABLE` `displayedLeads`

- **Line:** 704

---

### `VARIABLE` `status`

- **Line:** 713

---

### `VARIABLE` `enteredDate`

- **Line:** 717

---

### `VARIABLE` `fromDate`

- **Line:** 721

---

### `VARIABLE` `toDate`

- **Line:** 722

---

### `VARIABLE` `amNames`

- **Line:** 727

---

### `VARIABLE` `targetAm`

- **Line:** 728

---

### `VARIABLE` `hasActivityInRange`

- **Line:** 729

---

### `VARIABLE` `author`

- **Line:** 730

---

### `VARIABLE` `amStageAnalytics`

- **Line:** 742

---

### `VARIABLE` `amFilteredLeads`

- **Line:** 746

---

### `VARIABLE` `status`

- **Line:** 753

---

### `VARIABLE` `rep`

- **Line:** 757

---

### `VARIABLE` `matchRep`

- **Line:** 758

---

### `VARIABLE` `matchAct`

- **Line:** 759

---

### `VARIABLE` `prevMonthSummary`

- **Line:** 767

---

### `VARIABLE` `appointmentMetrics`

- **Line:** 771

---

### `VARIABLE` `baseFilteredLeadIds`

- **Line:** 772

---

### `VARIABLE` `status`

- **Line:** 778

---

### `VARIABLE` `enteredDate`

- **Line:** 782

---

### `VARIABLE` `fromDate`

- **Line:** 784

---

### `VARIABLE` `toDate`

- **Line:** 785

---

### `VARIABLE` `relevantAppointments`

- **Line:** 792

---

### `VARIABLE` `targetAm`

- **Line:** 795

---

### `VARIABLE` `appAm`

- **Line:** 797

---

### `VARIABLE` `lead`

- **Line:** 798

---

### `VARIABLE` `leadAm`

- **Line:** 799

---

### `VARIABLE` `appDateStr`

- **Line:** 806

---

### `VARIABLE` `appDate`

- **Line:** 808

---

### `VARIABLE` `fromDate`

- **Line:** 810

---

### `VARIABLE` `toDate`

- **Line:** 811

---

### `VARIABLE` `scheduled`

- **Line:** 818

---

### `VARIABLE` `cancelled`

- **Line:** 819

---

### `VARIABLE` `rescheduled`

- **Line:** 820

---

### `VARIABLE` `completed`

- **Line:** 821

---

### `VARIABLE` `noShow`

- **Line:** 822

---

### `VARIABLE` `perAm`

- **Line:** 823
- **Signature:** `Record<string, number>`

---

### `VARIABLE` `perLead`

- **Line:** 824
- **Signature:** `Record<string, number>`

---

### `VARIABLE` `byWeekCreated`

- **Line:** 825
- **Signature:** `Record<string, number>`

---

### `VARIABLE` `byDateScheduled`

- **Line:** 826
- **Signature:** `Record<string, number>`

---

### `VARIABLE` `byDateCreated`

- **Line:** 827
- **Signature:** `Record<string, number>`

---

### `VARIABLE` `status`

- **Line:** 830

---

### `VARIABLE` `am`

- **Line:** 837

---

### `VARIABLE` `leadName`

- **Line:** 840

---

### `VARIABLE` `rawDateScheduled`

- **Line:** 843

---

### `VARIABLE` `dateScheduled`

- **Line:** 844

---

### `VARIABLE` `dateCreated`

- **Line:** 850

---

### `VARIABLE` `weekDate`

- **Line:** 853

---

### `VARIABLE` `weekStr`

- **Line:** 856

---

### `VARIABLE` `fallbackDate`

- **Line:** 860

---

### `VARIABLE` `weekDate`

- **Line:** 862

---

### `VARIABLE` `weekStr`

- **Line:** 865

---

### `VARIABLE` `todayStart`

- **Line:** 873

---

### `VARIABLE` `overduePending`

- **Line:** 874

---

### `VARIABLE` `status`

- **Line:** 875

---

### `VARIABLE` `appDateStr`

- **Line:** 877

---

### `VARIABLE` `appDate`

- **Line:** 879

---

### `FUNCTION` `normalizeAuthorName`

- **Line:** 894

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `authorName` | `string` | **Yes** | - | - |
| `amNames` | `string[]` | **Yes** | - | - |

---

### `VARIABLE` `name`

- **Line:** 896

---

### `VARIABLE` `matched`

- **Line:** 902

---

### `VARIABLE` `allActivities`

- **Line:** 907

---

### `VARIABLE` `activities`

- **Line:** 908
- **Signature:** `FlatActivity[]`

---

### `VARIABLE` `amNames`

- **Line:** 909

---

### `VARIABLE` `targetAm`

- **Line:** 910

---

### `VARIABLE` `rawAuthor`

- **Line:** 915

---

### `VARIABLE` `author`

- **Line:** 916

---

### `VARIABLE` `groupedActivities`

- **Line:** 943

---

### `VARIABLE` `authorGroups`

- **Line:** 944
- **Signature:** `Record<string, Record<string, { leadId: string; leadName: string; activities: FlatActivity[] }>>`

---

### `VARIABLE` `author`

- **Line:** 947

---

### `VARIABLE` `leadId`

- **Line:** 948

---

### `VARIABLE` `leadName`

- **Line:** 949

---

### `VARIABLE` `leads`

- **Line:** 965

---

### `VARIABLE` `sortedActs`

- **Line:** 966

---

### `VARIABLE` `totalCount`

- **Line:** 974

---

### `VARIABLE` `latestDate`

- **Line:** 975

---

### `VARIABLE` `activityTrendData`

- **Line:** 986

---

### `VARIABLE` `dailyCounts`

- **Line:** 987
- **Signature:** `Record<string, { date: string; Calls: number; Emails: number; Meetings: number; Updates: number; Total: number }>`

---

### `VARIABLE` `dateStr`

- **Line:** 990

---

### `VARIABLE` `activityLeaderboardData`

- **Line:** 1005

---

### `VARIABLE` `counts`

- **Line:** 1006
- **Signature:** `Record<string, { name: string; Calls: number; Emails: number; Meetings: number; Updates: number; Total: number }>`

---

### `VARIABLE` `author`

- **Line:** 1011

---

### `VARIABLE` `metrics`

- **Line:** 1027

---

### `VARIABLE` `totalCalls`

- **Line:** 1028

---

### `VARIABLE` `totalEmails`

- **Line:** 1029

---

### `VARIABLE` `totalMeetings`

- **Line:** 1030

---

### `VARIABLE` `totalUpdates`

- **Line:** 1031

---

### `VARIABLE` `amCallStats`

- **Line:** 1033
- **Signature:** `Record<string, { callCount: number; totalDurationMinutes: number }>`

---

### `VARIABLE` `am`

- **Line:** 1041

---

### `FUNCTION` `isLostLead`

- **Line:** 1050

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `l` | `Lead` | **Yes** | - | - |

---

### `VARIABLE` `st`

- **Line:** 1051

---

### `VARIABLE` `lostStatuses`

- **Line:** 1052

---

### `VARIABLE` `totalPipelineValue`

- **Line:** 1056

---

### `VARIABLE` `activeLeadsWithMrrCount`

- **Line:** 1057

---

### `VARIABLE` `totalSignedMrr`

- **Line:** 1058

---

### `VARIABLE` `totalSignedLeadsCount`

- **Line:** 1059

---

### `VARIABLE` `totalDurationMinutes`

- **Line:** 1060

---

### `VARIABLE` `valueByStatus`

- **Line:** 1061
- **Signature:** `Record<string, { value: number; leadCount: number }>`

---

### `VARIABLE` `valueByLeadType`

- **Line:** 1062
- **Signature:** `Record<string, { value: number; leadCount: number }>`

---

### `VARIABLE` `valueByBucket`

- **Line:** 1063
- **Signature:** `Record<string, { value: number; leadCount: number }>`

---

### `VARIABLE` `valueByAM`

- **Line:** 1064
- **Signature:** `Record<string, { value: number; leadCount: number }>`

---

### `VARIABLE` `valueByLead`

- **Line:** 1065
- **Signature:** `{ id: string; name: string; value: number; status: string; leadType: string; activityCount: number; durationMinutes: number; lastContacted: string | null }[]`

---

### `VARIABLE` `dateRangeFilter`

- **Line:** 1067

---

### `VARIABLE` `isLost`

- **Line:** 1070

---

### `VARIABLE` `isSigned`

- **Line:** 1071

---

### `VARIABLE` `signedInPeriod`

- **Line:** 1072

---

### `VARIABLE` `rawVal`

- **Line:** 1073

---

### `VARIABLE` `leadType`

- **Line:** 1074

---

### `VARIABLE` `status`

- **Line:** 1075

---

### `VARIABLE` `val`

- **Line:** 1087

---

### `VARIABLE` `bucketRaw`

- **Line:** 1100

---

### `VARIABLE` `bucket`

- **Line:** 1101

---

### `VARIABLE` `am`

- **Line:** 1106

---

### `VARIABLE` `leadActivities`

- **Line:** 1114

---

### `VARIABLE` `leadDuration`

- **Line:** 1115

---

### `VARIABLE` `lastContactedAct`

- **Line:** 1119

---

### `VARIABLE` `groupedByAM`

- **Line:** 1136
- **Signature:** `Record<string, SummaryGroup>`

---

### `VARIABLE` `groupedByStatus`

- **Line:** 1137
- **Signature:** `Record<string, SummaryGroup>`

---

### `VARIABLE` `groupedByFranchisee`

- **Line:** 1138
- **Signature:** `Record<string, SummaryGroup>`

---

### `FUNCTION` `getGroup`

- **Line:** 1140
- **Returns:** `SummaryGroup`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `record` | `Record<string, SummaryGroup>` | **Yes** | - | - |
| `key` | `string` | **Yes** | - | - |

---

### `VARIABLE` `isLost`

- **Line:** 1149

---

### `VARIABLE` `isSigned`

- **Line:** 1150

---

### `VARIABLE` `rawVal`

- **Line:** 1151

---

### `VARIABLE` `status`

- **Line:** 1152

---

### `VARIABLE` `franchisee`

- **Line:** 1153

---

### `VARIABLE` `amAssigned`

- **Line:** 1154

---

### `VARIABLE` `leadActivities`

- **Line:** 1156

---

### `VARIABLE` `leadDuration`

- **Line:** 1157

---

### `VARIABLE` `summaryLeadItem`

- **Line:** 1159

---

### `VARIABLE` `stGroup`

- **Line:** 1171

---

### `VARIABLE` `frGroup`

- **Line:** 1179

---

### `VARIABLE` `amGroup`

- **Line:** 1187

---

### `VARIABLE` `author`

- **Line:** 1195

---

### `VARIABLE` `amGroup`

- **Line:** 1196

---

### `VARIABLE` `leadObj`

- **Line:** 1200

---

### `VARIABLE` `summaryByAM`

- **Line:** 1215

---

### `VARIABLE` `summaryByStatus`

- **Line:** 1216

---

### `VARIABLE` `summaryByFranchisee`

- **Line:** 1217

---

### `FUNCTION` `formatHours`

- **Line:** 1242
- **Returns:** `string`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `hours` | `number | null` | **Yes** | - | - |

---

### `VARIABLE` `mins`

- **Line:** 1245

---

### `VARIABLE` `days`

- **Line:** 1251

---

### `VARIABLE` `amResponsivenessMetrics`

- **Line:** 1255

---

### `VARIABLE` `amNames`

- **Line:** 1256

---

### `VARIABLE` `metricsMap`

- **Line:** 1257
- **Signature:** `Record<string, AmResponsivenessMetric>`

---

### `VARIABLE` `assignedAM`

- **Line:** 1271

---

### `VARIABLE` `amMetric`

- **Line:** 1276

---

### `VARIABLE` `assignmentDate`

- **Line:** 1278
- **Signature:** `Date | null`

---

### `VARIABLE` `amHistory`

- **Line:** 1280

---

### `VARIABLE` `parsed`

- **Line:** 1288

---

### `VARIABLE` `fromDate`

- **Line:** 1296

---

### `VARIABLE` `toDate`

- **Line:** 1297

---

### `VARIABLE` `amActivities`

- **Line:** 1303

---

### `VARIABLE` `firstActivity`

- **Line:** 1307

---

### `VARIABLE` `firstActivityDate`

- **Line:** 1308

---

### `VARIABLE` `hasActivity`

- **Line:** 1309

---

### `VARIABLE` `timeToInteractHours`

- **Line:** 1311
- **Signature:** `number | null`

---

### `VARIABLE` `diffMs`

- **Line:** 1313

---

### `VARIABLE` `interactedLeads`

- **Line:** 1335

---

### `VARIABLE` `sumHours`

- **Line:** 1337

---

### `VARIABLE` `list`

- **Line:** 1347

---

### `VARIABLE` `statusChartData`

- **Line:** 1355

---

### `VARIABLE` `leadTypeChartData`

- **Line:** 1366

---

### `VARIABLE` `bucketChartData`

- **Line:** 1376

---

### `VARIABLE` `amChartData`

- **Line:** 1385

---

### `VARIABLE` `signedLeadsData`

- **Line:** 1395

---

### `FUNCTION` `isLostLead`

- **Line:** 1396

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `l` | `Lead` | **Yes** | - | - |

---

### `VARIABLE` `st`

- **Line:** 1397

---

### `VARIABLE` `lostStatuses`

- **Line:** 1398

---

### `VARIABLE` `dateRangeFilter`

- **Line:** 1402

---

### `VARIABLE` `signedList`

- **Line:** 1404
- **Signature:** `{
            id: string;
            companyName: string;
            accountManager: string;
            bucket: string;
            leadType: string;
            status: string;
            signedMrr: number;
            dateEntered: string;
            lead: Lead;
        }[]`

---

### `VARIABLE` `signedMrr`

- **Line:** 1418

---

### `VARIABLE` `bucketRaw`

- **Line:** 1419

---

### `VARIABLE` `bucket`

- **Line:** 1420

---

### `VARIABLE` `leadType`

- **Line:** 1421

---

### `VARIABLE` `am`

- **Line:** 1422

---

### `VARIABLE` `status`

- **Line:** 1423

---

### `VARIABLE` `totalSignedMrr`

- **Line:** 1439

---

### `VARIABLE` `byBucketMap`

- **Line:** 1440
- **Signature:** `Record<string, { bucket: string; count: number; signedMrr: number; leads: Lead[] }>`

---

### `VARIABLE` `byLeadTypeMap`

- **Line:** 1441
- **Signature:** `Record<string, { type: string; count: number; signedMrr: number; leads: Lead[] }>`

---

### `VARIABLE` `byAmMap`

- **Line:** 1442
- **Signature:** `Record<string, { am: string; count: number; signedMrr: number; leads: Lead[] }>`

---

### `VARIABLE` `byBucket`

- **Line:** 1472

---

### `VARIABLE` `byLeadType`

- **Line:** 1473

---

### `VARIABLE` `byAm`

- **Line:** 1474

---

### `VARIABLE` `lostLeadsData`

- **Line:** 1487

---

### `FUNCTION` `isLostLead`

- **Line:** 1488

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `l` | `Lead` | **Yes** | - | - |

---

### `VARIABLE` `st`

- **Line:** 1489

---

### `VARIABLE` `lostStatuses`

- **Line:** 1490

---

### `VARIABLE` `lostList`

- **Line:** 1494
- **Signature:** `{
            id: string;
            companyName: string;
            accountManager: string;
            bucket: string;
            leadType: string;
            status: string;
            lostMrr: number;
            dateEntered: string;
            lead: Lead;
        }[]`

---

### `VARIABLE` `lostMrr`

- **Line:** 1508

---

### `VARIABLE` `bucketRaw`

- **Line:** 1511

---

### `VARIABLE` `bucket`

- **Line:** 1512

---

### `VARIABLE` `leadType`

- **Line:** 1513

---

### `VARIABLE` `am`

- **Line:** 1514

---

### `VARIABLE` `status`

- **Line:** 1515

---

### `VARIABLE` `totalLostMrr`

- **Line:** 1532

---

### `VARIABLE` `byBucketMap`

- **Line:** 1533
- **Signature:** `Record<string, { bucket: string; count: number; lostMrr: number; leads: Lead[] }>`

---

### `VARIABLE` `byLeadTypeMap`

- **Line:** 1534
- **Signature:** `Record<string, { type: string; count: number; lostMrr: number; leads: Lead[] }>`

---

### `VARIABLE` `byAmMap`

- **Line:** 1535
- **Signature:** `Record<string, { am: string; count: number; lostMrr: number; leads: Lead[] }>`

---

### `VARIABLE` `byBucket`

- **Line:** 1565

---

### `VARIABLE` `byLeadType`

- **Line:** 1566

---

### `VARIABLE` `byAm`

- **Line:** 1567

---

### `FUNCTION` `isDirectOutOfTerritory`

- **Line:** 1579
- **Returns:** `boolean`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `l` | `Lead` | **Yes** | - | - |

---

### `VARIABLE` `status`

- **Line:** 1580

---

### `VARIABLE` `customerStatus`

- **Line:** 1581

---

### `FUNCTION` `isLostOutOfTerritory`

- **Line:** 1585
- **Returns:** `boolean`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `l` | `Lead` | **Yes** | - | - |

---

### `VARIABLE` `status`

- **Line:** 1587

---

### `VARIABLE` `customerStatus`

- **Line:** 1588

---

### `VARIABLE` `nsStatus`

- **Line:** 1589

---

### `VARIABLE` `isLost`

- **Line:** 1590

---

### `VARIABLE` `reason`

- **Line:** 1599

---

### `FUNCTION` `isAnyOutOfTerritory`

- **Line:** 1603
- **Returns:** `boolean`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `l` | `Lead` | **Yes** | - | - |

---

### `VARIABLE` `reason`

- **Line:** 1604

---

### `VARIABLE` `outOfTerritoryMetrics`

- **Line:** 1608

---

### `VARIABLE` `directLeads`

- **Line:** 1609

---

### `VARIABLE` `lostLeads`

- **Line:** 1610

---

### `VARIABLE` `totalLeads`

- **Line:** 1611

---

### `VARIABLE` `byAmMap`

- **Line:** 1613
- **Signature:** `Record<string, { am: string; direct: number; lost: number; total: number; leads: Lead[] }>`

---

### `VARIABLE` `am`

- **Line:** 1617

---

### `VARIABLE` `byAm`

- **Line:** 1631

---

### `VARIABLE` `summaryChartData`

- **Line:** 1641

---

### `VARIABLE` `data`

- **Line:** 1642

---

### `VARIABLE` `activityBreakdownData`

- **Line:** 1653

---

### `VARIABLE` `topLeads`

- **Line:** 1654

---

### `VARIABLE` `leadActivities`

- **Line:** 1656

---

### `VARIABLE` `calls`

- **Line:** 1657

---

### `VARIABLE` `emails`

- **Line:** 1657

---

### `VARIABLE` `meetings`

- **Line:** 1657

---

### `VARIABLE` `updates`

- **Line:** 1657

---

### `VARIABLE` `scatterData`

- **Line:** 1675

---

### `VARIABLE` `outcomeChartData`

- **Line:** 1685

---

### `VARIABLE` `statusData`

- **Line:** 1686
- **Signature:** `Record<string, {status: string, activities: number, duration: number, value: number}>`

---

### `VARIABLE` `stat`

- **Line:** 1688

---

### `VARIABLE` `franchiseeOptions`

- **Line:** 1698
- **Signature:** `Option[]`

---

### `VARIABLE` `bucketOptions`

- **Line:** 1699
- **Signature:** `Option[]`

---

### `VARIABLE` `leadTypeOptions`

- **Line:** 1703
- **Signature:** `Option[]`

---

### `VARIABLE` `statusOptions`

- **Line:** 1704
- **Signature:** `Option[]`

---

### `FUNCTION` `clearFilters`

- **Line:** 1705

---

### `FUNCTION` `handleExportAllSectionsCSV`

- **Line:** 1725

---

### `VARIABLE` `csvParts`

- **Line:** 1726
- **Signature:** `string[]`

---

### `VARIABLE` `dateStr`

- **Line:** 1727

---

### `FUNCTION` `escapeCsv`

- **Line:** 1728

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `val` | `any` | **Yes** | - | - |

---

### `FUNCTION` `addSection`

- **Line:** 1730

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `title` | `string` | **Yes** | - | - |
| `headers` | `string[]` | **Yes** | - | - |
| `rows` | `any[][]` | **Yes** | - | - |

---

### `VARIABLE` `leadHeaders`

- **Line:** 1740

---

### `VARIABLE` `leadRows`

- **Line:** 1745

---

### `VARIABLE` `primaryContact`

- **Line:** 1746

---

### `VARIABLE` `amSummaryHeaders`

- **Line:** 1765

---

### `VARIABLE` `amSummaryRows`

- **Line:** 1766

---

### `VARIABLE` `statusSummaryHeaders`

- **Line:** 1776

---

### `VARIABLE` `statusSummaryRows`

- **Line:** 1777

---

### `VARIABLE` `franSummaryHeaders`

- **Line:** 1787

---

### `VARIABLE` `franSummaryRows`

- **Line:** 1788

---

### `VARIABLE` `respHeaders`

- **Line:** 1798

---

### `VARIABLE` `respRows`

- **Line:** 1799

---

### `VARIABLE` `appHeaders`

- **Line:** 1809

---

### `VARIABLE` `appRows`

- **Line:** 1810

---

### `VARIABLE` `primaryContact`

- **Line:** 1811

---

### `VARIABLE` `stageHeaders`

- **Line:** 1825

---

### `VARIABLE` `stageRows`

- **Line:** 1826
- **Signature:** `any[][]`

---

### `VARIABLE` `count`

- **Line:** 1831

---

### `VARIABLE` `ootHeaders`

- **Line:** 1840

---

### `VARIABLE` `ootRows`

- **Line:** 1841

---

### `VARIABLE` `revStatusHeaders`

- **Line:** 1850

---

### `VARIABLE` `revStatusRows`

- **Line:** 1851

---

### `VARIABLE` `revTypeHeaders`

- **Line:** 1855

---

### `VARIABLE` `revTypeRows`

- **Line:** 1856

---

### `VARIABLE` `revBucketHeaders`

- **Line:** 1860

---

### `VARIABLE` `revBucketRows`

- **Line:** 1861

---

### `VARIABLE` `revAmHeaders`

- **Line:** 1865

---

### `VARIABLE` `revAmRows`

- **Line:** 1866

---

### `VARIABLE` `csvContent`

- **Line:** 1870

---

### `VARIABLE` `blob`

- **Line:** 1871

---

### `VARIABLE` `link`

- **Line:** 1872

---

### `FUNCTION` `handleExportRevenueAnalysisCSV`

- **Line:** 1885

---

### `VARIABLE` `csvParts`

- **Line:** 1886
- **Signature:** `string[]`

---

### `VARIABLE` `dateStr`

- **Line:** 1887

---

### `FUNCTION` `escapeCsv`

- **Line:** 1888

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `val` | `any` | **Yes** | - | - |

---

### `FUNCTION` `addSection`

- **Line:** 1890

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `title` | `string` | **Yes** | - | - |
| `headers` | `string[]` | **Yes** | - | - |
| `rows` | `any[][]` | **Yes** | - | - |

---

### `VARIABLE` `csvContent`

- **Line:** 1904

---

### `VARIABLE` `blob`

- **Line:** 1905

---

### `VARIABLE` `link`

- **Line:** 1906

---

### `VARIABLE` `data`

- **Line:** 1954

---

### `VARIABLE` `exportRows`

- **Line:** 1955

---

### `VARIABLE` `headers`

- **Line:** 1962

---

### `FUNCTION` `escapeCsv`

- **Line:** 1963

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `val` | `any` | **Yes** | - | - |

---

### `VARIABLE` `csvRows`

- **Line:** 1964

---

### `VARIABLE` `csvContent`

- **Line:** 1965

---

### `VARIABLE` `blob`

- **Line:** 1966

---

### `VARIABLE` `link`

- **Line:** 1967

---

### `VARIABLE` `exportData`

- **Line:** 1977

---

### `VARIABLE` `headers`

- **Line:** 1985

---

### `FUNCTION` `escapeCsv`

- **Line:** 1986

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `val` | `any` | **Yes** | - | - |

---

### `VARIABLE` `csvRows`

- **Line:** 1987

---

### `VARIABLE` `csvContent`

- **Line:** 1988

---

### `VARIABLE` `blob`

- **Line:** 1989

---

### `VARIABLE` `link`

- **Line:** 1990

---

### `VARIABLE` `name`

- **Line:** 2023

---

### `VARIABLE` `activeLeadIds`

- **Line:** 2198

---

### `VARIABLE` `activeLeads`

- **Line:** 2199

---

### `VARIABLE` `mrrLeads`

- **Line:** 2210

---

### `VARIABLE` `mrrLeads`

- **Line:** 2221

---

### `FUNCTION` `isLostLead`

- **Line:** 2232

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `l` | `Lead` | **Yes** | - | - |

---

### `VARIABLE` `st`

- **Line:** 2233

---

### `VARIABLE` `lostStatuses`

- **Line:** 2234

---

### `VARIABLE` `dateRangeFilter`

- **Line:** 2237

---

### `VARIABLE` `signedLeads`

- **Line:** 2238

---

### `FUNCTION` `isLostLead`

- **Line:** 2249

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `l` | `Lead` | **Yes** | - | - |

---

### `VARIABLE` `st`

- **Line:** 2250

---

### `VARIABLE` `lostStatuses`

- **Line:** 2251

---

### `VARIABLE` `dateRangeFilter`

- **Line:** 2254

---

### `VARIABLE` `signedLeads`

- **Line:** 2255

---

### `VARIABLE` `data`

- **Line:** 2291

---

### `VARIABLE` `exportRows`

- **Line:** 2292

---

### `VARIABLE` `headers`

- **Line:** 2300

---

### `FUNCTION` `escapeCsv`

- **Line:** 2301

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `val` | `any` | **Yes** | - | - |

---

### `VARIABLE` `csvRows`

- **Line:** 2302

---

### `VARIABLE` `csvContent`

- **Line:** 2303

---

### `VARIABLE` `blob`

- **Line:** 2304

---

### `VARIABLE` `link`

- **Line:** 2305

---

### `VARIABLE` `matchedLeads`

- **Line:** 2356

---

### `VARIABLE` `data`

- **Line:** 2383

---

### `VARIABLE` `groupKey`

- **Line:** 2396

---

### `VARIABLE` `matchedLeads`

- **Line:** 2403

---

### `VARIABLE` `amName`

- **Line:** 2569

---

### `VARIABLE` `activeLeads`

- **Line:** 2570

---

### `VARIABLE` `amName`

- **Line:** 2583

---

### `VARIABLE` `activeLeads`

- **Line:** 2584

---

### `VARIABLE` `amName`

- **Line:** 2597

---

### `VARIABLE` `activeLeads`

- **Line:** 2598

---

### `VARIABLE` `amName`

- **Line:** 2611

---

### `VARIABLE` `activeLeads`

- **Line:** 2612

---

### `VARIABLE` `avgMins`

- **Line:** 2691

---

### `VARIABLE` `totalMinutesInt`

- **Line:** 2692

---

### `VARIABLE` `totalSecondsInt`

- **Line:** 2693

---

### `VARIABLE` `avgMinutesInt`

- **Line:** 2694

---

### `VARIABLE` `avgSecondsInt`

- **Line:** 2695

---

### `VARIABLE` `isAuthorExpanded`

- **Line:** 2730

---

### `VARIABLE` `leadKey`

- **Line:** 2761

---

### `VARIABLE` `isLeadExpanded`

- **Line:** 2762

---

### `VARIABLE` `coveragePct`

- **Line:** 2860

---

### `VARIABLE` `matchedLeads`

- **Line:** 2869

---

### `VARIABLE` `item`

- **Line:** 2932

---

### `VARIABLE` `matches`

- **Line:** 2953

---

### `VARIABLE` `item`

- **Line:** 2989

---

### `VARIABLE` `matches`

- **Line:** 3011

---

### `VARIABLE` `item`

- **Line:** 3047

---

### `VARIABLE` `matches`

- **Line:** 3069

---

### `VARIABLE` `bucketRaw`

- **Line:** 3070

---

### `VARIABLE` `bucketName`

- **Line:** 3071

---

### `VARIABLE` `item`

- **Line:** 3109

---

### `VARIABLE` `matches`

- **Line:** 3131

---

### `VARIABLE` `item`

- **Line:** 3230

---

### `VARIABLE` `item`

- **Line:** 3249

---

### `VARIABLE` `item`

- **Line:** 3278

---

### `VARIABLE` `item`

- **Line:** 3297

---

### `VARIABLE` `item`

- **Line:** 3326

---

### `VARIABLE` `item`

- **Line:** 3345

---

### `VARIABLE` `item`

- **Line:** 3458

---

### `VARIABLE` `item`

- **Line:** 3477

---

### `VARIABLE` `item`

- **Line:** 3506

---

### `VARIABLE` `item`

- **Line:** 3525

---

### `VARIABLE` `item`

- **Line:** 3554

---

### `VARIABLE` `item`

- **Line:** 3573

---

### `VARIABLE` `data`

- **Line:** 3665

---

### `VARIABLE` `total`

- **Line:** 3705

---

### `VARIABLE` `duration`

- **Line:** 3706

---

### `VARIABLE` `matched`

- **Line:** 3737

---

### `VARIABLE` `matched`

- **Line:** 3749

---

### `VARIABLE` `matched`

- **Line:** 3761

---

### `VARIABLE` `matched`

- **Line:** 3773

---

### `VARIABLE` `acts`

- **Line:** 3804

---

### `VARIABLE` `mins`

- **Line:** 3805

---

### `VARIABLE` `val`

- **Line:** 3806

---

### `VARIABLE` `activeAmList`

- **Line:** 3866

---

### `VARIABLE` `allActiveStatusesSet`

- **Line:** 3869

---

### `VARIABLE` `activeStatuses`

- **Line:** 3874

---

### `VARIABLE` `amLeads`

- **Line:** 3920

---

### `VARIABLE` `avgDays`

- **Line:** 3930

---

### `VARIABLE` `activeAmList`

- **Line:** 3959

---

### `VARIABLE` `allActiveStatusesSet`

- **Line:** 3962

---

### `VARIABLE` `activeStatusKeys`

- **Line:** 3967

---

### `VARIABLE` `STATUS_BAR_COLORS`

- **Line:** 3969
- **Signature:** `Record<string, string>`

---

### `VARIABLE` `PALETTE`

- **Line:** 3985

---

### `VARIABLE` `chartData`

- **Line:** 3987

---

### `VARIABLE` `item`

- **Line:** 3988
- **Signature:** `Record<string, any>`

---

### `VARIABLE` `appsWithLeads`

- **Line:** 4117

---

### `VARIABLE` `appsWithLeads`

- **Line:** 4141

---

### `VARIABLE` `list`

- **Line:** 4158

---

### `VARIABLE` `appsWithLeads`

- **Line:** 4159

---

### `VARIABLE` `list`

- **Line:** 4176

---

### `VARIABLE` `appsWithLeads`

- **Line:** 4177

---

### `VARIABLE` `list`

- **Line:** 4194

---

### `VARIABLE` `appsWithLeads`

- **Line:** 4195

---

### `VARIABLE` `list`

- **Line:** 4212

---

### `VARIABLE` `appsWithLeads`

- **Line:** 4213

---

### `VARIABLE` `list`

- **Line:** 4230

---

### `VARIABLE` `appsWithLeads`

- **Line:** 4231

---

### `VARIABLE` `amName`

- **Line:** 4264

---

### `VARIABLE` `appLeadIds`

- **Line:** 4265

---

### `VARIABLE` `matchedLeads`

- **Line:** 4266

---

### `VARIABLE` `ob`

- **Line:** 4383

---

### `VARIABLE` `outboundCount`

- **Line:** 4384

---

### `VARIABLE` `inboundCount`

- **Line:** 4385

---

### `VARIABLE` `fieldSalesCount`

- **Line:** 4386

---

### `VARIABLE` `marketingCount`

- **Line:** 4387

---

### `VARIABLE` `lpoCount`

- **Line:** 4388

---

### `VARIABLE` `mrrVal`

- **Line:** 4509

---

### `VARIABLE` `isComp`

- **Line:** 4510

---

### `VARIABLE` `dateVal`

- **Line:** 4524

---

### `VARIABLE` `primaryContact`

- **Line:** 4614

---

