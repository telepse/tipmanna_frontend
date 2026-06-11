"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useEffect, useMemo, useRef, useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { useAppRouter } from "@/components/navigation/navigation-progress-provider";
import SignInDialog from "@/components/auth/sign-in-dialog";
import { useSelector } from "react-redux";
import { useRouter } from "next/navigation";
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
  getHostEventsAction,
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
import { Button } from "@/components/ui/button";
import { isHostRole } from "@/lib/is-host-role";

type SignInIntent = "add-video" | "type-picker-proceed" | null;

interface Props {
  openPopup: boolean;
  setOpenPopup: (value: boolean) => void;
  /**
   * When true, always show the event / content / event+content picker (routes on proceed),
   * even for hosts when Community is enabled (Explore uses this; dashboard can keep add-video flow).
   */
  forceTypePicker?: boolean;
  /** Use explore-layer z-index so the dialog sits above explore filter chrome. */
  onExploreLayer?: boolean;
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
  forceTypePicker = false,
  onExploreLayer = false,
}: Props) => {
  const { push } = useAppRouter();
  const router = useRouter();
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
  const [resumeVideoSubmit, setResumeVideoSubmit] = useState(false);

  const [hostSessionActive, setHostSessionActive] = useState(false);
  const [hostSessionProbed, setHostSessionProbed] = useState(false);
  const isHostFromRedux = isHostRole(user?.role);
  const showHostCreateFlow =
    communityFeatureOn &&
    !forceTypePicker &&
    (isHostFromRedux || hostSessionActive);

  useEffect(() => {
    if (!openPopup) {
      setIsProceeding(false);
      setShowNewEventRoomPicker(false);
      setHostSessionActive(false);
      setHostSessionProbed(false);
    }
  }, [openPopup]);

  useEffect(() => {
    if (!openPopup || forceTypePicker || !communityFeatureOn) return;

    if (isHostFromRedux) {
      setHostSessionActive(true);
      setHostSessionProbed(true);
    } else {
      setHostSessionActive(false);
      setHostSessionProbed(false);
    }

    setPickerLoading(true);
    (async () => {
      const [evRes, commRes] = await Promise.all([
        getHostEventsAction(),
        getMyCommunitiesAction(),
      ]);

      if (evRes.success) {
        setHostSessionActive(true);
      } else if (!isHostFromRedux) {
        setHostSessionActive(false);
      }

      if (evRes.success && evRes.data) {
        const raw = evRes.data as HostEventRow[] | { data?: HostEventRow[] };
        const list = Array.isArray(raw)
          ? raw
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

      setHostSessionProbed(true);
      setPickerLoading(false);
    })();
  }, [openPopup, forceTypePicker, isHostFromRedux, user?.id]);

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

  const handleProceed = () => {
    if (!selected || isProceeding) return;

    let href = "/";
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
        href = "/";
    }

    if (!user) {
      setSignInIntent("type-picker-proceed");
      setPendingHref(href);
      setSignInOpen(true);
      return;
    }

    setIsProceeding(true);
    setOpenPopup(false);
    push(href);
  };

  const handleModalSignInSuccess = () => {
    setSignInOpen(false);
    if (signInIntent === "type-picker-proceed" && pendingHref) {
      setIsProceeding(true);
      setOpenPopup(false);
      push(pendingHref);
      setPendingHref(null);
      setSignInIntent(null);
      return;
    }
    if (signInIntent === "add-video" && pendingVideoSubmitRef.current) {
      setOpenPopup(true);
      setSignInIntent(null);
      setResumeVideoSubmit(true);
      return;
    }
    setOpenPopup(true);
    setSignInIntent(null);
  };

  const handleHostVideoSubmit = async (values: AddVideoFormValues) => {
    if (!showHostCreateFlow) {
      pendingVideoSubmitRef.current = values;
      setSignInIntent("add-video");
      setSignInOpen(true);
      toast.error("Sign in to add a video");
      return;
    }
    if (!targetId) {
      toast.error("Choose an event or community first");
      return;
    }
    setSubmitLoading(true);
    try {
      const payload = buildCreateChannelPayload(values);
      if (hostTab === "event") {
        const res = await createEventChannelAction(payload, targetId);
        if (!res.success) {
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
        const res = await addCommunityVideoAction(undefined, targetId, payload);
        if (!res.success) {
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
      setSubmitLoading(false);
    }
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

  const signInDialog = (
    <SignInDialog
      open={signInOpen}
      onOpenChange={setSignInOpen}
      title="Sign in to continue"
      defaultUserType="host"
      onSuccess={handleModalSignInSuccess}
      overlayClassName={signInOverlayZIndex}
      contentClassName={signInContentZIndex}
    />
  );

  const awaitingHostSessionProbe =
    openPopup &&
    communityFeatureOn &&
    !forceTypePicker &&
    !isHostFromRedux &&
    !hostSessionProbed;

  if (awaitingHostSessionProbe) {
    return (
      <>
        <Dialog
          open={openPopup}
          onOpenChange={setOpenPopup}
        >
          <DialogContent
            overlayClassName={dialogOverlayZIndex}
            className={`${dialogContentZIndex} rounded-2xl border-2 border-white/70 bg-black/60 p-6 text-white shadow-2xl sm:max-w-md`}
          >
            <DialogHeader>
              <DialogTitle className="text-white/70">Add a video</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-white/70">Checking your host session…</p>
          </DialogContent>
        </Dialog>
        {signInDialog}
      </>
    );
  }

  if (showHostCreateFlow) {
    return (
      <>
        <Dialog
          open={openPopup}
          onOpenChange={setOpenPopup}
        >
          <DialogContent
            overlayClassName={dialogOverlayZIndex}
            className={`${dialogContentZIndex} max-h-[90vh] overflow-y-auto rounded-2xl border-2 border-white/70 bg-black/60 p-6 text-white shadow-2xl sm:max-w-2xl`}
          >
            <DialogHeader>
              <DialogTitle className="text-white/70">
                {showNewEventRoomPicker
                  ? "Create new event room"
                  : "Add a video"}
              </DialogTitle>
            </DialogHeader>

            {pickerLoading ? (
              <p className="text-sm text-white/70">Loading your events…</p>
            ) : showNewEventRoomPicker ? (
              <>
                <p className="text-sm text-white/70">
                  Choose what you are creating. You will continue on the full
                  create form.
                </p>
                <RadioGroup
                  value={selected}
                  onValueChange={setSelected}
                  className="mt-3 grid gap-2"
                >
                  {[
                    { value: "content", title: "Content only" },
                    { value: "event", title: "Event room" },
                    { value: "event_content", title: "Event and content" },
                  ].map(opt => (
                    <Label
                      key={opt.value}
                      htmlFor={`host-new-${opt.value}`}
                      className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/30 bg-[#251212] p-3 text-white"
                    >
                      <RadioGroupItem
                        value={opt.value}
                        id={`host-new-${opt.value}`}
                      />
                      {opt.title}
                    </Label>
                  ))}
                </RadioGroup>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="border-white/40 text-white"
                    onClick={() => setShowNewEventRoomPicker(false)}
                  >
                    Back to add video
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
            ) : (
              <>
                <div className="mb-4">
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full sm:w-auto"
                    onClick={() => setShowNewEventRoomPicker(true)}
                  >
                    Create new event room
                  </Button>
                  <p className="mt-2 text-xs text-white/50">
                    Or add a video to an existing event or community below.
                  </p>
                </div>
                <Tabs
                  value={hostTab}
                  onValueChange={v =>
                    setHostTab(v as "event" | "owner" | "cocreator")
                  }
                  className="w-full"
                >
                  <TabsList className="mb-4 grid w-full grid-cols-3 gap-1 bg-white/10">
                    <TabsTrigger
                      value="event"
                      className="text-xs sm:text-sm"
                    >
                      Event
                    </TabsTrigger>
                    <TabsTrigger
                      value="owner"
                      className="text-xs sm:text-sm"
                    >
                      My community
                    </TabsTrigger>
                    <TabsTrigger
                      value="cocreator"
                      className="text-xs sm:text-sm"
                    >
                      Co-create
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="event">
                    <Label className={CREATE_FORM_LABEL_CLASS}>Event</Label>
                    <Select
                      value={targetId}
                      onValueChange={setTargetId}
                    >
                      <SelectTrigger
                        className={`mt-2 ${CREATE_FORM_SELECT_TRIGGER_CLASS}`}
                      >
                        <SelectValue placeholder="Select event" />
                      </SelectTrigger>
                      <SelectContent
                        className={CREATE_FORM_SELECT_CONTENT_CLASS}
                      >
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
                  <TabsContent value="owner">
                    <Label className={CREATE_FORM_LABEL_CLASS}>
                      Community you own
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
                      <SelectContent
                        className={CREATE_FORM_SELECT_CONTENT_CLASS}
                      >
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
                  <TabsContent value="cocreator">
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
                      <SelectContent
                        className={CREATE_FORM_SELECT_CONTENT_CLASS}
                      >
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
                    onFormReady={setAddVideoForm}
                    onDraftIdChange={setModalDraftId}
                    draftAutosave={
                      hostTab === "owner" && targetId
                        ? {
                            kind: "community_video",
                            targetId,
                            enabled: true,
                          }
                        : hostTab === "event" && targetId
                          ? {
                              kind: "room_add_video",
                              targetId,
                              enabled: true,
                            }
                          : undefined
                    }
                  />
                ) : (
                  <p className="mt-4 text-sm text-white/55">
                    Choose an event or community above to add a video.
                  </p>
                )}
              </>
            )}
          </DialogContent>
        </Dialog>
        {signInDialog}
      </>
    );
  }

  return (
    <>
      <Dialog
        open={openPopup}
        onOpenChange={setOpenPopup}
      >
        <DialogContent
          overlayClassName={dialogOverlayZIndex}
          className={`${dialogContentZIndex} rounded-2xl border-2 border-white/70 bg-black/60 p-6 text-white shadow-2xl sm:max-w-md`}
        >
          <DialogHeader>
            <DialogTitle className="text-white/70">
              What are you creating?
            </DialogTitle>
          </DialogHeader>

          <div className="mt-4 grid w-full grid-cols-1 gap-4 md:grid-cols-3">
            <RadioGroup
              value={selected}
              onValueChange={setSelected}
              className="grid w-full grid-cols-1"
            >
              {[
                {
                  value: "content",
                  title: "Content",
                  subtitle: "Upload videos to create content",
                  description: "Suitable for content creators",
                },
                {
                  value: "event",
                  title: "Event",
                  subtitle: "Livestream your event and share",
                  description: "Suitable for event organizers",
                },
                {
                  value: "event_content",
                  title: "Event and Content",
                  subtitle: "Livestream and upload videos",
                  description: "Suitable for charity and event",
                },
              ].map(option => (
                <Label
                  key={option.value}
                  htmlFor={option.value}
                  className="relative flex w-full flex-col sm:w-[400px] sm:flex-row"
                >
                  <div
                    className={`w-full sm:w-[400px] ${selected === option.value ? "border-primary bg-primary/20" : "border-white/30 bg-[#251212]"} duration transition-300 flex w-full items-center justify-between gap-2 rounded-2xl border-2 p-4 text-white shadow-2xl`}
                  >
                    <div className="relative flex w-full">
                      <div className="flex flex-col gap-1">
                        <h5>{option.title}</h5>
                        <p className="text-xs text-white/80">
                          {option.subtitle}
                        </p>
                        <span className="inline-block text-[10px] text-white/50 sm:hidden">
                          {option.description}
                        </span>
                      </div>

                      <RadioGroupItem
                        className={`absolute top-1/2 right-2 -translate-y-1/2 ${selected === option.value ? "bg-primary" : "bg-[#3b3b3b]"}`}
                        value={option.value}
                        id={option.value}
                      />
                    </div>
                  </div>

                  <span className="hidden text-xs text-white/80 sm:inline-block">
                    {option.description}
                  </span>
                </Label>
              ))}
            </RadioGroup>
          </div>

          <p className="mt-3 text-center text-xs text-white/55">
            Sign in as a{" "}
            <button
              type="button"
              className="text-primary underline-offset-2 hover:underline"
              onClick={() => {
                setSignInIntent("type-picker-proceed");
                setSignInOpen(true);
              }}
            >
              host
            </button>{" "}
            to add videos straight to your events and communities from here when
            Community is enabled.
          </p>

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

      {signInDialog}
    </>
  );
};
