# Module: `functions/src/leads.ts`

- **Language:** TypeScript
- **Total Lines:** 1525
- **Direct Dependencies:** 5 modules imported

## Exported Symbols & API

### `VARIABLE` `onLeadUpdated`

- **Line:** 7

---

### `VARIABLE` `beforeData`

- **Line:** 11

---

### `VARIABLE` `afterData`

- **Line:** 12

---

### `VARIABLE` `db`

- **Line:** 14

---

### `VARIABLE` `amName`

- **Line:** 19

---

### `VARIABLE` `updates`

- **Line:** 21
- **Signature:** `any`

---

### `VARIABLE` `currentActive`

- **Line:** 35
- **Signature:** `string[]`

---

### `VARIABLE` `journeysSnapshot`

- **Line:** 71

---

### `VARIABLE` `newJourneyId`

- **Line:** 73
- **Signature:** `string | null`

---

### `VARIABLE` `newJourneyName`

- **Line:** 74
- **Signature:** `string | null`

---

### `VARIABLE` `cancelOtherJourneys`

- **Line:** 75

---

### `VARIABLE` `matchedGroupDetails`

- **Line:** 76
- **Signature:** `any`

---

### `FUNCTION` `parseLeadDate`

- **Line:** 78
- **Returns:** `Date | null`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `val` | `any` | **Yes** | - | - |

---

### `VARIABLE` `parsed`

- **Line:** 83

---

### `FUNCTION` `getFieldValue`

- **Line:** 89

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `field` | `string` | **Yes** | - | - |
| `leadData` | `any` | **Yes** | - | - |

---

### `VARIABLE` `isComp`

- **Line:** 94

---

### `FUNCTION` `evaluateCondition`

- **Line:** 106

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `cond` | `any` | **Yes** | - | - |
| `leadData` | `any` | **Yes** | - | - |

---

### `VARIABLE` `op`

- **Line:** 108

---

### `VARIABLE` `leadDate`

- **Line:** 111

---

### `VARIABLE` `leadTime`

- **Line:** 116

---

### `VARIABLE` `fromStr`

- **Line:** 117

---

### `VARIABLE` `toStr`

- **Line:** 118

---

### `VARIABLE` `parts`

- **Line:** 121

---

### `VARIABLE` `match`

- **Line:** 129

---

### `VARIABLE` `fromTime`

- **Line:** 131

---

### `VARIABLE` `toTime`

- **Line:** 135

---

### `VARIABLE` `fromTime`

- **Line:** 143

---

### `VARIABLE` `targetStr`

- **Line:** 148

---

### `VARIABLE` `toTime`

- **Line:** 150

---

### `VARIABLE` `fromTime`

- **Line:** 156

---

### `VARIABLE` `toTime`

- **Line:** 157

---

### `VARIABLE` `fromTime`

- **Line:** 163

---

### `VARIABLE` `toTime`

- **Line:** 164

---

### `VARIABLE` `val`

- **Line:** 170

---

### `VARIABLE` `val`

- **Line:** 177

---

### `VARIABLE` `leadNum`

- **Line:** 184

---

### `VARIABLE` `targetNum`

- **Line:** 185

---

### `VARIABLE` `isAccepted`

- **Line:** 190

---

### `VARIABLE` `targetValue`

- **Line:** 191

---

### `VARIABLE` `leadVal`

- **Line:** 195

---

### `VARIABLE` `targetVal`

- **Line:** 196

---

### `VARIABLE` `journeyData`

- **Line:** 207

---

### `VARIABLE` `triggerNode`

- **Line:** 208

---

### `VARIABLE` `groups`

- **Line:** 211

---

### `VARIABLE` `group`

- **Line:** 225

---

### `VARIABLE` `allConditionsMetNow`

- **Line:** 228

---

### `VARIABLE` `wasMetBefore`

- **Line:** 229

---

### `VARIABLE` `hasChangedCondition`

- **Line:** 230

---

### `VARIABLE` `metNow`

- **Line:** 233

---

### `VARIABLE` `metBefore`

- **Line:** 234

---

### `VARIABLE` `currentActive`

- **Line:** 264
- **Signature:** `string[]`

---

### `VARIABLE` `journeysToKeep`

- **Line:** 268

---

### `VARIABLE` `conditionNotes`

- **Line:** 300

---

### `FUNCTION` `generateRandomAlphanumeric`

- **Line:** 319
- **Returns:** `string`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `length` | `any` | No | `6` | - |

---

### `VARIABLE` `chars`

- **Line:** 320

---

### `VARIABLE` `result`

