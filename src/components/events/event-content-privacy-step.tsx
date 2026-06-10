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
  createVideoCoOwnerInviteAction,
} from "@/actions/events";
import { verifyYoutubeOwnershipAction } from "@/actions/policy";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { subscribeChannel, unsubscribeChannel } from "@/lib/pusher";
import { toast } from "react-toastify";
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
}: {
  control: Control<NewEventFormData>;
}) {
  const { watch, setValue, getValues } = useFormContext<NewEventFormData>();
  const user = useSelector((s: RootState) => s.auth.user);
  const token = useSelector((s: RootState) => s.auth.token);
  const videoLinks = watch("videoLinks") || [];
  const [channels, setChannels] = useState<YtRow[]>([]);
  const [loadingYt, setLoadingYt] = useState(false);
  const [slot1Input, setSlot1Input] = useState("");
  const [slot2Input, setSlot2Input] = useState("");
  const [verifyStatus, setVerifyStatus] = useState<
    Record<number, "idle" | "checking" | "verified" | "failed">
  >({});

  const hostTier =
    user?.role === "HOST"
      ? (user as { hostSubscriptionTier?: string }).hostSubscriptionTier
      : undefined;
  const canInvite =
    hostTier === "HOST_PREMIUM" || hostTier === "HOST_COMMUNITY";

  useEffect(() => {
    videoLinks.forEach((_, i) => {
      const k = getValues(`videoLinks.${i}.coOwnerDraftKey`);
      if (!k) {
        setValue(`videoLinks.${i}.coOwnerDraftKey`, crypto.randomUUID());
      }
    });
  }, [videoLinks.length, getValues, setValue]);

  useEffect(() => {
    if (!user?.id || user?.role !== "HOST") return;
    setLoadingYt(true);
    void getYoutubeChannelsAction(token).then(res => {
      setLoadingYt(false);
      if (res.success && res.data && typeof res.data === "object") {
        const c = (res.data as { channels?: YtRow[] }).channels;
        if (Array.isArray(c)) setChannels(c);
      } else if (!res.success) {
        toast.error(res.message ?? "Could not load your YouTube channels");
      }
    });
  }, [user?.id, user?.role, token]);

  const saveSlot = async (slot: number, url: string) => {
    if (!user?.id) {
      toast.error("Sign in required");
      return;
    }
    const res = await upsertYoutubeChannelAction(
      {
        slot,
        url: url.trim(),
        rawUrl: url.trim(),
      },
      token
    );
    if (!res.success) {
      toast.error(res.message ?? "Could not save channel");
      return;
    }
    toast.success("YouTube channel saved");
    const r = await getYoutubeChannelsAction(token);
    if (r.success && r.data && typeof r.data === "object") {
      const c = (r.data as { channels?: YtRow[] }).channels;
      if (Array.isArray(c)) setChannels(c);
    }
  };

  const verifyVideoOnChannel = async (videoIndex: number) => {
    const url = getValues(`videoLinks.${videoIndex}.url`)?.trim();
    const slot = getValues(`videoLinks.${videoIndex}.onYoutubeChannelSlot`);
    const ownership = getValues(`videoLinks.${videoIndex}.ownershipAnswer`);
    if (!user?.id || user.role !== "HOST") {
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
    setVerifyStatus(prev => ({ ...prev, [videoIndex]: "checking" }));
    setValue(`videoLinks.${videoIndex}.isOnHostYoutube`, false);
    const res = await verifyYoutubeOwnershipAction(url, slot, token);
    if (!res.success) {
      setVerifyStatus(prev => ({ ...prev, [videoIndex]: "failed" }));
      toast.error(res.message ?? "Verification failed");
      return;
    }
    const status = (res.data as { status?: string })?.status;
    if (status === "verified") {
      setVerifyStatus(prev => ({ ...prev, [videoIndex]: "verified" }));
      setValue(`videoLinks.${videoIndex}.isOnHostYoutube`, true);
      toast.success("Video verified on your YouTube channel");
    } else {
      setVerifyStatus(prev => ({ ...prev, [videoIndex]: "failed" }));
      setValue(`videoLinks.${videoIndex}.isOnHostYoutube`, false);
      toast.error(
        (res.data as { message?: string })?.message ??
          "Video not found on selected channel"
      );
    }
  };

  const [coOwnerBlockIndex, setCoOwnerBlockIndex] = useState<number | null>(
    null
  );

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
            invites require Host Premium or Host Community.
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
                      if (value !== "no") {
                        setCoOwnerBlockIndex(prev =>
                          prev === i ? null : prev
                        );
                      }
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

                  {field.value === "no" ? (
                    <Button
                      type="button"
                      className="w-fit bg-white text-black hover:bg-white/80"
                      onClick={() => setCoOwnerBlockIndex(i)}
                    >
                      Add co-owner
                    </Button>
                  ) : null}

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

            {coOwnerBlockIndex === i ? (
              <CoOwnerInviteBlock
                index={i}
                canInvite={!!canInvite}
                videoTitle={watch(`videoLinks.${i}.title`) || `Video ${i + 1}`}
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
}: {
  index: number;
  canInvite: boolean;
  videoTitle: string;
}) {
  const user = useSelector((s: RootState) => s.auth.user);
  const { getValues, watch } = useFormContext<NewEventFormData>();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pct, setPct] = useState(25);
  const [pending, setPending] = useState(false);
  const [coOwnerInviteChannel, setCoOwnerInviteChannel] = useState<
    string | null
  >(null);
  const draftKey = watch(`videoLinks.${index}.coOwnerDraftKey`);

  useEffect(() => {
    if (!coOwnerInviteChannel) return;
    const channel = subscribeChannel(coOwnerInviteChannel);
    if (!channel) return;

    const handler = (data: { status?: string }) => {
      if (data?.status === "approved") {
        toast.success(`Co-owner approved: ${videoTitle}`);
        setCoOwnerInviteChannel(null);
      }
    };

    channel.bind("co-owner-invite", handler);
    return () => {
      channel.unbind("co-owner-invite", handler);
      unsubscribeChannel(coOwnerInviteChannel);
    };
  }, [coOwnerInviteChannel, videoTitle]);

  const sendInvite = async () => {
    if (!canInvite) {
      toast.error(
        "Upgrade to Host Premium or Host Community to invite co-owners."
      );
      return;
    }
    const dk = getValues(`videoLinks.${index}.coOwnerDraftKey`);
    if (!user?.id || !dk) {
      toast.error("Missing session or draft id");
      return;
    }
    if (!email.trim()) {
      toast.error("Co-owner email is required");
      return;
    }
    if (!name.trim()) {
      toast.error("Co-owner legal name is required");
      return;
    }
    setPending(true);
    const res = await createVideoCoOwnerInviteAction({
      draftKey: dk,
      coOwnerName: name.trim(),
      coOwnerEmail: email.trim(),
      payoutPercentBp: Math.round(pct * 100),
    });
    setPending(false);
    if (!res.success) {
      toast.error(res.message ?? "Invite failed");
      return;
    }
    const inv = (res.data as { invite?: { id?: string } })?.invite;
    toast.success("Invite sent — co-owner must approve via email");
    if (inv?.id) {
      setCoOwnerInviteChannel(`coowner-invite-${inv.id}`);
    }
  };

  if (!canInvite) {
    return (
      <p className="text-destructive text-sm">
        You need Host Premium or Host Community to add a co-owner for this
        video.
      </p>
    );
  }

  return (
    <div className="space-y-2 rounded-md border border-white/20 bg-black/20 p-3">
      <p className="text-sm font-medium text-white/90">
        Invite co-owner (draft {draftKey?.slice(0, 8)}…)
      </p>
      <Input
        placeholder="Co-owner legal name"
        className={CREATE_FORM_INPUT_CLASS}
        value={name}
        onChange={e => setName(e.target.value)}
      />
      <Input
        placeholder="Co-owner email"
        type="email"
        className={CREATE_FORM_INPUT_CLASS}
        value={email}
        onChange={e => setEmail(e.target.value)}
      />
      <div className="flex items-center gap-2">
        <FormLabel className={`shrink-0 ${CREATE_FORM_LABEL_CLASS}`}>
          Share % (of 100%)
        </FormLabel>
        <Input
          type="number"
          className={`w-24 ${CREATE_FORM_INPUT_CLASS}`}
          min={1}
          max={100}
          value={pct}
          onChange={e => setPct(Number(e.target.value))}
        />
      </div>
      <Button
        type="button"
        size="sm"
        className="bg-white text-black hover:bg-white/80"
        disabled={pending}
        onClick={sendInvite}
      >
        {pending ? "Sending…" : "Send invite email"}
      </Button>
    </div>
  );
}
