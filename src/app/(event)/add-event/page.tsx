"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Third-party imports
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { useSelector } from "react-redux";
import Cookies from "js-cookie";

// Local imports
import { AddEventBanner } from "@/components/banners/add-event-banner";
import { StepIndicator } from "@/components/events/step-indicator";
import { EventFormData, eventSchema } from "@/schemas";
import { BasicInfo } from "@/components/events/basic-info";
import { VenueInfo } from "@/components/events/venue-info";
import { SessionsInfo } from "@/components/events/sessions-info";
import { FinanceInfo } from "@/components/events/finance-info";
import { ProtectedRoute } from "@/components/protected-route";
import { createEventAction } from "@/actions/events";
import { RootState } from "@/redux/store";
import { ApiError } from "@/types";
import { Loader2 } from "lucide-react";
import { uploadImage } from "@/lib/cloudinary";

export default function AddNewEventPage() {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();

  const user = useSelector((state: RootState) => state.auth.user);
  const token = Cookies.get("token");

  const nextStep = async () => {
    let fieldsToValidate: (keyof EventFormData)[] = [];

    if (step === 1) {
      fieldsToValidate = [
        "amountToRaise",
        "eventName",
        "customerType",
        "niNumber",
        "eventDescription",
        "organizationName",
        "hostName",
        "eventType",
        "eventBanner",
        "eventDate",
        "startTime",
        "endTime",
      ];
    } else if (step === 2) {
      fieldsToValidate = [
        "venueName",
        "postalCode",
        "venueLocation",
        "activities",
      ];
    } else if (step === 3) {
      fieldsToValidate = ["performers", "sessions", "cohosts", "liveVideoLink"];
    } else if (step === 4) {
      fieldsToValidate = [
        "resourcesRequested",
        "bankAccountDetails",
        "tipUsageDisclosure",
      ];
    }

    const valid = await form.trigger(fieldsToValidate);
    if (valid) setStep(s => s + 1);
  };

  const prevStep = () => setStep(step - 1);

  const form = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      amountToRaise: 0,
      eventName: "",
      customerType: "",
      niNumber: "",
      eventDescription: "",
      organizationName: "",
      registrationNumber: "",
      hostName: user?.fullName,
      eventType: "",
      eventBanner: "",
      eventDate: "",
      startTime: "",
      endTime: "",

      venueName: "",
      postalCode: "",
      venueLocation: "",
      activities: [],

      performers: [],
      sessions: [],
      cohosts: [],
      liveVideoLink: "",

      resourcesRequested: [],
      bankAccountDetails: "",
      tipUsageDisclosure: [],
    },
  });

  const onSubmit = async (values: EventFormData) => {
    try {
      setIsLoading(true);

      let imageUrl = "";

      if (values.eventBanner) {
        // Upload logo to cloudinary
        const res = await uploadImage(values.eventBanner);
        imageUrl = res?.secure_url ?? "";

        toast.success("Event banner uploaded successfully");
      }

      const result = await createEventAction(
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
        router.push(`/host/${user.eventSlug}/manage-event`);
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
    <ProtectedRoute>
      <AddEventBanner title="Create an event" />

      <div className="mini-wrapper space-y-6 p-4 sm:p-6">
        <StepIndicator step={step} />

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-6"
          >
            {step === 1 && <BasicInfo control={form.control} />}
            {step === 2 && <VenueInfo control={form.control} />}
            {step === 3 && <SessionsInfo control={form.control} />}
            {step === 4 && <FinanceInfo control={form.control} />}

            <div className="flex flex-wrap justify-end gap-4">
              {step > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="border-muted-foreground text-muted-foreground"
                  onClick={prevStep}
                >
                  Back to page
                </Button>
              )}

              {step < 4 ? (
                <Button
                  type="button"
                  size="lg"
                  onClick={nextStep}
                >
                  Continue registration &rarr;
                </Button>
              ) : (
                <Button
                  type="submit"
                  size="lg"
                  disabled={isLoading}
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
          </form>
        </Form>
      </div>
    </ProtectedRoute>
  );
}
