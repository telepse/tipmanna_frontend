"use client";

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
import { Button } from "@/components/ui/button";
import { useFieldArray } from "react-hook-form";
import { X } from "lucide-react";

// Local imports
import { NewEventFormData } from "@/schemas";
import { VideoLinksEventVideoTypeField } from "@/components/events/video-links-event-video-type-field";
import { VideoLinkContentCountryCombobox } from "@/components/events/video-link-content-country-combobox";
import { VideoLinkContentLanguageCombobox } from "@/components/events/video-link-content-language-combobox";
import { VideoTipReminderSlotsEditor } from "@/components/events/video-tip-reminder-slots-editor";

interface Props {
  control: Control<NewEventFormData>;
  hasActivePremium: boolean;
}

export const HostContentInfo = ({ control, hasActivePremium }: Props) => {
  const { setValue } = useFormContext();

  const { register } = useFormContext<NewEventFormData>();

  const { fields, append, remove } = useFieldArray({
    control,
    name: "videoLinks", // <- your form field for videos
  });

  const videoLinks = useWatch({ control, name: "videoLinks" });

  return (
    <>
      {/* Basic content information */}
      <div className="space-y-6 rounded-lg border-2 border-white bg-black/50 p-4 text-white shadow sm:p-6">
        <h2 className="font-semibold">Host your content on Tipmanna</h2>

        <FormField
          control={control}
          name="eventType"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="relative w-fit">
                What type of content are you uploading?{" "}
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
                    <SelectValue placeholder="Select content type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CONCERT_MUSIC">Concert/Music</SelectItem>
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

        {/* Channel videos */}
        <div className="space-y-6 rounded-lg border border-white p-4 shadow sm:p-6">
          <div className="space-y-1">
            <h2 className="font-semibold">Add content</h2>

            <p className="text-xs text-white/80">
              2 or more videos recommended
            </p>
          </div>

          {fields.map((field, index) => {
            return (
              <div
                key={field.id}
                className="flex flex-col gap-4 rounded bg-black/25 p-2 sm:p-4"
              >
                <div className="flex items-center justify-between">
                  {/* Default mark */}
                  <label className="mb-2 flex items-center justify-end gap-2 text-white">
                    <input
                      type="checkbox"
                      checked={videoLinks?.[index]?.isDefault || false}
                      onChange={() => {
                        videoLinks?.forEach((_, i) => {
                          setValue(`videoLinks.${i}.isDefault`, i === index);
                        });
                      }}
                    />
                    <h2 className="font-semibold">Set video as default</h2>
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
                  label="Content"
                />

                <VideoTipReminderSlotsEditor
                  value={videoLinks?.[index]?.reminders ?? []}
                  onChange={next =>
                    setValue(`videoLinks.${index}.reminders`, next)
                  }
                  hasActivePremium={hasActivePremium}
                  appearance="onDark"
                />
              </div>
            );
          })}

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
        </div>
      </div>
    </>
  );
};
