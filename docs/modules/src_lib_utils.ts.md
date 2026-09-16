# Module: `src/lib/utils.ts`

- **Language:** TypeScript
- **Total Lines:** 653
- **Direct Dependencies:** 3 modules imported

## Exported Symbols & API

### `FUNCTION` `cn`

- **Line:** 10
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `inputs` | `ClassValue[]` | **Yes** | - | - |

---

### `FUNCTION` `safeFormatDate`

- **Line:** 14
- **Returns:** `string`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `dateVal` | `any` | **Yes** | - | - |
| `formatStr` | `string` | No | `'MMM d, yyyy'` | - |

---

### `VARIABLE` `d`

- **Line:** 17
- **Signature:** `Date | null`

---

### `VARIABLE` `cleaned`

- **Line:** 28

---

### `FUNCTION` `getPreviousWorkingDayToTodayRange`

- **Line:** 41
- **Returns:** `{ from: Date; to: Date }`

---

### `VARIABLE` `now`

- **Line:** 42

---

### `VARIABLE` `fromDate`

- **Line:** 43

---

### `FUNCTION` `getQuickDateRange`

- **Line:** 55
- **Returns:** `{ from: Date; to: Date }`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `preset` | `string` | **Yes** | - | - |

---

### `VARIABLE` `now`

- **Line:** 56

---

### `VARIABLE` `normalized`

- **Line:** 57

---

### `VARIABLE` `yesterday`

- **Line:** 63

---

### `VARIABLE` `lastWeek`

- **Line:** 76

---

### `VARIABLE` `lastWeek`

- **Line:** 82

---

### `VARIABLE` `lastMonth`

- **Line:** 88

---

### `VARIABLE` `lastMonth`

- **Line:** 94

---

### `VARIABLE` `lastYear`

- **Line:** 102

---

### `VARIABLE` `start`

- **Line:** 107

---

### `VARIABLE` `start`

- **Line:** 112

---

### `FUNCTION` `isOutsideOfficeHours`

