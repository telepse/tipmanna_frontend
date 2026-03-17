"use client";

import { useEffect, useState } from "react";

// Third-party imports
import { Control, useFormContext, useWatch } from "react-hook-form";
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
import { NewEventFormData } from "@/schemas";
import { CloudUpload, X } from "lucide-react";
import { useFieldArray } from "react-hook-form";

// Local imports
import { ImageUploader } from "./image-uploader";
import { Checkbox } from "../ui/checkbox";
import { Button } from "../ui/button";

interface EventRoomInfoProps {
  control: Control<NewEventFormData>;
}

const API_URL = "https://nominatim.openstreetmap.org/search";

export const CreatorEventRoomInfo = ({ control }: EventRoomInfoProps) => {
  const { setValue } = useFormContext();

  const postalCode = useWatch({ control, name: "postalCode" });
  const [addresses, setAddresses] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const [image, setImage] = useState("");

  // Use useWatch to reactively get the hasPhysicalLocation value
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
  // Auto-populate city/country using Nominatim (UK-only)
  useEffect(() => {
    const fetchPostalData = async () => {
      if (!postalCode || postalCode.length < 3) return;

      try {
        const res = await fetch(
          `${API_URL}?q=${encodeURIComponent(postalCode)}&format=json&addressdetails=1&limit=1&countrycodes=gb`,
          {
            headers: { "User-Agent": "EventApp/1.0" },
          }
        );

        const data = await res.json();

        if (data.length > 0) {
          const addr = data?.[0].address;

          setValue("city", addr.city || addr.town || addr.village || "");
          setValue("country", addr.country || "United Kingdom");
        }
      } catch (error) {
        console.error("Postcode lookup failed:", error);
      }
    };

    fetchPostalData();
  }, [postalCode, setValue]);

  const handleAddressSearch = async () => {
    if (!postalCode) return;

    setLoading(true);

    try {
      const res = await fetch(
        `${API_URL}?q=${encodeURIComponent(
          postalCode
        )}&format=json&addressdetails=1&limit=50&countrycodes=gb`,
        {
          headers: { "User-Agent": "EventApp/1.0" },
        }
      );

      const data = await res.json();
      console.log("Full list of matches:", data);

      if (Array.isArray(data)) {
        const list = data.map(i => i.display_name);

        setAddresses(list);

        // Auto-set first item if available
        if (list.length > 0) {
          setValue("venueLocation", list?.[0]);
        }
      }
    } catch (err) {
      console.error("Address fetch error:", err);
    }

    setLoading(false);
  };

  return (
    <>
      {/* Basic event information */}
      <div className="space-y-6 rounded-lg border bg-black/60 p-4 text-white shadow sm:p-6">
        <h2 className="font-semibold">
          Let&apos;s setup your event room to host your content
        </h2>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <FormField
            control={control}
            name="eventName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>What would you like to name your event? *</FormLabel>
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
                    // readOnly
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
            <CloudUpload /> Event Banner
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
                Are you uploading videos to this event room as an individual or
                an organisation? *
              </FormLabel>
              <FormControl>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <SelectTrigger className="h-12 !w-full">
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
                    className="bg-[#3b3b3b]"
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
                      className="bg-[#3b3b3b] placeholder:text-white"
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
                      className="bg-[#3b3b3b] placeholder:text-white"
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
              <FormLabel>Event Description *</FormLabel>
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
