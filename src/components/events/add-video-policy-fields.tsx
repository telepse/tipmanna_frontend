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
import {
  coOwnerStatusIndicatorClass,
  useCoOwnerInviteStatus,
} from "@/hooks/use-coowner-invite-status";
import { mapCoOwnerInviteErrors } from "@/lib/coowner-invite-error.util";
import type { RootState } from "@/redux/store";
import type { AddVideoFormValues } from "./add-video-form";
import {
  CREATE_FORM_INPUT_CLASS,
  CREATE_FORM_LABEL_CLASS,
  CREATE_FORM_MUTED_TEXT_CLASS,
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
  coOwnerPolicyMode?: "full" | "ownerOnly";
  onCoOwnerInviteApproved?: () => void;
  onDraftSaveNow?: () => void | Promise<void>;
};

/** Ownership + co-owner policy block for single-video add forms (modals). */
export function AddVideoPolicyFields({
  form,
  videoTitle,
  variant = "default",
  coOwnerPolicyMode = "full",
  onCoOwnerInviteApproved,
  onDraftSaveNow,
}: Props) {
  const user = useSelector((s: RootState) => s.auth.user);
  const hostTier =
    user?.role === "HOST"
      ? (user as { hostSubscriptionTier?: string }).hostSubscriptionTier
      : undefined;
  const canInvite =
    hostTier === "HOST_PREMIUM" || hostTier === "HOST_COMMUNITY";
  const allowCoOwned = coOwnerPolicyMode === "full";

  const [coName, setCoName] = useState("");
  const [coEmail, setCoEmail] = useState("");
  const [coPct, setCoPct] = useState(25);
  const [invitePending, setInvitePending] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    name?: string;
  }>({});
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
        onCoOwnerInviteApproved?.();
      }
    };

    channel.bind("co-owner-invite", handler);
    return () => {
      channel.unbind("co-owner-invite", handler);
      unsubscribeChannel(coOwnerInviteChannel);
    };
  }, [coOwnerInviteChannel, videoTitle, onCoOwnerInviteApproved]);

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
  const inviteStatus = useCoOwnerInviteStatus(draftKey, coEmail);
  const isCreate = variant === "create";

  useEffect(() => {
    if (!allowCoOwned && ownershipAnswer === "no") {
      form.setValue("ownershipAnswer", "yes");
    }
  }, [allowCoOwned, ownershipAnswer, form]);

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
    if (!coName.trim()) {
      toast.error("Co-owner legal name is required");
      return;
    }
    setInvitePending(true);
    setFieldErrors({});
    const res = await createVideoCoOwnerInviteAction({
      draftKey: dk,
      coOwnerName: coName.trim() || "Co-owner",
      coOwnerEmail: coEmail.trim(),
      payoutPercentBp: Math.round(coPct * 100),
      contentTitle: form.getValues("title")?.trim() || "",
      youtubeLink: form.getValues("url")?.trim() || "",
    });
    setInvitePending(false);
    if (!res.success) {
      const mapped = mapCoOwnerInviteErrors(
        res.validationBody,
        res.message ?? undefined
      );
      if (Object.keys(mapped).length > 0) {
        setFieldErrors(mapped);
      } else {
        toast.error(res.message ?? "Invite failed");
      }
      return;
    }
    const inv = (res.data as { invite?: { id?: string } })?.invite;
    toast.success("Invite sent — co-owner must approve via email");
    if (inv?.id) {
      setCoOwnerInviteChannel(`coowner-invite-${inv.id}`);
    }
    await onDraftSaveNow?.();
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
      {!allowCoOwned ? (
        <p
          className={cn(
            "text-xs",
            isCreate ? CREATE_FORM_MUTED_TEXT_CLASS : "text-muted-foreground"
          )}
        >
          Co-creators can upload videos they fully own. Only the community owner
          can submit co-owned videos to this bank.
        </p>
      ) : null}
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
                {allowCoOwned ? (
                  <SelectItem
                    value="no"
                    className={
                      isCreate ? CREATE_FORM_SELECT_ITEM_CLASS : undefined
                    }
                  >
                    No (co-owner required)
                  </SelectItem>
                ) : null}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {allowCoOwned && ownershipAnswer === "no" ? (
        <div className="space-y-2 rounded-md border border-white/20 bg-black/20 p-3">
          <p className="text-sm font-medium text-white/90">
            Invite co-owner (draft {draftKey?.slice(0, 8)}…)
          </p>
          <Input
            placeholder="Co-owner legal name"
            className={`${CREATE_FORM_INPUT_CLASS} ${fieldErrors.name ? "border-destructive" : ""}`}
            value={coName}
            onChange={e => {
              setCoName(e.target.value);
              if (fieldErrors.name) {
                setFieldErrors(prev => ({ ...prev, name: undefined }));
              }
            }}
          />
          {fieldErrors.name ? (
            <p className="text-destructive text-xs">{fieldErrors.name}</p>
          ) : null}
          <Input
            placeholder="Co-owner email"
            type="email"
            className={`${CREATE_FORM_INPUT_CLASS} ${coOwnerStatusIndicatorClass(inviteStatus)} ${fieldErrors.email ? "border-destructive" : ""}`}
            value={coEmail}
            onChange={e => {
              setCoEmail(e.target.value);
              if (fieldErrors.email) {
                setFieldErrors(prev => ({ ...prev, email: undefined }));
              }
            }}
          />
          {fieldErrors.email ? (
            <p className="text-destructive text-xs">{fieldErrors.email}</p>
          ) : null}
          {inviteStatus ? (
            <p
              className={`text-xs ${
                inviteStatus === "approved"
                  ? "text-green-400"
                  : inviteStatus === "pending"
                    ? "text-amber-400"
                    : "text-red-400"
              }`}
            >
              Co-owner status: {inviteStatus}
            </p>
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
              value={coPct}
              onChange={e => setCoPct(Number(e.target.value))}
            />
          </div>
          <Button
            type="button"
            size="sm"
            className="bg-white text-black hover:bg-white/80"
            disabled={invitePending}
            onClick={() => void sendInvite()}
          >
            {invitePending ? "Sending…" : "Send invite email"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
