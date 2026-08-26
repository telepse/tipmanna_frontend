"use client";

import { Control, useFormContext } from "react-hook-form";
import { NewEventFormData } from "@/schemas";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";
import {
  getYoutubeChannelsAction,
  upsertYoutubeChannelAction,
} from "@/actions/events";
import { verifyYoutubeOwnershipAction } from "@/actions/policy";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { useCoOwnerDraftFields } from "@/hooks/use-coowner-draft-fields";
import { useHostCapabilityWithAuth } from "@/hooks/use-host-capability-with-auth";
import { useHostProfile } from "@/hooks/use-host-profile";
import type { CoOwnerDraftSlice } from "@/lib/form-draft-utils";
import {
  mintYoutubeVerifyRequest,
  resolveYoutubeVerifyOutcome,
} from "@/lib/youtube-verify-request.util";
import type { YoutubeVerifyUiState } from "@/lib/youtube-submit-readiness.util";
import { CoOwnerInviteStatusRow } from "./co-owner-invite-status-row";
import { toast } from "react-toastify";
import { HostSubscriptionUpgradeTrigger } from "@/components/dashboard/host-subscription-modal";
import {
  CREATE_FORM_INPUT_CLASS,
  CREATE_FORM_LABEL_CLASS,
  CREATE_FORM_MUTED_TEXT_CLASS,
  CREATE_FORM_SECTION_CLASS,
  CREATE_FORM_SELECT_CONTENT_CLASS,
  CREATE_FORM_SELECT_ITEM_CLASS,
  CREATE_FORM_SELECT_TRIGGER_CLASS,
} from "@/lib/create-form-theme";

type YtRow = { slot: number; url: string; locked: boolean };

