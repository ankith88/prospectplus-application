# Module: `src/components/post-call-outcome-dialog.tsx`

- **Language:** TypeScript
- **Total Lines:** 2548
- **Direct Dependencies:** 39 modules imported

## Exported Symbols & API

### `VARIABLE` `formSchema`

- **Line:** 59

---

### `INTERFACE` `PostCallOutcomeDialogProps`

- **Line:** 82

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `lead` | `Lead` | No | - |
| `lpoConnectActive` | `boolean` | Yes | - |
| `callActivity` | `Activity | null` | Yes | - |
| `isOpen` | `boolean` | No | - |
| `onClose` | `() => void` | No | - |
| `onOutcomeLogged` | `(newStatus?: LeadStatus, outcome?: string) => void` | No | - |
| `onSessionNext` | `() => void` | Yes | - |
| `isSessionActive` | `boolean` | Yes | - |
| `processMode` | `boolean` | Yes | - |
| `initialOutcome` | `string` | Yes | - |

---

### `VARIABLE` `COURIER_OPTIONS`

- **Line:** 95

---

### `FUNCTION` `parseCarriers`

- **Line:** 110
- **Returns:** `string[]`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `carrierData` | `string | string[]` | No | - | - |

---

### `TYPE` `SubmissionStatus`

- **Line:** 116
- **Signature:** `'idle' | 'saving_outcome' | 'complete' | 'error'`

---

### `VARIABLE` `outcomeGroups`

- **Line:** 118

---

### `FUNCTION` `isLpoExemptOutcome`

- **Line:** 149

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `selectedOutcome` | `string` | **Yes** | - | - |

---

### `VARIABLE` `normalized`

- **Line:** 151

---

### `VARIABLE` `outcomeStructure`

- **Line:** 163

---

### `FUNCTION` `PostCallOutcomeDialog`

