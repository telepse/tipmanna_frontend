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

// Local imports
import { NewEventFormData } from "@/schemas";

interface Props {
  control: Control<NewEventFormData>;
}

export const EventAndContentAmountInfo = ({ control }: Props) => {
  return (
    <>
      <div className="w-full space-y-6 rounded-lg border-2 border-white bg-black/60 p-6 shadow sm:w-96">
        <h2 className="flex items-center gap-2 font-semibold text-white">
          <PoundSterling /> How much are you anticipating from your event and
          content?
        </h2>

        {/* Amount to Raise */}
        <FormField
          control={control}
          name="amountToRaise"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-white">
                Target amount to raise *
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
      </div>
    </>
  );
};
