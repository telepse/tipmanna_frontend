"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useEffect, useMemo, useRef, useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { useAppRouter } from "@/components/navigation/navigation-progress-provider";
import SignInDialog from "@/components/auth/sign-in-dialog";
import { useSelector } from "react-redux";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "react-toastify";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AddVideoForm,
  buildCreateChannelPayload,
  type AddVideoFormValues,
} from "@/components/events/add-video-form";
import {
  getHostEventsSummaryAction,
  createEventChannelAction,
} from "@/actions/events";
import {
  getMyCommunitiesAction,
  addCommunityVideoAction,
} from "@/actions/communities";
import { ApiError } from "@/types/api-error.types";
import type { RootState } from "@/redux/store";
import { applyServerFormErrors } from "@/lib/form-error-mapper";
import {
  AUTH_MODAL_OVERLAY_Z_INDEX,
  AUTH_MODAL_Z_INDEX,
  EXPLORE_MODAL_Z_INDEX,
  SIGN_IN_EXPLORE_OVERLAY_Z_INDEX,
  SIGN_IN_EXPLORE_Z_INDEX,
  SIGN_IN_NESTED_OVERLAY_Z_INDEX,
  SIGN_IN_NESTED_Z_INDEX,
} from "@/lib/drawer-z-index";
import {
  CREATE_FORM_LABEL_CLASS,
  CREATE_FORM_SELECT_CONTENT_CLASS,
  CREATE_FORM_SELECT_ITEM_CLASS,
  CREATE_FORM_SELECT_TRIGGER_CLASS,
} from "@/lib/create-form-theme";
import { clearModalFormDraft } from "@/hooks/use-modal-form-draft-restore";
import { useCreateDialogResume } from "@/hooks/use-create-dialog-resume";
import type { DraftResumeOrigin } from "@/lib/form-draft-utils";
import { Button } from "@/components/ui/button";
import { useHostCapabilityWithAuth } from "@/hooks/use-host-capability-with-auth";
import { needsCreateHostAuth } from "@/lib/needs-create-host-auth";
import { resolveCreateDialogView } from "@/lib/create-dialog-view";
import { resolveCreateDialogSignInSuccess } from "@/lib/create-dialog-signin-resume";
import {
  beginExclusiveSubmit,
  endExclusiveSubmit,
} from "@/lib/exclusive-submit";
import { cn } from "@/lib/utils";

type SignInIntent =
  | "add-video"
  | "type-picker-proceed"
  | "return-prepared"
  | null;

export type CreateDialogEntry = "default" | "add-video" | "event-room";

const FULL_CREATE_OPTIONS = [
  {
    value: "content",
    title: "Content only",
    subtitle: "Upload videos to create content",
    description: "Suitable for",
    role: "content creators",
  },
  {
    value: "event",
    title: "Event channel",
    subtitle: "Livestream your event and share",
    description: "Suitable for",
    role: "event organizers",
  },
  {
    value: "event_content",
    title: "Event and Content channel",
    subtitle: "Livestream and upload videos",
    description: "Suitable for",
    role: "charity and event",
  },
] as const;

interface Props {
  openPopup: boolean;
  setOpenPopup: (value: boolean) => void;
  /** Use explore-layer z-index so the dialog sits above explore filter chrome. */
  onExploreLayer?: boolean;
  /** Opens add-video flow or live-event picker (content-only disabled). */
  entry?: CreateDialogEntry;
}

type CommunityBrief = {
  id: string;
  name: string;
  event?: { id: string; eventType?: string } | null;
};

type HostEventRow = {
  id: string;
  eventName: string;
  eventType?: string;
};

const communityFeatureOn =
  process.env.NEXT_PUBLIC_COMMUNITY_FEATURE_ENABLED === "true";

