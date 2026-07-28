"use client";

import { useEffect } from "react";
import type { UseFormReturn } from "react-hook-form";
import { useSelector } from "react-redux";
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
import { useCoOwnerDraftFields } from "@/hooks/use-coowner-draft-fields";
import type { CoOwnerDraftSlice } from "@/lib/form-draft-utils";
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
  onCoOwnerInvitePending?: (inviteId: string) => void;
  onDraftSaveNow?: () => void | Promise<void>;
  onRefreshSubmitReadiness?: () => void;
  refreshToken?: number;
};

/** Ownership + co-owner policy block for single-video add forms (modals). */
export function AddVideoPolicyFields({
  form,
  videoTitle,
  variant = "default",
  coOwnerPolicyMode = "full",
  onCoOwnerInvitePending,
  onDraftSaveNow,
  onRefreshSubmitReadiness,
  refreshToken = 0,
}: Props) {
  const user = useSelector((s: RootState) => s.auth.user);
  const hostTier =
    user?.role === "HOST"
      ? (user as { hostSubscriptionTier?: string }).hostSubscriptionTier
      : undefined;
  const canInvite =
    hostTier === "HOST_PREMIUM" || hostTier === "HOST_COMMUNITY";
  const allowCoOwned = coOwnerPolicyMode === "full";
  const isCreate = variant === "create";

  const ownershipAnswer = form.watch("ownershipAnswer");
  const draftKey = form.watch("coOwnerDraftKey");
  const coOwner = form.watch("coOwner");
  const youtubeLink = form.watch("url");

  const {
    name,
    email,
    pct,
    setName,
    setEmail,
    setPct,
    readOnlyInvite,
    pending,
    fieldErrors,
    sendInvite,
    statusIndicatorClass,
    inviteStatusLabel,
  } = useCoOwnerDraftFields({
    draftKey,
    ownershipAnswer,
    coOwner,
    setCoOwner: (values: CoOwnerDraftSlice) =>
      form.setValue("coOwner", values, { shouldDirty: true }),
    setDraftKey: key =>
      form.setValue("coOwnerDraftKey", key, { shouldDirty: true }),
    videoTitle,
    youtubeLink: youtubeLink ?? "",
    canInvite,
    onCoOwnerInvitePending,
    onDraftSaveNow,
    onRefreshSubmitReadiness,
    refreshToken,
  });

  useEffect(() => {
    if (!allowCoOwned && ownershipAnswer === "no") {
      form.setValue("ownershipAnswer", "yes");
    }
  }, [allowCoOwned, ownershipAnswer, form]);

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
                  <SelectValue placeholder="Select" />
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

      {ownershipAnswer === "no" && allowCoOwned ? (
        <div className="space-y-2">
          {!canInvite ? (
            <p className="text-destructive text-sm">
              Host Premium or Host Community required to invite co-owners.
            </p>
          ) : (
            <>
              <Input
                placeholder="Co-owner legal name"
                className={`${isCreate ? CREATE_FORM_INPUT_CLASS : ""} ${fieldErrors.name ? "border-destructive" : ""}`}
                value={name}
                readOnly={readOnlyInvite}
                onChange={e => setName(e.target.value)}
              />
              {fieldErrors.name ? (
                <p className="text-destructive text-xs">{fieldErrors.name}</p>
              ) : null}
              <Input
                placeholder="Co-owner email"
                type="email"
                className={`${isCreate ? CREATE_FORM_INPUT_CLASS : ""} ${statusIndicatorClass} ${fieldErrors.email ? "border-destructive" : ""}`}
                value={email}
                readOnly={readOnlyInvite}
                onChange={e => setEmail(e.target.value)}
              />
              {fieldErrors.email ? (
                <p className="text-destructive text-xs">{fieldErrors.email}</p>
              ) : null}
              {inviteStatusLabel ? (
                <p
                  className={`text-xs ${
                    inviteStatusLabel === "approved"
                      ? "text-green-600"
                      : inviteStatusLabel === "pending"
                        ? "text-amber-600"
                        : "text-red-600"
                  }`}
                >
                  Co-owner status: {inviteStatusLabel}
                </p>
              ) : null}
              <div className="flex items-center gap-2">
                <FormLabel
                  className={isCreate ? CREATE_FORM_LABEL_CLASS : undefined}
                >
                  Co-owner share %
                </FormLabel>
                <Input
                  type="number"
                  className={cn(
                    "w-24",
                    isCreate ? CREATE_FORM_INPUT_CLASS : ""
                  )}
                  min={1}
                  max={100}
                  value={pct}
                  readOnly={readOnlyInvite}
                  onChange={e => setPct(Number(e.target.value))}
                />
              </div>
              {readOnlyInvite ? null : (
                <Button
                  type="button"
                  size="sm"
                  disabled={pending}
                  onClick={() => void sendInvite()}
                >
                  {pending ? "Sending…" : "Send invite email"}
                </Button>
              )}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
