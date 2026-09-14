"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";

import { submitCommunityStartInterestAction } from "@/actions/communities";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useHostCapabilityWithAuth } from "@/hooks/use-host-capability-with-auth";
import { useImageUpload } from "@/hooks/use-image-upload";
import { tryUploadImage } from "@/lib/cloudinary";
import { COMMUNITY_TYPE_LABELS } from "@/lib/community-type-labels";
import { getHostUserFromCookies } from "@/lib/host-session-client";
import { normalizeEmail } from "@/lib/normalize-email";
import {
  COMMUNITY_TYPE_OPTIONS,
  type CommunityType,
} from "@/schemas/community.schema";
import type { RootState } from "@/redux/store";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmittedSuccess?: (eventSlug: string) => void;
};

function manageHostCommunityHref(eventSlug: string) {
  return `/host/${encodeURIComponent(eventSlug)}/host-community`;
}

export function StartCommunityRequestDialog({
  open,
  onOpenChange,
  onSubmittedSuccess,
}: Props) {
  const { user } = useSelector((s: RootState) => s.auth);
  const userId = user?.id;
  const { canWriteAsHost, capability } = useHostCapabilityWithAuth();

  const hostCommunitySlug = useMemo(() => {
    const hostSession = getHostUserFromCookies();
    const fromCookie =
      hostSession?.eventSlug?.trim() || hostSession?.username?.trim() || "";
    if (fromCookie) return fromCookie;
    if (capability.status === "active") {
      return capability.eventSlug?.trim() || capability.username?.trim() || "";
    }
    return "";
  }, [capability]);

  const hostCommunityPath = hostCommunitySlug
    ? manageHostCommunityHref(hostCommunitySlug)
    : "/dashboard/host-community";

  const [interestName, setInterestName] = useState("");
  const [interestDesc, setInterestDesc] = useState("");
  const [interestType, setInterestType] = useState<CommunityType>(
    COMMUNITY_TYPE_OPTIONS[0]
  );
  const [interestStart, setInterestStart] = useState("");
  const [interestEmail, setInterestEmail] = useState("");
  const [interestPhone, setInterestPhone] = useState("");
  const [interestSubmitting, setInterestSubmitting] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(
    null
  );
  const redirectPathRef = useRef("");

  const {
    readableImage: interestLogoPreview,
    error: interestLogoUploadError,
    inputRef: interestLogoInputRef,
    handleImageUpload: handleInterestLogoUpload,
    handleChangeImage: handleInterestLogoChangeClick,
    handleRemoveImage: handleRemoveInterestLogo,
  } = useImageUpload({ maxSizeMB: 2 });

  useEffect(() => {
    if (!open) return;
    const email =
      user && "email" in user && typeof user.email === "string"
        ? user.email
        : "";
    setInterestEmail(email);
  }, [open, user]);

  useEffect(() => {
    if (redirectCountdown === null) return;
    if (redirectCountdown <= 0) {
      const path = redirectPathRef.current;
      if (path) {
        window.location.assign(path);
      }
      setRedirectCountdown(null);
      redirectPathRef.current = "";
      onOpenChange(false);
      setInterestName("");
      setInterestDesc("");
      setInterestStart("");
      setInterestPhone("");
      handleRemoveInterestLogo();
      return;
    }
    const timer = window.setTimeout(
      () => setRedirectCountdown(current => (current ?? 1) - 1),
      1000
    );
    return () => window.clearTimeout(timer);
  }, [handleRemoveInterestLogo, onOpenChange, redirectCountdown]);

  const resetForm = () => {
    setInterestName("");
    setInterestDesc("");
    setInterestStart("");
    setInterestPhone("");
    setRedirectCountdown(null);
    redirectPathRef.current = "";
    handleRemoveInterestLogo();
  };

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) resetForm();
    onOpenChange(nextOpen);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !canWriteAsHost) {
      toast.error("Sign in to your host account to send this request.");
      return;
    }

    const communityName = interestName.trim();
    const description = interestDesc.trim();
    const contactEmail = normalizeEmail(interestEmail.trim());
    if (!communityName || !description || !contactEmail) {
      toast.error("Please fill in community name, description, and email.");
      return;
    }

    setInterestSubmitting(true);
    try {
      let logoUrl: string | null = null;
      if (interestLogoPreview?.startsWith("data:")) {
        const uploaded = await tryUploadImage(interestLogoPreview);
        if (!uploaded.ok) {
          toast.error(uploaded.message);
          return;
        }
        logoUrl = uploaded.data?.secure_url ?? null;
        if (!logoUrl) {
          toast.error("Could not upload community logo. Try again.");
          return;
        }
      }

      const r = await submitCommunityStartInterestAction({
        communityName,
        description,
        communityType: interestType,
        logoUrl,
        interestedStartDate: interestStart.trim() || null,
        contactEmail,
        contactPhone: interestPhone.trim() || null,
      });

      if (r.success) {
        toast.success("Interest sent — admins have been notified.");
        redirectPathRef.current = hostCommunityPath;
        if (hostCommunitySlug) {
          onSubmittedSuccess?.(hostCommunitySlug);
        }
        setRedirectCountdown(5);
      } else {
        toast.error(r.message ?? "Could not send request");
      }
    } finally {
      setInterestSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={handleClose}
    >
      <DialogContent className="flex max-h-[min(90dvh,640px)] flex-col gap-0 overflow-hidden sm:max-w-lg">
        {redirectCountdown !== null ? (
          <>
            <DialogHeader className="shrink-0 space-y-2 pr-6 pb-2">
              <DialogTitle>Request sent</DialogTitle>
              <DialogDescription>
                Our team has your interest. Review Community plan options or
                book a demo while we follow up.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center gap-4 px-2 py-6">
              <div className="flex w-full flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  className="flex-1"
                  onClick={() => {
                    window.location.assign(hostCommunityPath);
                  }}
                >
                  Community plan
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    window.open(
                      "https://calendly.com/partner-telepse/tipmanna-session",
                      "_blank",
                      "noreferrer"
                    );
                  }}
                >
                  Book a demo
                </Button>
              </div>
              <p className="text-muted-foreground text-center text-sm">
                Opening Community plan in{" "}
                <span
                  className="text-primary font-semibold tabular-nums"
                  aria-live="polite"
                >
                  {redirectCountdown}
                </span>
                …
              </p>
            </div>
          </>
        ) : (
          <>
            <DialogHeader className="shrink-0 space-y-2 pr-6 pb-2">
              <DialogTitle>Tell us about your community idea</DialogTitle>
              <DialogDescription>
                Share a few details so our team knows you are interested. This
                notifies admins only — it does not activate a community
              </DialogDescription>
            </DialogHeader>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <form
                className="space-y-3 pb-1"
                onSubmit={e => void handleSubmit(e)}
              >
                <div className="space-y-1">
                  <Label htmlFor="creator-sc-name">Community name</Label>
                  <Input
                    id="creator-sc-name"
                    value={interestName}
                    onChange={e => setInterestName(e.target.value)}
                    placeholder="Working title"
                    required
                    autoComplete="organization"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="creator-sc-desc">Short description</Label>
                  <Textarea
                    id="creator-sc-desc"
                    value={interestDesc}
                    onChange={e => setInterestDesc(e.target.value)}
                    placeholder="What is it about?"
                    rows={3}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label id="creator-sc-type-label">Community type</Label>
                  <div
                    className="flex flex-wrap gap-2"
                    role="radiogroup"
                    aria-labelledby="creator-sc-type-label"
                  >
                    {COMMUNITY_TYPE_OPTIONS.map(opt => (
                      <Button
                        key={opt}
                        type="button"
                        role="radio"
                        aria-checked={interestType === opt}
                        variant={interestType === opt ? "default" : "outline"}
                        size="sm"
                        className="h-auto shrink-0 rounded-full px-3 py-1.5 font-normal"
                        onClick={() => setInterestType(opt)}
                      >
                        {COMMUNITY_TYPE_LABELS[opt]}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="creator-sc-start">
                    Interested start date{" "}
                    <span className="text-muted-foreground font-normal">
                      (optional)
                    </span>
                  </Label>
                  <Input
                    id="creator-sc-start"
                    type="date"
                    value={interestStart}
                    onChange={e => setInterestStart(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="creator-sc-email">
                    How can we reach you? (email)
                  </Label>
                  <Input
                    id="creator-sc-email"
                    type="email"
                    value={interestEmail}
                    onChange={e => setInterestEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="creator-sc-phone">
                    Phone{" "}
                    <span className="text-muted-foreground font-normal">
                      (with country code, optional)
                    </span>
                  </Label>
                  <Input
                    id="creator-sc-phone"
                    value={interestPhone}
                    onChange={e => setInterestPhone(e.target.value)}
                    placeholder="+44 …"
                    autoComplete="tel"
                  />
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button
                    type="submit"
                    disabled={interestSubmitting}
                  >
                    {interestSubmitting ? "Sending…" : "Send interest"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={interestSubmitting}
                    onClick={() => handleClose(false)}
                  >
                    Cancel
                  </Button>
                </div>
                <p className="text-muted-foreground text-[11px]">
                  Your request is stored securely and every admin receives an
                  in-app notification.
                </p>
              </form>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
