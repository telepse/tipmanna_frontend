"use client";

import type { Control } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import type { NewEventFormData } from "@/schemas";
import { EventVideoTypeTagPicker } from "@/components/events/event-video-type-tag-picker";

export function VideoLinksEventVideoTypeField({
  control,
  index,
  label,
}: {
  control: Control<NewEventFormData>;
  index: number;
  label: string;
}) {
  return (
    <FormField
      control={control}
      name={`videoLinks.${index}.eventVideoType`}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-xs font-medium text-white/80">
            {label} video type (Helps people find you on Explore &amp; TV)
          </FormLabel>
          <FormControl>
            <EventVideoTypeTagPicker
              tone="dark"
              value={
                field.value === undefined || field.value === null
                  ? undefined
                  : String(field.value)
              }
              onChange={field.onChange}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