> Checks if a given date is outside of standard office hours (9 AM - 5 PM AEST, Mon-Fri).
AEST is UTC+10 (using Australia/Brisbane as it doesn't observe Daylight Saving).

- **Line:** 125
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `date` | `Date` | **Yes** | - | - |

---

### `VARIABLE` `options`

- **Line:** 126
- **Signature:** `Intl.DateTimeFormatOptions`

---

### `VARIABLE` `formatter`

- **Line:** 133

---

### `VARIABLE` `parts`

- **Line:** 134

---

### `VARIABLE` `hourPart`

- **Line:** 136

---

### `VARIABLE` `weekdayPart`

- **Line:** 137

---

### `VARIABLE` `hour`

- **Line:** 141

---

### `VARIABLE` `isWeekend`

- **Line:** 142

---

### `VARIABLE` `isOutsideTime`

- **Line:** 143

---

### `FUNCTION` `formatInTimezone`

> Formats a date in a specific timezone, defaulting to Australia/Sydney.

- **Line:** 151
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `date` | `Date | string | undefined` | **Yes** | - | - |
| `timezone` | `string | undefined` | **Yes** | - | - |
| `options` | `Intl.DateTimeFormatOptions | 'PP' | 'PPP' | 'PPpp' | 'yyyy-MM-dd' | 'HH:mm' | 'yyyy-MM'` | No | `{ dateStyle: 'medium' }` | - |

---

### `VARIABLE` `d`

- **Line:** 157

---

### `VARIABLE` `tz`

- **Line:** 160

---

### `VARIABLE` `year`

- **Line:** 173

---

### `VARIABLE` `month`

- **Line:** 174

---

### `VARIABLE` `day`

- **Line:** 175

---

### `VARIABLE` `year`

- **Line:** 179

---

### `VARIABLE` `month`

- **Line:** 180

---

### `VARIABLE` `hour`

- **Line:** 184

---

### `VARIABLE` `minute`

- **Line:** 185

---

### `FUNCTION` `parseDateString`

> Safely parses a date string, resolving format variations like DD/MM/YYYY
and cleaning up timezone name suffixes (e.g. "(PDT)", "(AEST)") which
cause standard Date constructor to fail in many browsers (like Safari).

- **Line:** 208
- **Returns:** `Date | null`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `dateVal` | `any` | **Yes** | - | - |

---

### `VARIABLE` `d`

- **Line:** 213

---

### `VARIABLE` `d`

- **Line:** 221

---

### `VARIABLE` `d`

- **Line:** 226

---

### `VARIABLE` `cleaned`

- **Line:** 232

---

### `VARIABLE` `dateTimeParts`

- **Line:** 235

---

### `VARIABLE` `datePart`

- **Line:** 236

---

### `VARIABLE` `dateParts`

- **Line:** 237

---

### `VARIABLE` `fullYear`

- **Line:** 241

---

### `VARIABLE` `date`

- **Line:** 246

---

### `FUNCTION` `getSydneyISOString`

> Returns a date string in Sydney timezone (ISO format with offset).

- **Line:** 255
- **Returns:** `string`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `date` | `Date` | No | `new Date()` | - |

---

### `VARIABLE` `tz`

- **Line:** 256

---

### `VARIABLE` `parts`

- **Line:** 257

---

### `FUNCTION` `getVal`

- **Line:** 268

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `type` | `string` | **Yes** | - | - |

---

### `VARIABLE` `year`

- **Line:** 270

---

### `VARIABLE` `month`

- **Line:** 271

---

### `VARIABLE` `day`

- **Line:** 272

---

### `VARIABLE` `hour`

- **Line:** 273

---

### `VARIABLE` `minute`

- **Line:** 274

---

### `VARIABLE` `second`

- **Line:** 275

---

### `VARIABLE` `tzParts`

- **Line:** 278

---

### `VARIABLE` `offsetVal`

- **Line:** 282

---

### `VARIABLE` `offset`

- **Line:** 283

---

### `FUNCTION` `validateABN`

> Validates an Australian Business Number (ABN) using the official check digit algorithm.

- **Line:** 291
- **Returns:** `boolean`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `abn` | `string` | **Yes** | - | - |

---

### `VARIABLE` `cleanAbn`

- **Line:** 292

---

### `VARIABLE` `weights`

- **Line:** 296

---

### `VARIABLE` `sum`

- **Line:** 297

---

### `VARIABLE` `digit`

- **Line:** 299

---

### `FUNCTION` `isManualActivity`

> Checks whether an activity was manually performed by a user (e.g. manual call, email, meeting, or note)
rather than automatically generated by system background processes, webhooks, or campaigns.

- **Line:** 312
- **Returns:** `boolean`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `act` | `any` | **Yes** | - | - |

---

### `VARIABLE` `source`

- **Line:** 330

---

### `VARIABLE` `author`

- **Line:** 354

---

### `VARIABLE` `noteText`

- **Line:** 384

---

### `FUNCTION` `isManualEmail`

> Checks whether an email was manually sent by a user (excluding marketing campaigns and system senders).

- **Line:** 460
- **Returns:** `boolean`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `email` | `{ campaignId?: string; sender?: string }` | **Yes** | - | - |

---

### `VARIABLE` `senderLower`

- **Line:** 465

---

### `VARIABLE` `isSystemSender`

- **Line:** 466

---

### `FUNCTION` `calculateBusinessHoursSydney`

> Calculates business hours (9:00 AM - 5:00 PM Mon-Fri Sydney time) between two dates.

- **Line:** 485
- **Returns:** `number`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `start` | `Date` | **Yes** | - | - |
| `end` | `Date` | **Yes** | - | - |

---

### `FUNCTION` `getSydneyLocal`

- **Line:** 488
- **Returns:** `Date`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `d` | `Date` | **Yes** | - | - |

---

### `VARIABLE` `formatter`

- **Line:** 489

---

### `VARIABLE` `parts`

- **Line:** 499

---

### `VARIABLE` `partObj`

- **Line:** 500
- **Signature:** `Record<string, string>`

---

### `VARIABLE` `hour`

- **Line:** 504

---

### `VARIABLE` `startSyd`

- **Line:** 515

---

### `VARIABLE` `endSyd`

- **Line:** 516

---

### `VARIABLE` `startDay`

- **Line:** 518

---

### `VARIABLE` `endDay`

- **Line:** 519

---

### `VARIABLE` `msPerDay`

- **Line:** 521

---

### `VARIABLE` `dayOfWeek`

- **Line:** 525

---

### `VARIABLE` `businessStart`

- **Line:** 528

---

### `VARIABLE` `businessEnd`

- **Line:** 530

---

### `VARIABLE` `clampedStart`

- **Line:** 533

---

### `VARIABLE` `clampedEnd`

- **Line:** 534

---

### `VARIABLE` `totalMs`

- **Line:** 539

---

### `VARIABLE` `startDayOfWeek`

- **Line:** 542

---

### `VARIABLE` `businessStart`

- **Line:** 544

---

### `VARIABLE` `businessEnd`

- **Line:** 546

---

### `VARIABLE` `clampedStart`

- **Line:** 549

---

### `VARIABLE` `currentDay`

- **Line:** 554

---

### `VARIABLE` `dayOfWeek`

- **Line:** 556

---

### `VARIABLE` `endDayOfWeek`

- **Line:** 564

---

### `VARIABLE` `businessStart`

- **Line:** 566

---

### `VARIABLE` `businessEnd`

- **Line:** 568

---

### `VARIABLE` `clampedEnd`

- **Line:** 571

---

### `FUNCTION` `getLeadDisplayDateValue`

- **Line:** 578
- **Returns:** `string | undefined`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `lead` | `any` | **Yes** | - | - |

---

### `VARIABLE` `status`

- **Line:** 580

---

### `FUNCTION` `getLeadDisplayDateLabel`

- **Line:** 608
- **Returns:** `string`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `lead` | `any` | **Yes** | - | - |

---

### `VARIABLE` `status`

- **Line:** 610

---

### `FUNCTION` `isScfAcceptedForLead`

> Checks if a lead has an accepted or signed SCF (Service Confirmation Form).

- **Line:** 626
- **Returns:** `boolean`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `lead` | `any` | **Yes** | - | - |

---

### `FUNCTION` `isTestLeadOrCompany`

> Determines if a lead or company is a test entity (e.g. used for testing where company name contains 'test').

- **Line:** 644
- **Returns:** `boolean`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `lead` | `any` | No | - | - |

---

### `VARIABLE` `name`

- **Line:** 647

---

