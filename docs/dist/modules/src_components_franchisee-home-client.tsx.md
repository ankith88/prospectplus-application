# Module: `src/components/franchisee-home-client.tsx`

- **Language:** TypeScript
- **Total Lines:** 1857
- **Direct Dependencies:** 24 modules imported

## Exported Symbols & API

### `INTERFACE` `AvailableSlot`

- **Line:** 70

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `start` | `string` | No | - |
| `end` | `string` | No | - |
| `formattedTime` | `string` | No | - |

---

### `FUNCTION` `FranchiseeHomeClient`

- **Line:** 76
- **Returns:** `void`

---

### `VARIABLE` `router`

- **Line:** 77

---

### `VARIABLE` `activeMonthDate`

- **Line:** 89

---

### `VARIABLE` `activeMonthName`

- **Line:** 93

---

### `VARIABLE` `tomorrow`

- **Line:** 102

---

### `VARIABLE` `isFranchiseeRole`

- **Line:** 119

---

### `VARIABLE` `currentFranId`

- **Line:** 124

---

### `VARIABLE` `activeFranName`

- **Line:** 129

---

### `VARIABLE` `linked`

- **Line:** 131

---

### `VARIABLE` `active`

- **Line:** 132

---

### `VARIABLE` `userDisplayName`

- **Line:** 136

---

### `FUNCTION` `refreshAppointments`

- **Line:** 139
- **Async:** Yes

---

### `VARIABLE` `fetchedAppts`

- **Line:** 141

---

### `VARIABLE` `startTimePerf`

- **Line:** 157

---

### `FUNCTION` `loadData`

- **Line:** 158
- **Async:** Yes
- **Returns:** `void`

---

### `VARIABLE` `targetFranchisee`

- **Line:** 162

---

### `VARIABLE` `fetchedLeads`

- **Line:** 166

---

### `VARIABLE` `fetchedAppts`

- **Line:** 171

---

### `VARIABLE` `territoryLeads`

- **Line:** 174

---

### `VARIABLE` `leadFranId`

- **Line:** 176

---

### `VARIABLE` `matchesFranId`

- **Line:** 177

---

### `VARIABLE` `matchesFranName`

- **Line:** 180

---

### `VARIABLE` `duration`

- **Line:** 193

---

### `FUNCTION` `fetchAleynaAvailability`

- **Line:** 206
- **Async:** Yes
- **Returns:** `void`

---

### `VARIABLE` `dateStr`

- **Line:** 210

---

### `VARIABLE` `res`

- **Line:** 211

---

### `VARIABLE` `data`

- **Line:** 212

---

### `VARIABLE` `leadsMap`

- **Line:** 230

---

### `VARIABLE` `territoryLeadIds`

- **Line:** 235

---

### `VARIABLE` `metrics`

- **Line:** 240

---

### `VARIABLE` `total`

- **Line:** 241

---

### `VARIABLE` `quotesSent`

- **Line:** 242

---

### `VARIABLE` `activeTrials`

- **Line:** 245

---

### `VARIABLE` `wonLeads`

- **Line:** 246

---

### `VARIABLE` `targetMonthLeads`

- **Line:** 257

---

### `VARIABLE` `targetYear`

- **Line:** 258

---

### `VARIABLE` `targetMonth`

- **Line:** 259

---

### `VARIABLE` `dateVal`

- **Line:** 261

---

### `VARIABLE` `d`

- **Line:** 263

---

### `VARIABLE` `leadDistribution`

- **Line:** 269

---

### `VARIABLE` `pool`

- **Line:** 270

---

### `VARIABLE` `quoteSentAccepted`

- **Line:** 271

---

### `VARIABLE` `localMileTrial`

- **Line:** 275

---

### `VARIABLE` `shipMateTrial`

- **Line:** 281

---

### `VARIABLE` `workInProgress`

- **Line:** 287

---

### `VARIABLE` `hotPriorityLeads`

- **Line:** 301

---

### `VARIABLE` `newLeads`

- **Line:** 308

---

### `VARIABLE` `currentMonthSnapshot`

- **Line:** 323

---

### `VARIABLE` `targetYear`

- **Line:** 324

---

### `VARIABLE` `targetMonth`

- **Line:** 325

---

### `VARIABLE` `monthName`

- **Line:** 326

---

### `VARIABLE` `pool`

- **Line:** 328

---

### `VARIABLE` `totalLeads`

- **Line:** 329

---

### `VARIABLE` `wonLeads`

- **Line:** 330

---

### `VARIABLE` `inDiscussion`

- **Line:** 331

---

### `VARIABLE` `quotesSent`

- **Line:** 334

---

### `VARIABLE` `conversionRate`

- **Line:** 338

---

### `VARIABLE` `wonLeadsThisMonth`

- **Line:** 351

---

### `VARIABLE` `targetYear`

- **Line:** 352

---

### `VARIABLE` `targetMonth`

- **Line:** 353

---

### `VARIABLE` `statusStr`

- **Line:** 356

---

### `VARIABLE` `custStatusStr`

- **Line:** 357

---

### `VARIABLE` `isWon`

- **Line:** 358

---

### `VARIABLE` `dateVal`

- **Line:** 369

---

### `VARIABLE` `hist`

- **Line:** 376

---

### `VARIABLE` `d`

- **Line:** 387

---

### `VARIABLE` `quotesSentLeads`

- **Line:** 394

---

### `VARIABLE` `targetYear`

- **Line:** 395

---

### `VARIABLE` `targetMonth`

- **Line:** 396

---

### `VARIABLE` `statusStr`

- **Line:** 399

---

### `VARIABLE` `isQuote`

- **Line:** 400

---