export const CreateDialog = ({
  openPopup,
  setOpenPopup,
  onExploreLayer = false,
  entry = "default",
}: Props) => {
  const { push } = useAppRouter();
  const router = useRouter();
  const pathname = usePathname();
  const user = useSelector((s: RootState) => s.auth.user);

  const [selected, setSelected] = useState<string>("");
  const [isProceeding, setIsProceeding] = useState(false);

  const [hostTab, setHostTab] = useState<"event" | "owner" | "cocreator">(
    "event"
  );
  const [events, setEvents] = useState<HostEventRow[]>([]);
  const [owned, setOwned] = useState<CommunityBrief[]>([]);
  const [coCreated, setCoCreated] = useState<CommunityBrief[]>([]);
  const [targetId, setTargetId] = useState("");
  const [pickerLoading, setPickerLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  const [signInIntent, setSignInIntent] = useState<SignInIntent>(null);
  const [showNewEventRoomPicker, setShowNewEventRoomPicker] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [addVideoForm, setAddVideoForm] =
    useState<UseFormReturn<AddVideoFormValues> | null>(null);
  const [modalDraftId, setModalDraftId] = useState<string | null>(null);
  const pendingVideoSubmitRef = useRef<AddVideoFormValues | null>(null);
  const signInIntentRef = useRef<SignInIntent>(null);
  const pendingHrefRef = useRef<string | null>(null);
  const signInHandledRef = useRef(false);
  const submitInFlightRef = useRef(false);
  const [resumeVideoSubmit, setResumeVideoSubmit] = useState(false);

  const {
    capability,
    canReadAsHost,
    canWriteAsHost,
    sessionLoading,
    requestHostAuth,
    handleAuthRequiredError,
    refresh,
    HostAuthModal,
  } = useHostCapabilityWithAuth({
    enabled: openPopup,
  });
  const showHostCreateFlow = communityFeatureOn && canReadAsHost;
  const summarizedIntent =
    showNewEventRoomPicker || (openPopup && entry === "event-room");

  const dialogView = resolveCreateDialogView({
    openPopup,
    communityFeatureOn,
    userId: user?.id,
    userRole: user?.role,
    capabilityStatus: capability.status,
    sessionLoading,
    pickerLoading,
    canReadAsHost,
    showNewEventRoomPicker: summarizedIntent,
  });

  useCreateDialogResume({
    openCreateDialog: () => setOpenPopup(true),
    setHostTab,
    setTargetId,
    setModalDraftId,
  });

  const modalResumeOrigin: DraftResumeOrigin | undefined =
    targetId && showHostCreateFlow
      ? {
          surface: "create_dialog",
          pathname: pathname ?? "/",
          targetId,
          hostTab,
        }
      : undefined;

  useEffect(() => {
    if (!openPopup) {
      setIsProceeding(false);
      setShowNewEventRoomPicker(false);
      setSelected("");
      return;
    }
    if (entry === "event-room") {
      setShowNewEventRoomPicker(true);
      setSelected("event");
    } else if (entry === "add-video") {
      setShowNewEventRoomPicker(false);
    }
  }, [openPopup, entry]);

  const createTypeOptions = FULL_CREATE_OPTIONS;

  const isLiveEventEntry = entry === "event-room";
  const disabledCreateOptions = isLiveEventEntry
    ? new Set<string>(["content"])
    : new Set<string>();

  const handleCreateTypeChange = (value: string) => {
    if (disabledCreateOptions.has(value)) return;
    setSelected(value);
  };

  const hostEventRoomDialogTitle = "Create new channel";
  const hostEventRoomDialogSubtitle =
    "Choose what you are creating. You will continue on the full create form.";

  useEffect(() => {
    if (!openPopup || !communityFeatureOn) return;

    if (summarizedIntent) return;

    if (!user?.id || !canReadAsHost) {
      setEvents([]);
      setOwned([]);
      setCoCreated([]);
      return;
    }

    let cancelled = false;
    setPickerLoading(true);

    (async () => {
      const [evRes, commRes] = await Promise.all([
        getHostEventsSummaryAction(),
        getMyCommunitiesAction(),
      ]);

      if (cancelled) return;

      if (evRes.success && evRes.data) {
        const raw = evRes.data as
          | HostEventRow[]
          | { events?: HostEventRow[]; data?: HostEventRow[] };
        const list = Array.isArray(raw)
          ? raw
          : Array.isArray(raw?.events)
            ? raw.events
            : Array.isArray(raw?.data)
              ? raw.data
              : [];
        setEvents(list);
      } else {
        setEvents([]);
      }

      if (commRes.success && commRes.data) {
        const raw = commRes.data as {
          owned: CommunityBrief[];
          coCreator: CommunityBrief[];
        };
        setOwned(raw.owned ?? []);
        setCoCreated(raw.coCreator ?? []);
      } else {
        setOwned([]);
        setCoCreated([]);
      }

      setPickerLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [
    openPopup,
    user?.id,
    canReadAsHost,
    communityFeatureOn,
    summarizedIntent,
  ]);

  useEffect(() => {
    if (!showHostCreateFlow) return;
    if (hostTab === "event") {
      setTargetId(events[0]?.id ?? "");
    } else if (hostTab === "owner") {
      setTargetId(owned[0]?.id ?? "");
    } else {
      setTargetId(coCreated[0]?.id ?? "");
    }
  }, [hostTab, events, owned, coCreated, showHostCreateFlow]);

  const resolvedEventType = useMemo(() => {
    if (hostTab === "event") {
      return events.find(e => e.id === targetId)?.eventType;
    }
    const list = hostTab === "owner" ? owned : coCreated;
    return list.find(c => c.id === targetId)?.event?.eventType;
  }, [hostTab, targetId, events, owned, coCreated]);

  const clearSignInPending = () => {
    setSignInIntent(null);
    setPendingHref(null);
    pendingVideoSubmitRef.current = null;
  };

  const openSignInFromCreate = (
    intent: NonNullable<SignInIntent>,
    href?: string
  ) => {
    signInHandledRef.current = false;
    signInIntentRef.current = intent;
    pendingHrefRef.current = href ?? null;
    setSignInIntent(intent);
    setPendingHref(href ?? null);
    requestAnimationFrame(() => setSignInOpen(true));
  };

  const handleCreateOpenChange = (open: boolean) => {
    setOpenPopup(open);
    if (!open) {
      setSignInOpen(false);
      clearSignInPending();
    }
  };

  const handleSignInOpenChange = (open: boolean) => {
    setSignInOpen(open);
    if (!open && !signInHandledRef.current) {
      if (signInIntentRef.current === "add-video") {
        pendingVideoSubmitRef.current = null;
      }
      signInIntentRef.current = null;
      pendingHrefRef.current = null;
      clearSignInPending();
    }
  };

  const handleProceed = () => {
    if (!selected || isProceeding) return;

    let href = "/explore";
    switch (selected) {
      case "content":
        href = "/content-only";
        break;
      case "event":
        href = "/event-only";
        break;
      case "event_content":
        href = "/event-and-content";
        break;
      default:
        href = "/explore";
    }

    if (needsCreateHostAuth(user)) {
      openSignInFromCreate("type-picker-proceed", href);
      return;
    }

    setIsProceeding(true);
    setOpenPopup(false);
    push(href);
  };

  const handleModalSignInSuccess = () => {
    signInHandledRef.current = true;
    const intent = signInIntentRef.current;
    const href = pendingHrefRef.current;
    const hasPendingVideo = Boolean(pendingVideoSubmitRef.current);
    signInIntentRef.current = null;
    pendingHrefRef.current = null;
    clearSignInPending();

    const resume = resolveCreateDialogSignInSuccess({
      intent,
      href,
      hasPendingVideo,
    });

    if (resume.closeCreate) {
      setOpenPopup(false);
    } else if (resume.keepCreateOpen) {
      setOpenPopup(true);
    }

    if (resume.navigateTo) {
      setIsProceeding(true);
      push(resume.navigateTo);
    }
    if (resume.refreshHostLink) {
      void refresh();
    }
    if (resume.resumeVideoSubmit) {
      setResumeVideoSubmit(true);
    }
  };

  const handleHostVideoSubmit = async (values: AddVideoFormValues) => {
    if (!showHostCreateFlow) {
      pendingVideoSubmitRef.current = values;
      openSignInFromCreate("add-video");
      toast.error("Sign in to add a video");
      return;
    }
    if (!targetId) {
      toast.error("Choose an event or community first");
      return;
    }

    const runSubmit = async () => {
      if (submitLoading || !beginExclusiveSubmit(submitInFlightRef)) return;
      setSubmitLoading(true);
      try {
        const payload = buildCreateChannelPayload(values);
        if (hostTab === "event") {
          const res = await createEventChannelAction(payload, targetId, null, {
            fromCreateDialog: true,
          });
          if (!res.success) {
            if (handleAuthRequiredError(res, () => void runSubmit())) {
              return;
            }
            if (addVideoForm) {
              applyServerFormErrors(
                addVideoForm,
                res.validationBody ?? { message: res.message }
              );
            } else {
              toast.error(res.message ?? "Could not add video to event");
            }
            return;
          }
          toast.success(
            (res.data as { message?: string })?.message ?? "Video added"
          );
          await clearModalFormDraft("room_add_video", targetId, modalDraftId);
          setModalDraftId(null);
        } else {
          const res = await addCommunityVideoAction(
            undefined,
            targetId,
            payload,
            { useHostSession: true }
          );
          if (!res.success) {
            if (handleAuthRequiredError(res, () => void runSubmit())) {
              return;
            }
            if (addVideoForm) {
              applyServerFormErrors(
                addVideoForm,
                res.validationBody ?? { message: res.message }
              );
            } else {
              toast.error(res.message ?? "Could not submit to community");
            }
            return;
          }
          toast.success(
            (res.data as { message?: string })?.message ?? "Video submitted"
          );
          await clearModalFormDraft("community_video", targetId, modalDraftId);
          setModalDraftId(null);
        }
        setOpenPopup(false);
        router.refresh();
      } catch (err: unknown) {
        if (err instanceof Error) toast.error(err.message);
        else if (typeof err === "object" && err !== null && "error" in err) {
          toast.error((err as ApiError).error.message);
        } else {
          toast.error("Something went wrong");
        }
      } finally {
        endExclusiveSubmit(submitInFlightRef);
        setSubmitLoading(false);
      }
    };

    if (hostTab !== "event" && !canWriteAsHost) {
      pendingVideoSubmitRef.current = values;
      requestHostAuth(() => {
        pendingVideoSubmitRef.current = values;
        setResumeVideoSubmit(true);
      });
      return;
    }

    await runSubmit();
  };

  useEffect(() => {
    if (
      !resumeVideoSubmit ||
      !showHostCreateFlow ||
      !pendingVideoSubmitRef.current
    )
      return;
    const values = pendingVideoSubmitRef.current;
    pendingVideoSubmitRef.current = null;
    setResumeVideoSubmit(false);
    void handleHostVideoSubmit(values);
  }, [resumeVideoSubmit, showHostCreateFlow, user?.id]);

  const dialogOverlayZIndex = onExploreLayer
    ? EXPLORE_MODAL_Z_INDEX
    : AUTH_MODAL_OVERLAY_Z_INDEX;
  const dialogContentZIndex = onExploreLayer
    ? EXPLORE_MODAL_Z_INDEX
    : AUTH_MODAL_Z_INDEX;
  const signInOverlayZIndex = onExploreLayer
    ? SIGN_IN_EXPLORE_OVERLAY_Z_INDEX
    : SIGN_IN_NESTED_OVERLAY_Z_INDEX;
  const signInContentZIndex = onExploreLayer
    ? SIGN_IN_EXPLORE_Z_INDEX
    : SIGN_IN_NESTED_Z_INDEX;

  const createDialogOpen = openPopup && !signInOpen;

  const signInDialog = (
    <SignInDialog
      open={signInOpen}
      onOpenChange={handleSignInOpenChange}
      title="Sign in to continue"
      defaultUserType="host"
      allowInlineSignUp
      onSuccess={handleModalSignInSuccess}
      overlayClassName={signInOverlayZIndex}
      contentClassName={signInContentZIndex}
    />
  );

  const summarizedPickerContent = (
    <>
      <p className="text-sm text-white/70">{hostEventRoomDialogSubtitle}</p>
      <RadioGroup
        value={selected}
        onValueChange={handleCreateTypeChange}
        className="mt-3 grid gap-2"
      >
        {createTypeOptions.map(opt => {
          const isDisabled = disabledCreateOptions.has(opt.value);

          return (
            <Label
              key={opt.value}
              htmlFor={`host-new-${opt.value}`}
              className={cn(
                "flex items-center gap-2 rounded-lg border border-white/30 bg-[#251212] p-3 text-white",
                isDisabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
              )}
            >
              <RadioGroupItem
                value={opt.value}
                id={`host-new-${opt.value}`}
                disabled={isDisabled}
              />
              <span className="flex flex-col gap-0.5">
                <span>{opt.title}</span>
                {"subtitle" in opt ? (
                  <span className="text-xs text-white/70">{opt.subtitle}</span>
                ) : null}
              </span>
            </Label>
          );
        })}
      </RadioGroup>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          className="border-white/40 bg-white text-black"
          onClick={() => {
            if (entry === "event-room") {
              setOpenPopup(false);
              return;
            }
            setShowNewEventRoomPicker(false);
          }}
        >
          {entry === "event-room" ? "Cancel" : "Back to add video"}
        </Button>
        <Button
          type="button"
          disabled={!selected || isProceeding}
          onClick={handleProceed}
        >
          {isProceeding ? "Opening…" : "Continue"}
        </Button>
      </div>
    </>
  );

  const preparedViewContent = (
    <div className="space-y-4">
      {entry !== "event-room" ? (
        <div className="mb-4">
          <Button
            type="button"
            variant="secondary"
            className="w-full sm:w-auto"
            onClick={() => setShowNewEventRoomPicker(true)}
          >
            Create new channel
          </Button>
          <p className="mt-2 text-xs text-white/50">
            Or add a video to an existing channel or community below.
          </p>
        </div>
      ) : null}
      <Tabs
        value={hostTab}
        onValueChange={v => setHostTab(v as "event" | "owner" | "cocreator")}
        className="w-full"
      >
        <TabsList className="mb-4 grid w-full grid-cols-3 gap-1 bg-white/10">
          <TabsTrigger
            value="event"
            className="text-xs text-white data-[state=active]:bg-white data-[state=active]:text-black sm:text-sm"
          >
            Channel
          </TabsTrigger>
          <TabsTrigger
            value="owner"
            className="text-xs text-white data-[state=active]:bg-white data-[state=active]:text-black sm:text-sm"
          >
            My community
          </TabsTrigger>
          <TabsTrigger
            value="cocreator"
            className="text-xs text-white data-[state=active]:bg-white data-[state=active]:text-black sm:text-sm"
          >
            Co-create
          </TabsTrigger>
        </TabsList>
        <TabsContent
          value="event"
          className="mt-4"
        >
          <Label className={CREATE_FORM_LABEL_CLASS}>Existing Channel</Label>
          <Select
            value={targetId}
            onValueChange={setTargetId}
          >
            <SelectTrigger
              className={`mt-2 ${CREATE_FORM_SELECT_TRIGGER_CLASS}`}
            >
              <SelectValue placeholder="Select event" />
            </SelectTrigger>
            <SelectContent className={CREATE_FORM_SELECT_CONTENT_CLASS}>
              {events.map(ev => (
                <SelectItem
                  key={ev.id}
                  value={ev.id}
                  className={CREATE_FORM_SELECT_ITEM_CLASS}
                >
                  {ev.eventName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!events.length && (
            <p className="mt-2 text-xs text-white/50">
              No events found — create one from your dashboard first.
            </p>
          )}
        </TabsContent>
        <TabsContent
          value="owner"
          className="mt-4"
        >
          <Label className={CREATE_FORM_LABEL_CLASS}>Community you own</Label>
          <Select
            value={targetId}
            onValueChange={setTargetId}
          >
            <SelectTrigger
              className={`mt-2 ${CREATE_FORM_SELECT_TRIGGER_CLASS}`}
            >
              <SelectValue placeholder="Select community" />
            </SelectTrigger>
            <SelectContent className={CREATE_FORM_SELECT_CONTENT_CLASS}>
              {owned.map(c => (
                <SelectItem
                  key={c.id}
                  value={c.id}
                  className={CREATE_FORM_SELECT_ITEM_CLASS}
                >
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!owned.length && (
            <p className="mt-2 text-xs text-white/50">
              You don’t own a community yet.
            </p>
          )}
        </TabsContent>
        <TabsContent
          value="cocreator"
          className="mt-4"
        >
          <Label className={CREATE_FORM_LABEL_CLASS}>
            Community you co-create
          </Label>
          <Select
            value={targetId}
            onValueChange={setTargetId}
          >
            <SelectTrigger
              className={`mt-2 ${CREATE_FORM_SELECT_TRIGGER_CLASS}`}
            >
              <SelectValue placeholder="Select community" />
            </SelectTrigger>
            <SelectContent className={CREATE_FORM_SELECT_CONTENT_CLASS}>
              {coCreated.map(c => (
                <SelectItem
                  key={c.id}
                  value={c.id}
                  className={CREATE_FORM_SELECT_ITEM_CLASS}
                >
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!coCreated.length && (
            <p className="mt-2 text-xs text-white/50">
              Accept a co-creator invite to show communities here.
            </p>
          )}
        </TabsContent>
      </Tabs>
      {targetId ? (
        <AddVideoForm
          variant="create"
          onSubmit={handleHostVideoSubmit}
          loading={submitLoading}
          eventEventType={resolvedEventType}
          showHostYoutubeSlot
          requirePolicyFields
          hostAuth={{ canWriteAsHost, requestHostAuth }}
          mountHostAuthModal={false}
          coOwnerPolicyMode={hostTab === "cocreator" ? "ownerOnly" : "full"}
          onFormReady={setAddVideoForm}
          onDraftIdChange={setModalDraftId}
          draftAutosave={
            (hostTab === "owner" || hostTab === "cocreator") && targetId
              ? {
                  kind: "community_video",
                  targetId,
                  enabled: true,
                  resumeOrigin: modalResumeOrigin,
                }
              : hostTab === "event" && targetId
                ? {
                    kind: "room_add_video",
                    targetId,
                    enabled: true,
                    resumeOrigin: modalResumeOrigin,
                  }
                : undefined
          }
          seedDraftId={modalDraftId}
        />
      ) : (
        <p className="mt-4 text-sm text-white/55">
          Choose a channel or community above to add a video.
        </p>
      )}
    </div>
  );

  if (dialogView === "loading") {
    return (
      <>
        {createDialogOpen ? (
          <Dialog
            open
            onOpenChange={handleCreateOpenChange}
          >
            <DialogContent
              overlayClassName={dialogOverlayZIndex}
              className={`${dialogContentZIndex} rounded-2xl border-2 border-white/70 bg-black/60 p-6 text-white shadow-2xl sm:max-w-md`}
            >
              <DialogHeader>
                <DialogTitle className="text-white/70">Add a video</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-white/70">
                Checking your host session…
              </p>
            </DialogContent>
          </Dialog>
        ) : null}
        {signInDialog}
        {HostAuthModal}
      </>
    );
  }

  if (dialogView === "summarized-picker") {
    return (
      <>
        {createDialogOpen ? (
          <Dialog
            open
            onOpenChange={handleCreateOpenChange}
          >
            <DialogContent
              overlayClassName={dialogOverlayZIndex}
              className={`${dialogContentZIndex} max-h-[90vh] overflow-y-auto rounded-2xl border-2 border-white/70 bg-black/60 p-6 text-white shadow-2xl sm:max-w-2xl`}
            >
              <DialogHeader>
                <DialogTitle className="text-white/70">
                  {hostEventRoomDialogTitle}
                </DialogTitle>
              </DialogHeader>
              {summarizedPickerContent}
            </DialogContent>
          </Dialog>
        ) : null}
        {signInDialog}
        {HostAuthModal}
      </>
    );
  }

  if (dialogView === "prepared") {
    return (
      <>
        {createDialogOpen ? (
          <Dialog
            open
            onOpenChange={handleCreateOpenChange}
          >
            <DialogContent
              overlayClassName={dialogOverlayZIndex}
              className={`${dialogContentZIndex} max-h-[90vh] overflow-y-auto rounded-2xl border-2 border-white/70 bg-black/60 p-6 text-white shadow-2xl sm:max-w-2xl`}
            >
              <DialogHeader>
                <DialogTitle className="text-white/70">Add a video</DialogTitle>
              </DialogHeader>
              {pickerLoading ? (
                <p className="text-sm text-white/70">Loading your events…</p>
              ) : (
                preparedViewContent
              )}
            </DialogContent>
          </Dialog>
        ) : null}
        {signInDialog}
        {HostAuthModal}
      </>
    );
  }

  return (
    <>
      {createDialogOpen ? (
        <Dialog
          open
          onOpenChange={handleCreateOpenChange}
        >
          <DialogContent
            overlayClassName={dialogOverlayZIndex}
            className={`${dialogContentZIndex} rounded-2xl border-2 border-white/70 bg-black/60 p-6 text-white shadow-2xl sm:max-w-md`}
          >
            <DialogHeader>
              <DialogTitle className="text-white/70">
                {isLiveEventEntry
                  ? hostEventRoomDialogTitle
                  : "What are you creating?"}
              </DialogTitle>
            </DialogHeader>

            {isLiveEventEntry ? (
              <p className="text-sm text-white/70">
                {hostEventRoomDialogSubtitle}
              </p>
            ) : null}

            <div className="mt-4 grid w-full grid-cols-1 gap-4 md:grid-cols-3">
              <RadioGroup
                value={selected}
                onValueChange={handleCreateTypeChange}
                className="grid w-full grid-cols-1"
              >
                {createTypeOptions.map(option => {
                  const isDisabled = disabledCreateOptions.has(option.value);

                  return (
                    <Label
                      key={option.value}
                      htmlFor={option.value}
                      className={cn(
                        "relative flex w-full flex-col sm:w-[400px] sm:flex-row",
                        isDisabled && "cursor-not-allowed opacity-50"
                      )}
                    >
                      <div
                        className={cn(
                          "duration transition-300 flex w-full items-center justify-between gap-2 rounded-2xl border-2 p-4 text-white shadow-2xl sm:w-[270px]",
                          selected === option.value
                            ? "border-primary bg-primary/20"
                            : "border-white/30 bg-[#251212]",
                          isDisabled ? "cursor-not-allowed" : "cursor-pointer"
                        )}
                      >
                        <div className="relative flex w-full">
                          <div className="flex flex-col gap-1">
                            <h5>{option.title}</h5>
                            {"subtitle" in option ? (
                              <>
                                <p className="text-xs text-white/80">
                                  {option.subtitle}
                                </p>
                                <span className="inline-block shrink-0 text-[10px] text-white/50 sm:hidden">
                                  {option.description} for {option.role}
                                </span>
                              </>
                            ) : null}
                          </div>

                          <RadioGroupItem
                            className={`absolute top-1/2 right-2 -translate-y-1/2 ${selected === option.value ? "bg-primary" : "bg-[#3b3b3b]"}`}
                            value={option.value}
                            id={option.value}
                            disabled={isDisabled}
                          />
                        </div>
                      </div>

                      {"description" in option ? (
                        <span className="hidden text-xs text-white/80 sm:inline-block">
                          {option.description} <br /> {option.role}
                        </span>
                      ) : null}
                    </Label>
                  );
                })}
              </RadioGroup>
            </div>

            {!isLiveEventEntry && (!user || user.role === "VISITOR") ? (
              <p className="mt-3 text-center text-xs text-white/55">
                * To add videos straight to your existing channels <br /> and
                communities, sign in as a{" "}
                <button
                  type="button"
                  className="text-primary cursor-pointer underline underline-offset-2 hover:underline"
                  onClick={() => openSignInFromCreate("return-prepared")}
                >
                  host creator
                </button>{" "}
                from here.
              </p>
            ) : null}

            <div className="mt-4 flex items-center justify-between">
              <button
                className="rounded-md border border-white/70 bg-[#3b3b3b] px-2 py-1 text-sm text-white shadow-2xl"
                onClick={() => setOpenPopup(false)}
              >
                Cancel
              </button>

              <button
                type="button"
                className="bg-primary shadow- rounded-md px-2 py-1 text-sm text-white disabled:opacity-50"
                disabled={!selected || isProceeding}
                onClick={handleProceed}
              >
                {isProceeding ? "Opening…" : "Proceed"}
              </button>
            </div>
          </DialogContent>
        </Dialog>
      ) : null}

      {signInDialog}
      {HostAuthModal}
    </>
  );
};
