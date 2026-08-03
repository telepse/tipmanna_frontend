"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar, ChevronsUpDown, X } from "lucide-react";
import { useFieldArray } from "react-hook-form";

// Local imports
import { ALL_COUNTRIES } from "@/lib/countries";
import { VideoLinksEventVideoTypeField } from "@/components/events/video-links-event-video-type-field";
import { VideoLinkContentCountryCombobox } from "@/components/events/video-link-content-country-combobox";
import { VideoLinkContentLanguageCombobox } from "@/components/events/video-link-content-language-combobox";
import { NewEventFormData } from "@/schemas";
import { getYoutubeThumbnail } from "@/lib/extractYoutubeID";

interface Props {
  control: Control<NewEventFormData>;
}

const DEFAULT_ADMIN_VIDEO = {
  url: "https://youtube.com/shorts/PSM1sgqtPxA?si=qH01Gtklb9L2gvW3",
  title: "Official Tipmanna Livestream Video",
  description: "Join the live event and support the host.",
};

const API_URL = "https://nominatim.openstreetmap.org/search";

export const HostEventAndContentInfo = ({ control }: Props) => {
  const { setValue } = useFormContext();

  const postalCode = useWatch({ control, name: "postalCode" });
  const [addresses, setAddresses] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [useDefaultAdminVideo, setUseDefaultAdminVideo] = useState(false);

  const { register } = useFormContext<NewEventFormData>();

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
  const videoLinks = useWatch({ control, name: "videoLinks" });

  const [countryOpen, setCountryOpen] = useState(false);

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

  // Helper to handle reminder logic (Requirement 2 & 3)
  const handleReminderToggle = (
    videoIndex: number,
    reminderId: number,
    isChecked: boolean,
    value: string
  ) => {
    const currentReminders = [...(videoLinks?.[videoIndex]?.reminders || [])];
    const numericValue = parseInt(value);

    if (isChecked) {
      // Add or Update value
      if (!isNaN(numericValue)) {
        // If we want to replace the old value for this specific slot, we manage it here
        // For simplicity, we filter out any existing entry for this specific "slot" if needed,
        // or just append if it's a new unique value.
        const updatedReminders = Array.from(
          new Set([...currentReminders, numericValue])
        );
        setValue(`videoLinks.${videoIndex}.reminders`, updatedReminders);
      }
    } else {
      // Remove value
      const updatedReminders = currentReminders.filter(r => r !== numericValue);
      setValue(`videoLinks.${videoIndex}.reminders`, updatedReminders);
    }
  };

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
      <div className="space-y-6 rounded-lg border-2 border-white bg-black/50 p-4 text-white shadow sm:p-6">
        <h2 className="font-semibold">Host your content on Tipmanna</h2>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <FormField
            control={control}
            name="eventType"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="relative w-fit">
                  What type of event and content are you organising?{" "}
                  <span className="text-destructive absolute top-0 -right-4">
                    *
                  </span>
                </FormLabel>
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
                      <SelectItem value="CHILDREN">Children</SelectItem>
                      <SelectItem value="EDUCATION">Education</SelectItem>
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
                  Does your event and content have a physical address?{" "}
                  <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    value={field.value}
                    className="mt-2 flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem
                        value="NO"
                        id="location-no"
                      />{" "}
                      <Label htmlFor="location-no">No</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <RadioGroupItem
                        value="YES"
                        id="location-yes"
                      />{" "}
                      <Label htmlFor="location-yes">Yes</Label>
                    </div>
                  </RadioGroup>
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
                      className="bg-black/25"
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
                          className="bg-black/25"
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
                className="mt-6 bg-white text-black hover:bg-white/80"
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
                  <FormLabel>
                    Event Venue Location{" "}
                    <span className="text-destructive">*</span>
                  </FormLabel>
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

            <FormField
              control={control}
              name="country"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Country <span className="absolute top-0 -right-4">*</span>
                  </FormLabel>
                  <FormControl>
                    <Popover
                      open={countryOpen}
                      onOpenChange={setCountryOpen}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="flex h-12 w-full justify-between border bg-black/25 text-white hover:bg-black/50"
                        >
                          {field.value ? (
                            <div className="flex items-center gap-2">
                              <Image
                                src={
                                  ALL_COUNTRIES.find(
                                    c => c.name === field.value
                                  )?.flag || ""
                                }
                                alt={
                                  ALL_COUNTRIES.find(
                                    c => c.name === field.value
                                  )?.name || ""
                                }
                                width={20}
                                height={20}
                                className="rounded"
                              />
                              {field.value}
                            </div>
                          ) : (
                            "Select a region..."
                          )}
                          <ChevronsUpDown className="opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        side="bottom"
                        align="start"
                        sideOffset={4}
                        avoidCollisions={false}
                        className="hide__scrollbar max-h-60 w-60 overflow-y-auto p-0"
                      >
                        <Command>
                          <CommandInput placeholder="Search a region..." />
                          <CommandEmpty>No country found.</CommandEmpty>
                          <CommandGroup heading="Countries">
                            {ALL_COUNTRIES.map(country => (
                              <CommandItem
                                key={country.code}
                                onSelect={() => {
                                  setValue("country", country.name);
                                  setCountryOpen(false);
                                }}
                                className="flex items-center gap-2"
                              >
                                <Image
                                  src={country.flag}
                                  alt={country.name}
                                  width={20}
                                  height={20}
                                  className="rounded"
                                />
                                {country.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        {hasPhysicalLocation === "NO" && (
          <div className="flex items-center gap-1 text-sm text-white/80">
            <span className="bg-moonstone-blue size-[10px] rounded-full sm:size-4"></span>{" "}
            Location: online
          </div>
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
                  <FormLabel>
                    Date <span className="text-destructive">*</span>
                  </FormLabel>
                  <div className="relative">
                    <FormControl>
                      <Input
                        type="date"
                        className="bg-black/25"
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
              <FormLabel>
                Expected Duration <span className="text-destructive">*</span>
              </FormLabel>
              <div className="grid grid-cols-2 gap-4">
                {/* Start Time */}
                <FormField
                  control={control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium text-white/80">
                        Start event
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="time"
                          className="bg-black/25"
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
                      <FormLabel className="text-xs font-medium text-white/80">
                        End event
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="time"
                          className="bg-black/25"
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
        <div className="space-y-6 rounded-lg border border-white p-4 shadow sm:p-6">
          <div className="space-y-1">
            <h2 className="font-semibold">Add content</h2>

            <p className="text-xs text-white/80">
              2 or more videos recommended
            </p>
          </div>

          <div className="flex items-center gap-4">
            <Button
              type="button"
              onClick={() => {
                setUseDefaultAdminVideo(true);

                setValue("videoLinks", [
                  {
                    url: DEFAULT_ADMIN_VIDEO.url,
                    title: DEFAULT_ADMIN_VIDEO.title,
                    description: DEFAULT_ADMIN_VIDEO.description,
                    reminders: [],
                    contentLanguage: "en-GB",
                    contentCountry: "all",
                    isDefault: true,
                  },
                ]);
              }}
              className="bg-transparent px-0 underline"
            >
              Use sample admin video
            </Button>

            {useDefaultAdminVideo && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  setUseDefaultAdminVideo(false);

                  // Reset to empty/default user state
                  setValue("videoLinks", [
                    {
                      url: "",
                      title: "",
                      description: "",
                      reminders: [],
                      contentLanguage: "en-GB",
                      contentCountry: "all",
                      isDefault: true,
                    },
                  ]);
                }}
              >
                Remove sample admin video
              </Button>
            )}
          </div>

          {/* Default video */}

          {fields.map((field, index) => {
            const url = videoLinks?.[index]?.url;
            const thumbnail = url ? getYoutubeThumbnail(url) : null;
            const isLocked = useDefaultAdminVideo && index === 0;

            return (
              <div
                key={field.id}
                className="flex flex-col gap-4 rounded bg-black/25 p-2 sm:p-4"
              >
                {useDefaultAdminVideo ? (
                  <>
                    <h2 className="font-semibold">Default Admin Video</h2>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Input
                        disabled={isLocked}
                        {...register(`videoLinks.${index}.url`)}
                      />
                      <Input
                        disabled={isLocked}
                        {...register(`videoLinks.${index}.title`)}
                      />
                    </div>

                    <Textarea
                      disabled={isLocked}
                      placeholder={`Video Description ${index + 1}`}
                      className="min-h-20 resize-y bg-black/15 text-white"
                      rows={3}
                      {...register(`videoLinks.${index}.description`)}
                    />
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      {/* Default mark */}
                      <label className="mb-2 flex items-center justify-end gap-2 text-white">
                        <input
                          type="checkbox"
                          checked={videoLinks?.[index]?.isDefault || false}
                          onChange={() => {
                            videoLinks?.forEach((_, i) => {
                              setValue(
                                `videoLinks.${i}.isDefault`,
                                i === index
                              );
                            });
                          }}
                        />
                        <h2 className="font-semibold">
                          {index === 0
                            ? "Event Live Stream Video"
                            : "Set video as default"}
                        </h2>
                      </label>

                      {index !== 0 && (
                        <button
                          type="button"
                          className="flex w-fit cursor-pointer items-center gap-1 rounded-md p-1 text-sm hover:bg-white hover:text-black"
                          onClick={() => remove(index)}
                        >
                          <span className="hidden sm:inline-block">Close</span>{" "}
                          <X className="text-destructive size-5" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {/* Video URL */}
                      <Input
                        placeholder={`Video youtube link ${index + 1}`}
                        className="bg-black/15 text-white"
                        {...register(`videoLinks.${index}.url` as const)}
                      />

                      {/* Video Title */}
                      <Input
                        placeholder={`Video Title ${index + 1}`}
                        className="bg-black/15 text-white"
                        {...register(`videoLinks.${index}.title` as const)}
                      />
                    </div>

                    {/* Video Description */}
                    <Textarea
                      placeholder={`Video Description ${index + 1}`}
                      className="min-h-20 resize-y bg-black/15 text-white"
                      rows={3}
                      {...register(`videoLinks.${index}.description` as const)}
                    />

                    <div className="flex gap-2">
                      <FormField
                        control={control}
                        name={`videoLinks.${index}.contentCountry` as const}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormLabel className="text-xs font-medium text-white/80">
                              Content Country
                            </FormLabel>
                            <FormControl>
                              <VideoLinkContentCountryCombobox
                                appearance="onDark"
                                value={field.value ?? ""}
                                onChange={field.onChange}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={control}
                        name={`videoLinks.${index}.contentLanguage` as const}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormLabel className="text-xs font-medium text-white/80">
                              Content Language
                            </FormLabel>
                            <FormControl>
                              <VideoLinkContentLanguageCombobox
                                appearance="onDark"
                                value={field.value ?? ""}
                                onChange={field.onChange}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <VideoLinksEventVideoTypeField
                      control={control}
                      index={index}
                      label="Event and content"
                    />

                    <div className="space-y-2">
                      <h2 className="font-semibold">Set fundraise reminders</h2>

                      <p className="text-xs text-white/80">
                        Show reminders to viewers while they are watching the
                        content
                      </p>

                      {/* Reminder 1 */}
                      <div className="flex items-center gap-3 text-sm">
                        <input
                          type="checkbox"
                          onChange={e => {
                            const input = document.getElementById(
                              `v-${index}-r1`
                            ) as HTMLInputElement;
                            handleReminderToggle(
                              index,
                              0,
                              e.target.checked,
                              input.value
                            );
                          }}
                        />
                        <span>After</span>
                        <Input
                          id={`v-${index}-r1`}
                          type="number"
                          defaultValue="0"
                          className="h-8 w-16 bg-black/20 text-center"
                          onChange={e => {
                            // If already checked, update the value in real-time
                            const cb = e.target.previousElementSibling
                              ?.previousElementSibling as HTMLInputElement;
                            if (cb?.checked)
                              handleReminderToggle(
                                index,
                                0,
                                true,
                                e.target.value
                              );
                          }}
                        />
                        <span>mins</span>
                      </div>

                      {/* Reminder 2 */}
                      <div className="flex items-center gap-3 text-sm">
                        <input
                          type="checkbox"
                          onChange={e => {
                            const input = document.getElementById(
                              `v-${index}-r2`
                            ) as HTMLInputElement;
                            handleReminderToggle(
                              index,
                              1,
                              e.target.checked,
                              input.value
                            );
                          }}
                        />
                        <span>After</span>
                        <Input
                          id={`v-${index}-r2`}
                          type="number"
                          defaultValue="0"
                          className="h-8 w-16 bg-black/20 text-center"
                          onChange={e => {
                            // If already checked, update the value in real-time
                            const cb = e.target.previousElementSibling
                              ?.previousElementSibling as HTMLInputElement;
                            if (cb?.checked)
                              handleReminderToggle(
                                index,
                                1,
                                true,
                                e.target.value
                              );
                          }}
                        />
                        <span>mins</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })}

          {!useDefaultAdminVideo && (
            <Button
              type="button"
              onClick={() =>
                append({
                  url: "",
                  title: "",
                  description: "",
                  reminders: [],
                  isDefault: false,
                  contentLanguage: "en-GB",
                  contentCountry: "all",
                })
              }
              className="bg-white text-black hover:bg-white/80"
            >
              + Add video or streaming link
            </Button>
          )}
        </div>
      </div>
    </>
  );
};
