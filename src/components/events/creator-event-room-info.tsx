"use client";

import { useEffect, useState } from "react";

// Third-party imports
import {
  Control,
  useFormContext,
  useWatch,
  useFieldArray,
} from "react-hook-form";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Check, PencilLineIcon, X } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";

// Local imports
import { RootState } from "@/redux/store";
import { NewEventFormData } from "@/schemas";
import { setCredentials } from "@/features/auth-slice";

interface EventRoomInfoProps {
  control: Control<NewEventFormData>;
}

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
  organizationName?: string;
};

export const CreatorEventRoomInfo = ({ control }: EventRoomInfoProps) => {
  const { register, setValue } = useFormContext();
  const [isNameConfirmed, setIsNameConfirmed] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);

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

  const { user, token } = useSelector((state: RootState) => state.auth);
  const [fullName, setFullName] = useState(user?.fullName);
  const dispatch = useDispatch();

  const hasCreatedBefore = ((user as HostUser)?.numOfEvents ?? 0) > 0;

  useEffect(() => {
    setFullName(user?.fullName);
  }, [user]);

  useEffect(() => {
    // Use the flattened fields from the user object
    if (
      hasCreatedBefore ||
      (user &&
        "individualLegalFirstName" in user &&
        "fullName" in user &&
        "individualLegalLastName" in user)
    ) {
      setValue("firstName", user?.fullName.split(" ")[0]);
      setValue(
        "lastName",
        (user as HostUser)?.individualLegalLastName ??
          user?.fullName.split(" ")[1]
      );
      // setValue("organizationName", (user as HostUser)?.organizationName);
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

  return (
    <>
      {/* Basic content information */}
      <div className="space-y-6 rounded-lg border bg-black/50 p-4 text-white shadow sm:p-6">
        <p className="text-sm text-white/80">
          Signed in as host: {user?.fullName} @{user?.username}
        </p>

        <h2 className="font-semibold">
          Let&apos;s setup your private channel to host your videos
        </h2>

        <FormField
          control={control}
          name="eventName"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="relative w-fit">
                What would you like to name your private channel?{" "}
                <span className="text-destructive absolute top-0 -right-4">
                  *
                </span>
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g. Lilian's Place"
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
          name="eventDescription"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="relative w-fit">
                Private Channel Description{" "}
                <span className="text-destructive absolute top-0 -right-4">
                  *
                </span>
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g. Just vibes with Lilian"
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

        <FormField
          control={control}
          name="customerType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Are you uploading videos to this private channel as an
                individual or an organisation?{" "}
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
                      value="INDIVIDUAL"
                      id="individual"
                    />{" "}
                    <Label htmlFor="individual">Individual</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <RadioGroupItem
                      value="ORGANIZATION"
                      id="organisation"
                      disabled={
                        Boolean((user as HostUser)?.individualLegalFirstName) &&
                        Boolean((user as HostUser)?.individualLegalLastName)
                      }
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
              This must be the legal registered name of the organisation
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
                          <SelectTrigger className="w-full bg-black/15">
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
                        className="bg-black/15 text-center"
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
                totalPercentage === 100
                  ? "text-success p-2 font-medium"
                  : "text-destructive p-2 font-medium"
              }
            >
              {totalPercentage > 100 || totalPercentage < 100
                ? "Please keep your total tip allocation at 100%"
                : "You have allocated " + totalPercentage + "%"}
            </span>
          </div>
        </div>

        <div className="space-y-6 rounded-lg border border-white p-4 shadow sm:p-6">
          <div className="space-y-1">
            <h2 className="font-semibold">
              Add more videos to your private channel?
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
