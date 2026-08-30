/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState, type ComponentProps } from "react";

// Third-party imports
import { Control, useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { useSelector, useDispatch } from "react-redux";

// Local imports
import { AddEventBanner } from "@/components/banners/add-event-banner";
import { newEventSchema, NewEventFormData } from "@/schemas";
import { defaultEventTimeZone } from "@/lib/event-timezones";
import { buildDefaultThankYouForHost } from "@/lib/thank-you-message";
import { RootState } from "@/redux/store";
import type { AppDispatch } from "@/redux/store";
import type { HostUser } from "@/features/auth-slice";
import { ApiError } from "@/types";
import { CircleArrowLeft, CircleArrowRight, Loader2 } from "lucide-react";
import { NewStepIndicator } from "@/components/events/new-step-indicator";
import { EventAmountInfo } from "@/components/events/event-amount-info";
import { HostEventInfo } from "@/components/events/host-event-info";
import { OrganiserEventRoomInfo } from "@/components/events/organiser-event-room-info";
import { uploadImage } from "@/lib/cloudinary";
import { newCreateEventAction } from "@/actions/events";
import { EventSignInForm } from "@/components/events/event-sign-in-form";
import { validateVideoLink } from "@/lib/validateVideoLink";
import { getFormErrors } from "@/lib/getFormErrors";
import { useAppRouter } from "@/components/navigation/navigation-progress-provider";
import { EventFormHelpButton } from "@/components/events/event-form-help-button";
import { EventContentPrivacyStep } from "@/components/events/event-content-privacy-step";
import { useFormDraftRestore } from "@/hooks/use-form-draft-restore";
import { deleteFormDraftAction } from "@/actions/form-drafts";
import { applyServerFormErrors } from "@/lib/form-error-mapper";
import { validateCoOwnerDraftsForSubmit } from "@/lib/coowner-draft-submit.util";
import { useCoOwnerDraftSubmitBlocked } from "@/hooks/use-coowner-draft-submit-blocked";
import { coOwnerBlockReasonMessage } from "@/lib/coowner-submit-readiness.util";
import { useCoOwnerPusherApprovalRefresh } from "@/hooks/use-coowner-pusher-approval-refresh";
import {
  isYoutubeVerifyBlockingSubmit,
  youtubeVerifyBlockingMessage,
  type YoutubeVerifyUiState,
} from "@/lib/youtube-submit-readiness.util";
import { DraftResumeBanner } from "@/components/events/draft-resume-banner";
import { CoOwnerDraftLifecycleProvider } from "@/providers/co-owner-draft-lifecycle-provider";
import {
  useWizardDraftAutosave,
  WizardDraftAutosaveProvider,
  WizardDraftSaveIndicator,
} from "@/providers/wizard-draft-autosave-provider";
import {
  runPrivacyChecksFromForm,
  resolveLiveVideoOwnershipAnswer,
} from "@/lib/validate-privacy-video-links";
import { syncHostAuthFromCreateEventResponse } from "@/lib/sync-host-auth-after-submission";
import { useHostCapabilityWithAuth } from "@/hooks/use-host-capability-with-auth";
import { useHostPlanCapabilities } from "@/hooks/useHostPlanCapabilities";
import { NavbarShell } from "@/components/shared/navbar-shell";

export default function EventOnlyPage() {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [pendingCoOwnerInviteIds, setPendingCoOwnerInviteIds] = useState<
    string[]
  >([]);
  const [coOwnerRefreshToken, setCoOwnerRefreshToken] = useState(0);
  const [youtubeVerifyStatus, setYoutubeVerifyStatus] = useState<
    Record<number, YoutubeVerifyUiState>
  >({});

  const { push } = useAppRouter();
  const dispatch = useDispatch<AppDispatch>();

  const user = useSelector((state: RootState) => state.auth.user);
  const token = useSelector((state: RootState) => state.auth.token);
  const requiresVerification = useSelector(
    (state: RootState) => state.auth.requiresVerification
  );
  const role = user?.role;

  const tag = useSelector((state: RootState) => state.auth.tag);
  const isExistingHost = tag === "EXISTING_HOST";
  const { canWriteAsHost } = useHostCapabilityWithAuth();
  const { hasActivePremium } = useHostPlanCapabilities();

  const nextStep = async () => {
    let fieldsToValidate: (keyof NewEventFormData)[] = [];

    if (step === 1) {
      fieldsToValidate = ["amountToRaise", "thankYouMessage"];
    } else if (step === 2) {
      fieldsToValidate = ["videoLinks"];
    } else if (step === 3) {
      fieldsToValidate = ["performers", "sessions", "cohosts", "liveVideoLink"];
    }

    const validBasic = await form.trigger(fieldsToValidate);

    let validVideos = true;
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
      thankYouMessage: buildDefaultThankYouForHost({
        fullName: user?.fullName,
        username: user?.username,
      }),

      hasPhysicalLocation: "",
      customerType: "",

      videoLinks: [
        {
          url: "",
          title: "",
          description: "",
          reminders: [],
          isDefault: true, // ✅ first video is default
          /// ISO-ish language tag (e.g. en-GB); "all" means unspecified in filters
          contentLanguage: "en-GB",
          /// ISO 3166-1 alpha-2 or "all" for explore filters
          contentCountry: "all",
        },
      ],
      cohosts: [],
      eventName: "",

      eventDescription: "",
      organizationName: "",
      hostName: user?.fullName,
      eventType: "",
      eventBanner: "",
      eventDate: undefined,
      startTime: "",
      endTime: "",
      timeZone: defaultEventTimeZone(),

      venueName: "",
      postalCode: "",
      venueLocation: "",
      activities: [],

      firstName: user?.fullName.split(" ")[0] || "",
      lastName: user?.fullName.split(" ")[1] || "",

      performers: [],
      sessions: [],
      liveVideoLink: "",

      resourcesRequested: [],
      tipUsageDisclosure: [],

      contributionType: "",
    },
  });

  const runPrivacyChecks = () =>
    runPrivacyChecksFromForm(form, hasActivePremium);

  const videoLinks = form.watch("videoLinks") ?? [];
  const {
    blocked: coOwnerSubmitBlocked,
    reason: coOwnerBlockReason,
    warnings: coOwnerWarnings,
    refresh: refreshCoOwnerSubmit,
  } = useCoOwnerDraftSubmitBlocked(videoLinks);

  useCoOwnerPusherApprovalRefresh({
    draftKeys: videoLinks
      .filter(v => v.ownershipAnswer === "no")
      .map(v => v.coOwnerDraftKey),
    extraInviteIds: pendingCoOwnerInviteIds,
    onApproved: () => {
      void refreshCoOwnerSubmit();
      setCoOwnerRefreshToken(t => t + 1);
    },
  });

  const coOwnerSubmitDisabled = coOwnerSubmitBlocked;
  const youtubeVerifyDisabled = isYoutubeVerifyBlockingSubmit(
    videoLinks,
    youtubeVerifyStatus
  );
  const submitDisabled =
    isLoading || coOwnerSubmitDisabled || youtubeVerifyDisabled;
  const submitBlockedLabel = coOwnerSubmitDisabled
    ? coOwnerBlockReason
      ? coOwnerBlockReasonMessage(coOwnerBlockReason)
      : "Awaiting co-owner approval"
    : youtubeVerifyDisabled
      ? (youtubeVerifyBlockingMessage(videoLinks, youtubeVerifyStatus) ??
        "Verify on YouTube")
      : null;

  const onSubmit = async (values: NewEventFormData) => {
    if (!runPrivacyChecks()) {
      return;
    }

    const coOwnerErr = await validateCoOwnerDraftsForSubmit(
      values.videoLinks ?? []
    );
    if (coOwnerErr) {
      toast.error(coOwnerErr);
      return;
    }

    try {
      setIsLoading(true);

      let imageUrl = "";

      if (values.eventBanner) {
        // Upload logo to cloudinary
        const res = await uploadImage(values.eventBanner);
        imageUrl = res?.secure_url ?? "";

        toast.success("Event banner uploaded successfully");
      }

      const result = await newCreateEventAction({
        ...values,
        eventBanner: imageUrl,
        liveVideoOwnershipAnswer: resolveLiveVideoOwnershipAnswer(values),
        submissionKind: "event_only",
      });

      if (!result.success) {
        applyServerFormErrors(
          form,
          result.validationBody ?? { message: result.message }
        );
        return;
      }

      toast.success("Event added successfully");

      const excluded = (
        result.data as {
          excludedVideos?: Array<{ title: string; reason: string }>;
        } | null
      )?.excludedVideos;
      if (excluded?.length) {
        toast.info(
          `${excluded.length} video(s) excluded from submission: ${excluded.map(v => v.title).join(", ")}`
        );
      }

      if (canWriteAsHost) {
        syncHostAuthFromCreateEventResponse(dispatch, user, token, result.data);
      }

      if (draftId) {
        void deleteFormDraftAction(draftId);
      }

      // redirect to manage event page
      if (canWriteAsHost && user?.username) {
        push(`/@${user.username}`);
      } else {
        toast.error("Host session required to create events");
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

  const {
    restoring: draftRestoring,
    pendingDraft,
    resume: resumeDraft,
    discard: discardDraft,
  } = useFormDraftRestore(form, {
    kind: "event_only",
    enabled: canWriteAsHost,
    onDraftId: setDraftId,
    onStep: setStep,
  });

  useEffect(() => {
    const errors = getFormErrors(form.formState.errors);

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
      <NavbarShell />
      <AddEventBanner title="Create new event" />
      <CoOwnerDraftLifecycleProvider draftRestoring={draftRestoring}>
        <WizardDraftAutosaveProvider
          form={form}
          kind="event_only"
          step={step}
          title={form.watch("eventName") || "Event draft"}
          draftId={draftId}
          onDraftId={setDraftId}
          hostEnabled={canWriteAsHost}
          verifyStatus={youtubeVerifyStatus}
        >
          {canWriteAsHost ? (
            <div className="container mx-auto space-y-2 px-4 pt-2">
              <DraftResumeBanner
                draft={pendingDraft}
                onResume={resumeDraft}
                onDiscard={discardDraft}
              />
              <WizardDraftSaveIndicator />
            </div>
          ) : null}
          <div className="mt-2 flex justify-end px-4">
            <EventFormHelpButton sourceForm="event_only" />
          </div>

          <div className="mini-wrapper space-y-6 p-4 sm:p-6">
            {draftRestoring ? (
              <p className="text-muted-foreground text-center text-sm">
                Restoring draft…
              </p>
            ) : null}
            <NewStepIndicator step={step} />

            <Form {...form}>
              {step === 1 && (
                <EventAmountInfo
                  control={form.control as unknown as Control<NewEventFormData>}
                />
              )}
              {step === 2 && (
                <HostEventInfo
                  control={form.control as unknown as Control<NewEventFormData>}
                />
              )}

              {step === 3 && (
                <div className="w-full">
                  {user &&
                  canWriteAsHost &&
                  !requiresVerification &&
                  !isExistingHost ? (
                    <OrganiserEventRoomInfo control={form.control as any} />
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
                <EventContentPrivacyStepWithAutosave
                  control={form.control as unknown as Control<NewEventFormData>}
                  onCoOwnerInvitePending={inviteId =>
                    setPendingCoOwnerInviteIds(prev =>
                      prev.includes(inviteId) ? prev : [...prev, inviteId]
                    )
                  }
                  onRefreshSubmitReadiness={() => void refreshCoOwnerSubmit()}
                  coOwnerRefreshToken={coOwnerRefreshToken}
                  onVerifyStateChange={setYoutubeVerifyStatus}
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
                    {coOwnerWarnings.length > 0 ? (
                      <div className="mb-3 w-full max-w-lg rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200">
                        {coOwnerWarnings.map(w => (
                          <p key={w}>{w}</p>
                        ))}
                      </div>
                    ) : null}
                    {user && !isExistingHost && !requiresVerification && (
                      <Button
                        type="button"
                        size="lg"
                        disabled={submitDisabled}
                        onClick={form.handleSubmit(onSubmit)}
                      >
                        {isLoading ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="size-4 animate-spin" />{" "}
                            Submitting for approval...
                          </span>
                        ) : submitBlockedLabel ? (
                          <span>{submitBlockedLabel}</span>
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
        </WizardDraftAutosaveProvider>
      </CoOwnerDraftLifecycleProvider>
    </div>
  );
}

function EventContentPrivacyStepWithAutosave(
  props: Omit<ComponentProps<typeof EventContentPrivacyStep>, "onDraftSaveNow">
) {
  const { saveNow } = useWizardDraftAutosave();
  return (
    <EventContentPrivacyStep
      {...props}
      onDraftSaveNow={() => void saveNow()}
    />
  );
}
