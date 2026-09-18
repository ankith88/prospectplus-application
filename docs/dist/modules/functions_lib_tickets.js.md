# Module: `functions/lib/tickets.js`

- **Language:** JavaScript
- **Total Lines:** 627

## Exported Symbols & API

### `VARIABLE` `__createBinding`

- **Line:** 2

---

### `VARIABLE` `desc`

- **Line:** 4

---

### `VARIABLE` `__setModuleDefault`

- **Line:** 13

---

### `VARIABLE` `__importStar`

- **Line:** 18

---

### `FUNCTION` `ownKeys`

- **Line:** 19

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `o` | `any` | **Yes** | - | - |

---

### `VARIABLE` `ar`

- **Line:** 21

---

### `VARIABLE` `result`

- **Line:** 29

---

### `VARIABLE` `functions`

- **Line:** 38

---

### `VARIABLE` `admin`

- **Line:** 39

---

### `VARIABLE` `emailDispatcher_1`

- **Line:** 40

---

### `VARIABLE` `SENDER_EMAIL`

- **Line:** 42

---

### `VARIABLE` `EMAIL_TEMPLATES`

- **Line:** 45

---

### `VARIABLE` `firstName`

- **Line:** 49

---

### `VARIABLE` `firstName`

- **Line:** 79

---

### `VARIABLE` `firstName`

- **Line:** 101

---

### `VARIABLE` `ticketData`

- **Line:** 183

---

### `VARIABLE` `ticketId`

- **Line:** 184

---

### `VARIABLE` `recipient`

- **Line:** 190

---

### `VARIABLE` `customerName`

- **Line:** 195

---

### `VARIABLE` `enquiryType`

- **Line:** 196

---

### `VARIABLE` `barcode`

- **Line:** 197

---

### `VARIABLE` `displayTicketId`

- **Line:** 198

---

### `VARIABLE` `mailOptions`

- **Line:** 199

---

### `VARIABLE` `result`

- **Line:** 206

---

### `VARIABLE` `beforeData`

- **Line:** 218

---

### `VARIABLE` `afterData`

- **Line:** 219

---

### `VARIABLE` `ticketId`

- **Line:** 220

---

### `VARIABLE` `displayTicketId`

- **Line:** 221

---

### `VARIABLE` `db`

- **Line:** 222

---

### `VARIABLE` `beforeScans`

- **Line:** 223

---

### `VARIABLE` `afterScans`

- **Line:** 224

---

### `VARIABLE` `recipient`

- **Line:** 227

---

### `VARIABLE` `customerName`

- **Line:** 228

---

### `VARIABLE` `whatWeNeed`

- **Line:** 233

---

### `VARIABLE` `barcode`

- **Line:** 245

---

### `VARIABLE` `depot`

- **Line:** 246

---

### `VARIABLE` `latestScan`

- **Line:** 247

---

### `VARIABLE` `scanEvent`

- **Line:** 248

---

### `VARIABLE` `location`

- **Line:** 249

---

### `VARIABLE` `time`

- **Line:** 250

---

### `VARIABLE` `opsEmail`

- **Line:** 251

---

### `VARIABLE` `assignedUser`

- **Line:** 263

---

### `VARIABLE` `usersSnap`

- **Line:** 266

---

### `VARIABLE` `matchedUser`

- **Line:** 267

---

### `VARIABLE` `data`

- **Line:** 268

---

### `VARIABLE` `fullName`

- **Line:** 269

---

### `VARIABLE` `userData`

- **Line:** 273

---

### `VARIABLE` `agentEmail`

- **Line:** 274

---

### `VARIABLE` `latestScan`

- **Line:** 276

---

### `VARIABLE` `parentId`

- **Line:** 289

---

### `VARIABLE` `sisterTicketsSnap`

- **Line:** 292

---

### `VARIABLE` `childTickets`

- **Line:** 295

---

### `VARIABLE` `resolvedStatuses`

- **Line:** 297

---

### `VARIABLE` `allResolved`

- **Line:** 298

---

### `VARIABLE` `parentDocRef`

- **Line:** 299

---

### `VARIABLE` `parentDoc`

- **Line:** 300

---

### `VARIABLE` `parentData`

- **Line:** 302

---

### `VARIABLE` `currentParentStatus`

- **Line:** 304

---