- **Line:** 321

---

### `FUNCTION` `getUniqueProspectPlusId`

- **Line:** 328
- **Async:** Yes
- **Returns:** `Promise<string>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `db` | `admin.firestore.Firestore` | **Yes** | - | - |

---

### `VARIABLE` `unique`

- **Line:** 329

---

### `VARIABLE` `candidate`

- **Line:** 330

---

### `VARIABLE` `attempts`

- **Line:** 331

---

### `VARIABLE` `leadsSnap`

- **Line:** 335

---

### `VARIABLE` `companiesSnap`

- **Line:** 337

---

### `VARIABLE` `onLeadCreated`

- **Line:** 344

---

### `VARIABLE` `data`

- **Line:** 348

---

### `VARIABLE` `db`

- **Line:** 349

---

### `VARIABLE` `updates`

- **Line:** 350
- **Signature:** `any`

---

### `VARIABLE` `uniqueId`

- **Line:** 353

---

### `VARIABLE` `am`

- **Line:** 358

---

### `VARIABLE` `token`

- **Line:** 372

---

### `VARIABLE` `token`

- **Line:** 378

---

### `VARIABLE` `leadId`

- **Line:** 388

---

### `VARIABLE` `fullData`

- **Line:** 391

---

### `VARIABLE` `payloadObject`

- **Line:** 392
- **Signature:** `Record<string, any>`

---

### `VARIABLE` `apiKey`

- **Line:** 404

---

### `VARIABLE` `response`

- **Line:** 405

---

### `VARIABLE` `onCompanyCreated`

- **Line:** 423

---

### `VARIABLE` `data`

- **Line:** 427

---

### `VARIABLE` `db`

- **Line:** 428

---

### `VARIABLE` `updates`

- **Line:** 429
- **Signature:** `any`

---

### `VARIABLE` `token`

- **Line:** 432

---

### `VARIABLE` `token`

- **Line:** 437

---

### `VARIABLE` `leadDoc`

- **Line:** 444

---

### `VARIABLE` `uniqueId`

- **Line:** 445

---

### `VARIABLE` `assignProspectPlusIdsFallback`

- **Line:** 461

---

### `VARIABLE` `db`

- **Line:** 465

---

### `VARIABLE` `leadsSnap1`

- **Line:** 469

---

### `VARIABLE` `leadsSnap2`

- **Line:** 470

---

### `VARIABLE` `seenLeads`

- **Line:** 472

---

### `VARIABLE` `combinedDocs`

- **Line:** 473

---

### `VARIABLE` `data`

- **Line:** 483

---

### `VARIABLE` `uniqueId`

- **Line:** 485

---

### `VARIABLE` `companiesSnap`

- **Line:** 496

---

### `VARIABLE` `data`

- **Line:** 498

---

### `VARIABLE` `leadDoc`

- **Line:** 500

---

### `VARIABLE` `uniqueId`

- **Line:** 501

---

### `FUNCTION` `runWebsiteLeadsReport`

> Core logic to generate daily website leads report, build email, and dispatch it.

- **Line:** 520
- **Async:** Yes
- **Returns:** `Promise<any>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `dateString` | `string` | **Yes** | - | - |
| `recipients` | `string[]` | **Yes** | - | - |
| `fromAddress` | `string` | No | - | - |

---

### `VARIABLE` `db`

- **Line:** 521

---

### `VARIABLE` `dayStr`

- **Line:** 528

---

### `VARIABLE` `monthStr`

- **Line:** 529

---

### `VARIABLE` `dateCreatedString`

- **Line:** 530

---

### `VARIABLE` `threeDaysAgo`

- **Line:** 532

---

### `VARIABLE` `q1`

- **Line:** 536

---

### `VARIABLE` `q2`

- **Line:** 539

---

### `VARIABLE` `q3`

- **Line:** 542

---

### `VARIABLE` `allLeadsMap`

- **Line:** 545

---

### `VARIABLE` `allLeads`

- **Line:** 549

---

### `VARIABLE` `targetStart`

- **Line:** 552

---

### `VARIABLE` `targetEnd`

- **Line:** 553

---

### `VARIABLE` `filteredLeads`

- **Line:** 555

---

### `VARIABLE` `source`

- **Line:** 557

---

### `VARIABLE` `createdDate`

- **Line:** 566
- **Signature:** `Date`

---

### `VARIABLE` `enteredDate`

- **Line:** 582

---

### `VARIABLE` `enteredDate`

- **Line:** 588

---

### `VARIABLE` `amCounts`

- **Line:** 599
- **Signature:** `Record<string, number>`

