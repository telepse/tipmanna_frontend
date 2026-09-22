"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { SquarePen, User } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  getCreatorProfileForEditHostAction,
  updateCreatorProfileHostAction,
} from "@/actions/host-creator";

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

import { useImageUpload } from "@/hooks/use-image-upload";
import { tryUploadImage } from "@/lib/cloudinary";
import { cn } from "@/lib/utils";
import { dispatchCreatorUsernameChanged } from "@/lib/creator-username-alias";
import { migrateCreatorProfileCacheUsername } from "@/lib/drawer-prefetch-cache";
import { useHostSession } from "@/hooks/use-host-session";
import type { RootState } from "@/redux/store";
import { CreatorFormData, creatorSchema } from "@/schemas/creator.schema";

import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";

const PLACEHOLDER_AVATAR =
  "https://res.cloudinary.com/tipmanna/image/upload/v1786172267/user_sce6gw.png";

function formatNextUsernameChange(dateIso: string): string {
  return new Date(dateIso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export const HostBanner = () => {
  const dispatch = useDispatch();

  const user = useSelector((state: RootState) => state.auth.user);

  const { eventSlug, username: hostUsername } = useHostSession();

  const full_name = user?.fullName ?? "";

  const [openCreatorDialog, setOpenCreatorDialog] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [saving, setSaving] = useState(false);

  const [bannerAvatarUrl, setBannerAvatarUrl] = useState<string | null>(null);

  const [canChangeUsername, setCanChangeUsername] = useState(true);

  const [nextUsernameChangeAt, setNextUsernameChangeAt] = useState<
    string | null
  >(null);

  const [usernameChangeOverride, setUsernameChangeOverride] = useState(false);

  const [pendingProfileImageUrl, setPendingProfileImageUrl] = useState<
    string | null
  >(null);

  const [modalAvatarUrl, setModalAvatarUrl] = useState<string | null>(null);

  const {
    readableImage,
    error: imageError,
    inputRef,
    handleImageUpload,
    handleChangeImage,
    handleRemoveImage,
    setReadableImage,
  } = useImageUpload({
    maxSizeMB: 2,
  });

  const [loadedHostUsername, setLoadedHostUsername] = useState<string | null>(
    null
  );

  const eventSlugFromSession = eventSlug;
  const displayHostUsername = loadedHostUsername ?? hostUsername ?? "";

  const creatorForm = useForm<CreatorFormData>({
    resolver: zodResolver(creatorSchema),
    defaultValues: {
      username: hostUsername ?? "",
      pageDescription: "",
      profileImageUrl: null,
      externalLinkUrl: "",
      externalLinkLabel: "",
    },
  });

  const savedProfileImageUrl = creatorForm.watch("profileImageUrl");

  const resolveKnownAvatarUrl = useCallback(
    () =>
      bannerAvatarUrl ??
      modalAvatarUrl ??
      pendingProfileImageUrl ??
      savedProfileImageUrl ??
      null,
    [
      bannerAvatarUrl,
      modalAvatarUrl,
      pendingProfileImageUrl,
      savedProfileImageUrl,
    ]
  );

  const dialogAvatarSrc =
    (readableImage?.startsWith("data:") ? readableImage : null) ??
    modalAvatarUrl ??
    readableImage ??
    pendingProfileImageUrl ??
    bannerAvatarUrl ??
    savedProfileImageUrl ??
    null;

  const applyProfileImage = useCallback(
    (imageUrl: string | null) => {
      if (imageUrl) {
        setBannerAvatarUrl(imageUrl);
        setPendingProfileImageUrl(imageUrl);
        setModalAvatarUrl(imageUrl);
        setReadableImage(imageUrl);
        creatorForm.setValue("profileImageUrl", imageUrl);
      } else {
        setBannerAvatarUrl(null);
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
      setLoadedHostUsername(profile.username);

      creatorForm.reset({
        username: profile.username,
        pageDescription: profile.pageDescription ?? "",
        profileImageUrl:
          profile.profileImageUrl ?? creatorForm.getValues("profileImageUrl"),
        externalLinkUrl: profile.externalLink?.url ?? "",
        externalLinkLabel: profile.externalLink?.label ?? "",
      });

      if (profile.profileImageUrl) {
        applyProfileImage(profile.profileImageUrl);
      }

      setCanChangeUsername(profile.canChangeUsername);
      setNextUsernameChangeAt(profile.nextUsernameChangeAt);
      setUsernameChangeOverride(profile.usernameChangeOverride);
    } finally {
      setLoadingProfile(false);
    }
  }, [applyProfileImage, creatorForm]);

  const handleOpenCreatorDialog = () => {
    const existing = resolveKnownAvatarUrl();

    if (existing) {
      setModalAvatarUrl(existing);
      setPendingProfileImageUrl(existing);
      setReadableImage(existing);
    }

    setOpenCreatorDialog(true);
  };

  useEffect(() => {
    if (!readableImage?.startsWith("data:")) return;

    setModalAvatarUrl(readableImage);
  }, [readableImage]);

  useEffect(() => {
    if (openCreatorDialog) {
      void loadCreatorProfile();
    }
  }, [loadCreatorProfile, openCreatorDialog]);

  useEffect(() => {
    void getCreatorProfileForEditHostAction().then(res => {
      if (res.success && res.data?.profileImageUrl) {
        applyProfileImage(res.data.profileImageUrl);
      }
    });
  }, [applyProfileImage]);

  useEffect(() => {
    if (!openCreatorDialog) return;

    const existing = resolveKnownAvatarUrl();

    if (existing) {
      setModalAvatarUrl(existing);
    }
  }, [openCreatorDialog, resolveKnownAvatarUrl]);

  const onSubmitCreator = async (values: CreatorFormData) => {
    setSaving(true);

    try {
      let profileImageUrl: string | null =
        pendingProfileImageUrl ?? bannerAvatarUrl ?? null;

      if (readableImage?.startsWith("data:")) {
        const uploaded = await tryUploadImage(readableImage);

        if (!uploaded.ok) {
          toast.error(uploaded.message);
          return;
        }

        profileImageUrl = uploaded.data?.secure_url ?? null;

        if (!profileImageUrl) {
          toast.error("Could not upload profile picture. Try again.");
          return;
        }
      } else if (readableImage?.startsWith("http")) {
        profileImageUrl = readableImage;
      } else if (!readableImage && !pendingProfileImageUrl) {
        profileImageUrl = null;
      }

      const previousUsername =
        loadedHostUsername ?? creatorForm.getValues("username") ?? "";

      const res = await updateCreatorProfileHostAction({
        username: values.username.trim(),
        profileImageUrl,
        pageDescription: values.pageDescription?.trim() || null,
        externalLinkUrl: values.externalLinkUrl?.trim() || null,
        externalLinkLabel: values.externalLinkLabel?.trim() || null,
        previousUsername,
      });

      if (!res.success || !res.data) {
        toast.error(res.message ?? "Could not update creator profile");
        return;
      }

      const updated = res.data;

      applyProfileImage(updated.profileImageUrl);

      setCanChangeUsername(updated.canChangeUsername);
      setNextUsernameChangeAt(updated.nextUsernameChangeAt);
      setUsernameChangeOverride(updated.usernameChangeOverride);

      if (updated.username !== previousUsername) {
        setLoadedHostUsername(updated.username);

        migrateCreatorProfileCacheUsername(previousUsername, updated.username);

        dispatchCreatorUsernameChanged({
          previousUsername,
          username: updated.username,
        });
      }

      toast.success("Creator profile updated successfully");

      setOpenCreatorDialog(false);
    } finally {
      setSaving(false);
    }
  };

  const avatarSrc = dialogAvatarSrc || PLACEHOLDER_AVATAR;

  return (
    <div
      style={{
        backgroundImage:
          "linear-gradient(to bottom, #F57D11, #E5740E, #B65B09)",
      }}
      className="relative z-10 w-full min-w-0 overflow-hidden rounded-md"
    >
      {/* =========================================================
          MOBILE BANNER
          ========================================================= */}
      <div className="flex w-full min-w-0 flex-col gap-4 p-4 sm:hidden">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative size-16 shrink-0 overflow-hidden rounded-full bg-white">
            {avatarSrc ? (
              <img
                src={avatarSrc}
                alt=""
                className="size-full object-cover"
              />
            ) : (
              <div className="flex size-full items-center justify-center">
                <User className="text-primary size-10" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-2">
            <h2 className="truncate text-2xl font-bold text-white">
              {full_name}
            </h2>

            <button
              type="button"
              className="flex max-w-full items-center gap-2 truncate text-sm text-white/90"
              onClick={handleOpenCreatorDialog}
            >
              <SquarePen className="size-4 shrink-0 text-white/90" />
              <span className="truncate">@{displayHostUsername}</span>
            </button>
          </div>
        </div>

        <Link
          href={
            eventSlugFromSession
              ? `/host/${eventSlugFromSession}/profile?tab=account_settings`
              : "/host"
          }
          className="flex w-full items-center justify-center gap-2 rounded border border-white/50 px-4 py-2 text-sm text-white"
        >
          <SquarePen className="size-4 text-white/90" />
          Profile Settings
        </Link>
      </div>

      {/* =========================================================
          DESKTOP BANNER
          ========================================================= */}
      <div className="relative mx-auto hidden min-h-64 max-w-4xl justify-between sm:flex">
        <div className="flex min-w-0 items-center gap-4">
          <div className="relative size-20 shrink-0 overflow-hidden rounded-full bg-white">
            {avatarSrc ? (
              <img
                src={avatarSrc}
                alt=""
                className="size-full object-cover"
              />
            ) : (
              <div className="flex size-full items-center justify-center">
                <User className="text-primary size-14" />
              </div>
            )}
          </div>

          <div className="min-w-0 space-y-2">
            <h2 className="truncate text-3xl font-bold text-white sm:text-4xl">
              {full_name}
            </h2>

            <div className="flex items-center gap-2">
              <Link
                href={
                  eventSlugFromSession
                    ? `/host/${eventSlugFromSession}/profile?tab=account_settings`
                    : "/host"
                }
                className="flex w-fit items-center gap-2 rounded border border-white/50 px-4 py-2 text-white"
              >
                <SquarePen className="size-4 text-white/90" />
                Profile Settings
              </Link>

              <button
                type="button"
                className="flex max-w-full cursor-pointer items-center gap-2 truncate text-sm text-white/90"
                onClick={handleOpenCreatorDialog}
              >
                <SquarePen className="size-4 shrink-0 text-white/90" />
                <span className="truncate">@{displayHostUsername}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="relative -mt-[41px] flex h-64 w-96 shrink-0 flex-col items-end overflow-hidden">
          <Image
            src="/assets/host-story.png"
            alt="Host story"
            width={500}
            height={500}
            className="absolute inset-0 z-50 mt-24 h-60 w-full [mask-image:linear-gradient(to_bottom,black_80%,transparent_100%)] object-cover sm:h-60"
          />
        </div>

        <div className="absolute right-0 mt-12 -mr-24 h-60 w-[397px] -rotate-[20deg] overflow-hidden [mask-image:linear-gradient(to_bottom,black_80%,transparent_100%)]">
          <Image
            src="/assets/host-blob.png"
            alt="Host blob"
            width={500}
            height={500}
            priority
            className="z-10 h-full w-full object-cover"
            style={{
              backgroundSize: "100% 100%",
            }}
          />

          <div className="absolute inset-0 z-20 bg-gradient-to-b from-transparent via-white to-white" />
        </div>
      </div>

      {/* =========================================================
          EDIT CREATOR PROFILE DIALOG
          ========================================================= */}
      <Dialog
        open={openCreatorDialog}
        onOpenChange={setOpenCreatorDialog}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Creator Profile</DialogTitle>
          </DialogHeader>

          {loadingProfile ? (
            <p className="text-muted-foreground text-sm">Loading profile…</p>
          ) : null}

          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={handleChangeImage}
                className="relative size-20 shrink-0 overflow-hidden rounded-full border bg-neutral-100"
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

              <div className="min-w-0 space-y-2">
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleImageUpload}
                />

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleChangeImage}
                >
                  Upload photo
                </Button>

                {dialogAvatarSrc ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => {
                      handleRemoveImage();
                      setModalAvatarUrl(null);
                      setPendingProfileImageUrl(null);
                      creatorForm.setValue("profileImageUrl", null);
                    }}
                  >
                    Remove photo
                  </Button>
                ) : null}

                {imageError ? (
                  <p className="text-destructive text-xs">{imageError}</p>
                ) : null}
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
                            Usernames can be changed once per month. Next change
                            available{" "}
                            {formatNextUsernameChange(nextUsernameChangeAt)}
                            {usernameChangeOverride ? " (override active)" : ""}
                            .
                          </FormDescription>
                        ) : (
                          <FormDescription>
                            Your public handle is @{field.value || "username"}.
                            {usernameChangeOverride
                              ? " Username change override is active."
                              : ""}
                          </FormDescription>
                        )}

                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    disabled={saving || loadingProfile}
                  >
                    {saving ? "Saving…" : "Save"}
                  </Button>
                </fieldset>
              </form>
            </Form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
