"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { CloudUpload, Loader2 } from "lucide-react";
import Image from "next/image";

import {
  createHostPlaylistAction,
  type HostPlaylistItemInput,
} from "@/actions/host-playlist";
import { getMyCommunitiesAction } from "@/actions/communities";
import { listMyVideosForVideoRequestsAction } from "@/actions/video-requests";
import { extractYoutubeID } from "@/lib/extractYoutubeID";
import { tryUploadImage } from "@/lib/cloudinary";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { subscriptionActionErrorMessage } from "@/lib/host-subscription-errors";
import { useHostSubscriptionPrompt } from "@/hooks/use-host-subscription-prompt";
import { useImageUpload } from "@/hooks/use-image-upload";

const MIN_ITEMS = 3;
const MAX_ITEMS = 10;

type ChannelOption = {
  id: string;
  title: string;
  url: string;
  eventName: string;
};

type HostPlaylistCreateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void | Promise<void>;
};

export function HostPlaylistCreateDialog({
  open,
  onOpenChange,
  onCreated,
}: HostPlaylistCreateDialogProps) {
  const [saving, setSaving] = useState(false);
  const [channels, setChannels] = useState<ChannelOption[]>([]);
  const [communities, setCommunities] = useState<
    Array<{ id: string; name: string }>
  >([]);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState<"standard" | "community">("standard");
  const [communityId, setCommunityId] = useState("");
  const [selectedChannelIds, setSelectedChannelIds] = useState<string[]>([]);
  const [bannerChannelId, setBannerChannelId] = useState("");

  const { handleSubscriptionActionError, SubscriptionPromptModal } =
    useHostSubscriptionPrompt({
      focusTier: "community",
    });

  const {
    readableImage: bannerUploadPreview,
    error: bannerUploadError,
    inputRef: bannerInputRef,
    handleImageUpload: handleBannerImageUpload,
    handleChangeImage: handleChangeBannerImage,
    handleRemoveImage: handleRemoveBannerImage,
  } = useImageUpload({ maxSizeMB: 2 });

  /*
   * Load eligible videos and communities when the modal opens.
   */
  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    void (async () => {
      const [videosRes, commRes] = await Promise.all([
        listMyVideosForVideoRequestsAction(),
        getMyCommunitiesAction(),
      ]);

      if (cancelled) return;

      if (videosRes.success && videosRes.data) {
        const events =
          (
            videosRes.data as {
              events?: Array<{
                eventName: string;
                channels: Array<{
                  id: string;
                  title: string;
                  url: string;
                }>;
              }>;
            }
          ).events ?? [];

        const opts: ChannelOption[] = [];

        for (const ev of events) {
          for (const ch of ev.channels ?? []) {
            opts.push({
              id: ch.id,
              title: ch.title,
              url: ch.url,
              eventName: ev.eventName,
            });
          }
        }

        setChannels(opts);
      }

      if (commRes.success && commRes.data) {
        const raw = commRes.data as {
          owned?: Array<{ id: string; name: string }>;
        };

        setCommunities(raw.owned ?? []);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open]);

  /*
   * Select or unselect a video.
   */
  const toggleChannel = (channelId: string) => {
    setSelectedChannelIds(prev => {
      if (prev.includes(channelId)) {
        const next = prev.filter(id => id !== channelId);

        if (bannerChannelId === channelId) {
          setBannerChannelId(next[0] ?? "");
        }

        return next;
      }

      if (prev.length >= MAX_ITEMS) {
        toast.info(`Maximum ${MAX_ITEMS} videos per playlist`);
        return prev;
      }

      const next = [...prev, channelId];

      if (!bannerChannelId) {
        setBannerChannelId(channelId);
      }

      return next;
    });
  };

  const canSubmit = useMemo(() => {
    if (!name.trim()) return false;

    if (selectedChannelIds.length < MIN_ITEMS) {
      return false;
    }

    if (kind === "community" && !communityId.trim()) {
      return false;
    }

    return true;
  }, [communityId, kind, name, selectedChannelIds.length]);

  /*
   * Reset the form.
   */
  const resetForm = () => {
    setName("");
    setDescription("");
    setKind("standard");
    setCommunityId("");
    setSelectedChannelIds([]);
    setBannerChannelId("");
    handleRemoveBannerImage();
  };

  /*
   * Create playlist.
   */
  const onCreate = async () => {
    if (!canSubmit || saving) return;

    setSaving(true);

    try {
      const items: HostPlaylistItemInput[] = selectedChannelIds.map(
        (eventChannelId, index) => ({
          eventChannelId,
          sortOrder: index,
        })
      );

      let bannerUrl: string | null = null;

      // Custom uploaded banner
      if (bannerUploadPreview) {
        const uploaded = await tryUploadImage(bannerUploadPreview);

        if (!uploaded.ok) {
          toast.error(uploaded.message);
          return;
        }

        if (!uploaded.data?.secure_url) {
          toast.error("Could not upload banner image");
          return;
        }

        bannerUrl = uploaded.data.secure_url;
      }

      // Selected YouTube thumbnail
      else if (bannerChannelId) {
        const bannerChannel = channels.find(c => c.id === bannerChannelId);

        const bannerVideoId = bannerChannel
          ? extractYoutubeID(bannerChannel.url)
          : null;

        bannerUrl = bannerVideoId
          ? `https://img.youtube.com/vi/${bannerVideoId}/hqdefault.jpg`
          : null;
      }

      const res = await createHostPlaylistAction({
        name: name.trim(),
        description: description.trim() || null,
        kind,
        communityId: kind === "community" ? communityId : null,
        bannerUrl,
        items,
      });

      if (!res.success) {
        if (
          handleSubscriptionActionError(res, {
            focusTier: "premium",
          })
        ) {
          return;
        }

        toast.error(
          subscriptionActionErrorMessage(
            res.validationBody,
            res.message ?? "Could not create playlist"
          )
        );

        return;
      }

      toast.success("Playlist created");

      onOpenChange(false);
      resetForm();

      await onCreated?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {SubscriptionPromptModal}

      <Dialog
        open={open}
        onOpenChange={nextOpen => {
          onOpenChange(nextOpen);

          if (!nextOpen) {
            resetForm();
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Create playlist</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="pl-name">Name</Label>

              <Input
                id="pl-name"
                value={name}
                onChange={e => setName(e.target.value)}
                maxLength={120}
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="pl-desc">Description</Label>

              <Textarea
                id="pl-desc"
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            {/* Kind */}
            <div className="space-y-1.5">
              <Label>Kind</Label>

              <Select
                value={kind}
                onValueChange={v => setKind(v as "standard" | "community")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>

                  <SelectItem value="community">Community</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Community */}
            {kind === "community" ? (
              <div className="space-y-1.5">
                <Label>Community</Label>

                <Select
                  value={communityId}
                  onValueChange={setCommunityId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select community" />
                  </SelectTrigger>

                  <SelectContent>
                    {communities.map(c => (
                      <SelectItem
                        key={c.id}
                        value={c.id}
                      >
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            {/* Videos */}
            <div className="space-y-2">
              <Label>
                Videos ({selectedChannelIds.length}/{MAX_ITEMS}, min {MIN_ITEMS}
                )
              </Label>

              <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border p-2">
                {channels.length === 0 ? (
                  <p className="text-muted-foreground text-xs">
                    No eligible videos found.
                  </p>
                ) : (
                  channels.map(ch => (
                    <label
                      key={ch.id}
                      className="hover:bg-muted/50 flex cursor-pointer items-start gap-2 rounded px-2 py-1"
                    >
                      <input
                        type="checkbox"
                        checked={selectedChannelIds.includes(ch.id)}
                        onChange={() => toggleChannel(ch.id)}
                        className="mt-1"
                      />

                      <span className="min-w-0 text-sm">
                        <span className="font-medium">{ch.title}</span>

                        <span className="text-muted-foreground block text-xs">
                          {ch.eventName}
                        </span>
                      </span>
                    </label>
                  ))
                )}
              </div>
            </div>

            {/* Banner image */}
            <div className="space-y-2">
              <Label>Banner image (optional)</Label>

              {bannerUploadPreview ? (
                <div className="relative inline-block">
                  <Image
                    src={bannerUploadPreview}
                    alt="Playlist banner preview"
                    width={320}
                    height={180}
                    className="aspect-video w-full max-w-xs rounded-md object-cover"
                    unoptimized={bannerUploadPreview.startsWith("data:")}
                  />

                  <div className="absolute top-2 right-2 flex gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleChangeBannerImage}
                    >
                      Change
                    </Button>

                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        handleRemoveBannerImage();
                        setBannerChannelId("");
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="hover:bg-muted/50 flex w-full cursor-pointer flex-wrap items-center gap-3 rounded-md border border-dashed p-4 text-left"
                  onClick={() => bannerInputRef.current?.click()}
                >
                  <CloudUpload className="text-muted-foreground size-8" />

                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">Upload custom banner</p>

                    <p className="text-muted-foreground text-xs">
                      PNG, JPEG, or WebP — max 2 MB
                    </p>
                  </div>
                </button>
              )}

              <input
                type="file"
                ref={bannerInputRef}
                hidden
                accept="image/png,image/jpeg,image/webp,image/jiff"
                onChange={e => {
                  void handleBannerImageUpload(e);
                  setBannerChannelId("");
                }}
              />

              {bannerUploadError ? (
                <p className="text-destructive text-xs">{bannerUploadError}</p>
              ) : null}
            </div>

            {/* YouTube thumbnail selection */}
            {selectedChannelIds.length > 0 && !bannerUploadPreview ? (
              <div className="space-y-2">
                <Label>Or pick a video thumbnail</Label>

                <div className="flex flex-wrap gap-2">
                  {selectedChannelIds.map(channelId => {
                    const ch = channels.find(c => c.id === channelId);

                    if (!ch) return null;

                    const videoId = extractYoutubeID(ch.url);

                    const thumb = videoId
                      ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
                      : null;

                    return (
                      <button
                        key={channelId}
                        type="button"
                        onClick={() => setBannerChannelId(channelId)}
                        className={cn(
                          "overflow-hidden rounded-md border-2",
                          bannerChannelId === channelId
                            ? "border-primary"
                            : "border-transparent"
                        )}
                        aria-label={`Use ${ch.title} as banner`}
                      >
                        {thumb ? (
                          <img
                            src={thumb}
                            alt=""
                            className="aspect-video w-24 object-cover"
                          />
                        ) : (
                          <span className="block px-2 py-4 text-xs">
                            {ch.title}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {/* Submit */}
            <Button
              type="button"
              disabled={!canSubmit || saving}
              onClick={() => void onCreate()}
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Creating…
                </>
              ) : (
                "Create playlist"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