---

### `VARIABLE` `franchiseeCounts`

- **Line:** 600
- **Signature:** `Record<string, number>`

---

### `VARIABLE` `am`

- **Line:** 603

---

### `VARIABLE` `fran`

- **Line:** 606

---

### `VARIABLE` `amReport`

- **Line:** 610

---

### `VARIABLE` `franReport`

- **Line:** 614

---

### `VARIABLE` `leadRowsHtml`

- **Line:** 619

---

### `VARIABLE` `addressParts`

- **Line:** 621

---

### `VARIABLE` `address`

- **Line:** 627

---

### `VARIABLE` `amRowsHtml`

- **Line:** 638

---

### `VARIABLE` `franRowsHtml`

- **Line:** 646

---

### `VARIABLE` `emailHtml`

- **Line:** 654

---

### `VARIABLE` `toStr`

- **Line:** 753

---

### `VARIABLE` `result`

- **Line:** 754

---

### `VARIABLE` `sendDailyWebsiteLeadsReport`

> Scheduled Cloud Function that runs daily at 6:15 AM Sydney time.

- **Line:** 772

---

### `VARIABLE` `db`

- **Line:** 779

---

### `VARIABLE` `recipients`

- **Line:** 780

---

### `VARIABLE` `frequency`

- **Line:** 781

---

### `VARIABLE` `fromAddress`

- **Line:** 782

---

### `VARIABLE` `configDoc`

- **Line:** 785

---

### `VARIABLE` `data`

- **Line:** 787

---

### `VARIABLE` `sydneyHourStr`

- **Line:** 810

---

### `VARIABLE` `currentHour`

- **Line:** 816

---

### `VARIABLE` `targetHour`

- **Line:** 817

---

### `VARIABLE` `sydneyFormatter`

- **Line:** 824

---

### `VARIABLE` `now`

- **Line:** 831

---

### `VARIABLE` `parts`

- **Line:** 834

---

### `VARIABLE` `day`

- **Line:** 835

---

### `VARIABLE` `month`

- **Line:** 836

---

### `VARIABLE` `year`

- **Line:** 837

---

### `VARIABLE` `dateString`

- **Line:** 839

---

### `FUNCTION` `formatBucketName`

- **Line:** 848
- **Returns:** `string`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `bucketStr` | `string` | **Yes** | - | - |

---

### `VARIABLE` `b`

- **Line:** 850

---

### `FUNCTION` `runFranchiseeLeadsReport`

- **Line:** 865
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `dateString` | `string` | **Yes** | - | - |
| `recipients` | `string[]` | **Yes** | - | - |
| `fromAddress` | `string` | No | - | - |

---

### `VARIABLE` `db`

- **Line:** 866

---

### `VARIABLE` `usersSnap`

- **Line:** 869

---

### `VARIABLE` `franchiseeUserIds`

- **Line:** 870

---

### `VARIABLE` `franchiseeUserEmails`

- **Line:** 871

---

### `VARIABLE` `franchiseeUserNames`

- **Line:** 872

---

### `VARIABLE` `u`

- **Line:** 875

---

### `VARIABLE` `role`

- **Line:** 876

---

### `VARIABLE` `assignedRoles`

- **Line:** 877

---

### `VARIABLE` `isFranchisee`

- **Line:** 878

---

### `VARIABLE` `dName`

- **Line:** 883

---

### `VARIABLE` `targetStart`

- **Line:** 889

---

### `VARIABLE` `targetEnd`

- **Line:** 890

---

### `VARIABLE` `dayStr`

- **Line:** 892

---

### `VARIABLE` `monthStr`

- **Line:** 893

---

### `VARIABLE` `dateCreatedString`

- **Line:** 894

---

### `VARIABLE` `threeDaysAgo`

- **Line:** 896

---

### `VARIABLE` `q1`

- **Line:** 899

---

### `VARIABLE` `q2`

- **Line:** 900

---

### `VARIABLE` `q3`

- **Line:** 901

---

### `VARIABLE` `q4`

- **Line:** 902

---

### `VARIABLE` `allLeadsMap`

- **Line:** 904

---

### `VARIABLE` `allLeads`

- **Line:** 909

---

### `VARIABLE` `filteredLeads`

- **Line:** 911

---

### `VARIABLE` `isDateMatch`

- **Line:** 912

---

### `VARIABLE` `createdDate`

- **Line:** 916
- **Signature:** `Date`

---

### `VARIABLE` `enteredDate`

- **Line:** 929

---

### `VARIABLE` `enteredDate`

- **Line:** 935

