# Module: `src/components/reports-client.tsx`

- **Language:** TypeScript
- **Total Lines:** 5821
- **Direct Dependencies:** 39 modules imported

## Exported Symbols & API

### `FUNCTION` `isLostLead`

- **Line:** 86

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `l` | `Lead` | **Yes** | - | - |

---

### `VARIABLE` `status`

- **Line:** 87

---

### `VARIABLE` `customerStatus`

- **Line:** 88

---

### `VARIABLE` `lostStatuses`

- **Line:** 89

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

### `VARIABLE` `hasAction`

- **Line:** 105

---

### `FUNCTION` `isActiveLocalMileLead`

- **Line:** 113

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `l` | `Lead` | **Yes** | - | - |

---

### `VARIABLE` `activeStatuses`

- **Line:** 115

---

### `VARIABLE` `status`

- **Line:** 119

---

### `FUNCTION` `isManualEmail`

- **Line:** 123
- **Returns:** `boolean`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `email` | `{ campaignId?: string; sender?: string }` | **Yes** | - | - |

---

### `VARIABLE` `senderLower`

- **Line:** 128

---

### `VARIABLE` `isSystemSender`

- **Line:** 129

---

### `FUNCTION` `calculateBusinessHoursSydney`

- **Line:** 145
- **Returns:** `number`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `start` | `Date` | **Yes** | - | - |
| `end` | `Date` | **Yes** | - | - |

---

### `FUNCTION` `getSydneyLocal`

- **Line:** 148
- **Returns:** `Date`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `d` | `Date` | **Yes** | - | - |

---

### `VARIABLE` `formatter`

- **Line:** 149

---

### `VARIABLE` `parts`

- **Line:** 159

---

### `VARIABLE` `partObj`

- **Line:** 160
- **Signature:** `Record<string, string>`

---

### `VARIABLE` `hour`

- **Line:** 164

---

### `VARIABLE` `startSyd`

- **Line:** 175

---

### `VARIABLE` `endSyd`

- **Line:** 176

---

### `VARIABLE` `startDay`

- **Line:** 178

---

### `VARIABLE` `endDay`

- **Line:** 179

---

### `VARIABLE` `msPerDay`

- **Line:** 181

---

### `VARIABLE` `dayOfWeek`

- **Line:** 184

---

### `VARIABLE` `businessStart`

- **Line:** 187

---

### `VARIABLE` `businessEnd`

- **Line:** 189

---

### `VARIABLE` `clampedStart`

- **Line:** 192

---

### `VARIABLE` `clampedEnd`

- **Line:** 193

---

### `VARIABLE` `totalMs`

- **Line:** 198

---

### `VARIABLE` `startDayOfWeek`

- **Line:** 200

---

### `VARIABLE` `businessStart`

- **Line:** 202

---

### `VARIABLE` `businessEnd`

- **Line:** 204

---

### `VARIABLE` `clampedStart`

- **Line:** 207

---

### `VARIABLE` `currentDay`

- **Line:** 211

---

### `VARIABLE` `dayOfWeek`

- **Line:** 213

---

### `VARIABLE` `endDayOfWeek`

- **Line:** 220

---

### `VARIABLE` `businessStart`

- **Line:** 222

---

### `VARIABLE` `businessEnd`

- **Line:** 224

---

### `VARIABLE` `clampedEnd`

- **Line:** 227

---

### `VARIABLE` `COLORS`

- **Line:** 234

---

### `FUNCTION` `SectionHelp`

- **Line:** 236

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ content }` | `{ content: React.ReactNode }` | **Yes** | - | - |

---

### `FUNCTION` `StatCard`

- **Line:** 253

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ title, value, icon: Icon, description, onClick, helpContent }` | `{ title: string; value: string | number | React.ReactNode; icon: React.ElementType; description?: React.ReactNode; onClick?: () => void; helpContent?: React.ReactNode }` | **Yes** | - | - |

---

### `FUNCTION` `CustomDailyTooltip`

- **Line:** 269

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ active, payload, label, metricMode }` | `any` | **Yes** | - | - |

---

### `VARIABLE` `fullDate`

- **Line:** 271

---

### `TYPE` `CallActivity`

- **Line:** 293
- **Signature:** `Activity & { leadId: string; leadName: string, leadStatus: LeadStatus, dialerAssigned?: string }`

---

### `TYPE` `AppointmentWithLead`

- **Line:** 294
- **Signature:** `Appointment & { leadId: string; leadName: string; dialerAssigned?: string; leadStatus: Lead['status']; entityId?: string; discoveryData?: DiscoveryData }`

---

### `VARIABLE` `leadStatuses`

- **Line:** 296
- **Signature:** `LeadStatus[]`

---

### `FUNCTION` `safeGetStatus`

- **Line:** 303
- **Returns:** `LeadStatus`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `status` | `any` | **Yes** | - | - |

---

### `VARIABLE` `validStatuses`

- **Line:** 304
- **Signature:** `LeadStatus[]`

---

### `VARIABLE` `trimmedStatus`

- **Line:** 306

---

### `VARIABLE` `cleanStatus`

- **Line:** 308

---

### `VARIABLE` `found`

- **Line:** 310

---

### `FUNCTION` `parseDateString`

- **Line:** 316
- **Returns:** `Date | null`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `dateVal` | `any` | **Yes** | - | - |

---

### `VARIABLE` `d`

- **Line:** 321

---

### `VARIABLE` `d`

- **Line:** 329

---

### `VARIABLE` `d`

- **Line:** 334

---

### `VARIABLE` `cleaned`

- **Line:** 340

---

### `VARIABLE` `dateTimeParts`

- **Line:** 342

---

### `VARIABLE` `datePart`

- **Line:** 343

---

### `VARIABLE` `dateParts`

- **Line:** 344

---

### `VARIABLE` `fullYear`

- **Line:** 348

---

### `VARIABLE` `date`

- **Line:** 352

---

### `FUNCTION` `safeFormat`

- **Line:** 359

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `dateStr` | `string | undefined` | **Yes** | - | - |
| `formatStr` | `string` | No | `'PP'` | - |

---

### `VARIABLE` `date`

- **Line:** 361

---

### `INTERFACE` `ReportsClientPageProps`

- **Line:** 368

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `externalDateRange` | `DateRange` | Yes | - |
| `hideHeaderAndFilters` | `boolean` | Yes | - |
| `visibleSections` | `string[]` | Yes | - |
| `defaultActivityDateRange` | `DateRange` | Yes | - |
| `defaultDialers` | `string[]` | Yes | - |
| `isDialerPerformanceOnly` | `boolean` | Yes | - |

---

### `FUNCTION` `ReportsClientPage`

- **Line:** 377
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{
  externalDateRange,
  hideHeaderAndFilters = false,
  visibleSections,
  defaultActivityDateRange,
  defaultDialers,
  isDialerPerformanceOnly = false,
}` | `ReportsClientPageProps` | No | `{}` | - |

---

### `VARIABLE` `staticDataRef`

- **Line:** 437

---

### `VARIABLE` `lastFetchedStartISORef`

- **Line:** 441

---

### `VARIABLE` `router`

- **Line:** 443

---

### `VARIABLE` `isSuperAdminUser`

- **Line:** 445

---

### `VARIABLE` `isFranchiseeRole`

- **Line:** 450

---

### `VARIABLE` `isUserOnlyRole`

- **Line:** 453

---

### `VARIABLE` `currentUserIdentifiers`

- **Line:** 455

---

