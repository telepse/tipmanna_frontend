"use client";

import { useEffect, useState } from "react";

import { Control, useFormContext, useWatch } from "react-hook-form";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "../ui/checkbox";
import { MapPin } from "lucide-react";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

import { EventFormData } from "@/schemas";
import { Button } from "../ui/button";

interface VenueInfoProps {
  control: Control<EventFormData>;
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

const API_URL = "https://nominatim.openstreetmap.org/search";

export const VenueInfo = ({ control }: VenueInfoProps) => {
  const { setValue } = useFormContext();

  const postalCode = useWatch({ control, name: "postalCode" });
  const [addresses, setAddresses] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

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

  // Fetch matching addresses (UK-only)
  // const handleAddressSearch = async () => {
  //   if (!postalCode) return;

  //   setLoading(true);

  //   try {
  //     const res = await fetch(
  //       `${API_URL}?q=${encodeURIComponent(postalCode)}&format=json&addressdetails=1&limit=10&countrycodes=gb`,
  //       {
  //         headers: { "User-Agent": "EventApp/1.0" },
  //       }
  //     );

  //     const data = await res.json();
  //     console.log(data);

  //     if (Array.isArray(data)) {
  //       const list = data.map((i) => i.display_name);
  //       setAddresses(list);

  //       if (list.length > 0) {
  //         setValue("venueLocation", list[0]);
  //       }
  //     }
  //   } catch (err) {
  //     console.error("Address fetch error:", err);
  //   }

  //   setLoading(false);
  // };

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
      <div className="space-y-6 rounded-lg border p-4 shadow sm:p-6">
        <h2 className="flex items-center gap-2 font-semibold">
          <MapPin /> Venue
        </h2>

        <FormField
          control={control}
          name="venueName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Venue Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="Enter venue name"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex items-center gap-2">
          <div className="flex-1">
            <FormField
              control={control}
              name="postalCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Postal Code</FormLabel>
                  <FormControl>
                    <Input
                      placeholder=""
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <Button
            type="button"
            size="lg"
            className="mt-6"
            disabled={loading}
            onClick={handleAddressSearch}
          >
            {loading ? "Finding address..." : "Find address"}
          </Button>
        </div>

        <FormField
          control={control}
          name="venueLocation"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Event Venue Location *</FormLabel>
              <FormControl>
                {postalCode && addresses.length > 0 ? (
                  <Select
                    onValueChange={v => {
                      field.onChange(v);
                      setAddresses([]); // hide list after selection
                    }}
                    value={field.value || ""}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select address..." />
                    </SelectTrigger>

                    <SelectContent>
                      {addresses.map((addr, idx) => (
                        <SelectItem
                          key={idx}
                          value={addr}
                        >
                          {addr}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    placeholder="Enter venue location manually"
                    {...field}
                  />
                )}
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="space-y-6 rounded-lg border p-4 shadow sm:p-6">
        <h2 className="flex items-center gap-2 font-semibold">
          Event Activity (Select all that apply)
        </h2>

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
    </>
  );
};