---

### `VARIABLE` `createdByRole`

- **Line:** 946

---

### `VARIABLE` `sourceVal`

- **Line:** 949

---

### `VARIABLE` `uid`

- **Line:** 952

---

### `VARIABLE` `email`

- **Line:** 955

---

### `VARIABLE` `creatorName`

- **Line:** 958

---

### `VARIABLE` `franchiseeCounts`

- **Line:** 964
- **Signature:** `Record<string, number>`

---

### `VARIABLE` `bucketCounts`

- **Line:** 965
- **Signature:** `Record<string, number>`

---

### `VARIABLE` `amCounts`

- **Line:** 966
- **Signature:** `Record<string, number>`

---

### `VARIABLE` `fran`

- **Line:** 969

---

### `VARIABLE` `rawBucket`

- **Line:** 972

---

### `VARIABLE` `formattedBucket`

- **Line:** 973

---

### `VARIABLE` `isAmBucket`

- **Line:** 976

---

### `VARIABLE` `am`

- **Line:** 978

---

### `VARIABLE` `franReport`

- **Line:** 983

---

### `VARIABLE` `bucketReport`

- **Line:** 987

---

### `VARIABLE` `amReport`

- **Line:** 991

---

### `VARIABLE` `leadRowsHtml`

- **Line:** 995

---

### `VARIABLE` `addressParts`

- **Line:** 997

---

### `VARIABLE` `address`

- **Line:** 1003

---

### `VARIABLE` `creator`

- **Line:** 1004

---

### `VARIABLE` `formattedBucket`

- **Line:** 1005

---

### `VARIABLE` `assignedAm`

- **Line:** 1006

---

### `VARIABLE` `franRowsHtml`

- **Line:** 1020

---

### `VARIABLE` `bucketRowsHtml`

- **Line:** 1028

---

### `VARIABLE` `amRowsHtml`

- **Line:** 1036

---

### `VARIABLE` `emailHtml`

- **Line:** 1044

---

### `VARIABLE` `toStr`

- **Line:** 1160

---

### `VARIABLE` `result`

- **Line:** 1161

---

### `VARIABLE` `sendDailyFranchiseeLeadsReport`

> Scheduled Cloud Function that runs hourly and sends daily franchisee generated leads report.

- **Line:** 1179

---

### `VARIABLE` `db`

- **Line:** 1186

---

### `VARIABLE` `recipients`

- **Line:** 1187

---

### `VARIABLE` `frequency`

- **Line:** 1188

---

### `VARIABLE` `fromAddress`

- **Line:** 1189

---

### `VARIABLE` `configDoc`

- **Line:** 1192

---

### `VARIABLE` `data`

- **Line:** 1194

---

### `VARIABLE` `sydneyHourStr`

- **Line:** 1216

---

### `VARIABLE` `currentHour`

- **Line:** 1222

---

### `VARIABLE` `targetHour`

- **Line:** 1223

---

### `VARIABLE` `sydneyFormatter`

- **Line:** 1230

---

### `VARIABLE` `now`

- **Line:** 1237

---

### `VARIABLE` `parts`

- **Line:** 1240

---

### `VARIABLE` `day`

- **Line:** 1241

---

### `VARIABLE` `month`

- **Line:** 1242

---

### `VARIABLE` `year`

- **Line:** 1243

---

### `VARIABLE` `dateString`

- **Line:** 1245

---

### `FUNCTION` `runZeeGenAutoResponseFunction`

> Executes Zee Gen Leads Auto Response for leads created yesterday

- **Line:** 1257
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `dateString` | `string` | No | - | - |
| `testEmail` | `string` | No | - | - |

---

### `VARIABLE` `db`

- **Line:** 1258

---

### `VARIABLE` `usersSnap`

- **Line:** 1260

---

### `VARIABLE` `franchiseeUserIds`

- **Line:** 1261

---

### `VARIABLE` `franchiseeUserEmails`

- **Line:** 1262

---

### `VARIABLE` `franchiseeUserNames`

- **Line:** 1263

---

### `VARIABLE` `userMapByEmail`

- **Line:** 1264

---

### `VARIABLE` `userMapByUid`

- **Line:** 1265

---

### `VARIABLE` `u`

- **Line:** 1268

---

### `VARIABLE` `role`

- **Line:** 1274

---

### `VARIABLE` `assignedRoles`

- **Line:** 1275

---

### `VARIABLE` `isFranchisee`

- **Line:** 1276

---

### `VARIABLE` `dName`

- **Line:** 1281

---

### `VARIABLE` `sydneyFormatter`

