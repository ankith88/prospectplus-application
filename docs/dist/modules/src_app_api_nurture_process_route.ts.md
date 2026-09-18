# Module: `src/app/api/nurture/process/route.ts`

- **Language:** TypeScript
- **Total Lines:** 875
- **Direct Dependencies:** 6 modules imported

## Exported Symbols & API

### `VARIABLE` `db`

- **Line:** 8

---

### `FUNCTION` `isSendTimeReached`

- **Line:** 10
- **Returns:** `boolean`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `lastExecTimeStr` | `string` | **Yes** | - | - |
| `sendTimeConfig` | `string` | **Yes** | - | - |

---

### `VARIABLE` `now`

- **Line:** 14

---

### `VARIABLE` `sydneyNow`

- **Line:** 17

---

### `VARIABLE` `sydneyTarget`

- **Line:** 18

---

### `VARIABLE` `lastExecSydney`

- **Line:** 21

---

### `FUNCTION` `POST`

- **Line:** 32
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `request` | `Request` | **Yes** | - | - |

---

### `VARIABLE` `authHeader`

- **Line:** 34

---

### `VARIABLE` `now`

- **Line:** 39

---

### `VARIABLE` `nowStr`

- **Line:** 40

---

### `VARIABLE` `deferredLeadsSnap`

- **Line:** 44

---

### `VARIABLE` `today`

- **Line:** 48

---

### `VARIABLE` `data`

- **Line:** 50

---

### `VARIABLE` `followUpDate`

- **Line:** 52

---

### `VARIABLE` `updates`

- **Line:** 54
- **Signature:** `Record<string, any>`

---

### `VARIABLE` `targetLeadId`

- **Line:** 84
- **Signature:** `string | null`

---

### `VARIABLE` `forceExecute`

- **Line:** 85

---

### `VARIABLE` `targetJourneyId`

- **Line:** 86
- **Signature:** `string | null`

---

### `VARIABLE` `body`

- **Line:** 88

---

### `VARIABLE` `docs`

- **Line:** 95
- **Signature:** `any[]`

---

### `VARIABLE` `leadDoc`

- **Line:** 97

---

### `VARIABLE` `leadsSnap`

- **Line:** 102

---

### `VARIABLE` `primarySender`

- **Line:** 112

---

### `VARIABLE` `integrationSnap`

- **Line:** 114

---

### `VARIABLE` `leadsProcessed`

- **Line:** 120

---

### `VARIABLE` `actionsExecuted`

- **Line:** 121

---

### `VARIABLE` `leadId`

- **Line:** 124

---

### `VARIABLE` `leadData`

- **Line:** 125

---

### `VARIABLE` `activeJourneys`

- **Line:** 126
- **Signature:** `string[]`

---

### `VARIABLE` `stateRef`

- **Line:** 134

---

### `VARIABLE` `stateDoc`

- **Line:** 135

---

### `VARIABLE` `state`

- **Line:** 136

---

### `VARIABLE` `journeySnap`

- **Line:** 139

---

### `VARIABLE` `journey`

- **Line:** 145

---

### `VARIABLE` `startNode`

- **Line:** 152

---

### `VARIABLE` `firstEdge`

- **Line:** 159

---

### `VARIABLE` `initialNodeId`

- **Line:** 160

---

### `VARIABLE` `currentNode`

- **Line:** 186

---

### `VARIABLE` `traversalCount`

- **Line:** 193

---

### `VARIABLE` `maxTraversals`

- **Line:** 194

---

### `VARIABLE` `stateUpdated`

- **Line:** 195

---

### `VARIABLE` `config`

- **Line:** 201

---

### `VARIABLE` `duration`

- **Line:** 202

---

### `VARIABLE` `unit`

- **Line:** 203

---

### `VARIABLE` `lastExec`

- **Line:** 205

---

### `VARIABLE` `delayMs`

- **Line:** 206

---

### `VARIABLE` `nextEdge`

- **Line:** 210

---

### `VARIABLE` `config`

- **Line:** 242

---

### `VARIABLE` `conditionField`

- **Line:** 243

---

### `VARIABLE` `conditionValue`

- **Line:** 244

---

### `VARIABLE` `leadVal`

- **Line:** 247

---

### `VARIABLE` `isMatch`

- **Line:** 248

---

### `VARIABLE` `matchingEdge`

- **Line:** 251

---

### `VARIABLE` `cond`

- **Line:** 254

---

### `VARIABLE` `defaultEdge`

- **Line:** 271

---

### `VARIABLE` `nodeConfig`

- **Line:** 282

---

### `VARIABLE` `config`

- **Line:** 285

---

### `VARIABLE` `timeoutHours`

- **Line:** 286

---

### `VARIABLE` `deliveriesSnap`

- **Line:** 289

---

### `VARIABLE` `isOpened`

- **Line:** 294

---

### `VARIABLE` `firstSentTime`

- **Line:** 295
- **Signature:** `Date | null`

---

### `VARIABLE` `dData`

- **Line:** 298

---

### `VARIABLE` `t`

- **Line:** 303

---

### `VARIABLE` `elapsedHours`

- **Line:** 308

---

### `VARIABLE` `matchingEdge`

- **Line:** 311

---

### `VARIABLE` `matchingEdge`

- **Line:** 328

---

### `VARIABLE` `config`

- **Line:** 351

---

### `VARIABLE` `sydneyNow`

- **Line:** 355

---

### `VARIABLE` `day`

