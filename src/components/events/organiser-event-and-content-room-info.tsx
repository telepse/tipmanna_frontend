"use client";

import { useState } from "react";

// Third-party imports
import {
  Control,
  useFieldArray,
  useFormContext,
  useWatch,
} from "react-hook-form";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { NewEventFormData } from "@/schemas";
import { CloudUpload, X } from "lucide-react";

// Local imports
import { ImageUploader } from "./image-uploader";

interface EventRoomInfoProps {
  control: Control<NewEventFormData>;
}

const eventActivities: {
  label: string;
  value: "COMEDY" | "GAMES" | "PRAYING" | "DRAWING" | "DANCING" | "STAGE_SHOW";
}[] = [
  { label: "Comedy", value: "COMEDY" },
  { label: "Games", value: "GAMES" },
  { label: "Praying", value: "PRAYING" },
  { label: "Drawing", value: "DRAWING" },
  { label: "Dancing", value: "DANCING" },
  { label: "Stage Show", value: "STAGE_SHOW" },
];

// Resource request options
const resourceRequests = [
  {
    label: "Email invitation to guests on your contact",
    value: "EMAIL_BLAST_TO_ATTENDEES",
  },
  {
    label: "NFC and QR support so guest tap or scan at your venue",
    value: "EVENT_QR_CODE_PRINTS",
  },
  {
    label: "Screen display at your venue showing live tips or donations",
    value: "SCREEN_DISPLAY_SUPPORT",
  },
  {
    label: "Our agents at your venue to support",
    value: "TIPMANNA_AGENTS_AT_VENUE",
  },
] as const;

