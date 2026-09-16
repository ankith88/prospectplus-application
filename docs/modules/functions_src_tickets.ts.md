# Module: `functions/src/tickets.ts`

- **Language:** TypeScript
- **Total Lines:** 652
- **Direct Dependencies:** 3 modules imported

## Exported Symbols & API

### `VARIABLE` `SENDER_EMAIL`

- **Line:** 6

---

### `VARIABLE` `EMAIL_TEMPLATES`

- **Line:** 10

---

### `VARIABLE` `firstName`

- **Line:** 14

---

### `VARIABLE` `firstName`

- **Line:** 44

---

### `VARIABLE` `firstName`

- **Line:** 66

---

### `VARIABLE` `onTicketCreated`

> 1. Ticket created (web form or agent) -> Send welcome / receipt email to customer

- **Line:** 145

---

### `VARIABLE` `ticketData`

- **Line:** 149

---

### `VARIABLE` `ticketId`

- **Line:** 150

---

### `VARIABLE` `recipient`

- **Line:** 158

---

### `VARIABLE` `customerName`

- **Line:** 165

---

### `VARIABLE` `enquiryType`

- **Line:** 166

---

### `VARIABLE` `barcode`

- **Line:** 167

---

### `VARIABLE` `displayTicketId`

- **Line:** 168

---

### `VARIABLE` `mailOptions`

- **Line:** 170

---

### `VARIABLE` `result`

- **Line:** 178

---

### `VARIABLE` `onTicketUpdated`

> 2. Status-based triggers, Missed Sweep, and Movement notifications on update

- **Line:** 187

---

### `VARIABLE` `beforeData`

- **Line:** 191

---

### `VARIABLE` `afterData`

- **Line:** 192

---

### `VARIABLE` `ticketId`

- **Line:** 193

---

### `VARIABLE` `displayTicketId`

- **Line:** 194

---

### `VARIABLE` `db`

- **Line:** 195

---

### `VARIABLE` `beforeScans`

- **Line:** 197

---

### `VARIABLE` `afterScans`

- **Line:** 198

---

### `VARIABLE` `recipient`

- **Line:** 202

---

### `VARIABLE` `customerName`

- **Line:** 203

---

### `VARIABLE` `whatWeNeed`

- **Line:** 209

---

### `VARIABLE` `barcode`

- **Line:** 222

---

### `VARIABLE` `depot`

- **Line:** 223

---

### `VARIABLE` `latestScan`

- **Line:** 224

---

### `VARIABLE` `scanEvent`

- **Line:** 225

---

### `VARIABLE` `location`

- **Line:** 226

---

### `VARIABLE` `time`

- **Line:** 227

---

### `VARIABLE` `opsEmail`

- **Line:** 229

---

### `VARIABLE` `assignedUser`

- **Line:** 243

---

### `VARIABLE` `usersSnap`

- **Line:** 246

---

### `VARIABLE` `matchedUser`

- **Line:** 247

---

### `VARIABLE` `data`

- **Line:** 248

---

### `VARIABLE` `fullName`

- **Line:** 249

---

### `VARIABLE` `userData`

- **Line:** 253

---

### `VARIABLE` `agentEmail`

- **Line:** 254

---

### `VARIABLE` `latestScan`

- **Line:** 256

---

### `VARIABLE` `parentId`

- **Line:** 275

---

### `VARIABLE` `sisterTicketsSnap`

- **Line:** 279

---

### `VARIABLE` `childTickets`

- **Line:** 283

---

### `VARIABLE` `resolvedStatuses`

- **Line:** 286

---

### `VARIABLE` `allResolved`

- **Line:** 287

---

### `VARIABLE` `parentDocRef`

- **Line:** 289

---

### `VARIABLE` `parentDoc`

- **Line:** 290

---

### `VARIABLE` `parentData`

- **Line:** 293

---

### `VARIABLE` `currentParentStatus`

- **Line:** 295

---

### `VARIABLE` `checkFollowUpReminders`

> 3. Scheduled Check: Follow-up date reached (runs daily at 8:00 AM Sydney time)

- **Line:** 317

---

### `VARIABLE` `db`

- **Line:** 322

---

### `VARIABLE` `todayStr`

- **Line:** 323

---

### `VARIABLE` `ticketsSnap`

- **Line:** 327

---

### `VARIABLE` `data`

- **Line:** 332

---

### `VARIABLE` `followUp`

