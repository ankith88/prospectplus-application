# Module: `src/lib/australian-holidays.ts`

- **Language:** TypeScript
- **Total Lines:** 133
- **Direct Dependencies:** 1 modules imported

## Overview
Utility functions for Australian (Sydney, NSW) Public Holidays and Weekend calculations.

## Exported Symbols & API

### `FUNCTION` `getEasterSunday`

> Calculates Easter Sunday for a given year using Meeus/Jones/Butcher algorithm.

- **Line:** 9
- **Returns:** `Date`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `year` | `number` | **Yes** | - | - |

---

### `VARIABLE` `a`

- **Line:** 10

---

### `VARIABLE` `b`

- **Line:** 11

---

### `VARIABLE` `c`

- **Line:** 12

---

### `VARIABLE` `d`

- **Line:** 13

---

### `VARIABLE` `e`

- **Line:** 14

---

### `VARIABLE` `f`

- **Line:** 15

---

### `VARIABLE` `g`

- **Line:** 16

---

### `VARIABLE` `h`

- **Line:** 17

---

### `VARIABLE` `i`

- **Line:** 18

---

### `VARIABLE` `k`

- **Line:** 19

---

### `VARIABLE` `L`

- **Line:** 20

---

### `VARIABLE` `m`

- **Line:** 21

---

### `VARIABLE` `month`

- **Line:** 22

---

### `VARIABLE` `day`

- **Line:** 23

---

### `FUNCTION` `getNthWeekdayOfMonth`

> Gets the Nth occurrence of a specific weekday in a given month.

- **Line:** 31
- **Returns:** `Date`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `year` | `number` | **Yes** | - | - |
| `month` | `number` | **Yes** | - | - |
| `weekday` | `number` | **Yes** | - | - |
| `n` | `number` | **Yes** | - | - |

---

### `VARIABLE` `count`

- **Line:** 32

---

### `VARIABLE` `d`

- **Line:** 34

---

### `FUNCTION` `getSydneyPublicHolidays`

> Returns a list of formatted 'yyyy-MM-dd' strings representing all Sydney (NSW) public holidays for a given year.

- **Line:** 47
- **Returns:** `string[]`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `year` | `number` | **Yes** | - | - |

---

### `VARIABLE` `holidays`

- **Line:** 48
- **Signature:** `Date[]`

---

### `VARIABLE` `newYear`

- **Line:** 51

---

### `VARIABLE` `australiaDay`

- **Line:** 57

---

### `VARIABLE` `easterSunday`

- **Line:** 63

---

### `VARIABLE` `goodFriday`

- **Line:** 64

---

### `VARIABLE` `easterSaturday`

- **Line:** 66

---

### `VARIABLE` `easterMonday`

- **Line:** 68

---

### `VARIABLE` `anzacDay`

- **Line:** 74

---

### `VARIABLE` `kingsBirthday`

- **Line:** 78

---

### `VARIABLE` `labourDay`

- **Line:** 82

---

### `VARIABLE` `christmas`

- **Line:** 86

---

### `VARIABLE` `boxingDay`

- **Line:** 87

---

### `FUNCTION` `isWeekend`

> Checks if a given date falls on a weekend (Saturday or Sunday).

- **Line:** 112
- **Returns:** `boolean`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `date` | `Date` | **Yes** | - | - |

---

### `VARIABLE` `day`

- **Line:** 113

---

### `FUNCTION` `isSydneyPublicHoliday`

> Checks if a given date is a Sydney (NSW), Australia public holiday.

- **Line:** 120
- **Returns:** `boolean`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `date` | `Date` | **Yes** | - | - |

---

### `VARIABLE` `year`

- **Line:** 121

---

### `VARIABLE` `dateStr`

- **Line:** 122

---

### `VARIABLE` `sydneyHolidays`

- **Line:** 123

---

### `FUNCTION` `isWeekendOrPublicHoliday`

> Checks if a given date is non-bookable (weekend or Sydney public holiday).

- **Line:** 130
- **Returns:** `boolean`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `date` | `Date` | **Yes** | - | - |

---

