# Module: `src/app/admin/tickets/[ticketId]/page.tsx`

- **Language:** TypeScript
- **Total Lines:** 4511
- **Direct Dependencies:** 20 modules imported

## Exported Symbols & API

### `FUNCTION` `parseCommContent`

- **Line:** 75

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `content` | `string` | **Yes** | - | - |

---

### `VARIABLE` `doubleNewlineIndex`

- **Line:** 78

---

### `VARIABLE` `subject`

- **Line:** 80

---

### `VARIABLE` `body`

- **Line:** 81

---

### `FUNCTION` `formatToDDMMYYYY`

- **Line:** 88

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `dateVal` | `string | number | Date | null | undefined` | **Yes** | - | - |

---

### `VARIABLE` `rawDate`

- **Line:** 91

---

### `VARIABLE` `sydneyStr`

- **Line:** 93

---

### `VARIABLE` `date`

- **Line:** 94

---

### `VARIABLE` `day`

- **Line:** 95

---

### `VARIABLE` `month`

- **Line:** 96

---

### `VARIABLE` `year`

- **Line:** 97

---

### `VARIABLE` `hours`

- **Line:** 99

---

### `VARIABLE` `minutes`

- **Line:** 100

---

### `VARIABLE` `seconds`

- **Line:** 101

---

### `VARIABLE` `ampm`

- **Line:** 102

---

### `FUNCTION` `parseLocationFromAddress`

- **Line:** 112

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `address` | `string` | No | - | - |
| `state` | `string` | No | - | - |

---

### `VARIABLE` `stateUpper`

- **Line:** 113

---

### `VARIABLE` `addr`

- **Line:** 126

---

### `FUNCTION` `hasWord`

- **Line:** 128

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `word` | `string` | **Yes** | - | - |

---

### `FUNCTION` `getLocalTimeDetails`

- **Line:** 155

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `zone` | `string` | **Yes** | - | - |

---

### `VARIABLE` `now`

- **Line:** 157

---

### `VARIABLE` `timeOptions`

- **Line:** 159
- **Signature:** `Intl.DateTimeFormatOptions`

---

### `VARIABLE` `dayOptions`

- **Line:** 166
- **Signature:** `Intl.DateTimeFormatOptions`

---

### `VARIABLE` `timeStr`

- **Line:** 171

---

### `VARIABLE` `dayStr`

- **Line:** 172

---

### `VARIABLE` `formatter`

- **Line:** 174

---

### `VARIABLE` `parts`

- **Line:** 178

---

### `VARIABLE` `tzPart`

- **Line:** 179

---

### `VARIABLE` `tzAbbr`

- **Line:** 180

---

### `VARIABLE` `locDateStr`

- **Line:** 182

---

### `VARIABLE` `sysDateStr`

- **Line:** 183

---

### `VARIABLE` `locDate`

- **Line:** 184

---

### `VARIABLE` `sysDate`

- **Line:** 185

---

### `VARIABLE` `diffMs`

- **Line:** 186

---

### `VARIABLE` `diffHours`

- **Line:** 187

---

### `VARIABLE` `targetHour`

- **Line:** 189

---

### `VARIABLE` `targetDay`

- **Line:** 190

---

### `VARIABLE` `isOpen`

- **Line:** 191

---

### `FUNCTION` `TicketDetailsPage`

- **Line:** 212
- **Returns:** `void`

---

### `VARIABLE` `router`

- **Line:** 215

---

### `VARIABLE` `params`

- **Line:** 216

---

### `VARIABLE` `ticketId`

- **Line:** 217

---

### `VARIABLE` `ENQUIRY_TYPE_OPTIONS`

- **Line:** 229

---

### `FUNCTION` `handleUpdateEnquiryTypes`

- **Line:** 252
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `newTypes` | `string[]` | **Yes** | - | - |

---

### `VARIABLE` `ticketRef`

- **Line:** 254

---

### `VARIABLE` `timer`

- **Line:** 268

---

### `VARIABLE` `childQuery`

- **Line:** 284

---

### `VARIABLE` `unsubChildren`

- **Line:** 286

---

### `VARIABLE` `list`

- **Line:** 287
- **Signature:** `any[]`

---

### `VARIABLE` `data`

- **Line:** 289

---

### `VARIABLE` `combinedLogs`

