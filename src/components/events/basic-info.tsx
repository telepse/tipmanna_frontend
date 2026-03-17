"use client";

import { useState } from "react";

// Third-party imports
import { Control, useWatch } from "react-hook-form";
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
import { EventFormData } from "@/schemas";
import { Calendar, CloudUpload, FileText, PoundSterling } from "lucide-react";

// Local imports
import { ImageUploader } from "./image-uploader";

interface BasicInfoProps {
  control: Control<EventFormData>;
}

export const BasicInfo = ({ control }: BasicInfoProps) => {
  const [image, setImage] = useState("");

  // Use useWatch to reactively get the customerType value
  const customerType = useWatch({
    control,
    name: "customerType",
    defaultValue: "",
  });

  return (
    <>
      <div className="bg-primary w-full space-y-6 rounded-lg border p-6 shadow sm:w-96">
        <h2 className="flex items-center gap-2 font-semibold text-white">
          <PoundSterling /> Event Target
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
                <div className="flex items-center rounded-md border bg-white px-4">
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
                    className="border-0 bg-white focus-visible:ring-0"
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Basic event information */}
      <div className="space-y-6 rounded-lg border p-4 shadow sm:p-6">
        <h2 className="flex items-center gap-2 font-semibold">
          <FileText /> Basic Event Information
        </h2>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <FormField
            control={control}
            name="eventName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Event Name *</FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g. Jazz Night at Blue Moon"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="customerType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Are you an individual / organisation? *</FormLabel>
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
        </div>

        {customerType === "ORGANIZATION" ? (
          <>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <FormField
                control={control}
                name="organizationName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organization Name *</FormLabel>
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

              <FormField
                control={control}
                name="registrationNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organisation Registration Number *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter registration number"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </>
        ) : customerType === "INDIVIDUAL" ? (
          <FormField
            control={control}
            name="niNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>NI Number *</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Please enter your NI number to process payments"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
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
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <FormField
            control={control}
            name="hostName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Host Name *</FormLabel>
                <FormControl>
                  <Input
                    placeholder="John Doe"
                    readOnly
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

          <FormField
            control={control}
            name="eventType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Event Type *</FormLabel>
                <FormControl>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <SelectTrigger className="h-12 !w-full">
                      <SelectValue placeholder="Select Event Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CONCERT_MUSIC">
                        Concert/Music
                      </SelectItem>
                      <SelectItem value="DRAMA_ART">Drama/Art</SelectItem>
                      <SelectItem value="FESTIVAL">Festival</SelectItem>
                      <SelectItem value="CULTINERY">Cultinery</SelectItem>
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
        </div>
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
    </>
  );
};
