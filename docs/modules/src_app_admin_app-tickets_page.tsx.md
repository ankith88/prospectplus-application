# Module: `src/app/admin/app-tickets/page.tsx`

- **Language:** TypeScript
- **Total Lines:** 1665
- **Direct Dependencies:** 18 modules imported

## Exported Symbols & API

### `INTERFACE` `AppTicket`

- **Line:** 60

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | No | - |
| `title` | `string` | No | - |
| `type` | `"feature" | "bug" | "issue" | "feedback"` | No | - |
| `platform` | `"ProspectPlus" | "LocalMile.Plus" | "LPO.Plus" | "Website"` | Yes | - |
| `description` | `string` | No | - |
| `status` | `"open" | "planned" | "in_progress" | "testing" | "completed" | "declined" | "waiting_on_user"` | No | - |
| `createdBy` | `string` | No | - |
| `createdByName` | `string` | No | - |
| `createdByEmail` | `string` | No | - |
| `assignedToUid` | `string` | Yes | - |
| `assignedToName` | `string` | Yes | - |
| `assignedToEmail` | `string` | Yes | - |
| `createdAt` | `any` | No | - |
| `updatedAt` | `any` | Yes | - |
| `attachments` | `{ name: string; url: string }[]` | Yes | - |
| `adminNotes` | `string` | Yes | - |
| `githubIssue` | `string` | Yes | - |
| `commitHash` | `string` | Yes | - |
| `branchName` | `string` | Yes | - |
| `history` | `{
    status: AppTicket["status"];
    note: string;
    updatedAt: string;
    updatedByName: string;
    role?: "admin" | "user";
    emailSent?: boolean;
    attachments?: { name: string; url: string }[];
  }[]` | Yes | - |

---

### `FUNCTION` `AdminAppTicketsPage`

- **Line:** 91
- **Returns:** `void`

---

### `VARIABLE` `router`

- **Line:** 93

---

### `VARIABLE` `superAdminsList`

- **Line:** 141

---

### `VARIABLE` `isExplicitSuperAdmin`

- **Line:** 143

---

### `VARIABLE` `isAuthorized`

- **Line:** 161

---

### `VARIABLE` `q`

- **Line:** 167

---

### `VARIABLE` `unsubscribe`

- **Line:** 168

---

### `VARIABLE` `ticketsData`

- **Line:** 169

---

### `FUNCTION` `handleOpenEdit`

- **Line:** 183

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `ticket` | `AppTicket` | **Yes** | - | - |

---

### `FUNCTION` `handleAdminFileUpload`

- **Line:** 207
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `event` | `React.ChangeEvent<HTMLInputElement>` | **Yes** | - | - |

---

### `VARIABLE` `files`

- **Line:** 209

---

### `VARIABLE` `newAttachments`

- **Line:** 213

---

### `VARIABLE` `file`

- **Line:** 217

---

### `VARIABLE` `storageRef`

- **Line:** 218

---

### `VARIABLE` `url`

- **Line:** 220

---

### `FUNCTION` `removeAdminAttachment`

- **Line:** 234

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `index` | `number` | **Yes** | - | - |

---

### `VARIABLE` `newAttachments`

- **Line:** 235

---

### `FUNCTION` `handleSaveChanges`

- **Line:** 240
- **Async:** Yes

---

### `VARIABLE` `ticketRef`

- **Line:** 249

---

### `VARIABLE` `newHistoryItem`

- **Line:** 251

---

### `VARIABLE` `updatedHistory`

- **Line:** 260

---

### `VARIABLE` `isReassigned`

- **Line:** 261

---

### `VARIABLE` `origin`

- **Line:** 283

---

### `VARIABLE` `emailHtml`

- **Line:** 284

---

### `VARIABLE` `statusLabelMap`

- **Line:** 330
- **Signature:** `Record<string, string>`

---

### `VARIABLE` `statusColorMap`

- **Line:** 339
- **Signature:** `Record<string, string>`

---

### `VARIABLE` `statusLabel`

- **Line:** 348

---

### `VARIABLE` `statusColor`

- **Line:** 349

---

### `VARIABLE` `isWaiting`

- **Line:** 351

---

### `VARIABLE` `emailHtml`

- **Line:** 373

---

### `VARIABLE` `response`

- **Line:** 399

---

### `VARIABLE` `emailRes`

- **Line:** 413

---

### `FUNCTION` `getStatusBadge`

- **Line:** 435

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `status` | `AppTicket["status"]` | **Yes** | - | - |

---

### `FUNCTION` `getTypeBadge`

- **Line:** 456

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `type` | `AppTicket["type"]` | **Yes** | - | - |

---

### `VARIABLE` `uniqueSubmitters`

- **Line:** 487

---

### `VARIABLE` `map`

- **Line:** 488

---

### `VARIABLE` `filteredTickets`

- **Line:** 503

---

### `VARIABLE` `matchesType`

- **Line:** 504

---

### `VARIABLE` `matchesStatus`

- **Line:** 505

---

### `VARIABLE` `matchesUser`

- **Line:** 506

---

### `VARIABLE` `statusCounts`

- **Line:** 511

---

### `VARIABLE` `statusData`

- **Line:** 516

---

### `VARIABLE` `categoryCounts`

- **Line:** 526

---

### `VARIABLE` `categoryData`

- **Line:** 531

---

### `VARIABLE` `platformCounts`

- **Line:** 539

---

### `VARIABLE` `p`

- **Line:** 540

---

### `VARIABLE` `platformData`

- **Line:** 545

---

### `VARIABLE` `userCounts`

- **Line:** 553

---

### `VARIABLE` `key`

- **Line:** 554

---

### `VARIABLE` `userData`

- **Line:** 559

---

### `VARIABLE` `dateCounts`

- **Line:** 565

---

### `VARIABLE` `date`

- **Line:** 567

---

### `VARIABLE` `dateStr`

- **Line:** 568

---

### `VARIABLE` `dateData`

- **Line:** 575

---

### `VARIABLE` `ticket`

- **Line:** 577

---

### `VARIABLE` `d`

- **Line:** 579

---

### `VARIABLE` `totalTicketsCount`

- **Line:** 595

---

### `VARIABLE` `openTicketsCount`

- **Line:** 596

---

### `VARIABLE` `plannedTicketsCount`

- **Line:** 597

---

### `VARIABLE` `inProgressTicketsCount`

- **Line:** 598

---

### `VARIABLE` `testingTicketsCount`

- **Line:** 599

---

### `VARIABLE` `activeTicketsCount`

- **Line:** 600

---

### `VARIABLE` `completedTicketsCount`

- **Line:** 601

---

### `VARIABLE` `bugTicketsCount`

- **Line:** 602

---

### `VARIABLE` `isActive`

- **Line:** 1090

---

### `VARIABLE` `val`

- **Line:** 1486

---

### `VARIABLE` `query`

- **Line:** 1575

---

### `VARIABLE` `name`

- **Line:** 1576

---

### `VARIABLE` `email`

- **Line:** 1577

---

### `VARIABLE` `uEmail`

- **Line:** 1581

---

### `VARIABLE` `emailSelected`

- **Line:** 1582

---

### `VARIABLE` `emails`

- **Line:** 1589

---

