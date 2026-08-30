"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CircleStar, Crown, LogOut, Sprout, User } from "lucide-react";
import { toast } from "react-toastify";

import {
  getCreatorProfileForEditHostAction,
  updateCreatorProfileHostAction,
} from "@/actions/host-creator";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { updateTipper } from "@/features/auth-slice";
import { useImageUpload } from "@/hooks/use-image-upload";
import { useHostPlanCapabilities } from "@/hooks/useHostPlanCapabilities";
import { uploadImage } from "@/lib/cloudinary";
import { dispatchCreatorUsernameChanged } from "@/lib/creator-username-alias";
import { migrateCreatorProfileCacheUsername } from "@/lib/drawer-prefetch-cache";
import {
  CREATOR_PROFILE_DIALOG_OVERLAY_Z_INDEX,
  CREATOR_PROFILE_DIALOG_Z_INDEX,
} from "@/lib/drawer-z-index";
import { cn, formatNextUsernameChange } from "@/lib/utils";
import type { AppDispatch, RootState } from "@/redux/store";
import {
  CREATOR_PROFILE_CATEGORIES,
  CREATOR_PROFILE_CATEGORY_LABELS,
  CreatorFormData,
  CreatorProfileCategory,
  CreatorProfileEditStats,
  HOST_CREATOR_DEFAULT_TAB_LABELS,
  HOST_CREATOR_DEFAULT_TABS,
  HostCreatorDefaultTab,
  creatorSchema,
} from "@/schemas/creator.schema";
import { performAuthLogout } from "@/lib/auth-logout";
import { useRouter } from "next/navigation";

export type CreatorProfileSavedPayload = {
  username: string;
  profileImageUrl: string | null;
  pageDescription: string | null;
  profileCategory: CreatorProfileCategory | null;
  externalLink: { url: string; label: string } | null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialAvatarUrl?: string | null;
  onSaved?: (payload: CreatorProfileSavedPayload) => void;
  onClose: () => void;
};

function GrowthPlanNotice({
  href,
  message = "Growth plan (premium plan) required.",
}: {
  href: string;
  message?: string;
}) {
  return (
    <div className="text-muted-foreground flex items-center gap-1 text-xs leading-relaxed">
      <Crown className="text-primary size-4" />
      {message}{" "}
      <Link
        href={href}
        className="text-primary font-medium underline underline-offset-2"
      >
        See more
      </Link>
    </div>
  );
}