- **Line:** 307

---

### `VARIABLE` `actionItems`

- **Line:** 308

---

### `VARIABLE` `noteItems`

- **Line:** 320

---

### `VARIABLE` `timeA`

- **Line:** 332

---

### `VARIABLE` `timeB`

- **Line:** 333

---

### `FUNCTION` `insertPlaceholder`

- **Line:** 368

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `placeholder` | `string` | **Yes** | - | - |

---

### `FUNCTION` `addContactToField`

- **Line:** 376

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `email` | `string` | **Yes** | - | - |
| `field` | `"to" | "cc" | "bcc"` | **Yes** | - | - |

---

### `VARIABLE` `setter`

- **Line:** 377

---

### `VARIABLE` `currentValue`

- **Line:** 378

---

### `VARIABLE` `emails`

- **Line:** 380

---

### `VARIABLE` `companyId`

- **Line:** 397

---

### `VARIABLE` `opId`

- **Line:** 400

---

### `VARIABLE` `scanWithOp`

- **Line:** 402

---

### `VARIABLE` `scanWithOp`

- **Line:** 406

---

### `FUNCTION` `fetchFranchiseeAndOperator`

- **Line:** 416
- **Async:** Yes
- **Returns:** `void`

---

### `VARIABLE` `finalFranchiseeDoc`

- **Line:** 419
- **Signature:** `any`

---

### `VARIABLE` `companySnap`

- **Line:** 423

---

### `VARIABLE` `compData`

- **Line:** 424

---

### `VARIABLE` `leadSnap`

- **Line:** 427

---

### `VARIABLE` `franchiseeId`

- **Line:** 434

---

### `VARIABLE` `franchiseeName`

- **Line:** 435

---

### `VARIABLE` `franSnap`

- **Line:** 438

---

### `VARIABLE` `q`

- **Line:** 445

---

### `VARIABLE` `snap`

- **Line:** 446

---

### `VARIABLE` `fallbackName`

- **Line:** 456

---

### `VARIABLE` `q`

- **Line:** 458

---

### `VARIABLE` `snap`

- **Line:** 459

---

### `VARIABLE` `q`

- **Line:** 470

---

### `VARIABLE` `snap`

- **Line:** 471

---

### `VARIABLE` `qNum`

- **Line:** 476

---

### `VARIABLE` `snapNum`

- **Line:** 477

---

### `VARIABLE` `docSnap`

- **Line:** 481

---

### `FUNCTION` `handleSaveEnquirerDetails`

- **Line:** 533
- **Async:** Yes

---

### `VARIABLE` `ticketRef`

- **Line:** 536

---

### `VARIABLE` `updateData`

- **Line:** 537

---

### `FUNCTION` `handleSaveReceiverDetails`

- **Line:** 582
- **Async:** Yes

---

### `VARIABLE` `ticketRef`

- **Line:** 585

---

### `VARIABLE` `updateData`

- **Line:** 586

---

### `VARIABLE` `activeUsersGroupedByRole`

- **Line:** 623

---

### `VARIABLE` `activeUsers`

- **Line:** 624

---

### `VARIABLE` `role`

- **Line:** 627

---

### `VARIABLE` `query`

- **Line:** 633

---

### `VARIABLE` `name`

- **Line:** 634

---

### `VARIABLE` `email`

- **Line:** 635

---

### `VARIABLE` `groups`

- **Line:** 642
- **Signature:** `Record<string, any[]>`

---

### `VARIABLE` `role`

- **Line:** 644

---

### `VARIABLE` `availableResolutionRecipients`

- **Line:** 654

---

### `VARIABLE` `list`

- **Line:** 655
- **Signature:** `Array<{ id: string; name: string; email: string; label: string; tag?: string }>`

---

### `VARIABLE` `addedEmails`

- **Line:** 656

---

### `VARIABLE` `emailClean`

- **Line:** 661

---

### `VARIABLE` `custEmailClean`

- **Line:** 677

---

### `VARIABLE` `enqEmailClean`

- **Line:** 692

---

### `FUNCTION` `loadUsers`

- **Line:** 710
- **Async:** Yes
- **Returns:** `void`

---

### `VARIABLE` `users`

- **Line:** 712

---

### `FUNCTION` `fetchTemplatesAndBrand`

