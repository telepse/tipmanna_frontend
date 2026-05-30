/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";

// Third-party imports
import { Control, useForm, type Resolver } from "react-hook-form";
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
import { ContentAmountInfo } from "@/components/events/content-amount-info";
import { HostContentInfo } from "@/components/events/host-content-info";
import { CreatorEventRoomInfo } from "@/components/events/creator-event-room-info";
import { newCreateEventAction } from "@/actions/events";
import { EventSignInForm } from "@/components/events/event-sign-in-form";
import { ContentStepIndicator } from "@/components/events/content-step-indicator";
import { validateVideoLink } from "@/lib/validateVideoLink";
import { getFormErrors } from "@/lib/getFormErrors";
import { useAppRouter } from "@/components/navigation/navigation-progress-provider";
import { EventFormHelpButton } from "@/components/events/event-form-help-button";
import { EventContentPrivacyStep } from "@/components/events/event-content-privacy-step";
import { useFormDraftAutosave } from "@/hooks/use-form-draft-autosave";
import { useFormDraftRestore } from "@/hooks/use-form-draft-restore";
import { deleteFormDraftAction } from "@/actions/form-drafts";
import { applyServerFormErrors } from "@/lib/form-error-mapper";
import {
  runPrivacyChecksFromForm,
  resolveLiveVideoOwnershipAnswer,
} from "@/lib/validate-privacy-video-links";

