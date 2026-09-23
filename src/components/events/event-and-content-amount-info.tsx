"use client";

import { Control } from "react-hook-form";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PoundSterling } from "lucide-react";
import { ThankYouMessageField } from "@/components/events/thank-you-message-field";
import type { ThankYouRemainderContext } from "@/lib/thank-you-message";

// Local imports
import { NewEventFormData } from "@/schemas";

interface Props {
  control: Control<NewEventFormData>;
  remainderContext?: ThankYouRemainderContext;
}

export const EventAndContentAmountInfo = ({
  control,
  remainderContext,
}: Props) => {
  return (
    <>
      <div className="w-full space-y-6 rounded-lg border-2 border-white bg-black/50 p-6 shadow sm:w-96">
        <h2 className="flex items-center gap-2 font-semibold text-white">
          <PoundSterling /> Enter a target amount to raise
        </h2>

        {/* Amount to Raise */}
        <FormField
          control={control}
          name="amountToRaise"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="relative text-white">
                How much are you anticipating from your event and content?{" "}
                <span className="text-destructive absolute top-0 right-0">
                  *
                </span>
              </FormLabel>
              <FormControl>
                <div className="flex items-center rounded-md border bg-black/25 px-4 text-white">
                  <span>&pound;</span>
                  <Input
                    type="text"
                    placeholder="Enter amount"
                    {...field}
                    onChange={e =>
                      field.onChange(
                        e.target.value === "" ? undefined : +e.target.value
                      )
                    }
                    className="border-0 focus-visible:ring-0"
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <ThankYouMessageField
          control={control}
          remainderContext={remainderContext}
        />
      </div>
    </>
  );
};
