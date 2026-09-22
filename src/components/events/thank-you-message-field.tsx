"use client";

import { Control, FieldValues, Path } from "react-hook-form";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import {
  describeThankYouRemainder,
  type ThankYouRemainderContext,
} from "@/lib/thank-you-message";

const MAX_LENGTH = 100;

interface Props<T extends FieldValues> {
  control: Control<T>;
  name?: Path<T>;
  variant?: "dark" | "light";
  remainderContext?: ThankYouRemainderContext;
  /** Preserved custom tail from a long stored template (manage-event only). */
  unmatchedTail?: string | null;
}

export function ThankYouMessageField<T extends FieldValues>({
  control,
  name = "thankYouMessage" as Path<T>,
  variant = "dark",
  remainderContext,
  unmatchedTail,
}: Props<T>) {
  const isDark = variant === "dark";
  const remainder = describeThankYouRemainder(remainderContext);

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        const value = field.value ?? "";
        return (
          <FormItem>
            <FormLabel className={isDark ? "text-white" : undefined}>
              Customize your thank-you message
            </FormLabel>
            <FormDescription className={isDark ? "text-white/70" : undefined}>
              People who tip you will receive it.
            </FormDescription>
            <FormControl>
              <div className="space-y-2">
                <Textarea
                  {...field}
                  value={value}
                  rows={3}
                  maxLength={MAX_LENGTH}
                  className={
                    isDark
                      ? "border-white/30 bg-black/25 text-white"
                      : undefined
                  }
                />
                <p
                  className={
                    isDark
                      ? "text-xs text-white/60"
                      : "text-muted-foreground text-xs"
                  }
                >
                  Tippers will also see: {remainder}
                </p>
                {unmatchedTail?.trim() ? (
                  <p
                    className={
                      isDark
                        ? "text-xs text-white/50 italic"
                        : "text-muted-foreground text-xs italic"
                    }
                  >
                    Plus: {unmatchedTail.trim()}
                  </p>
                ) : null}
                <span
                  className={
                    isDark
                      ? "block text-right text-xs text-white/50"
                      : "text-muted-foreground block text-right text-xs"
                  }
                >
                  {value.length}/{MAX_LENGTH} characters
                </span>
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}