export default function ContentOnlyPage() {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const { push } = useAppRouter();

  const user = useSelector((state: RootState) => state.auth.user);
  const requiresVerification = useSelector(
    (state: RootState) => state.auth.requiresVerification
  );
  const role = user?.role;

  // Cast to 'any' or a Record to allow arbitrary property access
  const tag = useSelector((state: RootState) => state.auth.tag);
  const isExistingHost = tag === "EXISTING_HOST";

  const nextStep = async () => {
    let fieldsToValidate: (keyof NewEventFormData)[] = [];

    // Determine which fields to validate based on the current step
    if (step === 1) {
      fieldsToValidate = ["amountToRaise"];
    } else if (step === 2) {
      fieldsToValidate = ["videoLinks", "contributionType"];
    } else if (step === 3) {
      fieldsToValidate = ["liveVideoLink", "tipUsageDisclosure"];
    }

    // Validate basic form fields
    const validBasic = await form.trigger(fieldsToValidate);

    let validVideos = true;

    // Step 2: video links validation
    if (step === 2) {
      const videoLinks = form.getValues("videoLinks") || [];

      if (videoLinks.length === 0) {
        toast.error("Please add at least one video");
        return;
      }

      const hasDefault = videoLinks.some(v => v.isDefault);
      if (!hasDefault) {
        toast.error("Please select a default video");
        return;
      }

      // Validate each video link
      const videoValidationResults = await Promise.all(
        videoLinks.map(async (link, i) => {
          // Skip validation if the video is default and empty
          if (link.isDefault && !link.url) {
            form.clearErrors(`videoLinks.${i}.url`);
            return { valid: true };
          }

          // Flag non-default empty video links
          if (!link.url) {
            form.setError(`videoLinks.${i}.url`, {
              type: "manual",
              message: "Video link is required",
            });
            return { valid: false };
          }

          // Validate actual URL
          const res = await validateVideoLink(link.url);

          if (!res.valid) {
            form.setError(`videoLinks.${i}.url`, {
              type: "manual",
              message: res.message,
            });
          } else {
            form.clearErrors(`videoLinks.${i}.url`);
          }

          return res;
        })
      );

      validVideos = videoValidationResults.every(res => res.valid);
    }

    // Move to the next step if all validations pass
    if (validBasic && validVideos) {
      setStep(s => s + 1);
    } else {
      toast.error(
        "The video link is broken or the video owner has not allowed embedding"
      );

      const errorMessages = getFormErrors(form.formState.errors);
      if (errorMessages.length > 0) {
        errorMessages.forEach(msg => toast.error(msg));
      } else {
        toast.error("Please fix the errors before continuing");
      }
    }
  };

  const prevStep = () => setStep(step - 1);

  const form = useForm<NewEventFormData>({
    resolver: zodResolver(newEventSchema) as Resolver<NewEventFormData>,
    defaultValues: {
      amountToRaise: 0,

      hasPhysicalLocation: "",
      customerType: "",
      contributionType: "",

      videoLinks: [
        {
          url: "",
          title: "",
          description: "",
          reminders: [],
          isDefault: false, // ✅ first video is default
          /// ISO-ish language tag (e.g. en-GB); "all" means unspecified in filters
          contentLanguage: "en-GB",
          /// ISO 3166-1 alpha-2 or "all" for explore filters
          contentCountry: "all",
        },
      ],
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

      firstName: user?.fullName.split(" ")[0] || "",
      lastName: user?.fullName.split(" ")[1] || "",

      performers: [],
      sessions: [],
      cohosts: [],
      liveVideoLink: "",
      liveVideoTitle: "",
      liveVideoDescription: "",

      resourcesRequested: [],
      tipUsageDisclosure: [],
    },
  });

  const runPrivacyChecks = () => runPrivacyChecksFromForm(form, user);

  const onSubmit = async (values: NewEventFormData) => {
    if (!runPrivacyChecks()) {
      return;
    }

    try {
      setIsLoading(true);

      const result = await newCreateEventAction({
        ...values,
        liveVideoOwnershipAnswer: resolveLiveVideoOwnershipAnswer(values),
      });
      console.log(result);

      const errorMessages = getFormErrors(form.formState.errors);

      if (errorMessages.length > 0) {
        errorMessages.forEach(msg => toast.error(msg));
      }

      if (!result.success) {
        applyServerFormErrors(
          form,
          result.validationBody ?? { message: result.message }
        );
        return;
      }

      toast.success("Content created successfully");

      if (draftId) {
        void deleteFormDraftAction(draftId);
      }

      // redirect to manage event page
      if (user?.role === "HOST") {
        push(`/room/${(result.data as any).event.id}`);
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

  useEffect(() => {
    if (user) {
      // Dynamically update form fields when user state changes (login/register)
      form.setValue("hostName", user.fullName);

      // Clear validation errors for these fields once they are populated
      form.clearErrors(["hostName", "firstName", "lastName"]);
    }
  }, [user, form]);

  useFormDraftAutosave(form.watch(), {
    kind: "content_only",
    step,
    title: form.watch("eventName") || "Content draft",
    enabled: user?.role === "HOST",
    draftId,
    onDraftId: setDraftId,
  });

  const { restoring: draftRestoring } = useFormDraftRestore(form, {
    kind: "content_only",
    enabled: user?.role === "HOST",
    onDraftId: setDraftId,
    onStep: setStep,
  });

  useEffect(() => {
    const errors = getFormErrors(form.formState.errors);

    console.log("errors", errors);
    console.log("form.formState.errors", form.formState.errors);

    if (errors.length > 0) {
      toast.error(errors.join("\n"));
    }
  }, [form.formState.errors]);

  return (
    <div
      style={{
        backgroundColor: "rgba(0, 0, 0, 0.10)",
      }}
    >
      <AddEventBanner title="Create new content" />
      <div className="mt-2 flex justify-end px-4">
        <EventFormHelpButton sourceForm="content_only" />
      </div>

      <div className="mini-wrapper space-y-6 p-4 sm:p-6">
        {draftRestoring ? (
          <p className="text-muted-foreground text-center text-sm">
            Restoring draft…
          </p>
        ) : null}
        <ContentStepIndicator step={step} />

        <Form {...form}>
          {step === 1 && (
            <ContentAmountInfo
              control={form.control as unknown as Control<NewEventFormData>}
            />
          )}
          {step === 2 && (
            <HostContentInfo
              control={form.control as unknown as Control<NewEventFormData>}
            />
          )}

          {step === 3 && (
            <div className="w-full">
              {user &&
              role === "HOST" &&
              !requiresVerification &&
              !isExistingHost ? (
                <CreatorEventRoomInfo control={form.control as any} />
              ) : (
                <EventSignInForm
                  role={role as any}
                  tag={tag as string}
                  onNext={nextStep}
                />
              )}
            </div>
          )}

          {step === 4 && (
            <EventContentPrivacyStep
              control={form.control as unknown as Control<NewEventFormData>}
            />
          )}

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

            {step < 4 ? (
              <button
                type="button"
                onClick={nextStep}
                className="cursor-pointer rounded-full bg-black hover:bg-black/80"
              >
                <CircleArrowRight className="size-8 text-white" />
              </button>
            ) : (
              <>
                {user && !isExistingHost && !requiresVerification && (
                  <Button
                    type="button"
                    size="lg"
                    disabled={isLoading}
                    onClick={form.handleSubmit(onSubmit)}
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="size-4 animate-spin" /> Submitting
                        for approval...
                      </span>
                    ) : (
                      <span>Submit for approval</span>
                    )}
                  </Button>
                )}
              </>
            )}
          </div>
        </Form>
      </div>
    </div>
  );
}
