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
import { useEffect, useState } from "react";
import {
  getYoutubeChannelsAction,
  upsertYoutubeChannelAction,
  createVideoCoOwnerInviteAction,
} from "@/actions/events";
import { verifyYoutubeOwnershipAction } from "@/actions/policy";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { getPusherClient } from "@/lib/pusher";
import { toast } from "react-toastify";

type YtRow = { slot: number; url: string; locked: boolean };

export function EventContentPrivacyStep({
  control,
}: {
  control: Control<NewEventFormData>;
}) {
  const { watch, setValue, getValues } = useFormContext<NewEventFormData>();
  const user = useSelector((s: RootState) => s.auth.user);
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
    void getYoutubeChannelsAction().then(res => {
      setLoadingYt(false);
      if (res.success && res.data && typeof res.data === "object") {
        const c = (res.data as { channels?: YtRow[] }).channels;
        if (Array.isArray(c)) setChannels(c);
      }
    });
  }, [user?.id, user?.role]);

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
    if (!user?.id) {
      toast.error("Sign in required");
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
    setVerifyStatus(prev => ({ ...prev, [videoIndex]: "checking" }));
    const res = await verifyYoutubeOwnershipAction(url, slot);
    if (!res.success) {
      setVerifyStatus(prev => ({ ...prev, [videoIndex]: "failed" }));
      toast.error(res.message ?? "Verification failed");
      return;
    }
    const status = (res.data as { status?: string })?.status;
    if (status === "verified") {
      setVerifyStatus(prev => ({ ...prev, [videoIndex]: "verified" }));
      toast.success("Video verified on your YouTube channel");
    } else {
      setVerifyStatus(prev => ({ ...prev, [videoIndex]: "failed" }));
      toast.error(
        (res.data as { message?: string })?.message ??
          "Video not found on selected channel"
      );
    }
  };

  const [showCoownerInviteBlock, setShowCoownerInviteBlock] = useState(false);

  return (
    <div className="mx-auto max-w-3xl space-y-8 py-4">
      <div>
        <h2 className="text-lg font-semibold">Privacy &amp; policy</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Confirm YouTube channels and ownership for each video. Co-owner
          invites require Host Premium or Host Community.
        </p>
      </div>

      <div className="space-y-4 rounded-lg border p-4">
        <h3 className="font-medium">Your YouTube channels</h3>
        {loadingYt ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FormLabel>Primary (slot 1)</FormLabel>
              {channels.find(c => c.slot === 1) ? (
                <Input
                  readOnly
                  value={channels.find(c => c.slot === 1)?.url ?? ""}
                  className="bg-muted mt-1"
                />
              ) : (
                <div className="mt-1 flex gap-2">
                  <Input
                    value={slot1Input}
                    onChange={e => setSlot1Input(e.target.value)}
                    placeholder="https://youtube.com/@yourchannel"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => saveSlot(1, slot1Input)}
                  >
                    Save
                  </Button>
                </div>
              )}
            </div>
            <div>
              <FormLabel>Secondary (slot 2, optional)</FormLabel>
              {channels.find(c => c.slot === 2) ? (
                <Input
                  readOnly
                  value={channels.find(c => c.slot === 2)?.url ?? ""}
                  className="bg-muted mt-1"
                />
              ) : (
                <div className="mt-1 flex gap-2">
                  <Input
                    value={slot2Input}
                    onChange={e => setSlot2Input(e.target.value)}
                    placeholder="Optional second channel"
                  />
                  <Button
                    type="button"
                    variant="secondary"
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

      {videoLinks.map((_, i) => (
        <div
          key={i}
          className="space-y-3 rounded-lg border p-4"
        >
          <h4 className="font-medium">Video {i + 1}</h4>
          <FormField
            control={control}
            name={`videoLinks.${i}.ownershipAnswer`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Do you have substantial ownership rights?</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No (co-owner required)</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  type="button"
                  variant="secondary"
                  className="w-fit"
                  onClick={() => {
                    setShowCoownerInviteBlock(true);
                    // field.onChange("yes");
                  }}
                >
                  Add co-owner
                </Button>

                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name={`videoLinks.${i}.onYoutubeChannelSlot`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Is this video on your YouTube channel?</FormLabel>
                <Select
                  onValueChange={v =>
                    field.onChange(v === "none" ? null : parseInt(v, 10))
                  }
                  value={field.value == null ? "none" : String(field.value)}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">No / not applicable</SelectItem>
                    <SelectItem value="1">Primary channel</SelectItem>
                    <SelectItem value="2">Secondary channel</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />

          {(watch(`videoLinks.${i}.onYoutubeChannelSlot`) === 1 ||
            watch(`videoLinks.${i}.onYoutubeChannelSlot`) === 2) && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={verifyStatus[i] === "checking"}
              onClick={() => void verifyVideoOnChannel(i)}
            >
              {verifyStatus[i] === "checking"
                ? "Verifying…"
                : verifyStatus[i] === "verified"
                  ? "Verified on channel"
                  : "Verify on YouTube channel"}
            </Button>
          )}

          {showCoownerInviteBlock && (
            <CoOwnerInviteBlock
              index={i}
              canInvite={!!canInvite}
              videoTitle={watch(`videoLinks.${i}.title`) || `Video ${i + 1}`}
            />
          )}
        </div>
      ))}
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
  const draftKey = watch(`videoLinks.${index}.coOwnerDraftKey`);

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
    setPending(true);
    const res = await createVideoCoOwnerInviteAction({
      draftKey: dk,
      coOwnerName: name || "Co-owner",
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
    if (inv?.id && getPusherClient()) {
      const c = getPusherClient()!;
      const chName = `coowner-invite-${inv.id}`;
      const channel = c.subscribe(chName);
      channel.bind("co-owner-invite", (data: { status?: string }) => {
        if (data?.status === "approved") {
          toast.success(`Co-owner approved: ${videoTitle}`);
          channel.unbind_all();
          c.unsubscribe(chName);
        }
      });
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
    <div className="bg-muted/40 space-y-2 rounded-md p-3">
      <p className="text-sm font-medium">
        Invite co-owner (draft {draftKey?.slice(0, 8)}…)
      </p>
      <Input
        placeholder="Co-owner legal name"
        value={name}
        onChange={e => setName(e.target.value)}
      />
      <Input
        placeholder="Co-owner email"
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
      />
      <div className="flex items-center gap-2">
        <FormLabel className="shrink-0">Share % (of 100%)</FormLabel>
        <Input
          type="number"
          className="w-24"
          min={1}
          max={100}
          value={pct}
          onChange={e => setPct(Number(e.target.value))}
        />
      </div>
      <Button
        type="button"
        size="sm"
        disabled={pending}
        onClick={sendInvite}
      >
        {pending ? "Sending…" : "Send invite email"}
      </Button>
    </div>
  );
}
