# Module: `src/app/app-tickets/page.tsx`

- **Language:** TypeScript
- **Total Lines:** 1682
- **Direct Dependencies:** 17 modules imported

## Exported Symbols & API

### `INTERFACE` `AppTicket`

- **Line:** 58

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

### `FUNCTION` `AppTicketsPage`

- **Line:** 86
- **Returns:** `void`

---

### `VARIABLE` `router`

- **Line:** 88

---

### `VARIABLE` `searchParams`

- **Line:** 89

---

### `VARIABLE` `ticketId`

- **Line:** 90

---

### `FUNCTION` `handleReplyFileUpload`

- **Line:** 119
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `event` | `React.ChangeEvent<HTMLInputElement>` | **Yes** | - | - |

---

### `VARIABLE` `targetTicket`

- **Line:** 120

---

### `VARIABLE` `files`

- **Line:** 122

---

### `VARIABLE` `newAttachments`

- **Line:** 126

---

### `VARIABLE` `file`

- **Line:** 130

---

### `VARIABLE` `storageRef`

- **Line:** 131

---

### `VARIABLE` `url`

- **Line:** 133

---

### `FUNCTION` `removeReplyAttachment`

- **Line:** 147

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `index` | `number` | **Yes** | - | - |

---

### `VARIABLE` `updated`

- **Line:** 148

---

### `FUNCTION` `handleSendReply`

- **Line:** 153
- **Async:** Yes

---

### `VARIABLE` `targetTicket`

- **Line:** 154

---

### `VARIABLE` `ticketRef`

- **Line:** 162

---

### `VARIABLE` `newStatus`

- **Line:** 165
- **Signature:** `AppTicket["status"]`

---

### `VARIABLE` `newHistoryItem`

- **Line:** 167

---

### `VARIABLE` `updatedHistory`

- **Line:** 177

---

### `VARIABLE` `adminEmail`

- **Line:** 186

---

### `VARIABLE` `origin`

- **Line:** 187

---

### `VARIABLE` `emailHtml`

- **Line:** 189

---

### `FUNCTION` `canEditTicket`

- **Line:** 242

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `ticket` | `AppTicket` | **Yes** | - | - |

---

### `FUNCTION` `handleOpenEdit`

- **Line:** 252

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `ticket` | `AppTicket` | **Yes** | - | - |

---

### `FUNCTION` `handleEditFileUpload`

- **Line:** 261
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `event` | `React.ChangeEvent<HTMLInputElement>` | **Yes** | - | - |

---

### `VARIABLE` `files`

- **Line:** 263

---

### `VARIABLE` `newAttachments`

- **Line:** 267

---

### `VARIABLE` `file`

- **Line:** 271

---

### `VARIABLE` `storageRef`

- **Line:** 272

---

### `VARIABLE` `url`

- **Line:** 274

---

### `FUNCTION` `removeEditAttachment`

- **Line:** 288

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `index` | `number` | **Yes** | - | - |

---

### `VARIABLE` `newAttachments`

- **Line:** 289

---

### `FUNCTION` `handleSaveEdit`

- **Line:** 294
- **Async:** Yes

---

### `VARIABLE` `ticketRef`

- **Line:** 303

---

### `VARIABLE` `q`

- **Line:** 344

---

### `VARIABLE` `unsubscribe`

- **Line:** 345

---

### `VARIABLE` `ticketsData`

- **Line:** 346

---

### `VARIABLE` `found`

- **Line:** 362

---

### `FUNCTION` `getStatusBadge`

- **Line:** 369

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `status` | `AppTicket["status"]` | **Yes** | - | - |

---

### `FUNCTION` `getTypeBadge`

- **Line:** 390

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `type` | `AppTicket["type"]` | **Yes** | - | - |

---

### `VARIABLE` `openTicketsCount`

- **Line:** 422

---

### `VARIABLE` `waitingTicketsCount`

- **Line:** 423

---

### `VARIABLE` `plannedTicketsCount`

- **Line:** 424

---

### `VARIABLE` `inProgressTicketsCount`

- **Line:** 425

---

### `VARIABLE` `testingTicketsCount`

- **Line:** 426

---

### `VARIABLE` `completedTicketsCount`

- **Line:** 427

---

### `VARIABLE` `declinedTicketsCount`

- **Line:** 428

---

### `VARIABLE` `activeTicketsCount`

- **Line:** 430

---

### `VARIABLE` `resolutionRate`

- **Line:** 431

---

### `VARIABLE` `statusData`

- **Line:** 434

---

### `VARIABLE` `categoryCounts`

- **Line:** 444

---

### `VARIABLE` `key`

- **Line:** 445

---

### `VARIABLE` `categoryData`

- **Line:** 450

---

### `VARIABLE` `platformCounts`

- **Line:** 457

---

### `VARIABLE` `p`

- **Line:** 458

---

### `VARIABLE` `platformData`

- **Line:** 463

---

### `VARIABLE` `filteredTickets`

- **Line:** 471

---

### `VARIABLE` `matchesType`

- **Line:** 473

---

### `VARIABLE` `matchesStatus`

- **Line:** 474

---

### `VARIABLE` `matchesPlatform`

- **Line:** 475

---

### `VARIABLE` `queryLower`

- **Line:** 476

---

### `VARIABLE` `matchesSearch`

- **Line:** 477

---

### `FUNCTION` `handleExportCSV`

- **Line:** 488

---

### `VARIABLE` `headers`

- **Line:** 494

---

### `VARIABLE` `rows`

- **Line:** 495

---

### `VARIABLE` `csvContent`

- **Line:** 507

---

### `VARIABLE` `encodedUri`

- **Line:** 508

---

### `VARIABLE` `link`

- **Line:** 509

---

### `VARIABLE` `t`

- **Line:** 1136

---