### `VARIABLE` `db`

- **Line:** 331

---

### `VARIABLE` `todayStr`

- **Line:** 332

---

### `VARIABLE` `ticketsSnap`

- **Line:** 335

---

### `VARIABLE` `data`

- **Line:** 339

---

### `VARIABLE` `followUp`

- **Line:** 340

---

### `VARIABLE` `assignedUser`

- **Line:** 342

---

### `VARIABLE` `usersSnap`

- **Line:** 344

---

### `VARIABLE` `matchedUser`

- **Line:** 345

---

### `VARIABLE` `data`

- **Line:** 346

---

### `VARIABLE` `fullName`

- **Line:** 347

---

### `VARIABLE` `userData`

- **Line:** 351

---

### `VARIABLE` `agentEmail`

- **Line:** 352

---

### `VARIABLE` `displayTicketId`

- **Line:** 354

---

### `VARIABLE` `customer`

- **Line:** 356

---

### `VARIABLE` `issueSummary`

- **Line:** 357

---

### `VARIABLE` `db`

- **Line:** 377

---

### `VARIABLE` `SLA_LIMIT_MS`

- **Line:** 380

---

### `VARIABLE` `now`

- **Line:** 381

---

### `VARIABLE` `ticketsSnap`

- **Line:** 384

---

### `VARIABLE` `data`

- **Line:** 388

---

### `VARIABLE` `createdAt`

- **Line:** 389

---

### `VARIABLE` `teamLeadEmail`

- **Line:** 391

---

### `VARIABLE` `displayTicketId`

- **Line:** 392

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

- **Line:** 397

---

### `FUNCTION` `runTicketsReport`

> Core logic to generate daily tickets report grouped by source, build email, and dispatch it.

- **Line:** 413
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `dateString` | `any` | **Yes** | - | - |
| `recipients` | `any` | **Yes** | - | - |
| `fromAddress` | `any` | **Yes** | - | - |

---

### `VARIABLE` `db`

- **Line:** 414

---

### `VARIABLE` `targetStart`

- **Line:** 419

---

### `VARIABLE` `targetEnd`

- **Line:** 420

---

### `VARIABLE` `threeDaysAgo`

- **Line:** 422

---

### `VARIABLE` `snapshot`

- **Line:** 424

---

### `VARIABLE` `tickets`

- **Line:** 427

---

### `VARIABLE` `snapshotTS`

- **Line:** 429

---

### `VARIABLE` `ticketsTS`

- **Line:** 432

---

### `VARIABLE` `allTicketsMap`

- **Line:** 434

---

### `VARIABLE` `allTickets`

- **Line:** 437

---

### `VARIABLE` `filteredTickets`

- **Line:** 439

---

### `VARIABLE` `createdDate`

- **Line:** 441

---

### `VARIABLE` `sourceCounts`

- **Line:** 453

---

### `VARIABLE` `source`

- **Line:** 455

---

### `VARIABLE` `sourceReport`

- **Line:** 466

---

### `VARIABLE` `sourceRowsHtml`

- **Line:** 470

---

### `VARIABLE` `emailHtml`

- **Line:** 477

---

### `VARIABLE` `toStr`

- **Line:** 544

---

### `VARIABLE` `result`

- **Line:** 545

---

### `VARIABLE` `db`

- **Line:** 567

---

### `VARIABLE` `recipients`

- **Line:** 568

---

### `VARIABLE` `frequency`

- **Line:** 569

---

### `VARIABLE` `fromAddress`

- **Line:** 570

---

### `VARIABLE` `configDoc`

- **Line:** 572

---

### `VARIABLE` `data`

- **Line:** 574

---

### `VARIABLE` `sydneyHourStr`

- **Line:** 596

---

### `VARIABLE` `currentHour`

- **Line:** 601

---

### `VARIABLE` `targetHour`

- **Line:** 602

---

### `VARIABLE` `sydneyFormatter`

- **Line:** 607

---

### `VARIABLE` `now`

- **Line:** 613

---

### `VARIABLE` `parts`

- **Line:** 615

---

### `VARIABLE` `day`

- **Line:** 616

---

### `VARIABLE` `month`

- **Line:** 617

---

### `VARIABLE` `year`

- **Line:** 618

---

### `VARIABLE` `dateString`

- **Line:** 619

---

