"use client";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { toast } from "react-toastify";
import { useSelector } from "react-redux";
import type { RootState } from "@/redux/store";
import { verifyYoutubeOwnershipAction } from "@/actions/policy";
import { getYoutubeChannelsAction } from "@/actions/events";
import { VideoLinkContentCountryCombobox } from "@/components/events/video-link-content-country-combobox";
import { VideoLinkContentLanguageCombobox } from "@/components/events/video-link-content-language-combobox";
import { EventVideoTypeTagPicker } from "@/components/events/event-video-type-tag-picker";
import { EVENT_VIDEO_TYPE_OPTIONS } from "@/lib/event-video-type-options";
import { AddVideoPolicyFields } from "@/components/events/add-video-policy-fields";
import {
  CREATE_FORM_INPUT_CLASS,
  CREATE_FORM_LABEL_CLASS,
  CREATE_FORM_MUTED_TEXT_CLASS,
  CREATE_FORM_SELECT_CONTENT_CLASS,
  CREATE_FORM_SELECT_ITEM_CLASS,
  CREATE_FORM_SELECT_TRIGGER_CLASS,
} from "@/lib/create-form-theme";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFormDraftAutosave } from "@/hooks/use-form-draft-autosave";
import { useModalFormDraftRestore } from "@/hooks/use-modal-form-draft-restore";
import type { FormDraftKind } from "@/actions/form-drafts";
import { modalDraftStorageKey } from "@/lib/form-draft-utils";

/** Sentinel for Radix Select (empty string not allowed as item value). */
export const MODAL_INHERIT_VIDEO_TYPE = "__inherit__";

export type AddVideoFormValues = {
  title: string;
  description: string;
  url: string;
  isLive: boolean;
  setReminder: boolean;
  reminders: {
    r1?: number;
    r2?: number;
    r3?: number;
  };
  contentLanguage: string;
  contentCountry: string;
  eventVideoType: string;
  /** Optional: link monetised traffic to a verified host YouTube slot (1–2). */
  hostYoutubeSlot: "none" | "1" | "2";
  ownershipAnswer?: "yes" | "no";
  coOwnerDraftKey: string;
};

const reminderKeys = ["r1", "r2", "r3"] as const;

function isHostRole(role: string | undefined): boolean {
  return role?.toUpperCase() === "HOST";
}

type YoutubeChannelRow = { slot: number; url: string; locked: boolean };

export function buildCreateChannelPayload(values: AddVideoFormValues) {
  const reminderNums =
    values.setReminder && values.reminders
      ? ([values.reminders.r1, values.reminders.r2, values.reminders.r3].filter(
          (n): n is number => typeof n === "number" && !Number.isNaN(n)
        ) as number[])
      : [];

  const eventVideoTypePayload =
    values.eventVideoType === MODAL_INHERIT_VIDEO_TYPE
      ? undefined
      : values.eventVideoType;

  const slot =
    values.hostYoutubeSlot === "1" || values.hostYoutubeSlot === "2"
      ? Number(values.hostYoutubeSlot)
      : null;

  return {
    title: values.title,
    description: values.description,
    url: values.url,
    isLive: values.isLive,
    reminders: reminderNums,
    contentLanguage: values.contentLanguage?.trim() || undefined,
    contentCountry: values.contentCountry?.trim() || undefined,
    eventVideoType: eventVideoTypePayload,
    ownershipAnswer: values.ownershipAnswer,
    coOwnerDraftKey: values.coOwnerDraftKey?.trim() || undefined,
    ...(slot !== null
      ? { onYoutubeChannelSlot: slot, isOnHostYoutube: true }
      : {}),
  };
}

type AddVideoFormProps = {
  onSubmit: (values: AddVideoFormValues) => Promise<void>;
  loading: boolean;
  /** Match full-page create wizards (dark glass panel) vs dashboard modals. */
  variant?: "create" | "default";
  /** Parent event.eventType — “Same as event type” label */
  eventEventType?: string;
  /** e.g. channel list + live link (event room only) */
  belowSubmit?: React.ReactNode;
  /** When true, show optional “Host YouTube slot” (saved on the channel). */
  showHostYoutubeSlot?: boolean;
  /** When true, require ownership / co-owner policy fields before submit. */
  requirePolicyFields?: boolean;
  /** Expose form instance for server error mapping in parent modals. */
  onFormReady?: (form: UseFormReturn<AddVideoFormValues>) => void;
  /** Track modal draft id for clearing after successful submit. */
  onDraftIdChange?: (id: string | null) => void;
  /** Optional autosave for modal add-video flows. */
  draftAutosave?: {
    kind: Extract<FormDraftKind, "community_video" | "room_add_video">;
    targetId: string;
    enabled?: boolean;
  };
};