- **Line:** 223
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ lead, lpoConnectActive = true, callActivity, isOpen, onClose, onOutcomeLogged, onSessionNext, isSessionActive, processMode = false, initialOutcome = '' }` | `PostCallOutcomeDialogProps` | **Yes** | - | - |

---

### `VARIABLE` `leadAttemptsCount`

- **Line:** 242

---

### `VARIABLE` `callActs`

- **Line:** 244

---

### `VARIABLE` `form`

- **Line:** 253

---

### `FUNCTION` `handleCarrierToggle`

- **Line:** 276

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `courierValue` | `string` | **Yes** | - | - |

---

### `VARIABLE` `filtered`

- **Line:** 281

---

### `VARIABLE` `outcome`

- **Line:** 290

---

### `VARIABLE` `followUpPeriod`

- **Line:** 291

---

### `VARIABLE` `targetPhone`

- **Line:** 292

---

### `VARIABLE` `isUserRole`

- **Line:** 294

---

### `VARIABLE` `isEmailOutcome`

- **Line:** 296

---

### `FUNCTION` `getSmsPreview`

- **Line:** 303

---

### `VARIABLE` `targetPhoneObj`

- **Line:** 304

---

### `VARIABLE` `contactNameFull`

- **Line:** 305

---

### `VARIABLE` `contactFirstName`

- **Line:** 306

---

### `VARIABLE` `displayName`

- **Line:** 307

---

### `VARIABLE` `userPhone`

- **Line:** 308

---

### `VARIABLE` `groupedTemplates`

- **Line:** 327

---

### `VARIABLE` `groups`

- **Line:** 328
- **Signature:** `{ campaignId: string; campaignName: string; templates: any[] }[]`

---

### `VARIABLE` `campName`

- **Line:** 331

---

### `VARIABLE` `campTemplates`

- **Line:** 336

---

### `VARIABLE` `linkedTemplateIds`

- **Line:** 346

---

### `VARIABLE` `unlinkedTemplates`

- **Line:** 351

---

### `VARIABLE` `pmpo`

- **Line:** 374

---

### `FUNCTION` `resetAndClose`

- **Line:** 391

---

### `FUNCTION` `fetchHierarchy`

- **Line:** 397
- **Async:** Yes
- **Returns:** `void`

---

### `VARIABLE` `snap`

- **Line:** 399

---

### `FUNCTION` `triggerAutoMap`

- **Line:** 413
- **Async:** Yes
- **Returns:** `void`

---

### `VARIABLE` `match`

- **Line:** 415

---

### `VARIABLE` `validContacts`

- **Line:** 456

---

### `VARIABLE` `primaryContactIds`

- **Line:** 457

---

### `FUNCTION` `fetchPlaybook`

- **Line:** 480
- **Async:** Yes

---

### `VARIABLE` `pbRef`

- **Line:** 483

---

### `VARIABLE` `q`

- **Line:** 484

---

### `VARIABLE` `snapshot`

- **Line:** 485

---

### `FUNCTION` `fetchFranchisee`

- **Line:** 502
- **Async:** Yes

---

### `VARIABLE` `fDocData`

- **Line:** 508

---

### `VARIABLE` `fIdStr`

- **Line:** 510

---

### `VARIABLE` `fDoc`

- **Line:** 511

---

### `VARIABLE` `q1`

- **Line:** 515

---

### `VARIABLE` `qSnap1`

- **Line:** 516

---

### `VARIABLE` `q2`

- **Line:** 520

---

### `VARIABLE` `qSnap2`

- **Line:** 521

---

### `VARIABLE` `q`

- **Line:** 529

---

### `VARIABLE` `qSnap`

- **Line:** 530

---

### `VARIABLE` `compilePlaceholders`

- **Line:** 543

---

### `VARIABLE` `result`

- **Line:** 545

---

### `VARIABLE` `primaryContact`

- **Line:** 547

---

### `VARIABLE` `contactName`

- **Line:** 548

---

### `VARIABLE` `contactFirstName`

- **Line:** 549

---

### `VARIABLE` `salesRep`

- **Line:** 551

---

### `VARIABLE` `franchiseeName`

- **Line:** 552

---

### `VARIABLE` `franchiseeContact`

- **Line:** 553

---

### `VARIABLE` `franchiseeEmail`

- **Line:** 554

---

### `VARIABLE` `franchiseeMobile`

- **Line:** 555

---

### `VARIABLE` `companyName`

- **Line:** 557

---

### `VARIABLE` `city`

- **Line:** 558

---

### `VARIABLE` `bookingLink`

- **Line:** 560

---

### `VARIABLE` `generalBookingLink`

- **Line:** 561

---

### `VARIABLE` `scfLink`

- **Line:** 562

---

### `VARIABLE` `encryptedId`

- **Line:** 563

---

### `VARIABLE` `sofLink`

- **Line:** 564

---

### `VARIABLE` `regLink`

- **Line:** 565

---

### `VARIABLE` `actLink`

- **Line:** 566

---

### `VARIABLE` `securityCode`

- **Line:** 567

---

### `FUNCTION` `applyTemplate`

- **Line:** 599

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `templateId` | `string` | **Yes** | - | - |

---

### `VARIABLE` `found`

- **Line:** 601

---

### `VARIABLE` `bodyContent`

- **Line:** 606

---

### `VARIABLE` `data`

- **Line:** 613

---

### `VARIABLE` `bodyContent`

- **Line:** 615

---

### `FUNCTION` `fetchTemplatesAndCampaigns`

- **Line:** 624
- **Async:** Yes
- **Returns:** `void`

---

### `VARIABLE` `loadedTemplates`

- **Line:** 630

---

### `VARIABLE` `found`

- **Line:** 636

---

### `VARIABLE` `bodyContent`

- **Line:** 639

---

### `VARIABLE` `activeRole`

- **Line:** 652

---

### `VARIABLE` `isUserRole`

- **Line:** 653

---

### `VARIABLE` `found`

- **Line:** 662

---

### `FUNCTION` `fetchTemplateSubject`

- **Line:** 670
- **Async:** Yes
- **Returns:** `void`

---

### `VARIABLE` `activeRole`

- **Line:** 672

---

### `VARIABLE` `isUserRole`

- **Line:** 673

---

### `VARIABLE` `docRef`

- **Line:** 678

---

### `VARIABLE` `docSnap`

- **Line:** 679

---

### `VARIABLE` `subj`

- **Line:** 681

---

### `VARIABLE` `templatesRef`

- **Line:** 689

---

### `VARIABLE` `q`

- **Line:** 690

---

### `VARIABLE` `querySnapshot`

- **Line:** 691

---

### `VARIABLE` `subj`

- **Line:** 693

---

### `VARIABLE` `isMounted`

- **Line:** 707

---

### `FUNCTION` `fetchAllContacts`

- **Line:** 709
- **Async:** Yes

---

### `VARIABLE` `emails`

- **Line:** 710
- **Signature:** `{ email: string; label: string; name: string }[]`

---

### `VARIABLE` `contactsRef`

- **Line:** 724

---

### `VARIABLE` `snap`

- **Line:** 725

---

### `VARIABLE` `data`

- **Line:** 727

---

### `VARIABLE` `fullName`

- **Line:** 729

---

### `VARIABLE` `compId`

- **Line:** 739

---

### `VARIABLE` `companyContactsRef`

- **Line:** 741

---

### `VARIABLE` `compSnap`

- **Line:** 742

---

### `VARIABLE` `data`

- **Line:** 744

---

### `VARIABLE` `fullName`

- **Line:** 746

---

### `VARIABLE` `uniqueMap`

- **Line:** 761

---

### `VARIABLE` `lower`

- **Line:** 763

---

### `VARIABLE` `unique`

- **Line:** 769

---

### `FUNCTION` `resolveAmEmail`

- **Line:** 779
- **Async:** Yes

---

### `VARIABLE` `amAssigned`

- **Line:** 780

---

### `VARIABLE` `usersRef`

- **Line:** 788

---

### `VARIABLE` `qAll`

- **Line:** 789

---

### `VARIABLE` `snapAll`

- **Line:** 790

---

### `VARIABLE` `name`

- **Line:** 791

---

### `VARIABLE` `found`

- **Line:** 792

---

### `VARIABLE` `data`

- **Line:** 793

---

### `VARIABLE` `fullName`

- **Line:** 794

---

### `VARIABLE` `dispName`

- **Line:** 795

---

### `VARIABLE` `emailName`

- **Line:** 796

---

### `VARIABLE` `data`

- **Line:** 800

---

### `VARIABLE` `phones`

- **Line:** 815
- **Signature:** `{phone: string, label: string, name: string}[]`

---

### `VARIABLE` `uniqueP`

- **Line:** 824

---

### `FUNCTION` `onSubmit`

- **Line:** 832
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `values` | `z.infer<typeof formSchema>` | **Yes** | - | - |

---

### `VARIABLE` `isLostOutcome`

- **Line:** 842

---

### `VARIABLE` `validRegisterContacts`

- **Line:** 863

---

### `VARIABLE` `c`

- **Line:** 864

---

### `VARIABLE` `isUserRoleSubmitted`

- **Line:** 885

---

### `VARIABLE` `isEmailOutcomeSubmitted`

- **Line:** 886

---

### `VARIABLE` `mappedStatusObj`

- **Line:** 894

---

### `VARIABLE` `targetStatus`

- **Line:** 895

---

### `VARIABLE` `isTargetLost`

- **Line:** 896

---

### `VARIABLE` `firebaseStartTime`

- **Line:** 918

---

### `VARIABLE` `newStatus`

- **Line:** 919
- **Signature:** `LeadStatus | undefined`

---

### `VARIABLE` `nsOutcomePromise`

- **Line:** 922

---

### `VARIABLE` `logCallPromise`

- **Line:** 930

---

### `VARIABLE` `isLost`

- **Line:** 942

---

### `VARIABLE` `extraFirestorePromises`

- **Line:** 943
- **Signature:** `Promise<any>[]`

---

### `VARIABLE` `activeThemesList`

- **Line:** 946

---

### `VARIABLE` `selectedThemeObj`

- **Line:** 947

---

### `VARIABLE` `selectedWhyObj`

- **Line:** 948

---

### `VARIABLE` `selectedReasonObj`

- **Line:** 949

---

### `VARIABLE` `effectiveHasAccount`

- **Line:** 964

---

### `VARIABLE` `effectiveParcelVol`

- **Line:** 965

---

### `VARIABLE` `carrierValue`

- **Line:** 966

---

### `VARIABLE` `oldBucket`

- **Line:** 979

---

### `VARIABLE` `author`

- **Line:** 980

---

### `VARIABLE` `selectedContactsInfo`

- **Line:** 1007
- **Signature:** `any[]`

---

### `VARIABLE` `contactUpdatePromises`

- **Line:** 1008
- **Signature:** `Promise<any>[]`

---

### `VARIABLE` `c`

- **Line:** 1010

---

### `VARIABLE` `contact`

- **Line:** 1023

---

### `VARIABLE` `numericRate`

- **Line:** 1024

---

### `VARIABLE` `trialPromise`

- **Line:** 1026

---

### `VARIABLE` `postTrialPromises`

- **Line:** 1057
- **Signature:** `Promise<any>[]`

---

### `VARIABLE` `isOutbound`

- **Line:** 1067

---

### `VARIABLE` `nowIso`

- **Line:** 1068

---

### `VARIABLE` `firebaseEndTime`

- **Line:** 1121

---

### `VARIABLE` `callBackIso`

- **Line:** 1126

---

### `VARIABLE` `actionText`

- **Line:** 1127

---

### `VARIABLE` `createdTask`

- **Line:** 1134

---

### `VARIABLE` `userEmail`

- **Line:** 1141

---

### `VARIABLE` `userId`

- **Line:** 1142

---

### `VARIABLE` `syncRes`

- **Line:** 1145

---

### `VARIABLE` `syncData`

- **Line:** 1159

---

### `VARIABLE` `period`

- **Line:** 1171

---

### `VARIABLE` `d`

- **Line:** 1172

---

### `VARIABLE` `customD`

- **Line:** 1180

---

### `VARIABLE` `followUpIso`

- **Line:** 1189

---

### `VARIABLE` `activeRoleStr`

- **Line:** 1191

---

### `VARIABLE` `dialerRoles`

- **Line:** 1192

---

### `VARIABLE` `isDialerUser`

- **Line:** 1193

---

### `VARIABLE` `isLocalMileOpp`

- **Line:** 1195

---

### `VARIABLE` `taskTitle`

- **Line:** 1201

---

### `VARIABLE` `createdFollowUpTask`

- **Line:** 1202

---

### `VARIABLE` `userEmail`

- **Line:** 1209

---

### `VARIABLE` `userId`

- **Line:** 1210

---

### `VARIABLE` `syncRes`

- **Line:** 1213

---

### `VARIABLE` `syncData`

- **Line:** 1227

---

### `VARIABLE` `targetPhone`

- **Line:** 1239

---

### `VARIABLE` `smsResult`

- **Line:** 1242

---

### `VARIABLE` `targetEmail`

- **Line:** 1264

---

### `VARIABLE` `targetEmailObj`

- **Line:** 1265

---

### `VARIABLE` `contactName`

- **Line:** 1266

---

### `VARIABLE` `templateIdToUse`

- **Line:** 1268

---

### `VARIABLE` `found`

- **Line:** 1273

---

### `VARIABLE` `response`

- **Line:** 1282

---

### `VARIABLE` `result`

- **Line:** 1297

---

### `VARIABLE` `outcomeLower`

- **Line:** 1315

---

### `VARIABLE` `statusLower`

- **Line:** 1316

---

### `VARIABLE` `GroupIcon`

- **Line:** 1428

---

### `VARIABLE` `filteredSubgroups`

- **Line:** 1430

---

### `VARIABLE` `visibleItems`

- **Line:** 1431

---

### `VARIABLE` `activeRole`

- **Line:** 1432

---

### `VARIABLE` `hiddenForUserRole`

- **Line:** 1435

---

### `VARIABLE` `exceptFieldSales`

- **Line:** 1447

---

### `VARIABLE` `fieldSalesOnly`

- **Line:** 1458

---

### `VARIABLE` `isSelected`

- **Line:** 1502

---

### `VARIABLE` `btnClasses`

- **Line:** 1504

---

### `VARIABLE` `isExpanded`

- **Line:** 1656

---

### `VARIABLE` `isSelected`

- **Line:** 1681

---

### `VARIABLE` `allEmails`

- **Line:** 1734

---

### `VARIABLE` `currentVal`

- **Line:** 1752

---

### `VARIABLE` `isSelected`

- **Line:** 1753

---

### `VARIABLE` `emails`

- **Line:** 1762

---

### `VARIABLE` `idx`

- **Line:** 1763

---

### `VARIABLE` `subjectInput`

- **Line:** 1832

---

### `VARIABLE` `start`

- **Line:** 1834

---

### `VARIABLE` `end`

- **Line:** 1835

---

### `VARIABLE` `text`

- **Line:** 1836

---

### `VARIABLE` `before`

- **Line:** 1837

---

### `VARIABLE` `after`

- **Line:** 1838

---

### `VARIABLE` `current`

- **Line:** 1912

---

### `VARIABLE` `emails`

- **Line:** 1913

---

### `VARIABLE` `userEmail`

- **Line:** 1914

---

### `VARIABLE` `current`

- **Line:** 1931

---

### `VARIABLE` `emails`

- **Line:** 1932

---

### `VARIABLE` `currentHasAccount`

- **Line:** 2117

---

### `VARIABLE` `currentParcelVol`

- **Line:** 2118

---

### `VARIABLE` `isTrialingLocalMile`

- **Line:** 2119

---

### `VARIABLE` `isLost`

- **Line:** 2120

---

### `VARIABLE` `isAmOrSalesMgr`

- **Line:** 2122

---

### `VARIABLE` `hasValidLpoAnswers`

- **Line:** 2123

---

### `VARIABLE` `canPushToLpo`

- **Line:** 2124

---

### `VARIABLE` `isSelected`

- **Line:** 2172

---

### `VARIABLE` `isMandatory`

- **Line:** 2226

---

### `VARIABLE` `currentHasAccount`

- **Line:** 2227

---

### `VARIABLE` `currentParcelVol`

- **Line:** 2228

---

### `VARIABLE` `isTrialingLocalMile`

- **Line:** 2229

---

### `VARIABLE` `isLost`

- **Line:** 2230

---

### `VARIABLE` `isAmOrSalesMgr`

- **Line:** 2232

---

### `VARIABLE` `hasValidLpoAnswers`

- **Line:** 2233

---

### `VARIABLE` `canPushToLpo`

- **Line:** 2234

---

### `VARIABLE` `isSelected`

- **Line:** 2284

---

### `VARIABLE` `isValidContact`

- **Line:** 2383

---

### `VARIABLE` `val`

- **Line:** 2443

---

### `VARIABLE` `author`

- **Line:** 2535

---

### `VARIABLE` `vals`

- **Line:** 2539

---

