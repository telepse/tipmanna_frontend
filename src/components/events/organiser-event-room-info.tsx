/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Check, CloudUpload, PencilLineIcon, X } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";

// Local imports
import { ImageUploader } from "./image-uploader";
import { RootState } from "@/redux/store";
import { NewEventFormData } from "@/schemas";
import { setCredentials } from "@/features/auth-slice";
import { getLockedCustomerType } from "@/lib/locked-customer-type";
import { updateHostAction } from "@/actions/auth";
import { ApiError } from "@/types/api-error.types";

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
    label: "TV Screen display at your venue showing live tips or donations x2",
    value: "SCREEN_DISPLAY_SUPPORT",
  },
  {
    label: "Our agents at your venue to support",
    value: "TIPMANNA_AGENTS_AT_VENUE",
  },
] as const;

// 1. Add these options at the top of your file
const tipUsageOptions = [
  { label: "Charity", value: "CHARITY" },
  { label: "Community", value: "COMMUNITY" },
  { label: "Gaming", value: "GAMING" },
  { label: "Gifting", value: "GIFTING" },
  { label: "Hype", value: "HYPE" },
  { label: "Logistics", value: "LOGISTICS" },
  { label: "Religious", value: "RELIGIOUS" },
  { label: "Shoutout", value: "SHOUTOUT" },
  { label: "Upkeep", value: "UPKEEP" },
  { label: "Welfare", value: "WELFARE" },
];

type HostUser = {
  id: string;
  fullName: string;
  email: string;
  username: string;
  role: "HOST";
  eventCode?: string;
  eventSlug?: string;
  numOfEvents?: number;
  individualLegalFirstName?: string;
  individualLegalLastName?: string;
  lockedCustomerType?: "INDIVIDUAL" | "ORGANIZATION" | null;
};

const splitFullName = (fullName?: string) => {
  if (!fullName) {
    return { firstName: "", lastName: "" };
  }

  const parts = fullName.trim().split(/\s+/);

  if (parts.length >= 3) {
    return {
      firstName: parts.slice(0, 2).join(" "),
      lastName: parts.slice(2).join(" "),
    };
  }

  return {
    firstName: parts[0] || "",
    lastName: parts[1] || "",
  };
};