- **Line:** 723
- **Async:** Yes
- **Returns:** `void`

---

### `VARIABLE` `list`

- **Line:** 729

---

### `FUNCTION` `applyTemplate`

- **Line:** 752

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `templateId` | `string` | **Yes** | - | - |

---

### `VARIABLE` `template`

- **Line:** 759

---

### `VARIABLE` `contactName`

- **Line:** 761

---

### `VARIABLE` `companyName`

- **Line:** 762

---

### `VARIABLE` `representativeName`

- **Line:** 763

---

### `VARIABLE` `receiverName`

- **Line:** 765

---

### `VARIABLE` `receiverCompanyName`

- **Line:** 766

---

### `VARIABLE` `receiverAddress`

- **Line:** 767

---

### `VARIABLE` `ticketNumber`

- **Line:** 768

---

### `VARIABLE` `trackingId`

- **Line:** 769

---

### `VARIABLE` `parsedSubject`

- **Line:** 771

---

### `VARIABLE` `parsedBody`

- **Line:** 785

---

### `FUNCTION` `fetchTicket`

- **Line:** 816
- **Async:** Yes

---

### `VARIABLE` `docRef`

- **Line:** 818

---

### `VARIABLE` `docSnap`

- **Line:** 819

---

### `VARIABLE` `tData`

- **Line:** 821

---

### `VARIABLE` `companyId`

- **Line:** 845

---

### `FUNCTION` `fetchContacts`

- **Line:** 851
- **Async:** Yes
- **Returns:** `void`

---

### `VARIABLE` `contactsRef`

- **Line:** 855

---

### `VARIABLE` `contactsSnap`

- **Line:** 856

---

### `VARIABLE` `list`

- **Line:** 857

---

### `VARIABLE` `companyId`

- **Line:** 879

---

### `FUNCTION` `fetchCompanyDetails`

- **Line:** 885
- **Async:** Yes
- **Returns:** `void`

---

### `VARIABLE` `compRef`

- **Line:** 887

---

### `VARIABLE` `compSnap`

- **Line:** 888

---

### `VARIABLE` `leadRef`

- **Line:** 894

---

### `VARIABLE` `leadSnap`

- **Line:** 895

---

### `VARIABLE` `actionsRef`

- **Line:** 912

---

### `VARIABLE` `qActions`

- **Line:** 913

---

### `VARIABLE` `unsubActions`

- **Line:** 914

---

### `VARIABLE` `list`

- **Line:** 915
- **Signature:** `any[]`

---

### `VARIABLE` `commsRef`

- **Line:** 921

---

### `VARIABLE` `qComms`

- **Line:** 922

---

### `VARIABLE` `unsubComms`

- **Line:** 923

---

### `VARIABLE` `list`

- **Line:** 924
- **Signature:** `any[]`

---

### `VARIABLE` `notesRef`

- **Line:** 930

---

### `VARIABLE` `qNotes`

- **Line:** 931

---

### `VARIABLE` `unsubNotes`

- **Line:** 932

---

### `VARIABLE` `list`

- **Line:** 933
- **Signature:** `any[]`

---

### `FUNCTION` `fetchPackageData`

- **Line:** 945
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `identifier` | `string` | **Yes** | - | - |
| `currentCustomerCompany` | `string` | No | - | - |

---

### `VARIABLE` `response`

- **Line:** 948

---

### `VARIABLE` `data`

- **Line:** 950

---

### `VARIABLE` `isWebsiteCustomer`

- **Line:** 954

---

### `VARIABLE` `ticketRef`

- **Line:** 956

---

### `VARIABLE` `updates`

- **Line:** 957

---

### `FUNCTION` `updateTicketStatus`

- **Line:** 987
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `newStatus` | `string` | **Yes** | - | - |
| `notes` | `string` | No | - | - |

---

### `VARIABLE` `ticketRef`

- **Line:** 990

---

### `VARIABLE` `isCloseStatus`

- **Line:** 991

---

### `VARIABLE` `nowIso`

- **Line:** 993

---

### `VARIABLE` `updateData`

- **Line:** 994
- **Signature:** `any`

---

### `VARIABLE` `updated`

- **Line:** 1004

---

### `VARIABLE` `isCloseOrResolve`

- **Line:** 1013

---

### `VARIABLE` `recipients`

