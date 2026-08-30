"use client";

import { Control } from "react-hook-form";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { NewEventFormData } from "@/schemas";

interface Props {
  control: Control<NewEventFormData>;
  variant?: "dark" | "light";
}

export function ThankYouMessageField({ control, variant = "dark" }: Props) {
  const isDark = variant === "dark";
  return (
    <FormField
      control={control}
      name="thankYouMessage"
      render={({ field }) => (
        <FormItem>
          <FormLabel className={isDark ? "text-white" : undefined}>
            Thank-you message for tippers
          </FormLabel>
          <FormDescription className={isDark ? "text-white/70" : undefined}>
            Sent after each successful tip. Placeholders: {"{amount}"},{" "}
            {"{character}"}, {"{tippedAt}"}, {"{hostFirstName}"},{" "}
            {"{creatorPageUrl}"}, {"{communityName}"}, {"{communityPageUrl}"}.
          </FormDescription>
          <FormControl>
            <Textarea
              {...field}
              value={field.value ?? ""}
              rows={4}
              className={
                isDark
                  ? "border-white/30 bg-black/25 text-white"
                  : undefined
              }
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