export function EventContentPrivacyStep({
  control,
  onCoOwnerInvitePending,
  onDraftSaveNow,
  onRefreshSubmitReadiness,
  coOwnerRefreshToken = 0,
  onVerifyStateChange,
}: {
  control: Control<NewEventFormData>;
  onCoOwnerInvitePending?: (inviteId: string) => void;
  onDraftSaveNow?: () => void | Promise<void>;
  onRefreshSubmitReadiness?: () => void;
  coOwnerRefreshToken?: number;
  onVerifyStateChange?: (status: Record<number, YoutubeVerifyUiState>) => void;
}) {
  const { watch, setValue, getValues } = useFormContext<NewEventFormData>();
  const user = useSelector((s: RootState) => s.auth.user);
  const token = useSelector((s: RootState) => s.auth.token);
  const { canWriteAsHost } = useHostCapabilityWithAuth();
  const { profile } = useHostProfile();
  const videoLinks = watch("videoLinks") || [];
  const [channels, setChannels] = useState<YtRow[]>([]);
  const [loadingYt, setLoadingYt] = useState(false);
  const [slot1Input, setSlot1Input] = useState("");
  const [slot2Input, setSlot2Input] = useState("");
  const [verifyStatus, setVerifyStatus] = useState<
    Record<number, YoutubeVerifyUiState>
  >({});
  const nextVerifyRequestIdRef = useRef(0);
  const latestVerifyRequestIdByIndexRef = useRef<Record<number, number>>({});

  const hostTier = profile?.hostSubscriptionTier;
  console.log(hostTier);
  const canInvite =
    hostTier === "HOST_PREMIUM" || hostTier === "HOST_COMMUNITY";

  useEffect(() => {
    if (!user?.id || !canWriteAsHost) return;
    setLoadingYt(true);
    void getYoutubeChannelsAction().then(res => {
      setLoadingYt(false);
      if (res.success && res.data && typeof res.data === "object") {
        const c = (res.data as { channels?: YtRow[] }).channels;
        if (Array.isArray(c)) setChannels(c);
      } else if (!res.success) {
        toast.error(res.message ?? "Could not load your YouTube channels");
      }
    });
  }, [user?.id, canWriteAsHost]);

  const saveSlot = async (slot: number, url: string) => {
    if (!user?.id) {
      toast.error("Sign in required");
      return;
    }
    const res = await upsertYoutubeChannelAction({
      slot,
      url: url.trim(),
      rawUrl: url.trim(),
    });
    if (!res.success) {
      toast.error(res.message ?? "Could not save channel");
      return;
    }
    toast.success("YouTube channel saved");
    const r = await getYoutubeChannelsAction();
    if (r.success && r.data && typeof r.data === "object") {
      const c = (r.data as { channels?: YtRow[] }).channels;
      if (Array.isArray(c)) setChannels(c);
    }
  };

  const verifyVideoOnChannel = async (videoIndex: number) => {
    const url = getValues(`videoLinks.${videoIndex}.url`)?.trim();
    const slot = getValues(`videoLinks.${videoIndex}.onYoutubeChannelSlot`);
    const ownership = getValues(`videoLinks.${videoIndex}.ownershipAnswer`);
    if (!user?.id || !canWriteAsHost) {
      toast.error("Sign in as host to verify YouTube ownership");
      return;
    }
    if (ownership !== "yes") {
      toast.error(
        "Select “Yes” for ownership before verifying on your channel"
      );
      return;
    }
    if (!url) {
      toast.error("Add a video URL first");
      return;
    }
    if (slot !== 1 && slot !== 2) {
      toast.error("Select a YouTube channel slot to verify");
      return;
    }
    if (!channels.some(c => c.slot === slot && c.url?.trim())) {
      toast.error(
        `Save your YouTube channel URL for slot ${slot} above before verifying`
      );
      return;
    }
    nextVerifyRequestIdRef.current += 1;
    const request = mintYoutubeVerifyRequest(
      url,
      slot,
      nextVerifyRequestIdRef.current
    );
    latestVerifyRequestIdByIndexRef.current[videoIndex] = request.requestId;

    setVerifyStatus(prev => ({ ...prev, [videoIndex]: "checking" }));
    setValue(`videoLinks.${videoIndex}.isOnHostYoutube`, false);
    const res = await verifyYoutubeOwnershipAction(url, slot);

    const currentUrl = getValues(`videoLinks.${videoIndex}.url`)?.trim() ?? "";
    const currentSlot = getValues(
      `videoLinks.${videoIndex}.onYoutubeChannelSlot`
    );
    const latestRequestId =
      latestVerifyRequestIdByIndexRef.current[videoIndex] ?? 0;
    const outcome = resolveYoutubeVerifyOutcome(
      request,
      latestRequestId,
      currentUrl,
      currentSlot as number,
      res
    );

    if (outcome.kind === "stale") {
      setVerifyStatus(prev => ({ ...prev, [videoIndex]: "idle" }));
      toast.info(
        "Verification cancelled — the URL or channel changed. Please verify again."
      );
      return;
    }

    if (outcome.kind === "error") {
      setVerifyStatus(prev => ({ ...prev, [videoIndex]: "failed" }));
      toast.error(outcome.message);
      return;
    }
    if (outcome.kind === "verified") {
      setVerifyStatus(prev => ({ ...prev, [videoIndex]: "verified" }));
      setValue(`videoLinks.${videoIndex}.isOnHostYoutube`, true);
      toast.success("Video verified on your YouTube channel");
      return;
    }
    setVerifyStatus(prev => ({ ...prev, [videoIndex]: "failed" }));
    setValue(`videoLinks.${videoIndex}.isOnHostYoutube`, false);
    toast.error(outcome.message);
  };

  const slotConfigured = (slot: 1 | 2) =>
    channels.some(c => c.slot === slot && c.url?.trim());

  useEffect(() => {
    videoLinks.forEach((link, i) => {
      if (link.isOnHostYoutube) {
        setVerifyStatus(prev =>
          prev[i] === "verified" ? prev : { ...prev, [i]: "verified" }
        );
      }
    });
  }, [videoLinks]);

  const verificationFingerprint = videoLinks
    .map(v => `${v.url?.trim()}|${v.onYoutubeChannelSlot}|${v.ownershipAnswer}`)
    .join(";;");
  const prevFingerprint = useRef(verificationFingerprint);

  useEffect(() => {
    if (prevFingerprint.current === verificationFingerprint) return;
    prevFingerprint.current = verificationFingerprint;
    setVerifyStatus({});
    const links = getValues("videoLinks") ?? [];
    links.forEach((_, i) => {
      setValue(`videoLinks.${i}.isOnHostYoutube`, false);
    });
  }, [verificationFingerprint, getValues, setValue]);

  useEffect(() => {
    onVerifyStateChange?.(verifyStatus);
  }, [verifyStatus, onVerifyStateChange]);

  const slotLabel = (slot: 1 | 2) => {
    const row = channels.find(c => c.slot === slot);
    if (!row?.url?.trim()) {
      return `Slot ${slot} — not configured (save above)`;
    }
    const short = row.url.length > 48 ? `${row.url.slice(0, 45)}…` : row.url;
    return `Slot ${slot}: ${short}`;
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-4">
      <div className="space-y-6 rounded-lg border-2 border-white bg-black/50 p-4 text-white shadow sm:p-6">
        <div>
          <h2 className="font-semibold">Privacy &amp; policy</h2>
          <p className={`mt-1 ${CREATE_FORM_MUTED_TEXT_CLASS}`}>
            Confirm YouTube channels and ownership for each video. Co-owner
            invites requires a paid plan.
          </p>
        </div>

        <div className={`space-y-4 ${CREATE_FORM_SECTION_CLASS}`}>
          <h3 className="font-medium text-white">Your YouTube channels</h3>
          {loadingYt ? (
            <p className={CREATE_FORM_MUTED_TEXT_CLASS}>Loading…</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <FormLabel className={CREATE_FORM_LABEL_CLASS}>
                  Primary (slot 1)
                </FormLabel>
                {channels.find(c => c.slot === 1) ? (
                  <Input
                    readOnly
                    value={channels.find(c => c.slot === 1)?.url ?? ""}
                    className={`mt-1 ${CREATE_FORM_INPUT_CLASS}`}
                  />
                ) : (
                  <div className="mt-1 flex gap-2">
                    <Input
                      value={slot1Input}
                      onChange={e => setSlot1Input(e.target.value)}
                      placeholder="https://youtube.com/@yourchannel"
                      className={CREATE_FORM_INPUT_CLASS}
                    />
                    <Button
                      type="button"
                      className="bg-white text-black hover:bg-white/80"
                      onClick={() => saveSlot(1, slot1Input)}
                    >
                      Save
                    </Button>
                  </div>
                )}
              </div>
              <div>
                <FormLabel className={CREATE_FORM_LABEL_CLASS}>
                  Secondary (slot 2, optional)
                </FormLabel>
                {channels.find(c => c.slot === 2) ? (
                  <Input
                    readOnly
                    value={channels.find(c => c.slot === 2)?.url ?? ""}
                    className={`mt-1 ${CREATE_FORM_INPUT_CLASS}`}
                  />
                ) : (
                  <div className="mt-1 flex gap-2">
                    <Input
                      value={slot2Input}
                      onChange={e => setSlot2Input(e.target.value)}
                      placeholder="Optional second channel"
                      className={CREATE_FORM_INPUT_CLASS}
                    />
                    <Button
                      type="button"
                      className="bg-white text-black hover:bg-white/80"
                      onClick={() => saveSlot(2, slot2Input)}
                    >
                      Save
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {videoLinks.map((link, i) => (
          <div
            key={i}
            className={`space-y-3 ${CREATE_FORM_SECTION_CLASS}`}
          >
            <h4 className="font-medium text-white">
              {link.title?.trim() ? link.title : `Video ${i + 1}`}
            </h4>
            {link.url?.trim() ? (
              <p className={CREATE_FORM_MUTED_TEXT_CLASS}>{link.url}</p>
            ) : null}
            <FormField
              control={control}
              name={`videoLinks.${i}.ownershipAnswer`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={CREATE_FORM_LABEL_CLASS}>
                    Do you have substantial ownership rights?
                  </FormLabel>
                  <Select
                    onValueChange={value => {
                      field.onChange(value);
                      if (value !== "yes") {
                        setValue(`videoLinks.${i}.onYoutubeChannelSlot`, null);
                        setValue(`videoLinks.${i}.isOnHostYoutube`, false);
                        setVerifyStatus(prev => ({ ...prev, [i]: "idle" }));
                      }
                    }}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger
                        className={CREATE_FORM_SELECT_TRIGGER_CLASS}
                      >
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className={CREATE_FORM_SELECT_CONTENT_CLASS}>
                      <SelectItem
                        value="yes"
                        className={CREATE_FORM_SELECT_ITEM_CLASS}
                      >
                        Yes
                      </SelectItem>
                      <SelectItem
                        value="no"
                        className={CREATE_FORM_SELECT_ITEM_CLASS}
                      >
                        No (co-owner required)
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  <FormMessage />
                </FormItem>
              )}
            />

            {watch(`videoLinks.${i}.ownershipAnswer`) === "yes" ? (
              <FormField
                control={control}
                name={`videoLinks.${i}.onYoutubeChannelSlot`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={CREATE_FORM_LABEL_CLASS}>
                      Is this video on your YouTube channel?
                    </FormLabel>
                    <Select
                      onValueChange={v => {
                        const next = v === "none" ? null : parseInt(v, 10);
                        field.onChange(next);
                        setValue(`videoLinks.${i}.isOnHostYoutube`, false);
                        setVerifyStatus(prev => ({ ...prev, [i]: "idle" }));
                      }}
                      value={field.value == null ? "none" : String(field.value)}
                    >
                      <FormControl>
                        <SelectTrigger
                          className={CREATE_FORM_SELECT_TRIGGER_CLASS}
                        >
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent
                        className={CREATE_FORM_SELECT_CONTENT_CLASS}
                      >
                        <SelectItem
                          value="none"
                          className={CREATE_FORM_SELECT_ITEM_CLASS}
                        >
                          No / not applicable
                        </SelectItem>
                        <SelectItem
                          value="1"
                          disabled={!slotConfigured(1)}
                          className={CREATE_FORM_SELECT_ITEM_CLASS}
                        >
                          {slotLabel(1)}
                        </SelectItem>
                        <SelectItem
                          value="2"
                          disabled={!slotConfigured(2)}
                          className={CREATE_FORM_SELECT_ITEM_CLASS}
                        >
                          {slotLabel(2)}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className={CREATE_FORM_MUTED_TEXT_CLASS}>
                      If this video is on one of your saved channels, select the
                      slot and verify so we can confirm it belongs to you.
                    </p>
                  </FormItem>
                )}
              />
            ) : null}

            {(watch(`videoLinks.${i}.onYoutubeChannelSlot`) === 1 ||
              watch(`videoLinks.${i}.onYoutubeChannelSlot`) === 2) &&
            watch(`videoLinks.${i}.ownershipAnswer`) === "yes" ? (
              <Button
                type="button"
                size="sm"
                className="bg-white text-black hover:bg-white/80"
                disabled={verifyStatus[i] === "checking"}
                onClick={() => void verifyVideoOnChannel(i)}
              >
                {verifyStatus[i] === "checking"
                  ? "Verifying…"
                  : verifyStatus[i] === "verified" ||
                      watch(`videoLinks.${i}.isOnHostYoutube`)
                    ? "Verified on channel"
                    : "Verify on YouTube channel"}
              </Button>
            ) : null}

            {watch(`videoLinks.${i}.ownershipAnswer`) === "no" ? (
              <CoOwnerInviteBlock
                index={i}
                canInvite={!!canInvite}
                videoTitle={watch(`videoLinks.${i}.title`) || `Video ${i + 1}`}
                onCoOwnerInvitePending={onCoOwnerInvitePending}
                onDraftSaveNow={onDraftSaveNow}
                onRefreshSubmitReadiness={onRefreshSubmitReadiness}
                refreshToken={coOwnerRefreshToken}
              />
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function CoOwnerInviteBlock({
  index,
  canInvite,
  videoTitle,
  onCoOwnerInvitePending,
  onDraftSaveNow,
  onRefreshSubmitReadiness,
  refreshToken,
}: {
  index: number;
  canInvite: boolean;
  videoTitle: string;
  onCoOwnerInvitePending?: (inviteId: string) => void;
  onDraftSaveNow?: () => void | Promise<void>;
  onRefreshSubmitReadiness?: () => void;
  refreshToken?: number;
}) {
  const { watch, setValue, getValues } = useFormContext<NewEventFormData>();
  const draftKey = watch(`videoLinks.${index}.coOwnerDraftKey`);
  const ownershipAnswer = watch(`videoLinks.${index}.ownershipAnswer`);
  const coOwner = watch(`videoLinks.${index}.coOwner`);

  const {
    name,
    email,
    pct,
    setName,
    setEmail,
    setPct,
    readOnlyInvite,
    pending,
    resending,
    canResend,
    resendCooldownSec,
    canRemove,
    removing,
    removeInvite,
    activeInvite,
    fieldErrors,
    sendInvite,
    resendInvite,
    statusIndicatorClass,
    inviteStatusLabel,
  } = useCoOwnerDraftFields({
    draftKey,
    ownershipAnswer,
    coOwner,
    setCoOwner: (values: CoOwnerDraftSlice) =>
      setValue(`videoLinks.${index}.coOwner`, values, { shouldDirty: true }),
    setDraftKey: key =>
      setValue(`videoLinks.${index}.coOwnerDraftKey`, key, {
        shouldDirty: true,
      }),
    videoTitle,
    youtubeLink: getValues(`videoLinks.${index}.url`) ?? "",
    canInvite,
    onCoOwnerInvitePending,
    onDraftSaveNow,
    onRefreshSubmitReadiness,
    refreshToken,
  });

  if (!canInvite) {
    return (
      <div className="space-y-2">
        <p className="text-destructive text-sm">
          You need Host Growth or Host Community to add a co-owner for this
          video.
        </p>
        <HostSubscriptionUpgradeTrigger
          focusTier="premium"
          label="View plans"
          variant="outline"
          title="Unlock co-owner invites"
          description="Subscribe to Host Growth or Community to invite co-owners during event creation."
        />
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-md border border-white/20 bg-black/20 p-3">
      <p className="text-sm font-medium text-white/90">
        Invite co-owner (draft {draftKey?.slice(0, 8)}…)
      </p>
      <Input
        placeholder="Co-owner legal name"
        className={`${CREATE_FORM_INPUT_CLASS} ${fieldErrors.name ? "border-destructive" : ""}`}
        value={name}
        readOnly={readOnlyInvite}
        onChange={e => {
          if (readOnlyInvite) return;
          setName(e.target.value);
        }}
      />
      {fieldErrors.name ? (
        <p className="text-destructive text-xs">{fieldErrors.name}</p>
      ) : null}
      <Input
        placeholder="Co-owner email"
        type="email"
        className={`${CREATE_FORM_INPUT_CLASS} ${statusIndicatorClass} ${fieldErrors.email ? "border-destructive" : ""}`}
        value={email}
        readOnly={readOnlyInvite}
        onChange={e => {
          if (readOnlyInvite) return;
          setEmail(e.target.value);
        }}
      />
      {fieldErrors.email ? (
        <p className="text-destructive text-xs">{fieldErrors.email}</p>
      ) : null}
      {inviteStatusLabel ? (
        <CoOwnerInviteStatusRow
          status={inviteStatusLabel}
          expiresAt={activeInvite?.expiresAt}
          resendCount={activeInvite?.resendCount}
          canResend={canResend}
          resendCooldownSec={resendCooldownSec}
          resending={resending}
          onResend={resendInvite}
          canRemove={canRemove}
          removing={removing}
          onRemove={removeInvite}
          className="text-white/90"
        />
      ) : null}
      <div className="flex items-center gap-2">
        <FormLabel className={`shrink-0 ${CREATE_FORM_LABEL_CLASS}`}>
          Co-owner share % (of 100%)
        </FormLabel>
        <Input
          type="number"
          className={`w-24 ${CREATE_FORM_INPUT_CLASS}`}
          min={1}
          max={100}
          value={pct}
          readOnly={readOnlyInvite}
          onChange={e => {
            if (readOnlyInvite) return;
            setPct(Number(e.target.value));
          }}
        />
      </div>
      {readOnlyInvite &&
      inviteStatusLabel !== "expired" &&
      inviteStatusLabel !== "declined" ? null : (
        <Button
          type="button"
          size="sm"
          className="bg-white text-black hover:bg-white/80"
          disabled={
            pending || !(getValues(`videoLinks.${index}.url`) ?? "").trim()
          }
          onClick={() => void sendInvite()}
        >
          {pending ? "Sending…" : "Send invite email"}
        </Button>
      )}
    </div>
  );
}
