"use client";

import { useEffect, useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
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
import { createVideoCoOwnerInviteAction } from "@/actions/events";
import { subscribeChannel, unsubscribeChannel } from "@/lib/pusher";
import type { RootState } from "@/redux/store";
import type { AddVideoFormValues } from "./add-video-form";
import {
  CREATE_FORM_INPUT_CLASS,
  CREATE_FORM_LABEL_CLASS,
  CREATE_FORM_SECTION_CLASS,
  CREATE_FORM_SELECT_CONTENT_CLASS,
  CREATE_FORM_SELECT_ITEM_CLASS,
  CREATE_FORM_SELECT_TRIGGER_CLASS,
} from "@/lib/create-form-theme";
import { cn } from "@/lib/utils";

type Props = {
  form: UseFormReturn<AddVideoFormValues>;
  videoTitle: string;
  variant?: "create" | "default";
};

/** Ownership + co-owner policy block for single-video add forms (modals). */
export function AddVideoPolicyFields({
  form,
  videoTitle,
  variant = "default",
}: Props) {
  const user = useSelector((s: RootState) => s.auth.user);
  const hostTier =
    user?.role === "HOST"
      ? (user as { hostSubscriptionTier?: string }).hostSubscriptionTier
      : undefined;
  const canInvite =
    hostTier === "HOST_PREMIUM" || hostTier === "HOST_COMMUNITY";

  const [coName, setCoName] = useState("");
  const [coEmail, setCoEmail] = useState("");
  const [coPct, setCoPct] = useState(25);
  const [invitePending, setInvitePending] = useState(false);
  const [coOwnerInviteChannel, setCoOwnerInviteChannel] = useState<
    string | null
  >(null);

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

  useEffect(() => {
    const key = form.getValues("coOwnerDraftKey");
    if (!key?.trim()) {
      form.setValue(
        "coOwnerDraftKey",
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `draft-${Date.now()}`
      );
    }
  }, [form]);

  const ownershipAnswer = form.watch("ownershipAnswer");
  const draftKey = form.watch("coOwnerDraftKey");
  const isCreate = variant === "create";

  const sendInvite = async () => {
    if (!canInvite) {
      toast.error(
        "Upgrade to Host Premium or Host Community to invite co-owners."
      );
      return;
    }
    const dk = form.getValues("coOwnerDraftKey")?.trim();
    if (!user?.id || !dk) {
      toast.error("Missing session or draft id");
      return;
    }
    if (!coEmail.trim()) {
      toast.error("Co-owner email is required");
      return;
    }
    setInvitePending(true);
    const res = await createVideoCoOwnerInviteAction({
      draftKey: dk,
      coOwnerName: coName.trim() || "Co-owner",
      coOwnerEmail: coEmail.trim(),
      payoutPercentBp: Math.round(coPct * 100),
    });
    setInvitePending(false);
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

  return (
    <div
      className={cn(
        "space-y-3 rounded-lg border p-4",
        isCreate ? CREATE_FORM_SECTION_CLASS : undefined
      )}
    >
      <h4
        className={cn(
          "text-sm font-medium",
          isCreate ? "text-white" : undefined
        )}
      >
        Privacy &amp; ownership
      </h4>
      <FormField
        control={form.control}
        name="ownershipAnswer"
        render={({ field }) => (
          <FormItem>
            <FormLabel
              className={isCreate ? CREATE_FORM_LABEL_CLASS : undefined}
            >
              Do you have substantial ownership rights?
            </FormLabel>
            <Select
              onValueChange={field.onChange}
              value={field.value}
            >
              <FormControl>
                <SelectTrigger
                  className={
                    isCreate ? CREATE_FORM_SELECT_TRIGGER_CLASS : undefined
                  }
                >
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent
                className={
                  isCreate ? CREATE_FORM_SELECT_CONTENT_CLASS : undefined
                }
              >
                <SelectItem
                  value="yes"
                  className={
                    isCreate ? CREATE_FORM_SELECT_ITEM_CLASS : undefined
                  }
                >
                  Yes
                </SelectItem>
                <SelectItem
                  value="no"
                  className={
                    isCreate ? CREATE_FORM_SELECT_ITEM_CLASS : undefined
                  }
                >
                  No (co-owner required)
                </SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {ownershipAnswer === "no" ? (
        canInvite ? (
          <div
            className={cn(
              "space-y-2 rounded-md p-3",
              isCreate ? "border border-white/20 bg-black/20" : "bg-muted/40"
            )}
          >
            <p
              className={cn(
                "text-sm font-medium",
                isCreate ? "text-white/90" : undefined
              )}
            >
              Invite co-owner (draft {draftKey?.slice(0, 8)}…)
            </p>
            <Input
              placeholder="Co-owner legal name"
              className={isCreate ? CREATE_FORM_INPUT_CLASS : undefined}
              value={coName}
              onChange={e => setCoName(e.target.value)}
            />
            <Input
              placeholder="Co-owner email"
              type="email"
              className={isCreate ? CREATE_FORM_INPUT_CLASS : undefined}
              value={coEmail}
              onChange={e => setCoEmail(e.target.value)}
            />
            <div className="flex items-center gap-2">
              <FormLabel
                className={cn(
                  "shrink-0",
                  isCreate ? CREATE_FORM_LABEL_CLASS : undefined
                )}
              >
                Share % (of 100%)
              </FormLabel>
              <Input
                type="number"
                className={cn(
                  "w-24",
                  isCreate ? CREATE_FORM_INPUT_CLASS : undefined
                )}
                min={1}
                max={100}
                value={coPct}
                onChange={e => setCoPct(Number(e.target.value))}
              />
            </div>
            <Button
              type="button"
              size="sm"
              disabled={invitePending}
              onClick={() => void sendInvite()}
            >
              {invitePending ? "Sending…" : "Send invite email"}
            </Button>
          </div>
        ) : (
          <p className="text-destructive text-sm">
            You need Host Premium or Host Community to add a co-owner for this
            video.
          </p>
        )
      ) : null}
    </div>
  );
}