export function AddVideoForm({
  onSubmit,
  loading,
  variant = "default",
  eventEventType,
  belowSubmit,
  showHostYoutubeSlot = false,
  requirePolicyFields = false,
  onFormReady,
  onDraftIdChange,
  draftAutosave,
}: AddVideoFormProps) {
  const authUser = useSelector((s: RootState) => s.auth.user);
  const isHost = isHostRole(authUser?.role);
  const [youtubeChannels, setYoutubeChannels] = useState<YoutubeChannelRow[]>(
    []
  );
  const [youtubeChannelsLoading, setYoutubeChannelsLoading] = useState(false);
  const [youtubeChannelsLoaded, setYoutubeChannelsLoaded] = useState(false);
  const [verifyState, setVerifyState] = useState<
    "idle" | "checking" | "verified" | "failed"
  >("idle");
  const [modalDraftId, setModalDraftId] = useState<string | null>(() => {
    if (typeof window === "undefined" || !draftAutosave?.targetId) return null;
    return sessionStorage.getItem(
      modalDraftStorageKey(draftAutosave.kind, draftAutosave.targetId)
    );
  });

  const form = useForm<AddVideoFormValues>({
    defaultValues: {
      title: "",
      description: "",
      url: "",
      isLive: false,
      setReminder: false,
      reminders: {},
      contentLanguage: "en-GB",
      contentCountry: "all",
      eventVideoType: MODAL_INHERIT_VIDEO_TYPE,
      hostYoutubeSlot: "none",
      coOwnerDraftKey: "",
    },
  });

  useEffect(() => {
    onFormReady?.(form);
  }, [form, onFormReady]);

  useEffect(() => {
    if (!showHostYoutubeSlot || !isHost) {
      setYoutubeChannels([]);
      setYoutubeChannelsLoaded(false);
      return;
    }
    setYoutubeChannelsLoading(true);
    void getYoutubeChannelsAction().then(res => {
      setYoutubeChannelsLoading(false);
      setYoutubeChannelsLoaded(true);
      if (res.success && res.data && typeof res.data === "object") {
        const rows = (res.data as { channels?: YoutubeChannelRow[] }).channels;
        setYoutubeChannels(Array.isArray(rows) ? rows : []);
        return;
      }
      setYoutubeChannels([]);
      if (!res.success) {
        toast.error(res.message ?? "Could not load your YouTube channels");
      }
    });
  }, [showHostYoutubeSlot, isHost, authUser?.id]);

  const slotLabel = (slot: 1 | 2) => {
    const row = youtubeChannels.find(c => c.slot === slot);
    if (!row?.url?.trim()) {
      return `Slot ${slot} — not configured (add in dashboard co-owner / YouTube tools)`;
    }
    const short = row.url.length > 48 ? `${row.url.slice(0, 45)}…` : row.url;
    return `Slot ${slot}: ${short}${row.locked ? " (locked)" : ""}`;
  };

  const watchedUrl = form.watch("url");
  const watchedSlot = form.watch("hostYoutubeSlot");

  useEffect(() => {
    setVerifyState("idle");
  }, [watchedUrl, watchedSlot]);

  useFormDraftAutosave(form.watch(), {
    kind: draftAutosave?.kind ?? "room_add_video",
    step: 1,
    title: form.watch("title") || "Add video draft",
    enabled: Boolean(draftAutosave?.enabled && draftAutosave.targetId),
    draftId: modalDraftId,
    payloadKind: "modal",
    onDraftId: id => {
      setModalDraftId(id);
      onDraftIdChange?.(id);
      if (draftAutosave?.targetId && typeof window !== "undefined") {
        sessionStorage.setItem(
          modalDraftStorageKey(draftAutosave.kind, draftAutosave.targetId),
          id
        );
      }
    },
  });

  useModalFormDraftRestore({
    kind: draftAutosave?.kind ?? "room_add_video",
    targetId: draftAutosave?.targetId ?? "",
    enabled: Boolean(draftAutosave?.enabled && draftAutosave.targetId),
    form,
    draftId: modalDraftId,
    onDraftId: id => {
      setModalDraftId(id);
      onDraftIdChange?.(id);
    },
  });

  const setReminder = form.watch("setReminder");

  const inheritEventTypeLabel =
    eventEventType &&
    EVENT_VIDEO_TYPE_OPTIONS.find(o => o.value === eventEventType)?.label;

  const isCreate = variant === "create";
  const labelClass = isCreate ? CREATE_FORM_LABEL_CLASS : undefined;
  const inputClass = isCreate ? CREATE_FORM_INPUT_CLASS : undefined;
  const mutedClass = isCreate
    ? CREATE_FORM_MUTED_TEXT_CLASS
    : "text-muted-foreground text-xs";
  const localeAppearance = isCreate ? "onDark" : "onLight";
  const tagTone = isCreate ? "dark" : "light";

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(async values => {
          const slot = values.hostYoutubeSlot;
          if (
            showHostYoutubeSlot &&
            (slot === "1" || slot === "2") &&
            verifyState !== "verified"
          ) {
            toast.error(
              "Verify the video on your YouTube channel before submitting"
            );
            return;
          }
          if (
            showHostYoutubeSlot &&
            (slot === "1" || slot === "2") &&
            !youtubeChannels.some(c => c.slot === Number(slot) && c.url?.trim())
          ) {
            toast.error(
              `Configure YouTube channel slot ${slot} in your dashboard before linking this video`
            );
            return;
          }
          if (requirePolicyFields && !values.ownershipAnswer) {
            toast.error("Please answer the ownership question");
            return;
          }
          if (requirePolicyFields && values.ownershipAnswer === "no") {
            if (!values.coOwnerDraftKey?.trim()) {
              toast.error("Co-owner draft id missing — refresh and try again");
              return;
            }
          }
          await onSubmit(values);
        })}
        className="space-y-4"
      >
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={labelClass}>Video Title</FormLabel>
              <FormControl>
                <Input
                  placeholder="My awesome event"
                  className={inputClass}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={labelClass}>Video Description</FormLabel>
              <FormControl>
                <Input
                  placeholder="My awesome event"
                  className={inputClass}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="url"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={labelClass}>Video URL</FormLabel>
              <FormControl>
                <Input
                  placeholder="https://..."
                  className={inputClass}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex flex-col gap-4 sm:flex-row sm:gap-2">
          <FormField
            control={form.control}
            name="contentCountry"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel className={labelClass}>Content Country</FormLabel>
                <FormControl>
                  <VideoLinkContentCountryCombobox
                    appearance={localeAppearance}
                    value={field.value ?? ""}
                    onChange={field.onChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="contentLanguage"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel className={labelClass}>Content Language</FormLabel>
                <FormControl>
                  <VideoLinkContentLanguageCombobox
                    appearance={localeAppearance}
                    value={field.value ?? ""}
                    onChange={field.onChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="eventVideoType"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={labelClass}>Event video type</FormLabel>
              <FormControl>
                <EventVideoTypeTagPicker
                  tone={tagTone}
                  value={
                    field.value === MODAL_INHERIT_VIDEO_TYPE
                      ? undefined
                      : field.value
                  }
                  onChange={next =>
                    field.onChange(
                      next === undefined ? MODAL_INHERIT_VIDEO_TYPE : next
                    )
                  }
                  inheritSuffix={
                    inheritEventTypeLabel ??
                    (eventEventType ? String(eventEventType) : undefined)
                  }
                />
              </FormControl>
              <p className={mutedClass}>
                Used for Explore and TV browsing filters.
              </p>
              <FormMessage />
            </FormItem>
          )}
        />

        {showHostYoutubeSlot ? (
          <>
            {isHost ? (
              <div
                className={cn(
                  "space-y-2 rounded-lg border p-3",
                  isCreate
                    ? "border-white/20 bg-white/5"
                    : "border-border bg-muted/30"
                )}
              >
                <p
                  className={cn(
                    "text-sm font-medium",
                    isCreate && "text-white"
                  )}
                >
                  Your saved YouTube channels
                </p>
                {youtubeChannelsLoading ? (
                  <p className={mutedClass}>Loading channels…</p>
                ) : youtubeChannels.some(c => c.url?.trim()) ? (
                  <ul className={cn("space-y-1 text-xs", mutedClass)}>
                    {[1, 2].map(slot => {
                      const row = youtubeChannels.find(c => c.slot === slot);
                      if (!row?.url?.trim()) return null;
                      return (
                        <li key={slot}>
                          <span className="font-medium">Slot {slot}:</span>{" "}
                          {row.url}
                        </li>
                      );
                    })}
                  </ul>
                ) : youtubeChannelsLoaded ? (
                  <p className={mutedClass}>
                    No channels saved yet. Add slot URLs in dashboard co-owner /
                    YouTube tools, then pick a slot below to verify this video.
                  </p>
                ) : null}
              </div>
            ) : (
              <p className={mutedClass}>
                Sign in as a host to link and verify videos on your YouTube
                channels.
              </p>
            )}
            <FormField
              control={form.control}
              name="hostYoutubeSlot"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={labelClass}>
                    Host YouTube channel slot
                  </FormLabel>
                  <Select
                    key={`host-yt-slot-${youtubeChannels.map(c => c.url).join("|")}`}
                    value={field.value}
                    onValueChange={v => {
                      field.onChange(v);
                      setVerifyState("idle");
                    }}
                  >
                    <FormControl>
                      <SelectTrigger
                        className={
                          isCreate
                            ? CREATE_FORM_SELECT_TRIGGER_CLASS
                            : undefined
                        }
                      >
                        <SelectValue placeholder="Not linked" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent
                      className={
                        isCreate ? CREATE_FORM_SELECT_CONTENT_CLASS : undefined
                      }
                    >
                      <SelectItem
                        value="none"
                        className={
                          isCreate ? CREATE_FORM_SELECT_ITEM_CLASS : undefined
                        }
                      >
                        Not linked
                      </SelectItem>
                      <SelectItem
                        value="1"
                        className={
                          isCreate ? CREATE_FORM_SELECT_ITEM_CLASS : undefined
                        }
                      >
                        {slotLabel(1)}
                      </SelectItem>
                      <SelectItem
                        value="2"
                        className={
                          isCreate ? CREATE_FORM_SELECT_ITEM_CLASS : undefined
                        }
                      >
                        {slotLabel(2)}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className={mutedClass}>
                    Optional. Configure and verify channels under co-owner /
                    YouTube tools where available.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
            {(form.watch("hostYoutubeSlot") === "1" ||
              form.watch("hostYoutubeSlot") === "2") && (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={verifyState === "checking"}
                onClick={async () => {
                  const url = form.getValues("url")?.trim();
                  const slot = Number(form.getValues("hostYoutubeSlot"));
                  if (!authUser) {
                    toast.error("Sign in as host to verify YouTube ownership");
                    return;
                  }
                  if (!isHost) {
                    toast.error(
                      "Host account required for YouTube verification"
                    );
                    return;
                  }
                  if (
                    !youtubeChannels.some(c => c.slot === slot && c.url?.trim())
                  ) {
                    toast.error(
                      `Save your YouTube channel URL for slot ${slot} in dashboard co-owner / YouTube tools first`
                    );
                    return;
                  }
                  if (!url) {
                    toast.error("Add a video URL first");
                    return;
                  }
                  setVerifyState("checking");
                  const res = await verifyYoutubeOwnershipAction(
                    url,
                    slot as 1 | 2
                  );
                  if (!res.success) {
                    setVerifyState("failed");
                    toast.error(res.message ?? "Verification failed");
                    return;
                  }
                  if (
                    (res.data as { status?: string })?.status === "verified"
                  ) {
                    setVerifyState("verified");
                    toast.success("Video verified on your YouTube channel");
                  } else {
                    setVerifyState("failed");
                    toast.error(
                      (res.data as { message?: string })?.message ??
                        "Video not found on selected channel"
                    );
                  }
                }}
              >
                {verifyState === "checking"
                  ? "Checking your YouTube channel..."
                  : verifyState === "verified"
                    ? "Verified on channel"
                    : "Verify on YouTube channel"}
              </Button>
            )}
          </>
        ) : null}

        {requirePolicyFields ? (
          <AddVideoPolicyFields
            form={form}
            variant={variant}
            videoTitle={form.watch("title") || "Video"}
          />
        ) : null}

        <FormField
          control={form.control}
          name="isLive"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between">
              <FormLabel className={labelClass}>Is it a live video?</FormLabel>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="setReminder"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between">
              <FormLabel className={labelClass}>
                Send reminders for tips and donations
              </FormLabel>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {setReminder && (
          <div className="space-y-4">
            <p
              className={cn(
                isCreate
                  ? "text-sm text-white/70"
                  : "text-muted-foreground text-sm"
              )}
            >
              Send reminder after
            </p>

            <div className="grid grid-cols-3 gap-4">
              {reminderKeys.map(key => (
                <FormField
                  key={key}
                  control={form.control}
                  name={`reminders.${key}`}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="flex gap-1">
                          <Input
                            type="number"
                            placeholder=""
                            {...field}
                            onChange={e =>
                              field.onChange(
                                e.target.value === ""
                                  ? undefined
                                  : Number(e.target.value)
                              )
                            }
                            className={cn("h-8 w-10", inputClass)}
                          />{" "}
                          <span
                            className={isCreate ? "text-white/80" : undefined}
                          >
                            mins
                          </span>
                        </div>
                      </FormControl>
                    </FormItem>
                  )}
                />
              ))}
            </div>
          </div>
        )}

        <Button
          type="submit"
          variant="default"
          size="lg"
          className="w-full"
          disabled={loading}
        >
          {loading ? "Saving video..." : "Save video"}
        </Button>

        {belowSubmit}
      </form>
    </Form>
  );
}
