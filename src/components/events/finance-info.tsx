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
import { Checkbox } from "@/components/ui/checkbox";
import { Euro } from "lucide-react";

// Local imports
import { EventFormData } from "@/schemas";
import { Paragraph } from "@/components/shared/paragraph";

interface FinanceInfoProps {
  control: Control<EventFormData>;
}

type TipUsage = {
  usageType: (typeof tipUsageOptions)[number]["value"];
  percentage: number;
};

// Resource request options
const resourceRequests = [
  { label: "Email blast to attendees", value: "EMAIL_BLAST_TO_ATTENDEES" },
  { label: "Event QR code Prints", value: "EVENT_QR_CODE_PRINTS" },
  { label: "Screen display support", value: "SCREEN_DISPLAY_SUPPORT" },
  { label: "Tipmanna agents at venue", value: "TIPMANNA_AGENTS_AT_VENUE" },
] as const;

// Example tip usage options
const tipUsageOptions = [
  { label: "50% performer welfare", value: "PERFORMER_WELFARE" },
  { label: "20% to Host", value: "HOST_WELFARE" },
  { label: "30% to Co host", value: "COHOST_WELFARE" },
] as const;

export const FinanceInfo = ({ control }: FinanceInfoProps) => {
  return (
    <>
      {/* Resources Request */}
      <div className="space-y-4 rounded-lg border p-6 shadow">
        <h2 className="font-semibold">Resources Request (From Tipmanna)</h2>

        <FormField
          control={control}
          name="resourcesRequested"
          render={({ field }) => (
            <FormItem>
              <div className="flex flex-col gap-4">
                {resourceRequests.map(res => (
                  <FormItem
                    key={res.value}
                    className="flex items-center gap-2"
                  >
                    <FormControl>
                      <Checkbox
                        checked={field.value?.includes(res.value)}
                        onCheckedChange={checked => {
                          const newValue = checked
                            ? [...(field.value || []), res.value]
                            : field.value?.filter(v => v !== res.value);
                          field.onChange(newValue);
                        }}
                      />
                    </FormControl>
                    <FormLabel className="text-sm font-normal">
                      {res.label}
                    </FormLabel>
                  </FormItem>
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Financial Details */}
      <div className="space-y-6 rounded-lg border p-6 shadow">
        <h2 className="flex items-center gap-2 font-semibold">
          <Euro className="h-4 w-4" /> Financial Details
        </h2>

        {/* Bank Account Details */}
        <FormField
          control={control}
          name="bankAccountDetails"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Payout Details *</FormLabel>
              <FormControl>
                <Input
                  placeholder="Bank account details for organization"
                  {...field}
                />
              </FormControl>
              <Paragraph
                size="xs"
                color="muted"
              >
                For Organization staff for receiving tips
              </Paragraph>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Tip Usage Disclosure */}
        <div className="space-y-6">
          <h2 className="flex items-center gap-2 font-semibold">
            Tip Usage Disclosure *
          </h2>

          <FormField
            control={control}
            name="tipUsageDisclosure"
            render={({ field }) => (
              <FormItem>
                <div className="flex flex-col gap-4">
                  {tipUsageOptions.map(tip => (
                    <FormItem
                      key={tip.value}
                      className="flex items-center space-x-2"
                    >
                      <FormControl>
                        <Checkbox
                          checked={field.value?.some(
                            (v: TipUsage) => v.usageType === tip.value
                          )}
                          onCheckedChange={checked => {
                            let newValue = [...(field.value || [])];
                            if (checked) {
                              newValue.push({
                                usageType: tip.value,
                                percentage: 0,
                              });
                            } else {
                              newValue = newValue.filter(
                                (v: TipUsage) => v.usageType !== tip.value
                              );
                            }
                            field.onChange(newValue);
                          }}
                        />
                      </FormControl>
                      <FormLabel className="text-sm font-normal">
                        {tip.label}
                      </FormLabel>
                    </FormItem>
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
    </>
  );
};