### `VARIABLE` `dateVal`

- **Line:** 409

---

### `VARIABLE` `hist`

- **Line:** 416

---

### `VARIABLE` `d`

- **Line:** 427

---

### `VARIABLE` `trialLeads`

- **Line:** 434

---

### `VARIABLE` `targetYear`

- **Line:** 435

---

### `VARIABLE` `targetMonth`

- **Line:** 436

---

### `VARIABLE` `statusStr`

- **Line:** 439

---

### `VARIABLE` `trialTypeStr`

- **Line:** 440

---

### `VARIABLE` `isShipmate`

- **Line:** 441

---

### `VARIABLE` `isLocalmile`

- **Line:** 442

---

### `VARIABLE` `isTrial`

- **Line:** 444

---

### `VARIABLE` `dateVal`

- **Line:** 454

---

### `VARIABLE` `hist`

- **Line:** 461

---

### `VARIABLE` `d`

- **Line:** 474

---

### `VARIABLE` `threeMonthWindowLabel`

- **Line:** 481

---

### `VARIABLE` `franchiseeAppointments`

- **Line:** 487

---

### `VARIABLE` `targetYear`

- **Line:** 488

---

### `VARIABLE` `targetMonth`

- **Line:** 489

---

### `VARIABLE` `startOfTargetMonth`

- **Line:** 490

---

### `VARIABLE` `endOfTargetMonth`

- **Line:** 491

---

### `VARIABLE` `isTerritoryLead`

- **Line:** 494

---

### `VARIABLE` `isAleyna`

- **Line:** 495

---

### `VARIABLE` `isAssignedToUser`

- **Line:** 500

---

### `VARIABLE` `isTerritoryFran`

- **Line:** 504

---

### `VARIABLE` `matchesContext`

- **Line:** 508

---

### `VARIABLE` `rawDate`

- **Line:** 512

---

### `VARIABLE` `apptDate`

- **Line:** 514

---

### `VARIABLE` `scheduledAppts`

- **Line:** 522

---

### `VARIABLE` `pendingAppts`

- **Line:** 531

---

### `VARIABLE` `completedAppts`

- **Line:** 535

---

### `VARIABLE` `noShowAppts`

- **Line:** 539

---

### `VARIABLE` `aleynaAppts`

- **Line:** 546

---

### `VARIABLE` `quickViewItems`

- **Line:** 557

---

### `VARIABLE` `baseList`

- **Line:** 558
- **Signature:** `any[]`

---

### `VARIABLE` `q`

- **Line:** 565

---

### `VARIABLE` `companyName`

- **Line:** 567

---

### `VARIABLE` `contactName`

- **Line:** 568

---

### `VARIABLE` `status`

- **Line:** 569

---

### `VARIABLE` `dayAppointments`

- **Line:** 575

---

### `VARIABLE` `dateStr`

- **Line:** 577

---

### `VARIABLE` `apptDateStr`

- **Line:** 580

---

### `FUNCTION` `renderAppointmentList`

- **Line:** 586

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `list` | `Appointment[]` | **Yes** | - | - |
| `emptyMsg` | `string` | **Yes** | - | - |

---

### `VARIABLE` `rawName`

- **Line:** 608

---

### `VARIABLE` `leadCompanyName`

- **Line:** 609

---

### `VARIABLE` `apptDate`

- **Line:** 614

---

### `VARIABLE` `dateFormatted`

- **Line:** 615

---

### `VARIABLE` `todayStr`

- **Line:** 617

---

### `VARIABLE` `apptStr`

- **Line:** 618

---

### `VARIABLE` `isTeams`

- **Line:** 624

---

### `VARIABLE` `status`

- **Line:** 625

---

### `VARIABLE` `joinUrl`

- **Line:** 626

---

### `VARIABLE` `statusBadgeVariant`

- **Line:** 628
- **Signature:** `'default' | 'secondary' | 'destructive' | 'outline'`

---

### `FUNCTION` `handleConfirmTeamsBooking`

- **Line:** 703
- **Async:** Yes

---

### `VARIABLE` `res`

- **Line:** 711

---

### `VARIABLE` `data`

- **Line:** 735

---

### `FUNCTION` `handleCancelAppointment`

- **Line:** 755
- **Async:** Yes

---

### `VARIABLE` `res`

- **Line:** 759

---

### `VARIABLE` `data`

- **Line:** 771

---

### `VARIABLE` `userFirstName`

- **Line:** 798

---

### `VARIABLE` `rawName`

- **Line:** 981

---

### `VARIABLE` `leadCompanyName`

- **Line:** 982

---

### `VARIABLE` `isTeams`

- **Line:** 986

---

### `VARIABLE` `slotLabel`

- **Line:** 1497

---

### `VARIABLE` `title`

- **Line:** 1594

---

### `VARIABLE` `subtitle`

- **Line:** 1595

---

### `VARIABLE` `icon`

- **Line:** 1596

---

### `VARIABLE` `badgeBg`

- **Line:** 1597

---

### `VARIABLE` `rawName`

- **Line:** 1666

---

### `VARIABLE` `leadCompanyName`

- **Line:** 1667

---

### `VARIABLE` `isTeams`

- **Line:** 1671

---

### `VARIABLE` `status`

- **Line:** 1672

---

### `VARIABLE` `apptDate`

- **Line:** 1674

---

### `VARIABLE` `dateFormatted`

- **Line:** 1675

---

### `VARIABLE` `contactName`

- **Line:** 1725

---

### `VARIABLE` `contactPhone`

- **Line:** 1726

---

### `VARIABLE` `contactEmail`

- **Line:** 1727

---

### `VARIABLE` `location`

- **Line:** 1728

---

