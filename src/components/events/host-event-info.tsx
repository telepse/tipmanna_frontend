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
import { Calendar, X } from "lucide-react";
import { useFieldArray } from "react-hook-form";

// Local imports
import { Button } from "../ui/button";
import { extractYoutubeID } from "@/lib/extractYoutubeID";
import { ThumbnailPlayer } from "../tv/thumbnail-player";
import { validateYoutubePlayback } from "@/lib/playbackValidator";
import { PlaybackPreview } from "./playback-preview";

interface Props {
  control: Control<NewEventFormData>;
}

const API_URL = "https://nominatim.openstreetmap.org/search";

export const HostEventInfo = ({ control }: Props) => {
  const { setValue } = useFormContext();

  const postalCode = useWatch({ control, name: "postalCode" });
  const [addresses, setAddresses] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const { register, setError, clearErrors } =
    useFormContext<NewEventFormData>();

  const { fields, append, remove } = useFieldArray({
    control,
    name: "videoLinks", // <- your form field for videos
  });

  // Use useWatch to reactively get the hasPhysicalLocation value
  const hasPhysicalLocation = useWatch({
    control,
    name: "hasPhysicalLocation",
    defaultValue: "",
  });

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

  // Watch the videoLinks array
  const videoLinks = useWatch({
    control,
    name: "videoLinks",
    defaultValue: [], // optional but helps avoid undefined
  });

  const validateVideo = async (index: number, url: string): Promise<boolean> => {
    if (!url) return true; // allow empty for optional links
  
    const result = await validateYoutubePlayback(url);
  
    if (!result.valid) {
      setError(`videoLinks.${index}.url`, {
        type: "manual",
        message: "Invalid video link", // <- updated error message
      });
      return false;
    } else {
      clearErrors(`videoLinks.${index}.url`);
      return true;
    }
  };

  return (
    <>
      {/* Basic event information */}
      <div className="space-y-6 rounded-lg border-2 border-white bg-black/60 p-4 text-white shadow sm:p-6">
        <h2 className="font-semibold">Host your content on Tipmanna</h2>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <FormField
            control={control}
            name="eventType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>What type of event are you organising? *</FormLabel>
                <FormControl>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <SelectTrigger className="h-12 !w-full bg-black/25">
                      <SelectValue placeholder="Select event type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CONCERT_MUSIC">
                        Concert/Music
                      </SelectItem>
                      <SelectItem value="DRAMA_ART">Drama/Art</SelectItem>
                      <SelectItem value="FESTIVAL">Festival</SelectItem>
                      <SelectItem value="FOOD">Food</SelectItem>
                      <SelectItem value="HANG_OUT">Hang-out</SelectItem>
                      <SelectItem value="ISLAMIC">Islamic</SelectItem>
                      <SelectItem value="CHRISTIAN">Christian</SelectItem>
                      <SelectItem value="CORPORATE">Corporate</SelectItem>
                      <SelectItem value="COMEDY">Comedy</SelectItem>
                      <SelectItem value="FASHION">Fashion</SelectItem>
                      <SelectItem value="GAME_SPORT">Game/Sport</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="hasPhysicalLocation"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Does your event have a physical address? *
                </FormLabel>
                <FormControl>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <SelectTrigger className="h-12 !w-72 bg-black/25">
                      <SelectValue placeholder="Does your event have a physical address?" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="YES">Yes</SelectItem>
                      <SelectItem value="NO">No</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {hasPhysicalLocation === "YES" && (
          <>
            <FormField
              control={control}
              name="venueName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Venue Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter venue name"
                      className="bg-black/40"
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
                          placeholder="Enter postal code"
                          className="bg-black/40"
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
                size="sm"
                className="mt-6 bg-black"
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
          </>
        )}

        {/* Event timing */}
        <div className="space-y-6 rounded-lg border p-6 shadow">
          <h2 className="flex items-center gap-2 font-semibold">
            <Calendar /> Event Timing
          </h2>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <FormField
              control={control}
              name="eventDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date *</FormLabel>
                  <div className="relative">
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                      />
                    </FormControl>
                    <Calendar className="text-muted-foreground absolute top-1/2 right-4 size-5 -translate-y-1/2" />
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Expected Duration */}
            <div className="space-y-2">
              <FormLabel>Expected Duration *</FormLabel>
              <div className="grid grid-cols-2 gap-4">
                {/* Start Time */}
                <FormField
                  control={control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground text-xs font-medium">
                        Start event
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="time"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* End Time */}
                <FormField
                  control={control}
                  name="endTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground text-xs font-medium">
                        End event
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="time"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Channel videos */}
        <div className="space-y-6 rounded-lg border border-white p-6 shadow">
          <div className="space-y-1">
            <h2 className="font-semibold">Add a streaming link</h2>

            <p className="text-xs text-white/80">
              2 or more videos recommended
            </p>
          </div>

          {fields.map((field, index) => {
            const url = videoLinks?.[index]?.url;

            return (
              <div
                key={field.id}
                className="flex flex-col gap-3 rounded bg-[#1f1f1f] p-3"
              >
                {/* Video URL */}
                <FormField
                  control={control}
                  name={`videoLinks.${index}.url`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Video URL {index + 1}</FormLabel>

                      <FormControl>
                        <Input
                          {...field}
                          placeholder={`Video URL ${index + 1}`}
                          className="bg-[#3b3b3b] text-white"
                          onBlur={e => {
                            field.onBlur();
                            validateVideo(index, e.target.value);
                          }}
                        />
                      </FormControl>

                      {/* ERROR MESSAGE */}
                      <FormMessage className="text-destructive text-sm" />
                    </FormItem>
                  )}
                />

                {/* 🎥 Live Preview with ThumbnailPlayer */}
                {url && (
                  <PlaybackPreview
                    videoUrl={url}
                    className="w-full"
                  />
                )}

                {/* Video Title */}
                <Input
                  placeholder={`Video Title ${index + 1}`}
                  className="bg-[#3b3b3b] text-white"
                  {...register(`videoLinks.${index}.title` as const)}
                />

                {/* Reminders */}
                <Input
                  placeholder="Reminders (comma separated minutes)"
                  className="bg-[#3b3b3b] text-white"
                  {...register(`videoLinks.${index}.reminders` as const, {
                    setValueAs: (val: unknown) => {
                      if (!val) return [];
                      if (typeof val === "string") {
                        return val
                          .split(",")
                          .map(v => parseInt(v.trim()))
                          .filter(v => !isNaN(v));
                      }
                      if (Array.isArray(val)) {
                        return val.map(v => Number(v)).filter(v => !isNaN(v));
                      }
                      return [];
                    },
                  })}
                />

                {/* Default mark */}
                <label className="flex items-center gap-2 text-white">
                  <input
                    type="checkbox"
                    {...register(`videoLinks.${index}.isDefault` as const)}
                  />
                  Set as default
                </label>

                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-12 border-none bg-transparent"
                  onClick={() => remove(index)}
                >
                  <X className="size-6 text-black" />
                </Button>
              </div>
            );
          })}

          <Button
            type="button"
            onClick={() =>
              append({ url: "", title: "", reminders: [], isDefault: false })
            }
            className="bg-black hover:bg-black/80"
          >
            + Add video link
          </Button>
        </div>
      </div>
    </>
  );
};
