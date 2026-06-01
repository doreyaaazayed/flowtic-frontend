"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, type DropdownProps } from "react-day-picker";

import { cn } from "./utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";

type DropdownOption = { value: string; label: React.ReactNode; disabled?: boolean };

function parseDropdownOptions(children: React.ReactNode): DropdownOption[] {
  return React.Children.toArray(children)
    .filter(React.isValidElement)
    .map((child) => {
      const el = child as React.ReactElement<{
        value?: number | string;
        children?: React.ReactNode;
        disabled?: boolean;
      }>;
      return {
        value: String(el.props.value ?? ""),
        label: el.props.children,
        disabled: el.props.disabled,
      };
    })
    .filter((o) => o.value.length > 0);
}

/** Radix select — avoids native OS year list breaking dark popovers on Windows. */
function CalendarDropdown({ value, onChange, children, name }: DropdownProps) {
  const options = React.useMemo(() => parseDropdownOptions(children), [children]);
  const strValue = String(value);
  const selected = options.find((o) => o.value === strValue);

  return (
    <Select
      value={strValue}
      onValueChange={(next) => {
        onChange?.({
          target: { value: next, name },
        } as React.ChangeEvent<HTMLSelectElement>);
      }}
    >
      <SelectTrigger
        size="sm"
        aria-label={name === "years" ? "Year" : name === "months" ? "Month" : undefined}
        className="h-9 min-w-[5.5rem] max-w-[10rem] border-border bg-background px-2.5 text-sm font-medium shadow-sm"
      >
        <SelectValue placeholder="…">{selected?.label ?? strValue}</SelectValue>
      </SelectTrigger>
      <SelectContent className="max-h-60" position="popper">
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-0 rdp-flowtic", className)}
      classNames={{
        months: "flex flex-col sm:flex-row gap-6",
        month: "flex flex-col gap-4 pb-1 w-full",
        vhidden: "sr-only",
        caption:
          "flex flex-wrap justify-center items-center gap-3 w-full py-3 px-2 border-b border-border/60 bg-muted/30 rounded-t-xl",
        caption_label: "text-sm font-semibold text-foreground",
        caption_dropdowns:
          "flex items-center gap-2 flex-wrap justify-center min-w-0",
        dropdown: "relative inline-flex",
        dropdown_month: "relative inline-flex min-w-[7rem]",
        dropdown_year: "relative inline-flex min-w-[5.5rem]",
        nav: "flex items-center gap-0.5 shrink-0",
        nav_button:
          "inline-flex items-center justify-center size-9 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0",
        nav_button_previous: "",
        nav_button_next: "",
        table: "w-full border-collapse",
        head_row: "flex w-full",
        head_cell:
          "text-muted-foreground flex-1 min-w-0 text-center text-xs font-medium uppercase tracking-wider",
        row: "flex w-full mt-1.5",
        cell: cn(
          "relative flex-1 min-w-0 p-0.5 text-center text-sm focus-within:relative focus-within:z-10",
          props.mode === "range"
            ? "[&:has(>.day-range-end)]:rounded-r-full [&:has(>.day-range-start)]:rounded-l-full first:[&:has([aria-selected])]:rounded-l-full last:[&:has([aria-selected])]:rounded-r-full"
            : "[&:has([aria-selected])]:rounded-full",
        ),
        day: cn(
          "inline-flex items-center justify-center size-10 rounded-full p-0 text-sm font-medium transition-colors",
          "hover:bg-muted/80 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2",
          "aria-selected:opacity-100",
        ),
        day_range_start:
          "day-range-start rounded-full bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
        day_range_end:
          "day-range-end rounded-full bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground rounded-full",
        day_today:
          "bg-muted font-semibold text-foreground ring-1 ring-border rounded-full",
        day_outside:
          "day-outside text-muted-foreground/60 aria-selected:text-muted-foreground/60",
        day_disabled:
          "text-muted-foreground/40 cursor-not-allowed hover:bg-transparent",
        day_range_middle:
          "rounded-none bg-muted/50 text-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        Dropdown: CalendarDropdown,
        IconLeft: ({ className, ...iconProps }) => (
          <ChevronLeft className={cn("size-5", className)} {...iconProps} />
        ),
        IconRight: ({ className, ...iconProps }) => (
          <ChevronRight className={cn("size-5", className)} {...iconProps} />
        ),
        ...components,
      }}
      {...props}
    />
  );
}

export { Calendar };