### `VARIABLE` `ids`

- **Line:** 456

---

### `VARIABLE` `isAssignedToCurrentDialer`

- **Line:** 468

---

### `VARIABLE` `val`

- **Line:** 470

---

### `VARIABLE` `isDialerNameMatch`

- **Line:** 474

---

### `FUNCTION` `normalize`

- **Line:** 476

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `str` | `string` | **Yes** | - | - |

---

### `VARIABLE` `normA`

- **Line:** 477

---

### `VARIABLE` `normB`

- **Line:** 478

---

### `VARIABLE` `DEFAULT_DIALERS`

- **Line:** 488

---

### `VARIABLE` `hasUnappliedFilters`

- **Line:** 547

---

### `FUNCTION` `applyFilters`

- **Line:** 564

---

### `VARIABLE` `fetchData`

- **Line:** 568

---

### `VARIABLE` `startTimePerf`

- **Line:** 573

---

### `VARIABLE` `startISO`

- **Line:** 575

---

### `VARIABLE` `isDateRangeChanged`

- **Line:** 587

---

### `VARIABLE` `localStaticData`

- **Line:** 588

---

### `VARIABLE` `queryParams`

- **Line:** 597

---

### `VARIABLE` `apiRes`

- **Line:** 610

---

### `VARIABLE` `json`

- **Line:** 612

---

### `VARIABLE` `activityQueryConstraints`

- **Line:** 633
- **Signature:** `any[]`

---

### `VARIABLE` `endISO`

- **Line:** 635

---

### `VARIABLE` `activityQuery`

- **Line:** 639

---

### `VARIABLE` `apptQuery`

- **Line:** 644

---

### `VARIABLE` `fetches`

- **Line:** 648
- **Signature:** `Promise<any>[]`

---

### `VARIABLE` `results`

- **Line:** 657

---

### `VARIABLE` `activitiesSnap`

- **Line:** 660

---

### `VARIABLE` `apptsSnap`

- **Line:** 661

---

### `VARIABLE` `usersSnap`

- **Line:** 664

---

### `VARIABLE` `userList`

- **Line:** 666

---

### `VARIABLE` `data`

- **Line:** 667

---

### `VARIABLE` `name`

- **Line:** 668

---

### `VARIABLE` `role`

- **Line:** 671

---

### `VARIABLE` `activeRole`

- **Line:** 672

---

### `VARIABLE` `assignedRoles`

- **Line:** 673

---

### `VARIABLE` `isDialerRole`

- **Line:** 675

---

### `VARIABLE` `activeLeadIds`

- **Line:** 702

---

### `VARIABLE` `data`

- **Line:** 704

---

### `VARIABLE` `authorLower`

- **Line:** 705

---

### `VARIABLE` `notesLower`

- **Line:** 706

---

### `VARIABLE` `leadId`

- **Line:** 716

---

### `VARIABLE` `data`

- **Line:** 720

---

### `VARIABLE` `authorLower`

- **Line:** 721

---

### `VARIABLE` `notesLower`

- **Line:** 722

---

### `VARIABLE` `leadId`

- **Line:** 732

---

### `VARIABLE` `leadsDocs`

- **Line:** 738
- **Signature:** `any[]`

---

### `VARIABLE` `companiesDocs`

- **Line:** 739
- **Signature:** `any[]`

---

### `FUNCTION` `fetchInBatches`

- **Line:** 741
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `ids` | `string[]` | **Yes** | - | - |
| `isCompanies` | `boolean` | **Yes** | - | - |

---

### `VARIABLE` `colName`

- **Line:** 742

---

### `VARIABLE` `batches`

- **Line:** 743
- **Signature:** `string[][]`

---

### `VARIABLE` `resultsSnap`

- **Line:** 747
- **Signature:** `any[]`

---

### `VARIABLE` `concurrencyLimit`

- **Line:** 748

---

### `VARIABLE` `chunk`

- **Line:** 750

---

### `VARIABLE` `snaps`

- **Line:** 751

---

### `VARIABLE` `qLeads`

- **Line:** 768

---

### `VARIABLE` `qCompanies`

- **Line:** 769

---

### `FUNCTION` `processRecords`

- **Line:** 780

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `docs` | `any[]` | **Yes** | - | - |
| `isFromCompanies` | `any` | No | `false` | - |

---

### `VARIABLE` `data`

- **Line:** 782

---

### `VARIABLE` `rawLeads`

- **Line:** 807

---

### `VARIABLE` `rawCompanies`

- **Line:** 808

---

### `VARIABLE` `leadMap`

- **Line:** 810

---

### `VARIABLE` `combinedLeads`

- **Line:** 818

---

### `VARIABLE` `currentBucket`

- **Line:** 820

---

### `VARIABLE` `isCurrentlyOutbound`

- **Line:** 821

---

### `VARIABLE` `wasOutboundFlag`

- **Line:** 822

---

### `VARIABLE` `wasInBucketHistory`

- **Line:** 823

---

### `VARIABLE` `isAssignedToActiveDialer`

- **Line:** 827

---

### `VARIABLE` `activeLeadMap`

- **Line:** 838

---

### `VARIABLE` `rawActivities`

- **Line:** 841

---

### `VARIABLE` `data`

- **Line:** 842

---

### `VARIABLE` `leadId`

- **Line:** 843

---

### `VARIABLE` `lead`

- **Line:** 845

---

### `VARIABLE` `author`

- **Line:** 853

---

### `VARIABLE` `authorLower`

- **Line:** 859

---

### `VARIABLE` `notesLower`

- **Line:** 860

---

### `VARIABLE` `rawCalls`

- **Line:** 881

---

### `VARIABLE` `lead`

- **Line:** 883

---

### `VARIABLE` `outcomeMatch`

- **Line:** 884

---

### `VARIABLE` `outcome`

- **Line:** 885

---

### `VARIABLE` `finalCalls`

- **Line:** 895
- **Signature:** `CallActivity[]`

---

### `VARIABLE` `callsByLead`

- **Line:** 896
- **Signature:** `Record<string, CallActivity[]>`

---

### `VARIABLE` `outcomes`

- **Line:** 903

---

### `VARIABLE` `attempts`

- **Line:** 904

---

### `VARIABLE` `parsedAttempt`

- **Line:** 909

---

### `VARIABLE` `attemptTime`

- **Line:** 910

---

### `VARIABLE` `matched`

- **Line:** 911

---

### `VARIABLE` `parsedOutcome`

- **Line:** 912

---

### `VARIABLE` `outcomeTime`

- **Line:** 913

---

### `VARIABLE` `dateA`

- **Line:** 923

---

### `VARIABLE` `dateB`

- **Line:** 924

---

### `VARIABLE` `appts`

- **Line:** 929

---

### `VARIABLE` `data`

- **Line:** 930

---

### `VARIABLE` `authorLower`

- **Line:** 931

---

### `VARIABLE` `notesLower`

- **Line:** 932

---

### `VARIABLE` `apptDate`

- **Line:** 942

---

### `VARIABLE` `leadId`

- **Line:** 946

---

### `VARIABLE` `lead`

- **Line:** 948

---

### `VARIABLE` `dateA`

- **Line:** 972

---

### `VARIABLE` `dateB`

- **Line:** 973

---

### `FUNCTION` `handleFilterChange`

- **Line:** 995

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `filterName` | `keyof typeof filters` | **Yes** | - | - |
| `value` | `any` | **Yes** | - | - |

---

### `VARIABLE` `defaultRange`