- **Line:** 1015

---

### `VARIABLE` `formattedHtml`

- **Line:** 1020

---

### `VARIABLE` `personalizedBody`

- **Line:** 1028

---

### `VARIABLE` `contactObj`

- **Line:** 1029

---

### `VARIABLE` `recipientName`

- **Line:** 1030

---

### `VARIABLE` `name`

- **Line:** 1033

---

### `VARIABLE` `actionNotes`

- **Line:** 1102

---

### `FUNCTION` `promptStatusChange`

- **Line:** 1131

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `status` | `string` | **Yes** | - | - |

---

### `VARIABLE` `isCloseOrResolve`

- **Line:** 1137

---

### `VARIABLE` `displayId`

- **Line:** 1139

---

### `VARIABLE` `barcode`

- **Line:** 1140

---

### `VARIABLE` `defaultRecipients`

- **Line:** 1153
- **Signature:** `string[]`

---

### `FUNCTION` `handleAddAction`

- **Line:** 1171
- **Async:** Yes

---

### `VARIABLE` `nowIso`

- **Line:** 1182

---

### `FUNCTION` `handleEscalate`

- **Line:** 1200
- **Async:** Yes

---

### `VARIABLE` `selectedUserObj`

- **Line:** 1206

---

### `VARIABLE` `assigneeName`

- **Line:** 1207

---

### `VARIABLE` `todayDate`

- **Line:** 1220

---

### `VARIABLE` `raisedFormatted`

- **Line:** 1221

---

### `VARIABLE` `opsSnap`

- **Line:** 1228

---

### `VARIABLE` `opsNum`

- **Line:** 1229

---

### `VARIABLE` `itSnap`

- **Line:** 1242

---

### `VARIABLE` `itNum`

- **Line:** 1243

---

### `VARIABLE` `newStatus`

- **Line:** 1257

---

### `VARIABLE` `nowIso`

- **Line:** 1258

---

### `FUNCTION` `handleAssignStaff`

- **Line:** 1289
- **Async:** Yes

---

### `VARIABLE` `selectedUserObj`

- **Line:** 1295

---

### `VARIABLE` `assigneeName`

- **Line:** 1298

---

### `VARIABLE` `nowIso`

- **Line:** 1299

---

### `VARIABLE` `todayDate`

- **Line:** 1312

---

### `VARIABLE` `raisedFormatted`

- **Line:** 1313

---

### `VARIABLE` `opsSnap`

- **Line:** 1320

---

### `VARIABLE` `opsNum`

- **Line:** 1321

---

### `VARIABLE` `itSnap`

- **Line:** 1334

---

### `VARIABLE` `itNum`

- **Line:** 1335

---

### `VARIABLE` `newStatus`

- **Line:** 1348

---

### `FUNCTION` `handleSendEmail`

- **Line:** 1400
- **Async:** Yes

---

### `VARIABLE` `attachmentPayload`

- **Line:** 1408

---

### `VARIABLE` `nowIso`

- **Line:** 1426

---

### `VARIABLE` `response`

- **Line:** 1436

---

### `VARIABLE` `data`

- **Line:** 1452

---

### `FUNCTION` `handleSendMissedSweep`

- **Line:** 1474
- **Async:** Yes

---

### `VARIABLE` `res`

- **Line:** 1477

---

### `VARIABLE` `data`

- **Line:** 1486

---

### `FUNCTION` `handleAttachmentUpload`

- **Line:** 1503
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `e` | `React.ChangeEvent<HTMLInputElement>` | **Yes** | - | - |

---

### `VARIABLE` `file`

- **Line:** 1504

---

### `VARIABLE` `storageRef`

- **Line:** 1509

---

### `VARIABLE` `url`

- **Line:** 1511

---

### `VARIABLE` `attachmentObj`

- **Line:** 1513

---

### `VARIABLE` `existingAttachments`

- **Line:** 1520

---

### `VARIABLE` `newAttachments`

- **Line:** 1521

---

### `FUNCTION` `handleAddEnquiry`

- **Line:** 1555
- **Async:** Yes

---

### `VARIABLE` `currentEnquiries`

- **Line:** 1558

---

### `VARIABLE` `updated`

- **Line:** 1565

---

### `FUNCTION` `handleAddStaffNote`

