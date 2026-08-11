"use client";

import { useEffect, useState } from "react";
import { User } from "lucide-react";
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
import { useImageUpload } from "@/hooks/use-image-upload";
import { uploadImage } from "@/lib/cloudinary";
import { COMMUNITY_TYPE_LABELS } from "@/lib/community-type-labels";
import { normalizeEmail } from "@/lib/normalize-email";
import {
  COMMUNITY_TYPE_OPTIONS,
  type CommunityType,
} from "@/schemas/community.schema";
import type { RootState } from "@/redux/store";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function StartCommunityRequestDialog({ open, onOpenChange }: Props) {
  const { user, token: authToken } = useSelector((s: RootState) => s.auth);
  const userId = user?.id;

  const [interestName, setInterestName] = useState("");
  const [interestDesc, setInterestDesc] = useState("");
  const [interestType, setInterestType] = useState<CommunityType>(
    COMMUNITY_TYPE_OPTIONS[0]
  );
  const [interestStart, setInterestStart] = useState("");
  const [interestEmail, setInterestEmail] = useState("");
  const [interestPhone, setInterestPhone] = useState("");
  const [interestSubmitting, setInterestSubmitting] = useState(false);

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

  const handleClose = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
    if (!nextOpen) handleRemoveInterestLogo();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !authToken) {
      toast.error("Sign in to send this request.");
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
        const uploaded = await uploadImage(interestLogoPreview);
        logoUrl = uploaded?.secure_url ?? null;
        if (!logoUrl) {
          toast.error("Could not upload community logo. Try again.");
          return;
        }
      }

      const r = await submitCommunityStartInterestAction(authToken, {
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
        handleClose(false);
        setInterestName("");
        setInterestDesc("");
        setInterestStart("");
        setInterestPhone("");
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
        <DialogHeader className="shrink-0 space-y-2 pr-6 pb-2">
          <DialogTitle>Tell us about your community idea</DialogTitle>
          <DialogDescription>
            Share a few details so our team knows you are interested. This
            notifies admins only — it does not activate a community or link an
            event room.
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
              <Label>
                Community logo{" "}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </Label>
              <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={handleInterestLogoChangeClick}
                  className="relative size-20 shrink-0 overflow-hidden rounded-full border bg-neutral-100"
                >
                  {interestLogoPreview ? (
                    <img
                      src={interestLogoPreview}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center">
                      <User className="text-muted-foreground size-10" />
                    </div>
                  )}
                </button>
                <div className="min-w-0 flex-1 space-y-2">
                  <input
                    ref={interestLogoInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleInterestLogoUpload}
                  />
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleInterestLogoChangeClick}
                      className="w-fit"
                    >
                      Change photo
                    </Button>
                    {interestLogoPreview ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive w-fit"
                        onClick={handleRemoveInterestLogo}
                      >
                        Remove photo
                      </Button>
                    ) : null}
                    {interestLogoUploadError ? (
                      <p className="text-destructive text-xs">
                        {interestLogoUploadError}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
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
              Your request is stored securely and every admin receives an in-app
              notification.
            </p>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