- **Line:** 356

---

### `VARIABLE` `sendTime`

- **Line:** 363

---

### `VARIABLE` `actionType`

- **Line:** 372

---

### `VARIABLE` `rootContactName`

- **Line:** 375

---

### `VARIABLE` `contactName`

- **Line:** 376

---

### `VARIABLE` `contactFirstName`

- **Line:** 377

---

### `VARIABLE` `localMilePlusAuthLink`

- **Line:** 378

---

### `VARIABLE` `localMileSecurityCode`

- **Line:** 379

---

### `VARIABLE` `contactPhone`

- **Line:** 380

---

### `VARIABLE` `recipientEmail`

- **Line:** 381

---

### `VARIABLE` `contactsSnap`

- **Line:** 384

---

### `VARIABLE` `primaryContactDoc`

- **Line:** 387

---

### `VARIABLE` `contactWithEmailDoc`

- **Line:** 388

---

### `VARIABLE` `targetContactDoc`

- **Line:** 389

---

### `VARIABLE` `contactData`

- **Line:** 390

---

### `VARIABLE` `rawAmName`

- **Line:** 414

---

### `VARIABLE` `amName`

- **Line:** 415

---

### `VARIABLE` `amMobile`

- **Line:** 416

---

### `VARIABLE` `amCalendly`

- **Line:** 417

---

### `VARIABLE` `amEmail`

- **Line:** 418

---

### `VARIABLE` `amPhone`

- **Line:** 419

---

### `VARIABLE` `amNameTrimmed`

- **Line:** 423

---

### `VARIABLE` `userDocById`

- **Line:** 424

---

### `VARIABLE` `matchedUser`

- **Line:** 425
- **Signature:** `any`

---

### `VARIABLE` `usersSnap`

- **Line:** 428

---

### `VARIABLE` `targetLower`

- **Line:** 429

---

### `VARIABLE` `foundDoc`

- **Line:** 430

---

### `VARIABLE` `uData`

- **Line:** 431

---

### `VARIABLE` `fullName`

- **Line:** 432

---

### `VARIABLE` `displayName`

- **Line:** 433

---

### `VARIABLE` `name`

- **Line:** 434

---

### `VARIABLE` `email`

- **Line:** 435

---

### `VARIABLE` `trialsRemaining`

- **Line:** 456

---

### `VARIABLE` `jobsSnap`

- **Line:** 463

---

### `VARIABLE` `validJobsCount`

- **Line:** 465

---

### `VARIABLE` `st`

- **Line:** 466

---

### `VARIABLE` `franchiseeName`

- **Line:** 477

---

### `VARIABLE` `franchiseeMainContact`

- **Line:** 478

---

### `VARIABLE` `franchiseeEmail`

- **Line:** 479

---

### `VARIABLE` `franchiseeMobile`

- **Line:** 480

---

### `VARIABLE` `franchiseeData`

- **Line:** 482
- **Signature:** `any`

---

### `VARIABLE` `fIdStr`

- **Line:** 484

---

### `VARIABLE` `franDoc`

- **Line:** 485

---

### `VARIABLE` `franSnap1`

- **Line:** 489

---

### `VARIABLE` `franSnap2`

- **Line:** 493

---

### `VARIABLE` `franSnap`

- **Line:** 501

---

### `VARIABLE` `scfLink`

- **Line:** 516

---

### `VARIABLE` `sofLink`

- **Line:** 517

---

### `VARIABLE` `localMileLink`

- **Line:** 518

---

### `VARIABLE` `placeholderCtx`

- **Line:** 520

---

### `VARIABLE` `templateId`

- **Line:** 549

---

### `VARIABLE` `templateDoc`

- **Line:** 562

---

### `VARIABLE` `templateData`

- **Line:** 576

---

### `VARIABLE` `bodyHtml`

- **Line:** 577

---

### `VARIABLE` `subject`

- **Line:** 578

---

### `VARIABLE` `actionNodes`

- **Line:** 585

---

### `VARIABLE` `baseUrl`

- **Line:** 586

---

### `VARIABLE` `urlObj`

- **Line:** 588

---

### `VARIABLE` `actConfig`

- **Line:** 596

---

### `VARIABLE` `buttonTag`

- **Line:** 597

---

### `VARIABLE` `triggerUrl`

- **Line:** 598

---

### `VARIABLE` `sender`

- **Line:** 604

---

### `VARIABLE` `fromEmailMode`

- **Line:** 605

---

### `VARIABLE` `fallbackSender`

- **Line:** 609

---

### `VARIABLE` `manager`

- **Line:** 610

---

### `VARIABLE` `sendResult`

- **Line:** 639

---

### `VARIABLE` `smsMessage`

- **Line:** 678

---

### `VARIABLE` `smsTemplateDoc`

- **Line:** 682

---

### `VARIABLE` `templateData`

- **Line:** 684

---

### `VARIABLE` `sendResult`

- **Line:** 708

---

### `VARIABLE` `nextEdge`

- **Line:** 739

---

### `VARIABLE` `config`

- **Line:** 766

---

### `VARIABLE` `updates`

- **Line:** 769
- **Signature:** `Record<string, any>`

---

### `VARIABLE` `logs`

- **Line:** 770

---

### `VARIABLE` `contactsSnap`

- **Line:** 799

---

### `VARIABLE` `localMileContact`

- **Line:** 801

---

### `VARIABLE` `response`

- **Line:** 803

---

