"use client"

import * as React from "react"
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react"
import {
  DayPicker,
  getDefaultClassNames,
  DayButton,
} from "react-day-picker"
import { type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  buttonVariant = "ghost",
  ...props
}: React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: VariantProps<typeof buttonVariants>["variant"]
}) {
  const defaultClassNames = getDefaultClassNames()

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3 select-none", className)}
      classNames={{
        months: cn(
          "flex flex-col sm:flex-row gap-4 sm:gap-6",
          defaultClassNames.months
        ),
        month: cn("flex flex-col gap-3 max-w-full", defaultClassNames.month),
        month_caption: cn(
          "flex justify-center pt-1 relative items-center h-9",
          defaultClassNames.month_caption
        ),
        caption_label: cn(
          "text-sm font-semibold text-foreground",
          defaultClassNames.caption_label
        ),
        nav: cn(
          "flex items-center gap-1",
          defaultClassNames.nav
        ),
        button_previous: cn(
          buttonVariants({ variant: "outline", size: "icon" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 absolute left-1 top-1 z-10",
          defaultClassNames.button_previous
        ),
        button_next: cn(
          buttonVariants({ variant: "outline", size: "icon" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 absolute right-1 top-1 z-10",
          defaultClassNames.button_next
        ),
        table: "w-full border-collapse space-y-1",
        weekdays: cn("flex justify-between", defaultClassNames.weekdays),
        weekday: cn(
          "h-8 w-8 sm:h-9 sm:w-9 flex items-center justify-center rounded-md text-[0.8rem] font-medium text-muted-foreground select-none",
          defaultClassNames.weekday
        ),
        week: cn("mt-1 flex w-full justify-between", defaultClassNames.week),
        week_number_header: cn(
          "w-8 sm:w-9 select-none",
          defaultClassNames.week_number_header
        ),
        week_number: cn(
          "text-[0.8rem] text-muted-foreground select-none",
          defaultClassNames.week_number
        ),
        day: cn(
          "group/day relative h-8 w-8 sm:h-9 sm:w-9 p-0 text-center text-sm select-none [&:last-child[data-selected=true]_button]:rounded-r-md",
          props.showWeekNumber
            ? "[&:nth-child(2)[data-selected=true]_button]:rounded-l-md"
            : "[&:first-child[data-selected=true]_button]:rounded-l-md",
          defaultClassNames.day
        ),
        range_start: cn(
          "relative isolate z-0 rounded-l-md bg-muted after:absolute after:inset-y-0 after:right-0 after:w-4 after:bg-muted",
          defaultClassNames.range_start
        ),
        range_middle: cn("rounded-none", defaultClassNames.range_middle),
        range_end: cn(
          "relative isolate z-0 rounded-r-md bg-muted after:absolute after:inset-y-0 after:left-0 after:w-4 after:bg-muted",
          defaultClassNames.range_end
        ),
        today: cn(
          "rounded-md bg-muted text-foreground data-[selected=true]:rounded-none",
          defaultClassNames.today
        ),
        outside: cn(
          "text-muted-foreground opacity-50 aria-selected:text-muted-foreground",
          defaultClassNames.outside
        ),
        disabled: cn(
          "text-muted-foreground opacity-50",
          defaultClassNames.disabled
        ),
        hidden: cn("invisible", defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Root: ({ className, rootRef, ...props }) => {
          return (
            <div
              data-slot="calendar"
              ref={rootRef}
              className={cn("max-w-full overflow-x-auto", className)}
              {...props}
            />
          )
        },
        Chevron: ({ orientation }) => {
          const Icon =
            orientation === "left"
              ? ChevronLeftIcon
              : orientation === "right"
                ? ChevronRightIcon
                : ChevronDownIcon
          return <Icon className="h-4 w-4" />
        },
        DayButton: (props) => (
          <CalendarDayButton
            variant={buttonVariant}
            {...props}
          />
        ),
      }}
      {...props}
    />
  )
}

function CalendarDayButton({
  className,
  variant,
  ...props
}: React.ComponentProps<typeof DayButton> & {
  variant?: VariantProps<typeof buttonVariants>["variant"]
}) {
  return (
    <DayButton
      data-slot="calendar-day-button"
      className={cn(
        buttonVariants({ variant, size: "icon" }),
        "h-8 w-8 sm:h-9 sm:w-9 p-0 font-normal transition-none active:scale-100 min-w-0 data-[selected=true]:bg-primary data-[selected=true]:text-primary-foreground data-[selected=true]:opacity-100 data-[today=true]:not-data-[selected=true]:bg-accent data-[today=true]:not-data-[selected=true]:text-accent-foreground text-xs sm:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Calendar, CalendarDayButton }