- **Line:** 997

---

### `VARIABLE` `validRange`

- **Line:** 998

---

### `FUNCTION` `clearFilters`

- **Line:** 1005

---

### `VARIABLE` `defaultFilters`

- **Line:** 1006

---

### `VARIABLE` `leadsMap`

- **Line:** 1023

---

### `VARIABLE` `map`

- **Line:** 1024

---

### `VARIABLE` `apptsAssignedToMap`

- **Line:** 1029

---

### `VARIABLE` `map`

- **Line:** 1030

---

### `VARIABLE` `filteredCalls`

- **Line:** 1040

---

### `VARIABLE` `lead`

- **Line:** 1042

---

### `VARIABLE` `isUserMatch`

- **Line:** 1050

---

### `VARIABLE` `isUserMatch`

- **Line:** 1053

---

### `VARIABLE` `dialerMatch`

- **Line:** 1062

---

### `VARIABLE` `franchiseeMatch`

- **Line:** 1063

---

### `VARIABLE` `statusMatch`

- **Line:** 1064

---

### `VARIABLE` `sourceMatch`

- **Line:** 1065

---

### `VARIABLE` `activityDateMatch`

- **Line:** 1069

---

### `VARIABLE` `callDate`

- **Line:** 1071

---

### `VARIABLE` `fromDate`

- **Line:** 1073

---

### `VARIABLE` `toDate`

- **Line:** 1074

---

### `VARIABLE` `d`

- **Line:** 1081

---

### `VARIABLE` `minutesMatch`

- **Line:** 1082

---

### `VARIABLE` `secondsMatch`

- **Line:** 1083

---

### `VARIABLE` `minutes`

- **Line:** 1084

---

### `VARIABLE` `seconds`

- **Line:** 1085

---

### `VARIABLE` `durationInSeconds`

- **Line:** 1086

---

### `FUNCTION` `durationMatch`

- **Line:** 1088

---

### `VARIABLE` `apptAssignedSet`

- **Line:** 1098

---

### `VARIABLE` `appointmentAssignedToMatch`

- **Line:** 1099

---

### `VARIABLE` `assignmentDateMatch`

- **Line:** 1101

---

### `VARIABLE` `assignDate`

- **Line:** 1103

---

### `VARIABLE` `fromDate`

- **Line:** 1107

---

### `VARIABLE` `toDate`

- **Line:** 1108

---

### `VARIABLE` `leadAssignMatch`

- **Line:** 1109

---

### `VARIABLE` `callDate`

- **Line:** 1111

---

### `VARIABLE` `callDateMatch`

- **Line:** 1112

---

### `VARIABLE` `leadCreatedDateMatch`

- **Line:** 1118

---

### `VARIABLE` `createdDate`

- **Line:** 1120

---

### `VARIABLE` `fromDate`

- **Line:** 1124

---

### `VARIABLE` `toDate`

- **Line:** 1125

---

### `VARIABLE` `campaignMatch`

- **Line:** 1130

---

### `VARIABLE` `filteredAppointments`

- **Line:** 1136

---

### `VARIABLE` `lead`

- **Line:** 1139

---

### `VARIABLE` `campaignMatch`

- **Line:** 1142

---

### `VARIABLE` `isUserMatch`

- **Line:** 1150

---

### `VARIABLE` `isUserMatch`

- **Line:** 1153

---

### `VARIABLE` `dialerMatch`

- **Line:** 1162

---

### `VARIABLE` `franchiseeMatch`

- **Line:** 1163

---

### `VARIABLE` `statusMatch`

- **Line:** 1164

---

### `VARIABLE` `sourceMatch`

- **Line:** 1165

---

### `VARIABLE` `appointmentAssignedToMatch`

- **Line:** 1168

---

### `VARIABLE` `creationDateMatch`

- **Line:** 1170

---

### `VARIABLE` `appointmentCreatedDate`

- **Line:** 1172

---

### `VARIABLE` `fromDate`

- **Line:** 1174

---

### `VARIABLE` `toDate`

- **Line:** 1175

---

### `VARIABLE` `appointmentDateMatch`

- **Line:** 1179

---

### `VARIABLE` `apptDate`

- **Line:** 1181

---

### `VARIABLE` `fromDate`

- **Line:** 1183

---

### `VARIABLE` `toDate`

- **Line:** 1184

---

### `VARIABLE` `assignmentDateMatch`

- **Line:** 1188

---

### `VARIABLE` `assignDate`

- **Line:** 1190

---

### `VARIABLE` `fromDate`

- **Line:** 1194

---

### `VARIABLE` `toDate`

- **Line:** 1195

---

### `VARIABLE` `leadCreatedDateMatch`

- **Line:** 1200

---

### `VARIABLE` `createdDate`

- **Line:** 1202

---

### `VARIABLE` `fromDate`

- **Line:** 1206

---

### `VARIABLE` `toDate`

- **Line:** 1207

---

### `VARIABLE` `stats`

- **Line:** 1216

---

### `VARIABLE` `activitiesByLeadIdMap`

- **Line:** 1217

---

### `VARIABLE` `totalCalls`

- **Line:** 1225

---

### `VARIABLE` `totalAppointments`

- **Line:** 1226

---

### `VARIABLE` `uniqueLeadIdsCalled`

- **Line:** 1228

---

### `VARIABLE` `uniqueLeadIdsAppointed`

- **Line:** 1229

---

### `VARIABLE` `leadsWithAppts`

- **Line:** 1231

---

### `VARIABLE` `leadsWithCalls`

- **Line:** 1232

---

### `VARIABLE` `baseFilteredLeads`

- **Line:** 1234

---

### `VARIABLE` `isUserMatch`

- **Line:** 1240

---

### `VARIABLE` `isUserMatch`

- **Line:** 1243

---

### `VARIABLE` `franchiseeMatch`

- **Line:** 1250

---

### `VARIABLE` `dialerMatch`

- **Line:** 1251

---

### `VARIABLE` `sourceMatch`

- **Line:** 1253

---

### `VARIABLE` `interactionMatch`

- **Line:** 1257

---

### `VARIABLE` `leadActs`

- **Line:** 1259

---

### `VARIABLE` `actDate`

- **Line:** 1261

---

### `VARIABLE` `fromDate`

- **Line:** 1263

---

### `VARIABLE` `toDate`

- **Line:** 1264

---

### `VARIABLE` `assignmentDateMatch`

- **Line:** 1269

---

### `VARIABLE` `hasAssignedDialer`

- **Line:** 1271

---

### `VARIABLE` `assignDate`

- **Line:** 1275

---

### `VARIABLE` `fromDate`

- **Line:** 1279

---

### `VARIABLE` `toDate`

- **Line:** 1280

---

### `VARIABLE` `leadCreatedDateMatch`

- **Line:** 1286

---

### `VARIABLE` `createdDate`

- **Line:** 1288

---

### `VARIABLE` `fromDate`

- **Line:** 1292

---

### `VARIABLE` `toDate`

- **Line:** 1293

---

### `VARIABLE` `campaignMatch`

- **Line:** 1298

---

### `VARIABLE` `wonLeadsList`

- **Line:** 1303

---

### `VARIABLE` `wonCount`

- **Line:** 1304

---

### `VARIABLE` `quoteLeadsList`

- **Line:** 1306

---

### `VARIABLE` `quoteCount`

- **Line:** 1307

---

### `VARIABLE` `trialLeadsList`

- **Line:** 1309

---

### `VARIABLE` `trialCount`

