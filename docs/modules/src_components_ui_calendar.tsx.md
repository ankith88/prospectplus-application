# Module: `src/components/ui/calendar.tsx`

- **Language:** TypeScript
- **Total Lines:** 164
- **Direct Dependencies:** 6 modules imported

## Exported Symbols & API

### `FUNCTION` `Calendar`

- **Line:** 19
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{
  className,
  classNames,
  showOutsideDays = true,
  buttonVariant = "ghost",
  ...props
}` | `React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: VariantProps<typeof buttonVariants>["variant"]
}` | **Yes** | - | - |

---

### `VARIABLE` `defaultClassNames`

- **Line:** 28

---

### `VARIABLE` `Icon`

- **Line:** 120

---

### `FUNCTION` `CalendarDayButton`

- **Line:** 140
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{
  className,
  variant,
  ...props
}` | `React.ComponentProps<typeof DayButton> & {
  variant?: VariantProps<typeof buttonVariants>["variant"]
}` | **Yes** | - | - |

---