- **Line:** 1286

---

### `VARIABLE` `d`

- **Line:** 1293
- **Signature:** `number`

---

### `VARIABLE` `m`

- **Line:** 1293
- **Signature:** `number`

---

### `VARIABLE` `y`

- **Line:** 1293
- **Signature:** `number`

---

### `VARIABLE` `parts`

- **Line:** 1297

---

### `VARIABLE` `parts`

- **Line:** 1304

---

### `VARIABLE` `now`

- **Line:** 1310

---

### `VARIABLE` `parts`

- **Line:** 1312

---

### `VARIABLE` `targetStart`

- **Line:** 1318

---

### `VARIABLE` `targetEnd`

- **Line:** 1319

---

### `VARIABLE` `dateCreatedString`

- **Line:** 1320

---

### `VARIABLE` `threeDaysAgo`

- **Line:** 1322

---

### `VARIABLE` `q1`

- **Line:** 1325

---

### `VARIABLE` `q2`

- **Line:** 1326

---

### `VARIABLE` `q3`

- **Line:** 1327

---

### `VARIABLE` `q4`

- **Line:** 1328

---

### `VARIABLE` `allLeadsMap`

- **Line:** 1330

---

### `VARIABLE` `allLeads`

- **Line:** 1335

---

### `VARIABLE` `filteredLeads`

- **Line:** 1337

---

### `VARIABLE` `isDateMatch`

- **Line:** 1338

---

### `VARIABLE` `createdDate`

- **Line:** 1342
- **Signature:** `Date`

---

### `VARIABLE` `enteredDate`

- **Line:** 1355

---

### `VARIABLE` `enteredDate`

- **Line:** 1361

---

### `VARIABLE` `createdByRole`

- **Line:** 1372

---

### `VARIABLE` `sourceVal`

- **Line:** 1375

---

### `VARIABLE` `uid`

- **Line:** 1378

---

### `VARIABLE` `email`

- **Line:** 1381

---

### `VARIABLE` `creatorName`

- **Line:** 1384

---

### `VARIABLE` `franchiseeGroups`

- **Line:** 1390

---

### `VARIABLE` `franName`

- **Line:** 1392

---

### `VARIABLE` `templateSnap`

- **Line:** 1399

---

### `VARIABLE` `rawSubject`

- **Line:** 1404

---

### `VARIABLE` `rawBody`

- **Line:** 1405

---

### `VARIABLE` `templateDoc`

- **Line:** 1408

---

### `VARIABLE` `franchiseesSnap`

- **Line:** 1413

---

### `VARIABLE` `franchiseeEmailMap`

- **Line:** 1414

---

### `VARIABLE` `data`

- **Line:** 1416

---

### `VARIABLE` `nameKey`

- **Line:** 1417

---

### `VARIABLE` `email`

- **Line:** 1418

---

### `VARIABLE` `recipientEmail`

- **Line:** 1423

---

### `VARIABLE` `fNameLower`

- **Line:** 1426

---

### `VARIABLE` `finalSubject`

- **Line:** 1435

---

### `VARIABLE` `finalBody`

- **Line:** 1440

---

### `VARIABLE` `sendDailyZeeGenAutoResponse`

> Scheduled Cloud Function that runs hourly and sends daily Zee Gen Leads Auto Response.

- **Line:** 1462

---

### `VARIABLE` `sydneyHourStr`

- **Line:** 1468

---

### `VARIABLE` `currentHour`

- **Line:** 1474

---

### `FUNCTION` `encryptLeadId`

- **Line:** 1487
- **Returns:** `string`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |

---

### `VARIABLE` `SECRET`

- **Line:** 1490

---

### `VARIABLE` `key`

- **Line:** 1491

---

### `VARIABLE` `iv`

- **Line:** 1492

---

### `VARIABLE` `cipher`

- **Line:** 1493

---

### `VARIABLE` `encrypted`

- **Line:** 1494

---

### `VARIABLE` `token`

- **Line:** 1496

---

### `FUNCTION` `checkHasAmpo`

- **Line:** 1507
- **Returns:** `boolean`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `data` | `any` | **Yes** | - | - |

---

### `VARIABLE` `services`

- **Line:** 1509

---

### `VARIABLE` `name`

- **Line:** 1511

---

### `VARIABLE` `n`

- **Line:** 1512

---

### `FUNCTION` `checkHasPostalAddress`

- **Line:** 1517
- **Returns:** `boolean`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `data` | `any` | **Yes** | - | - |

---

### `VARIABLE` `p`

- **Line:** 1519

---