export function EditCreatorProfileDialog({
  open,
  onOpenChange,
  initialAvatarUrl = null,
  onSaved,
  onClose,
}: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.auth.user);
  const { hasActivePremium } = useHostPlanCapabilities();

  const [loadingProfile, setLoadingProfile] = useState(false);
  const [saving, setSaving] = useState(false);
  const [canChangeUsername, setCanChangeUsername] = useState(true);
  const [nextUsernameChangeAt, setNextUsernameChangeAt] = useState<
    string | null
  >(null);
  const [usernameChangeOverride, setUsernameChangeOverride] = useState(false);
  const [pendingProfileImageUrl, setPendingProfileImageUrl] = useState<
    string | null
  >(null);
  const [modalAvatarUrl, setModalAvatarUrl] = useState<string | null>(null);
  const [savedProfilePhotoUrl, setSavedProfilePhotoUrl] = useState<
    string | null
  >(null);
  const [photoGrowthNoticeOpen, setPhotoGrowthNoticeOpen] = useState(false);
  const [externalLinkGrowthNoticeOpen, setExternalLinkGrowthNoticeOpen] =
    useState(false);
  const [
    profilePhotoChangeRequiresPremium,
    setProfilePhotoChangeRequiresPremium,
  ] = useState(false);
  const [externalLinkRequiresPremium, setExternalLinkRequiresPremium] =
    useState(true);
  const [photoMarkedForRemoval, setPhotoMarkedForRemoval] = useState(false);
  const [editStats, setEditStats] = useState<CreatorProfileEditStats | null>(
    null
  );
  const [creatorDefaultTab, setCreatorDefaultTab] =
    useState<HostCreatorDefaultTab>("all_videos");
  const profileLoadedForOpenRef = useRef(false);

  const hostSlug = useMemo(() => {
    return user && "eventSlug" in user && user.eventSlug
      ? user.eventSlug
      : null;
  }, [user]);

  const premiumHref = hostSlug ? `/host/${hostSlug}/host-premium` : "/host";
  const hostDashboardHref = hostSlug ? `/host/${hostSlug}/profile` : "/host";
  const manageEventDashboardHref = hostSlug
    ? `/host/${hostSlug}/manage-event`
    : "/host";

  const photoChangeLocked =
    profilePhotoChangeRequiresPremium ||
    (Boolean(savedProfilePhotoUrl) && !hasActivePremium);
  const externalLinkLocked = externalLinkRequiresPremium || !hasActivePremium;

  const {
    readableImage,
    error: imageError,
    inputRef,
    handleImageUpload,
    handleChangeImage,
    handleRemoveImage,
    setReadableImage,
  } = useImageUpload({ maxSizeMB: 2 });

  const creatorForm = useForm<CreatorFormData>({
    resolver: zodResolver(creatorSchema),
    defaultValues: {
      username: user?.username ?? "",
      pageDescription: "",
      profileCategory: "content_creator",
      profileImageUrl: null,
      externalLinkUrl: "",
      externalLinkLabel: "",
      creatorDefaultTab: "all_videos",
    },
  });

  const savedProfileImageUrl = creatorForm.watch("profileImageUrl");

  const dialogAvatarSrc = photoMarkedForRemoval
    ? null
    : ((readableImage?.startsWith("data:") ? readableImage : null) ??
      modalAvatarUrl ??
      readableImage ??
      pendingProfileImageUrl ??
      savedProfileImageUrl ??
      initialAvatarUrl ??
      null);

  const applyProfileImage = useCallback(
    (imageUrl: string | null) => {
      if (imageUrl) {
        setPendingProfileImageUrl(imageUrl);
        setModalAvatarUrl(imageUrl);
        setReadableImage(imageUrl);
        creatorForm.setValue("profileImageUrl", imageUrl);
      } else {
        setPendingProfileImageUrl(null);
        setModalAvatarUrl(null);
        setReadableImage(null);
        creatorForm.setValue("profileImageUrl", null);
      }
    },
    [creatorForm, setReadableImage]
  );

  const loadCreatorProfile = useCallback(async () => {
    setLoadingProfile(true);
    try {
      const res = await getCreatorProfileForEditHostAction();
      if (!res.success || !res.data) {
        toast.error(res.message ?? "Could not load creator profile");
        return;
      }

      const profile = res.data;
      creatorForm.reset({
        username: profile.username,
        pageDescription: profile.pageDescription ?? "",
        profileCategory: profile.profileCategory ?? "content_creator",
        profileImageUrl: profile.profileImageUrl,
        externalLinkUrl: profile.externalLink?.url ?? "",
        externalLinkLabel: profile.externalLink?.label ?? "",
        creatorDefaultTab: profile.creatorDefaultTab ?? "all_videos",
      });
      setEditStats(profile.editStats ?? null);
      setCreatorDefaultTab(profile.creatorDefaultTab ?? "all_videos");
      setSavedProfilePhotoUrl(profile.profileImageUrl);
      setPhotoMarkedForRemoval(false);
      setProfilePhotoChangeRequiresPremium(
        profile.profilePhotoChangeRequiresPremium
      );
      setExternalLinkRequiresPremium(profile.externalLinkRequiresPremium);
      if (profile.profileImageUrl) {
        applyProfileImage(profile.profileImageUrl);
      } else {
        applyProfileImage(null);
      }
      setCanChangeUsername(profile.canChangeUsername);
      setNextUsernameChangeAt(profile.nextUsernameChangeAt);
      setUsernameChangeOverride(profile.usernameChangeOverride);
    } finally {
      setLoadingProfile(false);
    }
  }, [applyProfileImage, creatorForm]);

  useEffect(() => {
    if (!readableImage?.startsWith("data:")) return;
    setModalAvatarUrl(readableImage);
    setPhotoMarkedForRemoval(false);
  }, [readableImage]);

  useEffect(() => {
    if (!open) {
      profileLoadedForOpenRef.current = false;
      setPhotoGrowthNoticeOpen(false);
      setExternalLinkGrowthNoticeOpen(false);
      return;
    }

    if (profileLoadedForOpenRef.current) return;
    profileLoadedForOpenRef.current = true;

    if (initialAvatarUrl) {
      setModalAvatarUrl(initialAvatarUrl);
      setPendingProfileImageUrl(initialAvatarUrl);
      setReadableImage(initialAvatarUrl);
    }

    void loadCreatorProfile();
  }, [open, initialAvatarUrl, loadCreatorProfile, setReadableImage]);

  const handleRemovePhoto = () => {
    handleRemoveImage();
    applyProfileImage(null);
    setPhotoMarkedForRemoval(true);
  };

  const handlePhotoChangeClick = () => {
    if (photoChangeLocked) {
      setPhotoGrowthNoticeOpen(open => !open);
      return;
    }
    handleChangeImage();
  };

  const onSubmitCreator = async (values: CreatorFormData) => {
    setSaving(true);
    try {
      let profileImageUrl: string | null;

      if (photoMarkedForRemoval) {
        profileImageUrl = null;
      } else if (readableImage?.startsWith("data:")) {
        const uploaded = await uploadImage(readableImage);
        profileImageUrl = uploaded?.secure_url ?? null;
        if (!profileImageUrl) {
          toast.error("Could not upload profile picture. Try again.");
          return;
        }
      } else if (readableImage?.startsWith("http")) {
        profileImageUrl = readableImage;
      } else if (pendingProfileImageUrl) {
        profileImageUrl = pendingProfileImageUrl;
      } else {
        profileImageUrl = savedProfilePhotoUrl;
      }

      const previousUsername = user?.username ?? "";
      const res = await updateCreatorProfileHostAction({
        username: values.username.trim(),
        profileImageUrl,
        pageDescription: values.pageDescription?.trim() || null,
        profileCategory: values.profileCategory ?? null,
        externalLinkUrl: values.externalLinkUrl?.trim() || null,
        externalLinkLabel: values.externalLinkLabel?.trim() || null,
        creatorDefaultTab: values.creatorDefaultTab ?? creatorDefaultTab,
        previousUsername,
      });

      if (!res.success || !res.data) {
        toast.error(res.message ?? "Could not update creator profile");
        return;
      }

      const updated = res.data;
      applyProfileImage(updated.profileImageUrl);
      setSavedProfilePhotoUrl(updated.profileImageUrl);
      setPhotoMarkedForRemoval(false);
      setProfilePhotoChangeRequiresPremium(
        updated.profilePhotoChangeRequiresPremium
      );
      setExternalLinkRequiresPremium(updated.externalLinkRequiresPremium);
      setCanChangeUsername(updated.canChangeUsername);
      setNextUsernameChangeAt(updated.nextUsernameChangeAt);
      setUsernameChangeOverride(updated.usernameChangeOverride);
      setEditStats(updated.editStats ?? null);
      setCreatorDefaultTab(updated.creatorDefaultTab ?? "all_videos");

      if (updated.username !== previousUsername) {
        dispatch(updateTipper({ username: updated.username }));
        migrateCreatorProfileCacheUsername(previousUsername, updated.username);
        dispatchCreatorUsernameChanged({
          previousUsername,
          username: updated.username,
        });
      }

      onSaved?.({
        username: updated.username,
        profileImageUrl: updated.profileImageUrl,
        pageDescription: updated.pageDescription,
        profileCategory: updated.profileCategory,
        externalLink: updated.externalLink,
      });

      toast.success("Creator profile updated successfully");
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const router = useRouter();

  const handleLogout = async () => {
    await performAuthLogout(dispatch);
    toast.success("HOST account logged out");
    onClose();
    router.refresh();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent
        overlayClassName={CREATOR_PROFILE_DIALOG_OVERLAY_Z_INDEX}
        className={cn(
          CREATOR_PROFILE_DIALOG_Z_INDEX,
          "max-h-[min(90vh,900px)] w-[calc(100%-1rem)] max-w-md overflow-y-auto p-4 sm:w-full sm:p-6"
        )}
      >
        <DialogHeader>
          <DialogTitle>Edit Creator Page Profile</DialogTitle>
        </DialogHeader>

        {loadingProfile ? (
          <p className="text-muted-foreground text-sm">Loading profile…</p>
        ) : editStats ? (
          <div className="bg-muted/20 grid grid-cols-1 gap-2 rounded-md border p-3 text-xs sm:grid-cols-3">
            <div>
              <p className="text-muted-foreground">Page visits (90d)</p>
              <p className="font-semibold">{editStats.pageVisits90d}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Pending host payout</p>
              <p className="font-semibold">
                £{(editStats.pendingHostPayoutMinor / 100).toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Pending co-owner payout</p>
              <p className="font-semibold">
                £{(editStats.pendingCoOwnerPayoutPence / 100).toFixed(2)}
              </p>
            </div>
          </div>
        ) : null}

        <div className="flex flex-col gap-4">
          <div className="flex flex-row items-start gap-2 sm:items-center sm:gap-4">
            <button
              type="button"
              onClick={handlePhotoChangeClick}
              className="relative size-14 shrink-0 overflow-hidden rounded-full border bg-neutral-100 sm:size-20"
            >
              {dialogAvatarSrc ? (
                <img
                  src={dialogAvatarSrc}
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
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleImageUpload}
              />

              <div className="flex flex-col gap-1">
                <div className="flex w-fit items-center gap-2 rounded-md bg-gray-200 px-2 py-1 opacity-50">
                  <CircleStar />{" "}
                  <span className="text-xs">
                    You will get verified after your first payout.{" "}
                    <Link
                      href={hostDashboardHref}
                      className="underline"
                    >
                      View your earnings here
                    </Link>
                    .
                  </span>
                </div>

                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handlePhotoChangeClick}
                    className="flex-1 shrink-0 sm:w-fit"
                  >
                    {photoChangeLocked ? (
                      <Crown className="mr-1.5 size-4" />
                    ) : null}
                    Change photo
                  </Button>
                  {dialogAvatarSrc && !photoMarkedForRemoval ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive flex-1 shrink-0 sm:w-fit"
                      onClick={handleRemovePhoto}
                    >
                      Remove photo
                    </Button>
                  ) : null}
                  {imageError ? (
                    <p className="text-destructive text-xs">{imageError}</p>
                  ) : null}
                </div>
                {photoGrowthNoticeOpen && photoChangeLocked ? (
                  <GrowthPlanNotice
                    href={premiumHref}
                    message="Growth plan required to change photo."
                  />
                ) : null}
              </div>
            </div>
          </div>

          <Form {...creatorForm}>
            <form
              onSubmit={creatorForm.handleSubmit(onSubmitCreator)}
              className="space-y-5"
            >
              <fieldset
                disabled={loadingProfile || saving}
                className="space-y-5"
              >
                <FormField
                  control={creatorForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          disabled={!canChangeUsername}
                          className={cn(
                            !canChangeUsername &&
                              "cursor-not-allowed opacity-60"
                          )}
                        />
                      </FormControl>
                      {!canChangeUsername && nextUsernameChangeAt ? (
                        <FormDescription>
                          Usernames can be changed once every 90 days. Next
                          change available{" "}
                          {formatNextUsernameChange(nextUsernameChangeAt)}
                          {usernameChangeOverride ? " (override active)" : ""}.
                        </FormDescription>
                      ) : (
                        <FormDescription>
                          Your share URL is tipmanna.tv/@
                          {field.value || "username"}.
                          {usernameChangeOverride
                            ? " Username change override is active."
                            : ""}
                        </FormDescription>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={creatorForm.control}
                  name="pageDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Page description</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          rows={4}
                          placeholder="Tell your subscribers what your page is about"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={creatorForm.control}
                  name="profileCategory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Profile category</FormLabel>
                      <FormDescription className="text-muted-foreground text-xs">
                        Choose one tag that best describes your page.
                      </FormDescription>

                      <div className="flex items-center gap-4">
                        <Select
                          value={field.value ?? "content_creator"}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {CREATOR_PROFILE_CATEGORIES.map(category => (
                              <SelectItem
                                key={category}
                                value={category}
                              >
                                {CREATOR_PROFILE_CATEGORY_LABELS[category]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Link
                          href={manageEventDashboardHref}
                          className="text-xs underline"
                        >
                          Manage my channels and events
                        </Link>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={creatorForm.control}
                  name="creatorDefaultTab"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Default profile tab</FormLabel>
                      <FormDescription className="text-muted-foreground text-xs">
                        Visitors land on this tab when opening your creator
                        page.
                      </FormDescription>
                      <Select
                        value={field.value ?? creatorDefaultTab}
                        onValueChange={val => {
                          field.onChange(val);
                          setCreatorDefaultTab(val as HostCreatorDefaultTab);
                        }}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select default tab" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {HOST_CREATOR_DEFAULT_TABS.map(tab => (
                            <SelectItem
                              key={tab}
                              value={tab}
                            >
                              {HOST_CREATOR_DEFAULT_TAB_LABELS[tab]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-4 rounded-md border p-4">
                  <div className="flex items-start justify-between gap-4">
                    <p className="text-sm font-medium">External link</p>
                    {externalLinkLocked ? (
                      <button
                        type="button"
                        className="text-muted-foreground inline-flex cursor-pointer items-center gap-1 text-xs"
                        onClick={() =>
                          setExternalLinkGrowthNoticeOpen(open => !open)
                        }
                      >
                        <Crown className="text-primary size-4" />
                        Growth plan
                      </button>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    {externalLinkGrowthNoticeOpen && externalLinkLocked ? (
                      <GrowthPlanNotice
                        href={premiumHref}
                        message={`Growth plan required to add external link. ${premiumHref ? `See more ${premiumHref}` : ""}`}
                      />
                    ) : null}
                  </div>
                  <FormField
                    control={creatorForm.control}
                    name="externalLinkLabel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Link label</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="My website"
                            disabled={externalLinkLocked}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={creatorForm.control}
                    name="externalLinkUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Link URL</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="https://example.com"
                            disabled={externalLinkLocked}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {externalLinkLocked ? (
                    <div className="flex items-center gap-1">
                      <Crown className="text-primary size-4" />
                      <span className="text-muted-foreground text-xs">
                        Growth plan required to add an external link.
                      </span>
                      <Link
                        href={premiumHref}
                        className="text-primary text-xs font-medium underline underline-offset-2"
                      >
                        See more
                      </Link>
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <Button
                    type="submit"
                    disabled={saving || loadingProfile}
                  >
                    {saving ? "Saving…" : "Save"}
                  </Button>

                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="text-xs text-black"
                    onClick={handleLogout}
                  >
                    Sign out
                  </Button>
                </div>
              </fieldset>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