export const OrganiserEventRoomInfo = ({ control }: EventRoomInfoProps) => {
  const [, setImage] = useState("");
  const [isNameConfirmed, setIsNameConfirmed] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [openDefaultBanner, setOpenDefaultBanner] = useState(false);

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

  const { register, setValue } = useFormContext<NewEventFormData>();

  const {
    fields: cohostFields,
    append: cohostAppend,
    remove: cohostRemove,
  } = useFieldArray({
    control,
    name: "cohosts", // <- your form field for videos
  });

  const { user, token } = useSelector((state: RootState) => state.auth);
  const [fullName, setFullName] = useState(user?.fullName);
  const dispatch = useDispatch();
  const hasCreatedBefore = ((user as HostUser)?.numOfEvents ?? 0) > 0;
  const lockedCustomerType = getLockedCustomerType(user as HostUser);

  useEffect(() => {
    if (lockedCustomerType) {
      setValue("customerType", lockedCustomerType);
    }
  }, [lockedCustomerType, setValue]);

  useEffect(() => {
    setFullName(user?.fullName);
  }, [user]);

  useEffect(() => {
    // Use the flattened fields from the user object
    if (
      hasCreatedBefore ||
      (user && "individualLegalFirstName" in user && "fullName" in user)
    ) {
      // setValue("firstName", user?.fullName.split(" ")[0]);
      // setValue("lastName", user?.fullName.split(" ")[1]?.slice(0, 2));

      const { firstName, lastName } = splitFullName(user?.fullName);

      setValue("firstName", firstName);
      setValue("lastName", lastName);

      setValue("organizationName", "");
    }
  }, [hasCreatedBefore, user, setValue]);

  const confirmLegalNames = () => {
    if (user?.fullName !== fullName) {
      toast.error("Your full name does not match the one you signed up with");
    } else {
      toast.success("Your legal names have been confirmed");
      setIsNameConfirmed(true);
      setFullName(user?.fullName);
      setIsEditingName(false);
      setValue("firstName", fullName?.split(" ")[0]);
      setValue("lastName", fullName?.split(" ")[1]);
      dispatch(
        setCredentials({
          user: { ...(user as HostUser), fullName: fullName ?? "" },
          token: token ?? "",
        })
      );
    }
  };

  const [, setIsLoading] = useState(false);

  const updateLegalNames = async (values: {
    fullName: string;
    email: string;
  }) => {
    try {
      setIsLoading(true);

      if (!token) {
        toast.error("Invalid or expired token");
        return;
      }

      const res = await updateHostAction(
        {
          fullName: values.fullName,
          email: values.email,
        },
        token
      );

      if (!res.success) {
        toast.error(res.message);
        return;
      }

      const { fullName } = (res.data as any).host as any;

      // update redux store
      dispatch(
        setCredentials({
          user: {
            ...(user as HostUser),
            fullName: fullName ?? "",
          },
          token: token ?? "",
        })
      );

      toast.success("First and last name updated successfully");
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(err.message);
      } else if (typeof err === "object" && err !== null && "error" in err) {
        const apiErr = err as ApiError;
        toast.error(apiErr.error.message);
      } else {
        toast.error("Failed to update user");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Basic event information */}
      <div className="space-y-6 rounded-lg border bg-black/50 p-4 text-white shadow sm:p-6">
        <p className="text-sm text-white/80">
          Signed in as host: {user?.fullName} @{user?.username}
        </p>

        <h2 className="font-semibold">
          Let&apos;s setup your channel to host your event
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
                    className="bg-black/25"
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
                <FormLabel>
                  Name of Event Organiser{" "}
                  <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="John Doe"
                    className="bg-black/25"
                    disabled={true}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={control}
          name="contributionType"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="relative w-fit">
                Select a pin for your channel{" "}
                <span className="text-destructive absolute top-0 -right-4">
                  *
                </span>
              </FormLabel>

              <div className="flex gap-4">
                <button
                  type="button"
                  className={`flex cursor-pointer items-center gap-1 rounded-md bg-black/25 p-2 text-sm ${field.value === "PERFORMER" ? "bg-white/40 text-black" : "bg-black/25 text-white"}`}
                  onClick={() => field.onChange("PERFORMER")}
                >
                  {field.value === "PERFORMER" && <Check className="size-4" />}{" "}
                  Performers
                </button>
                <button
                  type="button"
                  className={`flex cursor-pointer items-center gap-1 rounded-md bg-black/25 p-2 text-sm ${field.value === "PROJECT" ? "bg-white/40 text-black" : "bg-black/25 text-white"}`}
                  onClick={() => field.onChange("PROJECT")}
                >
                  {field.value === "PROJECT" && <Check className="size-4" />}{" "}
                  Projects
                </button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-6 rounded-lg border bg-black/25 p-6 shadow">
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

          <Button
            type="button"
            onClick={() => {
              setOpenDefaultBanner(false);

              // Set the form field to the default banner
              setValue("eventBanner", "/assets/event_banner.webp");

              // Optionally, update local state if your ImageUploader relies on it
              setImage("/assets/event_banner.webp");

              toast.success("Sample banner applied");
            }}
            className="bg-white text-black hover:bg-white/80"
          >
            Use sample banner
          </Button>

          {openDefaultBanner && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <div className="rounded-md bg-white">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setOpenDefaultBanner(false);
                    }}
                    className="absolute top-0 right-0 cursor-pointer rounded-full bg-white"
                  >
                    <X className="text-black" />
                  </button>

                  <Image
                    src="/assets/event_banner.webp"
                    alt="Default event banner"
                    width={640}
                    height={320}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <FormField
          control={control}
          name="customerType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Are you creating this channel as an individual or an
                organisation? *
              </FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  value={field.value}
                  className="mt-2 flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem
                      value="INDIVIDUAL"
                      id="individual"
                      disabled={lockedCustomerType === "ORGANIZATION"}
                    />{" "}
                    <Label htmlFor="individual">Individual</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <RadioGroupItem
                      value="ORGANIZATION"
                      id="organisation"
                      disabled={lockedCustomerType === "INDIVIDUAL"}
                    />{" "}
                    <Label htmlFor="organisation">Organisation</Label>
                  </div>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {customerType === "ORGANIZATION" ? (
          <>
            <FormField
              control={control}
              name="organizationName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Official Name of Organization{" "}
                    <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter organization name"
                      className="bg-black/25"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <span className="-mt-4 block text-xs text-white/50">
              This must be the legal registered name of the organization
              receiving payout
            </span>
          </>
        ) : customerType === "INDIVIDUAL" ? (
          <>
            <div className="flex items-center gap-4 text-xs text-white/80">
              You are signed in as {user?.fullName}{" "}
              {!hasCreatedBefore && !isNameConfirmed && (
                <button
                  type="button"
                  onClick={() => setIsEditingName(true)}
                  className="cursor-pointer"
                >
                  <PencilLineIcon className="size-4" />
                </button>
              )}{" "}
              {isEditingName && !isNameConfirmed ? (
                <div className="relative flex w-full items-center gap-2">
                  <Input
                    type="text"
                    placeholder="Enter your fullname"
                    className="flex-1 bg-black/25"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                  />

                  <button
                    type="button"
                    onClick={() => {
                      setFullName(user?.fullName);
                      setValue("firstName", fullName?.split(" ")[0]);
                      setValue("lastName", fullName?.split(" ")[1]);
                      dispatch(
                        setCredentials({
                          user: {
                            ...(user as HostUser),
                            fullName: fullName ?? "",
                          },
                          token: token ?? "",
                        })
                      );

                      updateLegalNames({
                        fullName: fullName ?? "",
                        email: user?.email ?? "",
                      });
                    }}
                    className="absolute top-1/2 right-0 -translate-1/2 cursor-pointer"
                  >
                    <Check className="text-white/80" />
                  </button>
                </div>
              ) : null}
            </div>

            <div className="-mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2">
              <FormField
                control={control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      First name <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Please enter your first name"
                        className="bg-black/25 opacity-25"
                        readOnly
                        disabled={
                          hasCreatedBefore || isNameConfirmed || isEditingName
                        }
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
                    <FormLabel>
                      Last name <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Please enter your last name"
                        className="bg-black/25 opacity-25"
                        readOnly
                        disabled={
                          hasCreatedBefore || isNameConfirmed || isEditingName
                        }
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <p className="-mt-4 block text-xs text-white/50">
              This must be the legal name of the individual receiving payout
            </p>

            {!hasCreatedBefore && !isNameConfirmed && (
              <div>
                <Button
                  type="button"
                  // onClick={() => {
                  //   setIsNameConfirmed(true);
                  //   setFullName(user?.fullName);
                  //   setIsEditingName(false);
                  //   setValue("firstName", fullName?.split(" ")[0]);
                  //   setValue("lastName", fullName?.split(" ")[1]);
                  //   dispatch(
                  //     setCredentials({
                  //       user: { ...(user as HostUser), fullName: fullName ?? "" },
                  //       token: token ?? "",
                  //     })
                  //   );
                  // }}
                  onClick={confirmLegalNames}
                  className="bg-white text-black hover:bg-white/80"
                >
                  Confirm legal names
                </Button>

                <Button
                  type="button"
                  onClick={() => setIsEditingName(true)}
                  className="bg-transparent underline"
                >
                  Edit
                </Button>
              </div>
            )}
          </>
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
                  className="bg-black/25"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-6 rounded-lg border bg-black/25 p-4 shadow sm:p-6">
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
        <div className="space-y-4 rounded-lg border bg-black/25 p-6 shadow">
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
        <div className="space-y-4 rounded-lg border bg-black/25 p-4 text-white shadow">
          <h2 className="flex items-center gap-2 font-semibold">
            Tip Usage Allocation
          </h2>

          {fields.map((item, index) => (
            <div
              key={item.id}
              className="flex flex-col gap-3 border-b border-white/10 pb-4 last:border-0"
            >
              <div className="flex items-center gap-3">
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

                {/* Usage Type Select Dropdown */}
                <FormField
                  control={control}
                  name={`tipUsageDisclosure.${index}.usageType`}
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <Select
                        onValueChange={val => {
                          field.onChange(val);
                          // Automatically set the customLabel based on selection
                          const label = tipUsageOptions.find(
                            opt => opt.value === val
                          )?.label;
                          setValue(
                            `tipUsageDisclosure.${index}.customLabel` as const,
                            label || val
                          );
                        }}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full bg-[#3b3b3b]">
                            <SelectValue placeholder="Select Usage" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {tipUsageOptions.map(opt => (
                            <SelectItem
                              key={opt.value}
                              value={opt.value}
                            >
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                {/* Percentage Field - Kept Intact */}
                <FormField
                  control={control}
                  name={`tipUsageDisclosure.${index}.percentage`}
                  render={({ field }) => (
                    <div className="flex w-24 items-center gap-1">
                      <Input
                        type="number"
                        {...field}
                        onChange={e => field.onChange(Number(e.target.value))}
                        className="bg-[#3b3b3b] text-center"
                      />
                      <span className="text-sm">%</span>
                    </div>
                  )}
                />

                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="cursor-pointer rounded-md p-1 hover:bg-white"
                >
                  <X className="text-destructive size-5" />
                </button>
              </div>

              {/* Hidden input to keep customLabel in the form state for the schema */}
              <input
                type="hidden"
                {...register(`tipUsageDisclosure.${index}.customLabel`)}
              />
            </div>
          ))}

          <Button
            type="button"
            onClick={() =>
              append({
                usageType: "LOGISTICS",
                customLabel: "Logistics",
                percentage: 0,
                enabled: true,
              })
            }
            className="bg-white text-black hover:bg-white/80"
          >
            + Add tip usage allocation
          </Button>

          {/* Total calculation section stays the same as your original code */}
          <div className="mt-2 flex justify-between border-t border-white/20 pt-2 text-sm">
            <span>Total Allocation</span>
            <span
              className={
                totalPercentage === 100 ? "text-success" : "text-destructive"
              }
            >
              {totalPercentage > 100
                ? "Please keep your total tip allocation at 100%"
                : "You have allocated " + totalPercentage + "%"}
            </span>
          </div>
        </div>

        {/* Co-host */}
        <div className="space-y-4 rounded-lg border bg-black/25 p-4 text-white shadow">
          <div className="space-y-1">
            <h2 className="flex items-center gap-2 font-semibold">
              Co-host <span className="text-sm text-white/50">(optional)</span>
            </h2>

            <p className="text-sm text-white/50">
              Co-host has access to your channel settings and can receive payout
              report
            </p>
          </div>

          {cohostFields.map((field, index) => (
            <div
              key={field.id}
              className="flex items-center gap-2 sm:gap-4"
            >
              {/* Video URL */}
              <Input
                placeholder={`Co-host full name ${index + 1}`}
                className="bg-black/15 text-white"
                {...register(`cohosts.${index}.fullName` as const)}
              />

              {/* Video Title */}
              <Input
                placeholder={`Co-host email ${index + 1}`}
                className="bg-black/15 text-white"
                {...register(`cohosts.${index}.email` as const)}
              />

              <button
                type="button"
                onClick={() => cohostRemove(index)}
                className="cursor-pointer rounded-md p-1 hover:bg-white"
              >
                <X className="text-destructive size-5" />
              </button>
            </div>
          ))}

          <Button
            type="button"
            onClick={() => cohostAppend({ fullName: "", email: "" })}
            className="bg-white text-black hover:bg-white/80"
          >
            + Add co host
          </Button>
        </div>

        <div className="space-y-6 rounded-lg border border-white bg-black/25 p-4 shadow sm:p-6">
          <div className="space-y-1">
            <h2 className="font-semibold">
              Add more videos to your your channel?
            </h2>
            <p className="text-sm text-white/50">Recommended (skip)</p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={control}
              name="liveVideoLink"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      placeholder="Video youtube link..."
                      className="bg-black/25"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="liveVideoTitle"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      placeholder="Video title..."
                      className="bg-black/25"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={control}
            name="liveVideoDescription"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    placeholder="Video description..."
                    className="bg-black/25"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {/* Reminder 1 */}
          <div className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              onChange={e => {
                const input = document.getElementById(
                  `v-0-r1`
                ) as HTMLInputElement;
              }}
            />
            <span>After</span>
            <Input
              id={`v-0-r1`}
              type="number"
              defaultValue="0"
              className="h-8 w-16 bg-black/20 text-center"
              onChange={e => {
                // If already checked, update the value in real-time
                const cb = e.target.previousElementSibling
                  ?.previousElementSibling as HTMLInputElement;
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
                  `v-0-r1`
                ) as HTMLInputElement;
              }}
            />
            <span>After</span>
            <Input
              id={`v-0-r1`}
              type="number"
              defaultValue="0"
              className="h-8 w-16 bg-black/20 text-center"
              onChange={e => {
                // If already checked, update the value in real-time
                const cb = e.target.previousElementSibling
                  ?.previousElementSibling as HTMLInputElement;
              }}
            />
            <span>mins</span>
          </div>
        </div>
      </div>
    </>
  );
};