- **Line:** 1578
- **Async:** Yes

---

### `VARIABLE` `nowIso`

- **Line:** 1588

---

### `VARIABLE` `createdDate`

- **Line:** 1620

---

### `VARIABLE` `ticketAgeHours`

- **Line:** 1621

---

### `VARIABLE` `lastUpdate`

- **Line:** 1623

---

### `VARIABLE` `lastUpdateDate`

- **Line:** 1624

---

### `VARIABLE` `hoursSinceLastUpdate`

- **Line:** 1625

---

### `VARIABLE` `isSlaPaused`

- **Line:** 1627

---

### `VARIABLE` `slaColorClass`

- **Line:** 1629

---

### `VARIABLE` `slaDotColor`

- **Line:** 1630

---

### `VARIABLE` `slaLabel`

- **Line:** 1631

---

### `VARIABLE` `lastMovementTime`

- **Line:** 1644
- **Signature:** `Date | null`

---

### `VARIABLE` `movementDiffHours`

- **Line:** 1645

---

### `VARIABLE` `idToCopy`

- **Line:** 1726

---

### `VARIABLE` `senderLoc`

- **Line:** 1761

---

### `VARIABLE` `senderTime`

- **Line:** 1765

---

### `VARIABLE` `senderDiffHoursAbs`

- **Line:** 1766

---

### `VARIABLE` `senderDiffText`

- **Line:** 1767

---

### `VARIABLE` `recLoc`

- **Line:** 1771

---

### `VARIABLE` `recTime`

- **Line:** 1781

---

### `VARIABLE` `recDiffHoursAbs`

- **Line:** 1782

---

### `VARIABLE` `recDiffText`

- **Line:** 1783

---

### `VARIABLE` `val`

- **Line:** 1957

---

### `VARIABLE` `val`

- **Line:** 1986

---

### `VARIABLE` `val`

- **Line:** 2015

---

### `VARIABLE` `noteInput`

- **Line:** 2097

---

### `VARIABLE` `isHtml`

- **Line:** 2294

---

### `VARIABLE` `customerLoc`

- **Line:** 2397

---

### `VARIABLE` `customerTime`

- **Line:** 2401

---

### `VARIABLE` `contactLoc`

- **Line:** 2578

---

### `VARIABLE` `contactTime`

- **Line:** 2582

---

### `VARIABLE` `opLoc`

- **Line:** 2682

---

### `VARIABLE` `opTime`

- **Line:** 2683

---

### `VARIABLE` `recLoc`

- **Line:** 2802

---

### `VARIABLE` `recTime`

- **Line:** 2803

---

### `VARIABLE` `recLoc`

- **Line:** 2858

---

### `VARIABLE` `recTime`

- **Line:** 2862

---

### `VARIABLE` `recLoc`

- **Line:** 2918

---

### `VARIABLE` `recTime`

- **Line:** 2919

---

### `VARIABLE` `val`

- **Line:** 3013

---

### `VARIABLE` `val`

- **Line:** 3042

---

### `VARIABLE` `val`

- **Line:** 3071

---

### `VARIABLE` `newStatus`

- **Line:** 3301

---

### `VARIABLE` `newStatus`

- **Line:** 3360

---

### `VARIABLE` `name`

- **Line:** 3652

---

### `VARIABLE` `excludedNames`

- **Line:** 3653

---

### `VARIABLE` `rolesToCheck`

- **Line:** 3656

---

### `VARIABLE` `hasRoleInAssigned`

- **Line:** 3657

---

### `VARIABLE` `isDefaultRole`

- **Line:** 3660

---

### `VARIABLE` `isRole`

- **Line:** 3661

---

### `VARIABLE` `ticketContactEmail`

- **Line:** 3773

---

### `VARIABLE` `ticketContactName`

- **Line:** 3774

---

### `VARIABLE` `mergedContacts`

- **Line:** 3776

---

### `VARIABLE` `newAtt`

- **Line:** 3972

---

### `VARIABLE` `isChecked`

- **Line:** 3985

---

### `VARIABLE` `isSelected`

- **Line:** 4258

---

### `VARIABLE` `selectedTypes`

- **Line:** 4480

---

### `VARIABLE` `isChecked`

- **Line:** 4481

---

### `VARIABLE` `newTypes`

- **Line:** 4488

---