export const OrganiserEventAndContentRoomInfo = ({
  control,
}: EventRoomInfoProps) => {
  const [image, setImage] = useState("");

  // Use useWatch to reactively get the customerType value
  const customerType = useWatch({
    control,
    name: "customerType",
    defaultValue: "",
  });

  const tipDisclosures = useWatch({
    control,
    name: "tipUsageDisclosure",
  });

  // Tip usage disclosure field array
  const { fields, append, remove } = useFieldArray({
    control,
    name: "tipUsageDisclosure",
  });

  const enabledTips = tipDisclosures?.filter(t => t.enabled) || [];

  const totalPercentage = enabledTips.reduce(
    (sum, item) => sum + (item.percentage || 0),
    0
  );

  const { register } = useFormContext<NewEventFormData>();

  const {
    fields: cohostFields,
    append: cohostAppend,
    remove: cohostRemove,
  } = useFieldArray({
    control,
    name: "cohosts", // <- your form field for videos
  });

  return (
    <>
      {/* Basic event information */}
      <div className="space-y-6 rounded-lg border bg-black/60 p-4 text-white shadow sm:p-6">
        <h2 className="font-semibold">
          Let&apos;s setup your event and content room to host your event and
          content
        </h2>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <FormField
            control={control}
            name="eventName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  What would you like to name your event and content? *
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g. Jazz Night at Blue Moon"
                    className="bg-[#3b3b3b]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="hostName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name of Organiser *</FormLabel>
                <FormControl>
                  <Input
                    placeholder="John Doe"
                    readOnly
                    className="bg-[#3b3b3b]"
                    {...field}
                  />
                </FormControl>
                <span className="text-muted-foreground -mt-1 text-xs">
                  Please use your legal name
                </span>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-6 rounded-lg border p-6 shadow">
          <h2 className="flex items-center gap-2 font-semibold">
            <CloudUpload /> Event and Content Banner
          </h2>

          <FormField
            control={control}
            name="eventBanner"
            render={({ field }) => (
              <ImageUploader
                onImageUpload={img => {
                  setImage(img);
                  field.onChange(img); // Update form value
                }}
                defaultImage={field.value} // Pass current value to preserve on back navigation
              />
            )}
          />
        </div>

        <FormField
          control={control}
          name="customerType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Are you creating this event and content as an individual or an
                organisation? *
              </FormLabel>
              <FormControl>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <SelectTrigger className="h-12 !w-full bg-[#3b3b3b]">
                    <SelectValue placeholder="Select Customer Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INDIVIDUAL">Individual</SelectItem>
                    <SelectItem value="ORGANIZATION">Organization</SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {customerType === "ORGANIZATION" ? (
          <FormField
            control={control}
            name="organizationName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Official Name of Organization *</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter organization name"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : customerType === "INDIVIDUAL" ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <FormField
              control={control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First name *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Please enter your first legal name"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last name *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Please enter your last legal name"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        ) : null}

        <FormField
          control={control}
          name="eventDescription"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Event and Content Description *</FormLabel>
              <FormControl>
                <Input
                  placeholder="A short description of the event"
                  className="bg-[#3b3b3b] placeholder:text-white"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-6 rounded-lg border p-4 shadow sm:p-6">
          <div className="space-y-1">
            <h2 className="flex items-center gap-2 font-semibold">
              Event Activity
            </h2>

            <p className="text-xs text-white/50">Select all that apply</p>
          </div>

          <FormField
            control={control}
            name="activities"
            render={({ field }) => (
              <FormItem>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {eventActivities.map(activity => (
                    <FormItem
                      key={activity.value}
                      className="flex items-center space-x-2"
                    >
                      <FormControl>
                        <Checkbox
                          checked={field.value?.includes(activity.value)}
                          onCheckedChange={checked => {
                            const newValue = checked
                              ? [...(field.value || []), activity.value]
                              : field.value?.filter(v => v !== activity.value);

                            field.onChange(newValue);
                          }}
                        />
                      </FormControl>
                      <FormLabel className="text-sm font-normal">
                        {activity.label}
                      </FormLabel>
                    </FormItem>
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Resources Request */}
        <div className="space-y-4 rounded-lg border p-6 shadow">
          <div className="space-y-1">
            <h2 className="font-semibold">Resources Request</h2>
            <p className="text-xs text-white/50">From Tipmanna</p>
          </div>

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

        {/* Tip Usage Disclosure */}
        <div className="space-y-4 rounded-lg border bg-black/60 p-4 text-white shadow">
          <h2 className="flex items-center gap-2 font-semibold">
            Tip Usage Allocation
          </h2>

          {fields.map((item, index) => (
            <div
              key={item.id}
              className="flex items-center gap-2"
            >
              <FormField
                control={control}
                name={`tipUsageDisclosure.${index}.enabled`}
                render={({ field }) => (
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />

              <FormField
                control={control}
                name={`tipUsageDisclosure.${index}.customLabel`}
                render={({ field }) => (
                  <Input
                    {...field}
                    className="flex-1"
                  />
                )}
              />

              <FormField
                control={control}
                name={`tipUsageDisclosure.${index}.percentage`}
                render={({ field }) => (
                  <div className="flex w-28 items-center gap-1">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step={0.1}
                      {...field}
                      onChange={e => field.onChange(Number(e.target.value))}
                      className="text-center"
                    />
                    <span>%</span>
                  </div>
                )}
              />

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => remove(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}

          <button
            type="button"
            onClick={() =>
              append({
                usageType: "CUSTOM",
                customLabel: "",
                percentage: 0,
                enabled: true,
              })
            }
            className="rounded-md bg-white p-2 text-sm text-black"
          >
            + Add Tip Usage
          </button>

          <div className="mt-2 flex justify-between text-sm">
            <span>Total Allocation</span>
            <span
              className={
                totalPercentage === 100 ? "text-success" : "text-destructive"
              }
            >
              {totalPercentage}%
            </span>
          </div>

          {totalPercentage !== 100 && (
            <p className="text-destructive text-xs">
              Enabled allocations must total 100%
            </p>
          )}
        </div>

        {cohostFields.map((field, index) => (
          <div
            key={field.id}
            className="flex flex-col gap-2 rounded bg-[#1f1f1f] p-2"
          >
            {/* Video URL */}
            <Input
              placeholder={`Cohost fullname ${index + 1}`}
              className="bg-[#3b3b3b] text-white"
              {...register(`cohosts.${index}.fullname` as const)}
            />

            {/* Video Title */}
            <Input
              placeholder={`Cohost email ${index + 1}`}
              className="bg-[#3b3b3b] text-white"
              {...register(`cohosts.${index}.email` as const)}
            />

            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-12 border-none bg-transparent"
              onClick={() => cohostRemove(index)}
            >
              <X className="size-6 text-black" />
            </Button>
          </div>
        ))}

        <Button
          type="button"
          onClick={() => cohostAppend({ fullname: "", email: "" })}
          className="bg-black hover:bg-black/80"
        >
          + Add co host
        </Button>

        <FormField
          control={control}
          name="liveVideoLink"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Add a Streaming link *</FormLabel>
              <p className="text-sm text-white/50">Recommended (skip)</p>
              <FormControl>
                <Input
                  placeholder="Streaming link..."
                  className="bg-[#3b3b3b] placeholder:text-white"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </>
  );
};
