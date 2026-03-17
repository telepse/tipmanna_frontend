"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// Third-party imports
import { Control, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { useSelector } from "react-redux";

// Local imports
import { AddEventBanner } from "@/components/banners/add-event-banner";
import { newEventSchema, NewEventFormData } from "@/schemas";
import { RootState } from "@/redux/store";
import { ApiError } from "@/types";
import { CircleArrowLeft, CircleArrowRight, Loader2 } from "lucide-react";
import { NewStepIndicator } from "@/components/events/new-step-indicator";
import { ContentAmountInfo } from "@/components/events/content-amount-info";
import { HostContentInfo } from "@/components/events/host-content-info";
import { CreatorEventRoomInfo } from "@/components/events/creator-event-room-info";
import { uploadImage } from "@/lib/cloudinary";
import { newCreateEventAction } from "@/actions/events";
import { EventSignInForm } from "@/components/events/event-sign-in-form";

export default function ContentOnlyPage() {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const user = useSelector((state: RootState) => state.auth.user);
  const requiresVerification = useSelector(
    (state: RootState) => state.auth.requiresVerification
  );
  const token = useSelector((state: RootState) => state.auth.token);

  const nextStep = async () => {
    let fieldsToValidate: (keyof NewEventFormData)[] = [];

    if (step === 1) {
      fieldsToValidate = ["amountToRaise"];
    } else if (step === 2) {
      fieldsToValidate = ["eventType", "hasPhysicalLocation", "videoLinks"];
    } else if (step === 3) {
      fieldsToValidate = ["performers", "sessions", "cohosts", "liveVideoLink"];
    }

    const valid = await form.trigger(fieldsToValidate);

    if (valid) setStep(s => s + 1);
  };

  const prevStep = () => setStep(step - 1);

  const form = useForm({
    resolver: zodResolver(newEventSchema),
    defaultValues: {
      amountToRaise: 0,

      videoLinks: [],
      eventName: "",

      eventDescription: "",
      organizationName: "",
      hostName: user?.fullName,
      eventType: "",
      eventBanner: "",
      eventDate: undefined,
      startTime: "",
      endTime: "",

      venueName: "",
      postalCode: "",
      venueLocation: "",
      activities: [],

      firstName: "",
      lastName: "",

      performers: [],
      sessions: [],
      cohosts: [],
      liveVideoLink: "",

      resourcesRequested: [],
      tipUsageDisclosure: [],
    },
  });

  const allValues = useWatch({ control: form.control });

  useEffect(() => {
    console.log("Current form values:", allValues);
  }, [allValues]);

  const router = useRouter();

  const onSubmit = async (values: NewEventFormData) => {
    try {
      setIsLoading(true);

      let imageUrl = "";

      if (values.eventBanner) {
        // Upload logo to cloudinary
        const res = await uploadImage(values.eventBanner);
        imageUrl = res?.secure_url ?? "";

        toast.success("Event banner uploaded successfully");
      }

      const result = await newCreateEventAction(
        { ...values, eventBanner: imageUrl },
        token!
      );

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success("Event added successfully");

      // redirect to manage event page
      if (user?.role === "HOST") {
        router.push(`/room/${result.data.event.id}`);
      } else {
        toast.error("Only hosts can create events");
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(err.message);
      } else if (typeof err === "object" && err !== null && "error" in err) {
        const apiErr = err as ApiError;
        toast.error(apiErr.error.message);
      } else {
        toast.error("Failed to create event");
      }
    } finally {
      setIsLoading(false); // reset loading state
    }
  };

  return (
    <div
      style={{
        backgroundColor: "rgba(0, 0, 0, 0.10)",
      }}
    >
      <AddEventBanner title="Create new content" />

      <div className="mini-wrapper space-y-6 p-4 sm:p-6">
        <NewStepIndicator step={step} />

        <Form {...form}>
          {step === 1 && <ContentAmountInfo control={form.control} />}
          {step === 2 && (
            <HostContentInfo
              control={form.control as unknown as Control<NewEventFormData>}
            />
          )}
          {step === 3 &&
            (user && !requiresVerification ? (
              <CreatorEventRoomInfo
                control={form.control as unknown as Control<NewEventFormData>}
              />
            ) : (
              <EventSignInForm />
            ))}

          <div className="flex flex-wrap justify-center gap-4">
            {step > 1 && (
              <button
                type="button"
                onClick={prevStep}
                className="cursor-pointer rounded-full bg-black hover:bg-black/80"
              >
                <CircleArrowLeft className="size-8 text-white" />
              </button>
            )}

            {step < 3 ? (
              <button
                type="button"
                onClick={nextStep}
                className="cursor-pointer rounded-full bg-black hover:bg-black/80"
              >
                <CircleArrowRight className="size-8 text-white" />
              </button>
            ) : (
              <Button
                type="button"
                size="lg"
                disabled={isLoading}
                onClick={form.handleSubmit(onSubmit)}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin" /> Submitting for
                    approval...
                  </span>
                ) : (
                  <span>Submit for approval</span>
                )}
              </Button>
            )}
          </div>
        </Form>
      </div>
    </div>
  );
}