- **Line:** 1310

---

### `VARIABLE` `lostCount`

- **Line:** 1312

---

### `VARIABLE` `leadsCalledCount`

- **Line:** 1314

---

### `VARIABLE` `leadsAppointedCount`

- **Line:** 1315

---

### `VARIABLE` `queueLeads`

- **Line:** 1317

---

### `VARIABLE` `inProgressLeads`

- **Line:** 1318

---

### `VARIABLE` `processedLeads`

- **Line:** 1319

---

### `VARIABLE` `staleLeadsList`

- **Line:** 1322
- **Signature:** `Lead[]`

---

### `VARIABLE` `now`

- **Line:** 1323

---

### `FUNCTION` `isActionByUserRole`

- **Line:** 1325
- **Returns:** `boolean`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `authorOrSender` | `string` | No | - | - |

---

### `VARIABLE` `clean`

- **Line:** 1327

---

### `VARIABLE` `cleanLower`

- **Line:** 1329

---

### `VARIABLE` `isSystemAuthor`

- **Line:** 1331

---

### `VARIABLE` `dialerLower`

- **Line:** 1345

---

### `VARIABLE` `statusLower`

- **Line:** 1353

---

### `VARIABLE` `isClosed`

- **Line:** 1354

---

### `VARIABLE` `activityDates`

- **Line:** 1372
- **Signature:** `Date[]`

---

### `VARIABLE` `leadActivities`

- **Line:** 1373

---

### `VARIABLE` `manualEmails`

- **Line:** 1383

---

### `VARIABLE` `lastAction`

- **Line:** 1397

---

### `VARIABLE` `staleLeadsCount`

- **Line:** 1405

---

### `VARIABLE` `queueStatusDist`

- **Line:** 1407

---

### `VARIABLE` `inProgressStatusDist`

- **Line:** 1412

---

### `VARIABLE` `visitNotesMap`

- **Line:** 1417

---

### `VARIABLE` `fieldSourcedLeads`

- **Line:** 1419

---

### `VARIABLE` `fieldSourcedCount`

- **Line:** 1429

---

### `VARIABLE` `fieldSourcedWon`

- **Line:** 1430

---

### `VARIABLE` `fieldSourcedAppointedIds`

- **Line:** 1431

---

### `VARIABLE` `fieldSourcedAppointedCount`

- **Line:** 1432

---

### `VARIABLE` `fieldSourcedStatusData`

- **Line:** 1434

---

### `VARIABLE` `existing`

- **Line:** 1435

---

### `VARIABLE` `fieldRepContribution`

- **Line:** 1441

---

### `VARIABLE` `rep`

- **Line:** 1443

---

### `VARIABLE` `data`

- **Line:** 1447

---

### `VARIABLE` `outcome`

- **Line:** 1452

---

### `VARIABLE` `connectedOutcomes`

- **Line:** 1459

---

### `FUNCTION` `isDateInRange`

- **Line:** 1467

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `dateStr` | `any` | **Yes** | - | - |

---

### `VARIABLE` `d`

- **Line:** 1470

---

### `VARIABLE` `fromDate`

- **Line:** 1472

---

### `VARIABLE` `toDate`

- **Line:** 1473

---

### `VARIABLE` `shipmateTrialLeads`

- **Line:** 1477
- **Signature:** `Lead[]`

---

### `VARIABLE` `localmileTrialLeads`

- **Line:** 1478
- **Signature:** `Lead[]`

---

### `VARIABLE` `anyTrialLeads`

- **Line:** 1479
- **Signature:** `Lead[]`

---

### `VARIABLE` `leadActivities`

- **Line:** 1482

---

### `VARIABLE` `isShipMateStatus`

- **Line:** 1485

---

### `VARIABLE` `hasShipMateTrialActivity`

- **Line:** 1486

---

### `VARIABLE` `isEarlyStageLead`

- **Line:** 1490

---

### `VARIABLE` `startedShipMate`

- **Line:** 1491

---

### `VARIABLE` `isLocalMileStatus`

- **Line:** 1495

---

### `VARIABLE` `hasLocalMileJob`

- **Line:** 1496

---

### `VARIABLE` `hasLocalMileDates`

- **Line:** 1497

---

### `VARIABLE` `hasLocalMileConfirmedTrialActivity`

- **Line:** 1498

---

### `VARIABLE` `startedLocalMile`

- **Line:** 1509

---

### `VARIABLE` `perfNow`

- **Line:** 1524

---

### `VARIABLE` `perfFromDate`

- **Line:** 1525
- **Signature:** `Date`

---

### `VARIABLE` `perfToDate`

- **Line:** 1526
- **Signature:** `Date`

---

### `VARIABLE` `yesterdayTarget`

- **Line:** 1528

---

### `VARIABLE` `lastWeekTarget`

- **Line:** 1540

---

### `VARIABLE` `perfFilteredCalls`

- **Line:** 1551

---

### `VARIABLE` `lead`

- **Line:** 1552

---

### `VARIABLE` `isUserMatch`

- **Line:** 1558

---

### `VARIABLE` `isUserMatch`

- **Line:** 1561

---

### `VARIABLE` `dialerMatch`

- **Line:** 1569

---

### `VARIABLE` `franchiseeMatch`

- **Line:** 1571

---

### `VARIABLE` `campaignMatch`

- **Line:** 1572

---

### `VARIABLE` `cDate`

- **Line:** 1574

---

### `VARIABLE` `perfFilteredAppointments`

- **Line:** 1578

---

### `VARIABLE` `lead`

- **Line:** 1580

---

### `VARIABLE` `dialerMatch`

- **Line:** 1582

---

### `VARIABLE` `franchiseeMatch`

- **Line:** 1584

---

### `VARIABLE` `campaignMatch`

- **Line:** 1585

---

### `VARIABLE` `aDate`

- **Line:** 1587

---

### `VARIABLE` `perfActionedLeadIdsMap`

- **Line:** 1592

---

### `VARIABLE` `author`

- **Line:** 1595

---

### `VARIABLE` `matchedDialer`

- **Line:** 1596

---

### `VARIABLE` `actDate`

- **Line:** 1602

---

### `VARIABLE` `author`

- **Line:** 1604

---

### `VARIABLE` `matchedDialer`

- **Line:** 1605

---

### `VARIABLE` `topLevelQuotesLeads`

- **Line:** 1613

---

### `VARIABLE` `topLevelLmOppLeads`

- **Line:** 1614

---

### `VARIABLE` `topLevelLmPendingLeads`

- **Line:** 1615

---

### `VARIABLE` `topLevelTrialingLmLeads`

- **Line:** 1616

---

### `VARIABLE` `topLevelSignedLeads`

- **Line:** 1618

---

### `VARIABLE` `topLevelMovedToAmLeads`

- **Line:** 1620

---

### `VARIABLE` `currentBucket`

- **Line:** 1621

---

### `VARIABLE` `isCurrentlyAm`

- **Line:** 1622

---

### `VARIABLE` `initialBucket`

- **Line:** 1623

---

### `VARIABLE` `comesFromOutbound`

- **Line:** 1624

---

### `VARIABLE` `movedToAm`

- **Line:** 1626

---

### `VARIABLE` `bhMatch`

- **Line:** 1629

---

### `VARIABLE` `nb`

- **Line:** 1630

---

### `VARIABLE` `shMatch`

- **Line:** 1638

---

### `VARIABLE` `topLevelLmOppPendingLostLeads`

- **Line:** 1648

---

