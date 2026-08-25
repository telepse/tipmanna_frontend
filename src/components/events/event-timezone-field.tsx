"use client";

import type { Control, FieldValues, Path } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  buildEventTimezoneOptions,
  defaultEventTimeZone,
} from "@/lib/event-timezones";

type Props<T extends FieldValues> = {
  control: Control<T>;
  name: Path<T>;
  className?: string;
};

export function EventTimezoneField<T extends FieldValues>({
  control,
  name,
  className,
}: Props<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel>Event timezone</FormLabel>
          <FormControl>
            <select
              className="border-input w-full rounded-md border bg-black/25 px-3 py-2 text-sm"
              value={field.value ?? defaultEventTimeZone()}
              onChange={field.onChange}
            >
              {buildEventTimezoneOptions().map(tz => (
                <option
                  key={tz}
                  value={tz}
                >
                  {tz}
                </option>
              ))}
            </select>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