- **Line:** 333

---

### `VARIABLE` `assignedUser`

- **Line:** 336

---

### `VARIABLE` `usersSnap`

- **Line:** 338

---

### `VARIABLE` `matchedUser`

- **Line:** 339

---

### `VARIABLE` `data`

- **Line:** 340

---

### `VARIABLE` `fullName`

- **Line:** 341

---

### `VARIABLE` `userData`

- **Line:** 345

---

### `VARIABLE` `agentEmail`

- **Line:** 346

---

### `VARIABLE` `displayTicketId`

- **Line:** 348

---

### `VARIABLE` `customer`

- **Line:** 350

---

### `VARIABLE` `issueSummary`

- **Line:** 351

---

### `VARIABLE` `checkSlaEscalations`

> 4. Scheduled Check: Ticket SLA breaches (runs every 30 minutes)

- **Line:** 368

---

### `VARIABLE` `db`

- **Line:** 372

---

### `VARIABLE` `SLA_LIMIT_MS`

- **Line:** 376

---

### `VARIABLE` `now`

- **Line:** 377

---

### `VARIABLE` `ticketsSnap`

- **Line:** 381

---

### `VARIABLE` `data`

- **Line:** 386

---

### `VARIABLE` `createdAt`

- **Line:** 387

---

### `VARIABLE` `teamLeadEmail`

- **Line:** 390

---

### `VARIABLE` `displayTicketId`

- **Line:** 391

---

### `VARIABLE` `priority`

- **Line:** 394

---

### `VARIABLE` `agent`

- **Line:** 395

---

### `VARIABLE` `customer`

- **Line:** 396

---

### `VARIABLE` `result`

- **Line:** 398

---

### `FUNCTION` `runTicketsReport`

> Core logic to generate daily tickets report grouped by source, build email, and dispatch it.

- **Line:** 416
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

- **Line:** 417

---

### `VARIABLE` `targetStart`

- **Line:** 423

---

### `VARIABLE` `targetEnd`

- **Line:** 424

---

### `VARIABLE` `threeDaysAgo`

- **Line:** 427

---

### `VARIABLE` `snapshot`

- **Line:** 430

---

### `VARIABLE` `tickets`

- **Line:** 434

---

### `VARIABLE` `snapshotTS`

- **Line:** 437

---

### `VARIABLE` `ticketsTS`

- **Line:** 441

---

### `VARIABLE` `allTicketsMap`

- **Line:** 444

---

### `VARIABLE` `allTickets`

- **Line:** 447

---

### `VARIABLE` `filteredTickets`

- **Line:** 450

---

### `VARIABLE` `createdDate`

- **Line:** 452
- **Signature:** `Date`

---

### `VARIABLE` `sourceCounts`

- **Line:** 464
- **Signature:** `Record<string, number>`

---

### `VARIABLE` `source`

- **Line:** 466

---

### `VARIABLE` `sourceReport`

- **Line:** 477

---

### `VARIABLE` `sourceRowsHtml`

- **Line:** 482

---

### `VARIABLE` `emailHtml`

- **Line:** 490

---

### `VARIABLE` `toStr`

- **Line:** 558

---

### `VARIABLE` `result`

- **Line:** 559

---

### `VARIABLE` `sendDailyTicketsReport`

> Scheduled Cloud Function that runs daily at 6:30 AM Sydney time.

- **Line:** 577

---

### `VARIABLE` `db`

- **Line:** 584

---

### `VARIABLE` `recipients`

- **Line:** 585

---

### `VARIABLE` `frequency`

- **Line:** 586

---

### `VARIABLE` `fromAddress`

- **Line:** 587

---

### `VARIABLE` `configDoc`

- **Line:** 590

---

### `VARIABLE` `data`

- **Line:** 592

---

### `VARIABLE` `sydneyHourStr`

- **Line:** 615

---

### `VARIABLE` `currentHour`

- **Line:** 621

---

### `VARIABLE` `targetHour`

- **Line:** 622

---

### `VARIABLE` `sydneyFormatter`

- **Line:** 629

---

### `VARIABLE` `now`

- **Line:** 636

---

### `VARIABLE` `parts`

- **Line:** 639

---

### `VARIABLE` `day`

- **Line:** 640

---

### `VARIABLE` `month`

- **Line:** 641

---

### `VARIABLE` `year`

- **Line:** 642

---

### `VARIABLE` `dateString`

- **Line:** 644

---