### `VARIABLE` `statusHist`

- **Line:** 1651

---

### `VARIABLE` `leadActs`

- **Line:** 1652

---

### `VARIABLE` `hadLmOpp`

- **Line:** 1654

---

### `VARIABLE` `hadLmPending`

- **Line:** 1662

---

### `VARIABLE` `topLevelApptLeads`

- **Line:** 1675

---

### `FUNCTION` `getDialerForLead`

- **Line:** 1677

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `l` | `any` | **Yes** | - | - |

---

### `VARIABLE` `matched`

- **Line:** 1679

---

### `VARIABLE` `ad`

- **Line:** 1684

---

### `VARIABLE` `matched`

- **Line:** 1686

---

### `VARIABLE` `call`

- **Line:** 1691

---

### `FUNCTION` `isDateInTimeframe`

- **Line:** 1698

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `dateVal` | `any` | No | - | - |

---

### `VARIABLE` `d`

- **Line:** 1700

---

### `FUNCTION` `isDateBeforeOrInTimeframe`

- **Line:** 1704

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `dateVal` | `any` | No | - | - |

---

### `VARIABLE` `d`

- **Line:** 1706

---

### `VARIABLE` `teamPerformanceData`

- **Line:** 1710

---

### `VARIABLE` `dialerCallsList`

- **Line:** 1711

---

### `VARIABLE` `dialerCalls`

- **Line:** 1712

---

### `VARIABLE` `dialerLeadsCalled`

- **Line:** 1713

---

### `VARIABLE` `avgAttempts`

- **Line:** 1714

---

### `VARIABLE` `dialerConnectedCalls`

- **Line:** 1716

---

### `VARIABLE` `connectRate`

- **Line:** 1717

---

### `VARIABLE` `dialerActionedLeadIds`

- **Line:** 1719

---

### `VARIABLE` `dialerBaseLeads`

- **Line:** 1720

---

### `FUNCTION` `isMatch`

- **Line:** 1722

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `l` | `any` | **Yes** | - | - |

---

### `FUNCTION` `isEventInTimeframe`

- **Line:** 1724

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `l` | `any` | **Yes** | - | - |
| `dateKeys` | `string[]` | **Yes** | - | - |

---

### `VARIABLE` `eventDateVal`

- **Line:** 1725
- **Signature:** `any`

---

### `VARIABLE` `fallbackDateVal`

- **Line:** 1732

---

### `VARIABLE` `lmOppLeads`

- **Line:** 1736

---

### `VARIABLE` `lmOppCount`

- **Line:** 1737

---

### `VARIABLE` `lmOppCallRate`

- **Line:** 1738

---

### `VARIABLE` `lmPendingLeads`

- **Line:** 1740

---

### `VARIABLE` `lmPendingCount`

- **Line:** 1741

---

### `VARIABLE` `lmPendingCallRate`

- **Line:** 1742

---

### `VARIABLE` `trialingLMLeads`

- **Line:** 1744

---

### `VARIABLE` `trialingLMCount`

- **Line:** 1745

---

### `VARIABLE` `trialingLMCallRate`

- **Line:** 1746

---

### `VARIABLE` `dialerApptLeads`

- **Line:** 1748

---

### `VARIABLE` `dialerAppointments`

- **Line:** 1749

---

### `VARIABLE` `dialerQuotes`

- **Line:** 1750

---

### `VARIABLE` `dialerShipmateTrialLeads`

- **Line:** 1751

---

### `VARIABLE` `dialerShipmateTrials`

- **Line:** 1752

---

### `VARIABLE` `dialerWonLeads`

- **Line:** 1754

---

### `VARIABLE` `dialerWon`

- **Line:** 1755

---

### `VARIABLE` `dialerLostPipelineLeads`

- **Line:** 1757

---

### `VARIABLE` `dialerLostPipeline`

- **Line:** 1758

---

### `VARIABLE` `dialerActivePipelineLeads`

- **Line:** 1760

---

### `VARIABLE` `dialerActivePipeline`

- **Line:** 1761

---

### `VARIABLE` `dialerUnactionedPipelineLeads`

- **Line:** 1763

---

### `VARIABLE` `dialerUnactionedPipeline`

- **Line:** 1764

---

### `VARIABLE` `dialerMovedToAmLeads`

- **Line:** 1766

---

### `VARIABLE` `dialerLeads`

- **Line:** 1768

---

### `FUNCTION` `isUnassignedLead`

- **Line:** 1815

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `l` | `any` | **Yes** | - | - |

---

### `VARIABLE` `unassignedMovedToAm`

- **Line:** 1816

---

### `VARIABLE` `unassignedQuotes`

- **Line:** 1817

---

### `VARIABLE` `unassignedLmOpp`

- **Line:** 1818

---

### `VARIABLE` `unassignedLmPending`

- **Line:** 1819

---

### `VARIABLE` `unassignedTrialingLm`

- **Line:** 1820

---

### `VARIABLE` `unassignedSigned`

- **Line:** 1821

---

### `VARIABLE` `unassignedAppt`

- **Line:** 1822

---

### `VARIABLE` `totalTeamCalls`

- **Line:** 1864

---

### `VARIABLE` `totalAssignedLeads`

- **Line:** 1865

---

### `VARIABLE` `totalUnactionedPipeline`

- **Line:** 1866

---

### `VARIABLE` `totalActivePipeline`

- **Line:** 1867

---

### `VARIABLE` `totalLostPipeline`

- **Line:** 1868

---

### `VARIABLE` `totalWon`

- **Line:** 1869

---

### `VARIABLE` `totalLeadsProcessed`

- **Line:** 1871

---

### `VARIABLE` `totalAvgAttempts`

- **Line:** 1872

---

### `VARIABLE` `totalConnectedCalls`

- **Line:** 1873

---

### `VARIABLE` `dialerCallsList`

- **Line:** 1874

---

### `VARIABLE` `totalConnectRate`

- **Line:** 1877

---

### `VARIABLE` `totalAppts`

- **Line:** 1878

---

### `VARIABLE` `totalQuotes`

- **Line:** 1879

---

### `VARIABLE` `totalLMOpp`

- **Line:** 1880

---

### `VARIABLE` `totalLMOppRate`

- **Line:** 1881

---

### `VARIABLE` `totalLMPending`

- **Line:** 1882

---

### `VARIABLE` `totalLMPendingRate`

- **Line:** 1883

---

### `VARIABLE` `totalTrialingLM`

- **Line:** 1884

---

### `VARIABLE` `totalTrialingLMRate`

- **Line:** 1885

---

### `VARIABLE` `totalShipmateTrials`

- **Line:** 1886

---

### `VARIABLE` `totalMovedToAm`

- **Line:** 1887

---

### `VARIABLE` `teamPerformanceTotals`

- **Line:** 1889

---

### `VARIABLE` `callOutcomesData`

- **Line:** 1914

---

### `VARIABLE` `outcome`

- **Line:** 1915

---

### `VARIABLE` `outcomeMatch`

- **Line:** 1916

---

### `VARIABLE` `existing`

- **Line:** 1923

---

### `VARIABLE` `appointmentOutcomeData`

- **Line:** 1929

---

### `VARIABLE` `status`

- **Line:** 1930

---

### `VARIABLE` `existing`

- **Line:** 1931

---

### `VARIABLE` `amPerformanceData`

- **Line:** 1937

---

### `VARIABLE` `amAppts`

- **Line:** 1938

---

### `VARIABLE` `workingDaysInRange`

- **Line:** 1951

---

### `VARIABLE` `start`

- **Line:** 1953

---

### `VARIABLE` `end`

- **Line:** 1954

---

### `VARIABLE` `count`

- **Line:** 1955

---

### `VARIABLE` `cur`

- **Line:** 1956

---

### `VARIABLE` `day`

- **Line:** 1958

---

### `VARIABLE` `allLeadsMap`

- **Line:** 1965

---

### `VARIABLE` `burnNow`

- **Line:** 1968

---

### `VARIABLE` `burnFromDate`

- **Line:** 1969
- **Signature:** `Date`

---

### `VARIABLE` `burnToDate`

- **Line:** 1970
- **Signature:** `Date`

---

### `VARIABLE` `burnWorkingDays`

- **Line:** 1971
- **Signature:** `number`

---

### `VARIABLE` `burnFilteredCalls`

- **Line:** 1986

---

### `VARIABLE` `lead`

- **Line:** 1987

---

### `VARIABLE` `isUserMatch`

- **Line:** 1993

---

### `VARIABLE` `isUserMatch`

- **Line:** 1996

---

### `VARIABLE` `dialerMatch`

- **Line:** 2004

---

### `VARIABLE` `franchiseeMatch`

- **Line:** 2005

---

### `VARIABLE` `campaignMatch`

- **Line:** 2006

---

### `VARIABLE` `cDate`

- **Line:** 2008

---

### `VARIABLE` `burnRateLeaderboard`

- **Line:** 2012

---

### `VARIABLE` `dialerCallsList`

- **Line:** 2013

---

### `VARIABLE` `dialerCallsListLeadIds`

- **Line:** 2014

---

### `VARIABLE` `dialerLeads`

- **Line:** 2015

---

### `VARIABLE` `processedLeadsList`

- **Line:** 2018

---

### `VARIABLE` `processedInPeriod`

- **Line:** 2019

---

### `VARIABLE` `unactionedLeadsList`

- **Line:** 2022

---

### `VARIABLE` `leadDate`

- **Line:** 2025

---

### `VARIABLE` `unactionedPool`

- **Line:** 2028

---

### `VARIABLE` `dailyBurnRate`

- **Line:** 2030

---

### `VARIABLE` `weeklyBurnRate`

- **Line:** 2031

---

### `VARIABLE` `monthlyBurnRate`

- **Line:** 2032

---

### `VARIABLE` `burnRate`

- **Line:** 2034

---

### `VARIABLE` `runwayDays`

- **Line:** 2035

---

### `VARIABLE` `runwayStatus`

- **Line:** 2037
- **Signature:** `'critical' | 'warning' | 'healthy'`

---

### `VARIABLE` `targetBufferDays`

- **Line:** 2041

---

### `VARIABLE` `recommendedTopUp`

- **Line:** 2042

---

### `VARIABLE` `avgTeamBurnRate`

- **Line:** 2066

---

### `VARIABLE` `criticalRepsCount`

- **Line:** 2067

---

### `VARIABLE` `avgTeamRunwayDays`

- **Line:** 2068

---

### `VARIABLE` `totalRecommendedTopUp`

- **Line:** 2069

---

### `VARIABLE` `outboundAllQuotedLeads`

- **Line:** 2072

---

### `VARIABLE` `st`

- **Line:** 2073

---

### `VARIABLE` `leadActs`

- **Line:** 2077

---

### `VARIABLE` `notes`

- **Line:** 2079

---

### `VARIABLE` `minAssignmentDate`

- **Line:** 2090

---

### `VARIABLE` `maxAssignmentDate`

- **Line:** 2093

---

### `VARIABLE` `incentiveAppointments`

- **Line:** 2097

---

### `VARIABLE` `dialerMatch`

- **Line:** 2098

---

### `VARIABLE` `dateStr`

- **Line:** 2102

---

### `VARIABLE` `d`

- **Line:** 2104

---

### `VARIABLE` `incentiveLeadIds`

- **Line:** 2111

---

### `VARIABLE` `appointmentIncentiveLeaderboard`

- **Line:** 2113

---

### `VARIABLE` `dialerAppts`

- **Line:** 2114

---

### `VARIABLE` `booked`

- **Line:** 2115

---

### `VARIABLE` `completedAppts`

- **Line:** 2116

---

### `VARIABLE` `noShowAppts`

- **Line:** 2117

---

### `VARIABLE` `rescheduledAppts`

- **Line:** 2118

---

### `VARIABLE` `cancelledAppts`

- **Line:** 2119

---

### `VARIABLE` `pendingAppts`

- **Line:** 2120

---

### `FUNCTION` `isMatch`

- **Line:** 2122

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `l` | `any` | **Yes** | - | - |

---

### `VARIABLE` `dialerLmPendingLeads`

- **Line:** 2124

---

### `VARIABLE` `dialerMovedToAmLeads`

- **Line:** 2125

---

### `VARIABLE` `dialerLmOppPendingLostLeads`

- **Line:** 2126

---

### `VARIABLE` `dialerIncentivisedMap`

- **Line:** 2128

---

### `VARIABLE` `l`

- **Line:** 2130

---

### `VARIABLE` `dialerIncentivisedLeads`

- **Line:** 2137

---

### `VARIABLE` `signedLeads`

- **Line:** 2139

---

### `VARIABLE` `lostLeads`

- **Line:** 2140

---

### `VARIABLE` `quoteLeads`

- **Line:** 2141

---

### `VARIABLE` `trialLeads`

- **Line:** 2142

---

### `VARIABLE` `inProgressLeads`

- **Line:** 2143

---

### `VARIABLE` `signed`

- **Line:** 2145

---

### `VARIABLE` `trial`

- **Line:** 2146

---

### `VARIABLE` `quote`

- **Line:** 2147

---

### `VARIABLE` `lost`

- **Line:** 2148

---

### `VARIABLE` `inProgress`

- **Line:** 2149

---

### `VARIABLE` `totalConverted`

- **Line:** 2151

---

### `VARIABLE` `conversionRate`

- **Line:** 2152

---

### `VARIABLE` `totalCompletedAppts`

- **Line:** 2189

---

### `VARIABLE` `totalNoShowAppts`

- **Line:** 2190

---

### `VARIABLE` `totalRescheduledAppts`

- **Line:** 2191

---

### `VARIABLE` `totalCancelledAppts`

- **Line:** 2192

---

### `VARIABLE` `totalPendingAppts`

- **Line:** 2193

---

### `VARIABLE` `totalLmPendingIncentiveCount`

- **Line:** 2195

---

### `VARIABLE` `totalMovedToAmIncentiveCount`

- **Line:** 2196

---

### `VARIABLE` `totalIncentivisedCount`

- **Line:** 2197

---

### `VARIABLE` `totalApptsSigned`

- **Line:** 2198

---

### `VARIABLE` `totalApptsTrial`

- **Line:** 2199

---

### `VARIABLE` `totalApptsQuote`

- **Line:** 2200

---

### `VARIABLE` `totalApptsLost`

- **Line:** 2201

---

### `VARIABLE` `totalApptsInProgress`

- **Line:** 2202

---

### `VARIABLE` `totalConvertedAppts`

- **Line:** 2203

---

### `VARIABLE` `overallApptConversionRate`

- **Line:** 2204

---

### `FUNCTION` `getJourneyBreakdown`

- **Line:** 2208

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leads` | `Lead[]` | **Yes** | - | - |

---

### `VARIABLE` `total`

- **Line:** 2209

---

### `VARIABLE` `signed`

- **Line:** 2210

---

### `VARIABLE` `lost`

- **Line:** 2211

---

### `VARIABLE` `activeTrialStatuses`

- **Line:** 2212

---

### `VARIABLE` `trialing`

- **Line:** 2213

---

### `VARIABLE` `currentStatus`

- **Line:** 2216

---

### `VARIABLE` `other`

- **Line:** 2219

---

### `VARIABLE` `shipmateJourney`

- **Line:** 2233

---

### `VARIABLE` `localmileJourney`

- **Line:** 2234

---

### `VARIABLE` `combinedJourney`

- **Line:** 2235

---

### `VARIABLE` `totalLeadsActioned`

- **Line:** 2238

---

### `VARIABLE` `sumTimeToFirstAction`

- **Line:** 2239

---

### `VARIABLE` `sumTimeToConvert`

- **Line:** 2240

---

### `VARIABLE` `convertedCount`

- **Line:** 2241

---

### `VARIABLE` `sumTimeToDropoff`

- **Line:** 2242

---

### `VARIABLE` `dropoffCount`

- **Line:** 2243

---

### `VARIABLE` `dropoffStages`

- **Line:** 2244
- **Signature:** `Record<string, number>`

---

### `VARIABLE` `dropoffStageLeads`

- **Line:** 2245
- **Signature:** `Record<string, Lead[]>`

---

### `VARIABLE` `leadActivities`

- **Line:** 2248

---

### `VARIABLE` `dateA`

- **Line:** 2249

---

### `VARIABLE` `dateB`

- **Line:** 2250

---

### `VARIABLE` `enteredDate`

- **Line:** 2253

---

### `VARIABLE` `firstAction`

- **Line:** 2256

---

### `VARIABLE` `parsedFirstDate`

- **Line:** 2258

---

### `VARIABLE` `timeToFirstAction`

- **Line:** 2260

---

### `VARIABLE` `conversionDate`

- **Line:** 2269
- **Signature:** `Date | null`

---

### `VARIABLE` `conversionActivity`

- **Line:** 2270

---

### `VARIABLE` `accepted`

- **Line:** 2282

---

### `VARIABLE` `dateA`

- **Line:** 2285

---

### `VARIABLE` `dateB`

- **Line:** 2286

---

### `VARIABLE` `timeToConvert`

- **Line:** 2294

---

### `VARIABLE` `lostDate`

- **Line:** 2302
- **Signature:** `Date | null`

---

### `VARIABLE` `priorStatus`

- **Line:** 2303
- **Signature:** `string`

---

### `VARIABLE` `lostActivityIndex`

- **Line:** 2305

---

### `VARIABLE` `lostActivity`

- **Line:** 2316

---

### `VARIABLE` `match`

- **Line:** 2320

---

### `VARIABLE` `lastAct`

- **Line:** 2327

---

### `VARIABLE` `timeToDropoff`

- **Line:** 2332

---

### `VARIABLE` `stageLabel`

- **Line:** 2338

---

### `VARIABLE` `unassignedLeadsCount`

- **Line:** 2347

---

### `VARIABLE` `BUCKET_NAME_MAP`

- **Line:** 2350
- **Signature:** `Record<string, { label: string; description: string }>`

---

### `VARIABLE` `outboundProgressionLeads`

- **Line:** 2362

---

### `VARIABLE` `currentBucket`

- **Line:** 2363

---

### `VARIABLE` `isCurrentlyOutbound`

- **Line:** 2364

---

### `VARIABLE` `wasOutboundFlag`

- **Line:** 2365

---

### `VARIABLE` `wasInBucketHistory`

- **Line:** 2366

---

### `VARIABLE` `bucketProgressionCounts`

- **Line:** 2372
- **Signature:** `Record<string, Lead[]>`

---

### `VARIABLE` `currentBucket`

- **Line:** 2375

---

### `VARIABLE` `totalOutboundCohort`

- **Line:** 2382

---

### `VARIABLE` `bucketProgressionData`

- **Line:** 2384

---

### `VARIABLE` `info`

- **Line:** 2385

---

### `VARIABLE` `count`

- **Line:** 2389

---

### `VARIABLE` `percentage`

- **Line:** 2390

---

### `VARIABLE` `statusDist`

- **Line:** 2392

---

### `VARIABLE` `s`

- **Line:** 2393

---

### `VARIABLE` `journeyStats`

- **Line:** 2409

---

### `VARIABLE` `engagementLeadsList`

- **Line:** 2420

---

### `VARIABLE` `lead`

- **Line:** 2421

---

### `VARIABLE` `leadCalls`

- **Line:** 2422

---

### `VARIABLE` `uniqueCallIds`

- **Line:** 2423

---

### `VARIABLE` `customerStatusDist`

- **Line:** 2438

---

### `VARIABLE` `status`

- **Line:** 2439

---

### `VARIABLE` `customerStatusData`

- **Line:** 2444

---

### `VARIABLE` `leadTypeDist`

- **Line:** 2448

---

### `VARIABLE` `type`

- **Line:** 2449

---

### `VARIABLE` `leadTypeData`

- **Line:** 2454

---

### `VARIABLE` `statusTimes`

- **Line:** 2458
- **Signature:** `Record<string, { totalDays: number; count: number }>`

---

### `VARIABLE` `enteredDate`

- **Line:** 2461

---

### `VARIABLE` `currentStatus`

- **Line:** 2462

---

### `VARIABLE` `leadActivities`

- **Line:** 2464

---

### `VARIABLE` `statusActivities`

- **Line:** 2465

---

### `VARIABLE` `match`

- **Line:** 2468

---

### `VARIABLE` `actDate`

- **Line:** 2469

---

### `VARIABLE` `cleanStatus`

- **Line:** 2471

---

### `VARIABLE` `timeline`

- **Line:** 2477
- **Signature:** `{ status: string; date: Date }[]`

---

### `VARIABLE` `lastDate`

- **Line:** 2491

---

### `VARIABLE` `start`

- **Line:** 2499

---

### `VARIABLE` `end`

- **Line:** 2500

---

### `VARIABLE` `diffMs`

- **Line:** 2502

---

### `VARIABLE` `diffDays`

- **Line:** 2503

---

### `VARIABLE` `avgDurationByStatusData`

- **Line:** 2513

---

### `VARIABLE` `normalized`

- **Line:** 2519

---

### `VARIABLE` `isLost`

- **Line:** 2520

---

### `VARIABLE` `isWonSigned`

- **Line:** 2521

---

### `VARIABLE` `activeDialersList`

- **Line:** 2527

---

### `VARIABLE` `startDate`

- **Line:** 2540
- **Signature:** `Date`

---

### `VARIABLE` `endDate`

- **Line:** 2541
- **Signature:** `Date`

---

### `VARIABLE` `dailyDates`

- **Line:** 2569
- **Signature:** `Date[]`

---

### `VARIABLE` `currDate`

- **Line:** 2570

---

### `VARIABLE` `dailyMap`

- **Line:** 2580

---

### `VARIABLE` `key`

- **Line:** 2588

---

### `VARIABLE` `actDate`

- **Line:** 2600

---

### `VARIABLE` `dateKey`

- **Line:** 2602

---

### `VARIABLE` `dayData`

- **Line:** 2603

---

### `VARIABLE` `author`

- **Line:** 2606

---

### `VARIABLE` `matchedDialer`

- **Line:** 2611

---

### `VARIABLE` `prevActions`

- **Line:** 2622

---

### `VARIABLE` `dailyActionedChartData`

- **Line:** 2626

---

### `VARIABLE` `key`

- **Line:** 2627

---

### `VARIABLE` `displayDate`

- **Line:** 2628

---

### `VARIABLE` `fullFormattedDate`

- **Line:** 2629

---

### `VARIABLE` `dayData`

- **Line:** 2630

---

### `VARIABLE` `row`

- **Line:** 2632
- **Signature:** `Record<string, any>`

---

### `VARIABLE` `leadSet`

- **Line:** 2641

---

### `VARIABLE` `totalActionedLeadsPeriod`

- **Line:** 2651

---

### `VARIABLE` `actDate`

- **Line:** 2654

---

### `VARIABLE` `author`

- **Line:** 2656

---

### `VARIABLE` `totalActiveDays`

- **Line:** 2660

---

### `VARIABLE` `key`

- **Line:** 2661

---

### `VARIABLE` `avgDailyLeadsActioned`

- **Line:** 2665

---

### `VARIABLE` `dialerPeriodTotalsMap`

- **Line:** 2667

---

### `VARIABLE` `count`

- **Line:** 2671

---

### `VARIABLE` `topDialerName`

- **Line:** 2676

---

### `VARIABLE` `maxActionedCount`

- **Line:** 2677

---

### `VARIABLE` `activeDialersWithActivity`

- **Line:** 2685

---

### `VARIABLE` `dialersListForChart`

- **Line:** 2686

---

### `VARIABLE` `dailyActioned`

- **Line:** 2690

---

### `VARIABLE` `outboundQuotedWonLeads`

- **Line:** 2703

---

### `VARIABLE` `outboundQuotedLostLeads`

- **Line:** 2704

---

### `VARIABLE` `outboundQuotedPendingLeads`

- **Line:** 2705

---

### `VARIABLE` `outboundDirectLostLeads`

- **Line:** 2706

---

### `VARIABLE` `outboundActivePipelineLeads`

- **Line:** 2707

---

### `VARIABLE` `outboundTotalAssignedCount`

- **Line:** 2708

---

### `VARIABLE` `anyTrialLeadsList`

- **Line:** 2711

---

### `VARIABLE` `trialWonLeads`

- **Line:** 2712

---

### `VARIABLE` `trialQuotedLeads`

- **Line:** 2713

---

### `VARIABLE` `trialLostLeads`

- **Line:** 2714

---

### `VARIABLE` `activeTrialStatuses`

- **Line:** 2715

---

### `VARIABLE` `trialActiveLeads`

- **Line:** 2716

---

### `VARIABLE` `outboundProgressionByDialer`

- **Line:** 2723

---

### `VARIABLE` `dialerLeads`

- **Line:** 2724

---

### `VARIABLE` `total`

- **Line:** 2725

---

### `VARIABLE` `quoted`

- **Line:** 2726

---

### `VARIABLE` `quotedWon`

- **Line:** 2727

---

### `VARIABLE` `quotedLost`

- **Line:** 2728

---

### `VARIABLE` `directLost`

- **Line:** 2729

---

### `VARIABLE` `active`

- **Line:** 2730

---

### `VARIABLE` `dialerTrialLeads`

- **Line:** 2732

---

### `VARIABLE` `dialerTrialWonLeads`

- **Line:** 2733

---

### `VARIABLE` `convRate`

- **Line:** 2735

---

### `VARIABLE` `totalConvRate`

- **Line:** 2736

---

### `VARIABLE` `topLevelPerformanceMetrics`

- **Line:** 2760

---

### `FUNCTION` `handleExportChartData`

- **Line:** 2882

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `data` | `any[]` | **Yes** | - | - |
| `filename` | `string` | **Yes** | - | - |

---

### `VARIABLE` `headers`

- **Line:** 2887

---

### `VARIABLE` `csvRows`

- **Line:** 2888

---

### `VARIABLE` `csvContent`

- **Line:** 2889

---

### `VARIABLE` `blob`

- **Line:** 2890

---

### `VARIABLE` `link`

- **Line:** 2891

---

### `FUNCTION` `handleExportList`

- **Line:** 2900

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `data` | `any[]` | **Yes** | - | - |
| `headers` | `string[]` | **Yes** | - | - |
| `filename` | `string` | **Yes** | - | - |
| `rowMapper` | `(item: any) => string[]` | **Yes** | - | - |

---

### `VARIABLE` `csvContent`

- **Line:** 2905

---

### `VARIABLE` `blob`

- **Line:** 2906

---

### `VARIABLE` `link`

- **Line:** 2907

---

### `FUNCTION` `escapeCsvCell`

- **Line:** 2916

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `cellData` | `any` | **Yes** | - | - |

---

### `VARIABLE` `stringData`

- **Line:** 2920

---

### `VARIABLE` `leadStatusOptions`

- **Line:** 2927
- **Signature:** `Option[]`

---

### `VARIABLE` `amOptions`

- **Line:** 2928
- **Signature:** `Option[]`

---

### `VARIABLE` `ams`

- **Line:** 2929

---

### `VARIABLE` `dialerOptionsUI`

- **Line:** 2932
- **Signature:** `Option[]`

---

### `VARIABLE` `franchiseeOptions`

- **Line:** 2938
- **Signature:** `Option[]`

---

### `VARIABLE` `franchisees`

- **Line:** 2939

---

### `VARIABLE` `filteredSourcedAppts`

- **Line:** 2954

---

### `VARIABLE` `exportData`

- **Line:** 3252

---

### `VARIABLE` `item`

- **Line:** 3253
- **Signature:** `Record<string, any>`

---

### `VARIABLE` `val`

- **Line:** 3385

---

### `VARIABLE` `leadIds`

- **Line:** 3386

---

### `VARIABLE` `matchedLeads`

- **Line:** 3394

---

### `VARIABLE` `leadIds`

- **Line:** 3412

---

### `VARIABLE` `matchedLeads`

- **Line:** 3413

---

### `VARIABLE` `totalVal`

- **Line:** 3429

---

### `VARIABLE` `dialerCallsList`

- **Line:** 3789

---

### `VARIABLE` `calledLeadIds`

- **Line:** 3790

---

### `VARIABLE` `list`

- **Line:** 3810

---

### `VARIABLE` `list`

- **Line:** 3822

---

### `VARIABLE` `list`

- **Line:** 3834

---

### `VARIABLE` `targetCalls`

- **Line:** 3926

---

### `VARIABLE` `allCallLeadIds`

- **Line:** 3927

---

### `VARIABLE` `pct`

- **Line:** 4594

---

### `VARIABLE` `index`

- **Line:** 4707

---

### `VARIABLE` `index`

- **Line:** 4769

---

### `VARIABLE` `b`

- **Line:** 5012

---

### `VARIABLE` `leadStatus`

- **Line:** 5018

---

### `VARIABLE` `b`

- **Line:** 5120

---

### `VARIABLE` `b`

- **Line:** 5202

---

### `VARIABLE` `b`

- **Line:** 5281

---

### `VARIABLE` `b`

- **Line:** 5372

---

### `VARIABLE` `b`

- **Line:** 5494

---

### `VARIABLE` `b`

- **Line:** 5595

---

### `VARIABLE` `b`

- **Line:** 5720

---

### `VARIABLE` `appt`

- **Line:** 5726

---

### `VARIABLE` `b`

- **Line:** 5781

---

### `VARIABLE` `lead`

- **Line:** 5787

---

