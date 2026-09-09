"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Loader2, Plus, Trash2, ExternalLink } from "lucide-react";
import { toast } from "react-toastify";

import {
  createTipLinkDraftAction,
  deleteTipLinkAction,
  getTipLinkCreateEligibilityAction,
  listEventTipLinksAction,
  suggestTipLinkSlugAction,
  updateTipLinkAction,
  type TipLinkSummary,
} from "@/actions/tiplink";
import { listHostPlaylistsAction } from "@/actions/host-playlist";
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
import { extractYoutubeID } from "@/lib/extractYoutubeID";
import { subscriptionActionErrorMessage } from "@/lib/host-subscription-errors";
import { useHostSubscriptionPrompt } from "@/hooks/use-host-subscription-prompt";
import { useImageUpload } from "@/hooks/use-image-upload";
import { uploadImage } from "@/lib/cloudinary";
import {
  TIPLINK_STORE_FIELDS,
  TipLinkStoreIcon,
} from "@/components/tiplink/tiplink-store-icons";
import { TIPLINK_SOCIAL_PLATFORMS } from "@/components/tiplink/tiplink-social-icons";
import { cn } from "@/lib/utils";

type Content = {
  id: string;
  title: string;
  url: string;
};

type Props = {
  eventId: string;
  contents: Content[];
};

export function EventTipLinkTab({ eventId, contents }: Props) {
  const [tipLinks, setTipLinks] = useState<TipLinkSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [eligibility, setEligibility] = useState<{
    canCreate: boolean;
    firstFreeAvailable: boolean;
  } | null>(null);
  const [creatingForChannel, setCreatingForChannel] = useState<string>("");
  const [editing, setEditing] = useState<TipLinkSummary | null>(null);
  const [playlists, setPlaylists] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [saving, setSaving] = useState(false);
  const { handleSubscriptionActionError, SubscriptionPromptModal } =
    useHostSubscriptionPrompt({ focusTier: "premium" });

  const [form, setForm] = useState({
    eventChannelId: "",
    slug: "",
    pitch: "",
    title: "",
    description: "",
    appleMusicUrl: "",
    spotifyUrl: "",
    audiomackUrl: "",
    tiktokUrl: "",
    customLinkLabel: "",
    customLinkUrl: "",
    featuredPlaylistId: "",
    socialPlatform1: "instagram",
    socialUrl1: "",
    socialPlatform2: "instagram",
    socialUrl2: "",
    bannerSource: null as "thumbnail" | "upload" | null,
    bannerUrl: null as string | null,
  });

  const {
    readableImage: bannerPreview,
    inputRef: bannerInputRef,
    handleImageUpload: handleBannerUpload,
    handleRemoveImage: handleRemoveBanner,
    error: bannerUploadError,
  } = useImageUpload({ maxSizeMB: 2 });

  const searchParams = useSearchParams();
  const autoCreateChannelId = searchParams.get("channelId")?.trim() ?? "";
  const autoCreateAttemptedRef = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [listRes, eligRes, plRes] = await Promise.all([
        listEventTipLinksAction(eventId),
        getTipLinkCreateEligibilityAction(),
        listHostPlaylistsAction(),
      ]);
      if (listRes.success && listRes.data) {
        setTipLinks(listRes.data.tipLinks);
      }
      if (eligRes.success && eligRes.data) {
        setEligibility({
          canCreate: eligRes.data.canCreate,
          firstFreeAvailable: eligRes.data.firstFreeAvailable,
        });
      }
      if (plRes.success && plRes.data) {
        setPlaylists(
          (plRes.data.playlists ?? []).map(p => ({ id: p.id, name: p.name }))
        );
      }
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    void load();
  }, [load]);

  const channelsWithoutTipLink = useMemo(() => {
    const used = new Set(tipLinks.map(t => t.eventChannelId));
    return contents.filter(c => !used.has(c.id));
  }, [contents, tipLinks]);

  const selectableVideos = useMemo(() => {
    if (!editing) return [];
    const usedByOther = new Set(
      tipLinks.filter(t => t.id !== editing.id).map(t => t.eventChannelId)
    );
    return contents.filter(
      c => c.id === editing.eventChannelId || !usedByOther.has(c.id)
    );
  }, [contents, editing, tipLinks]);

  const activeVideoUrl = useMemo(() => {
    if (!editing) return "";
    const selectedId = form.eventChannelId || editing.eventChannelId;
    const selected = contents.find(c => c.id === selectedId);
    return selected?.url ?? editing.videoUrl;
  }, [contents, editing, form.eventChannelId]);

  const thumbFor = (url: string) => {
    const id = extractYoutubeID(url);
    return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
  };

  const startCreate = useCallback(
    async (channelId: string, title: string) => {
      if (!eligibility?.canCreate) {
        handleSubscriptionActionError(
          { success: false, validationBody: { code: "SUBSCRIPTION_REQUIRED" } },
          { focusTier: "premium" }
        );
        return;
      }
      setCreatingForChannel(channelId);
      try {
        const slugRes = await suggestTipLinkSlugAction(title);
        const slug =
          slugRes.success && slugRes.data ? slugRes.data.slug : "link";
        const res = await createTipLinkDraftAction({
          eventChannelId: channelId,
          slug,
        });
        if (!res.success || !res.data) {
          if (handleSubscriptionActionError(res, { focusTier: "premium" }))
            return;
          toast.error(res.message ?? "Could not create TipLink");
          return;
        }
        toast.success("TipLink draft created");
        setEditing(res.data.tipLink);
        setForm(f => ({ ...f, slug: res.data!.tipLink.slug, pitch: "" }));
        await load();
      } finally {
        setCreatingForChannel("");
      }
    },
    [eligibility?.canCreate, handleSubscriptionActionError, load]
  );

  useEffect(() => {
    if (
      loading ||
      editing ||
      !autoCreateChannelId ||
      autoCreateAttemptedRef.current
    ) {
      return;
    }
    const channel = contents.find(c => c.id === autoCreateChannelId);
    const alreadyHasTipLink = tipLinks.some(
      t => t.eventChannelId === autoCreateChannelId
    );
    if (!channel || alreadyHasTipLink) return;
    autoCreateAttemptedRef.current = true;
    void startCreate(channel.id, channel.title);
  }, [autoCreateChannelId, contents, editing, loading, startCreate, tipLinks]);

  const openEdit = (row: TipLinkSummary) => {
    setEditing(row);
    handleRemoveBanner();
    setForm({
      eventChannelId: row.eventChannelId,
      slug: row.slug,
      pitch: row.pitch ?? "",
      title: row.title,
      description: row.description ?? "",
      appleMusicUrl: row.appleMusicUrl ?? "",
      spotifyUrl: row.spotifyUrl ?? "",
      audiomackUrl: row.audiomackUrl ?? "",
      tiktokUrl: row.tiktokUrl ?? "",
      customLinkLabel: row.customLinkLabel ?? "",
      customLinkUrl: row.customLinkUrl ?? "",
      featuredPlaylistId: row.featuredPlaylistId ?? "",
      socialPlatform1: row.socials[0]?.platform ?? "instagram",
      socialUrl1: row.socials[0]?.url ?? "",
      socialPlatform2: row.socials[1]?.platform ?? "instagram",
      socialUrl2: row.socials[1]?.url ?? "",
      bannerSource: row.bannerSource,
      bannerUrl: row.bannerUrl,
    });
  };

  const buildSocials = () => {
    const socials = [];
    if (form.socialUrl1.trim()) {
      socials.push({
        platform: form.socialPlatform1.trim() || "instagram",
        url: form.socialUrl1.trim(),
      });
    }
    if (form.socialUrl2.trim()) {
      socials.push({
        platform: form.socialPlatform2.trim() || "instagram",
        url: form.socialUrl2.trim(),
      });
    }
    return socials;
  };

  const persistDraft = async (): Promise<boolean> => {
    if (!editing) return false;
    try {
      let bannerUrl = form.bannerUrl ?? editing.bannerUrl;
      let bannerSource = form.bannerSource ?? editing.bannerSource;
      if (bannerPreview) {
        const uploaded = await uploadImage(bannerPreview);
        if (!uploaded?.secure_url) {
          toast.error("Could not upload banner image");
          return false;
        }
        bannerUrl = uploaded.secure_url;
        bannerSource = "upload";
      }

      const isRebinding =
        Boolean(form.eventChannelId) &&
        form.eventChannelId !== editing.eventChannelId;
      const usesThumbnailBanner =
        bannerSource === "thumbnail" ||
        (bannerSource == null && editing.bannerSource === "thumbnail");

      const res = await updateTipLinkAction(editing.id, {
        ...(isRebinding ? { eventChannelId: form.eventChannelId } : {}),
        slug: form.slug,
        pitch: form.pitch || null,
        ...(!isRebinding
          ? {
              titleOverride: form.title || null,
              descriptionOverride: form.description || null,
            }
          : {}),
        appleMusicUrl: form.appleMusicUrl || null,
        spotifyUrl: form.spotifyUrl || null,
        audiomackUrl: form.audiomackUrl || null,
        tiktokUrl: form.tiktokUrl || null,
        customLinkLabel: form.customLinkLabel.trim() || null,
        customLinkUrl: form.customLinkUrl.trim() || null,
        featuredPlaylistId: form.featuredPlaylistId || null,
        socials: buildSocials(),
        ...(!(isRebinding && usesThumbnailBanner)
          ? { bannerUrl, bannerSource }
          : {}),
      });
      if (!res.success || !res.data) {
        toast.error(res.message ?? "Save failed");
        return false;
      }
      toast.success("Draft saved");
      setEditing(res.data.tipLink);
      await load();
      return true;
    } catch {
      toast.error("Save failed");
      return false;
    }
  };

  const saveDraft = async () => {
    setSaving(true);
    try {
      await persistDraft();
    } finally {
      setSaving(false);
    }
  };

  const publish = async () => {
    if (!editing) return;
    if (!form.pitch.trim()) {
      toast.error("Pitch is required to publish");
      return;
    }
    setSaving(true);
    try {
      const savedOk = await persistDraft();
      if (!savedOk) return;
      const res = await updateTipLinkAction(editing.id, {
        status: "published",
        pitch: form.pitch.trim(),
      });
      if (!res.success) {
        toast.error(res.message ?? "Publish failed");
        return;
      }
      toast.success("TipLink published");
      setEditing(null);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    const res = await deleteTipLinkAction(id);
    if (!res.success) {
      toast.error(res.message ?? "Delete failed");
      return;
    }
    toast.success("TipLink deleted");
    if (editing?.id === id) setEditing(null);
    await load();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-muted/30 rounded-lg border p-4 text-sm">
        {eligibility?.firstFreeAvailable ? (
          <p>
            Your first TipLink is free. Additional TipLinks require Growth or
            Community.
          </p>
        ) : eligibility?.canCreate ? (
          <p>You can create TipLinks with your active premium plan.</p>
        ) : (
          <p>Upgrade to Growth or Community to create another TipLink.</p>
        )}
      </div>

      {!editing ? (
        <>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">TipLinks for this event</h3>
          </div>
          {tipLinks.length === 0 ? (
            <p className="text-muted-foreground text-sm">No TipLinks yet.</p>
          ) : (
            <ul className="space-y-3">
              {tipLinks.map(row => (
                <li
                  key={row.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
                >
                  <div>
                    <p className="font-medium">{row.title}</p>
                    <p className="text-muted-foreground text-xs">
                      {row.status} · {row.pageVisits90d} visits (90d)
                      {row.visitAnalytics
                        ? ` · ${row.visitAnalytics.visits7d} (7d) · ${row.visitAnalytics.visits24h} (24h)`
                        : ""}{" "}
                      · /l/{row.slug}
                    </p>
                    {row.visitAnalytics &&
                    row.visitAnalytics.topCountries.length > 0 ? (
                      <p className="text-muted-foreground mt-1 text-xs">
                        Top countries (90d):{" "}
                        {row.visitAnalytics.topCountries
                          .map(c => `${c.code} (${c.count})`)
                          .join(", ")}
                      </p>
                    ) : row.visitAnalytics ? (
                      <p className="text-muted-foreground mt-1 text-xs">
                        Top countries: not enough data yet
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEdit(row)}
                    >
                      Edit
                    </Button>
                    {row.status === "published" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        asChild
                      >
                        <Link
                          href={row.landingUrl}
                          target="_blank"
                        >
                          <ExternalLink className="mr-1 size-4" /> Live
                        </Link>
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        asChild
                      >
                        <Link
                          href={`/l/preview/${row.id}`}
                          target="_blank"
                        >
                          Preview
                        </Link>
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => void remove(row.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {channelsWithoutTipLink.length > 0 ? (
            <div className="space-y-2">
              <Label>Create TipLink for a video</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {channelsWithoutTipLink.map(ch => {
                  const thumb = thumbFor(ch.url);
                  return (
                    <button
                      key={ch.id}
                      type="button"
                      disabled={creatingForChannel === ch.id}
                      className="hover:bg-muted/40 flex items-center gap-3 rounded-lg border p-2 text-left"
                      onClick={() => void startCreate(ch.id, ch.title)}
                    >
                      {thumb ? (
                        <Image
                          src={thumb}
                          alt=""
                          width={56}
                          height={42}
                          className="rounded"
                          unoptimized
                        />
                      ) : null}
                      <span className="text-sm font-medium">{ch.title}</span>
                      {creatingForChannel === ch.id ? (
                        <Loader2 className="ml-auto size-4 animate-spin" />
                      ) : (
                        <Plus className="ml-auto size-4" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <h3 className="font-semibold">Publish TipLink</h3>
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input
                value={form.slug}
                onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
              />
            </div>
            {selectableVideos.length > 1 ? (
              <div className="space-y-2">
                <Label>Video</Label>
                <Select
                  value={form.eventChannelId || editing.eventChannelId}
                  onValueChange={channelId => {
                    const next = contents.find(c => c.id === channelId);
                    const youtubeThumb = next ? thumbFor(next.url) : null;
                    setForm(f => ({
                      ...f,
                      eventChannelId: channelId,
                      ...(f.bannerSource === "thumbnail" && youtubeThumb
                        ? { bannerUrl: youtubeThumb }
                        : {}),
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select video" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectableVideos.map(video => (
                      <SelectItem
                        key={video.id}
                        value={video.id}
                      >
                        {video.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={e =>
                  setForm(f => ({ ...f, description: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Pitch (required to publish)</Label>
              <Textarea
                maxLength={120}
                value={form.pitch}
                onChange={e => setForm(f => ({ ...f, pitch: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Banner</Label>
              {editing
                ? (() => {
                    const youtubeThumb = thumbFor(activeVideoUrl);
                    const activeBanner =
                      bannerPreview ??
                      (form.bannerSource === "thumbnail" && youtubeThumb
                        ? youtubeThumb
                        : null) ??
                      (form.bannerUrl && form.bannerSource === "upload"
                        ? form.bannerUrl
                        : null) ??
                      (editing.bannerUrl && !bannerPreview
                        ? editing.bannerUrl
                        : null);
                    return (
                      <div className="space-y-3">
                        {youtubeThumb ? (
                          <button
                            type="button"
                            className={cn(
                              "relative block h-32 w-full overflow-hidden rounded-lg border-2 transition",
                              form.bannerSource === "thumbnail" &&
                                !bannerPreview
                                ? "border-primary"
                                : "hover:border-primary/40 border-transparent"
                            )}
                            onClick={() => {
                              handleRemoveBanner();
                              setForm(f => ({
                                ...f,
                                bannerSource: "thumbnail",
                                bannerUrl: youtubeThumb,
                              }));
                            }}
                          >
                            <Image
                              src={youtubeThumb}
                              alt="YouTube thumbnail"
                              fill
                              className="object-cover"
                              unoptimized
                            />
                            <span className="absolute bottom-2 left-2 rounded bg-black/70 px-2 py-0.5 text-xs">
                              Use video thumbnail
                            </span>
                          </button>
                        ) : null}
                        <input
                          ref={bannerInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          onChange={handleBannerUpload}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => bannerInputRef.current?.click()}
                        >
                          Upload banner
                        </Button>
                        {bannerUploadError ? (
                          <p className="text-destructive text-xs">
                            {bannerUploadError}
                          </p>
                        ) : null}
                        {activeBanner && bannerPreview ? (
                          <div className="relative mt-2 h-32 w-full">
                            <Image
                              src={activeBanner}
                              alt=""
                              fill
                              className="rounded object-cover"
                              unoptimized
                            />
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="absolute top-1 right-1"
                              onClick={() => {
                                handleRemoveBanner();
                                setForm(f => ({
                                  ...f,
                                  bannerSource: null,
                                  bannerUrl: null,
                                }));
                              }}
                            >
                              Remove
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    );
                  })()
                : null}
            </div>
            {TIPLINK_STORE_FIELDS.map(field => (
              <div
                key={field.key}
                className="space-y-2"
              >
                <Label className="inline-flex items-center gap-2">
                  <TipLinkStoreIcon storeKey={field.key} />
                  {field.label}
                </Label>
                <Input
                  value={form[field.key]}
                  onChange={e =>
                    setForm(f => ({ ...f, [field.key]: e.target.value }))
                  }
                  placeholder="https://"
                />
              </div>
            ))}
            <div className="space-y-2 rounded border p-3">
              <Label>Custom link (optional)</Label>
              <Input
                placeholder="Link name"
                value={form.customLinkLabel}
                onChange={e =>
                  setForm(f => ({ ...f, customLinkLabel: e.target.value }))
                }
              />
              <Input
                placeholder="https://"
                value={form.customLinkUrl}
                onChange={e =>
                  setForm(f => ({ ...f, customLinkUrl: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Featured playlist</Label>
              <Select
                value={form.featuredPlaylistId || "none"}
                onValueChange={v =>
                  setForm(f => ({
                    ...f,
                    featuredPlaylistId: v === "none" ? "" : v,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {playlists.map(p => (
                    <SelectItem
                      key={p.id}
                      value={p.id}
                    >
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[1, 2].map(n => (
                <div
                  key={n}
                  className="space-y-2 rounded border p-2"
                >
                  <Label>Social {n}</Label>
                  <Select
                    value={
                      (n === 1 ? form.socialPlatform1 : form.socialPlatform2) ||
                      "instagram"
                    }
                    onValueChange={v =>
                      setForm(f =>
                        n === 1
                          ? { ...f, socialPlatform1: v }
                          : { ...f, socialPlatform2: v }
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Platform" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPLINK_SOCIAL_PLATFORMS.map(p => (
                        <SelectItem
                          key={p.id}
                          value={p.id}
                        >
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="https://"
                    value={n === 1 ? form.socialUrl1 : form.socialUrl2}
                    onChange={e =>
                      setForm(f =>
                        n === 1
                          ? { ...f, socialUrl1: e.target.value }
                          : { ...f, socialUrl2: e.target.value }
                      )
                    }
                  />
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={saving}
                onClick={() => void saveDraft()}
              >
                Save draft
              </Button>
              <Button
                disabled={saving}
                variant="default"
                onClick={() => void publish()}
              >
                Publish
              </Button>
              <Button
                variant="ghost"
                onClick={() => setEditing(null)}
              >
                Cancel
              </Button>
            </div>
          </div>
          <div className="bg-muted/20 rounded-lg border p-4">
            <p className="mb-2 text-sm font-medium">Live preview</p>
            <Link
              href={`/l/preview/${editing.id}`}
              target="_blank"
              className="text-primary text-sm underline"
            >
              Open preview in new tab
            </Link>
          </div>
        </div>
      )}
      {SubscriptionPromptModal}
    </div>
  );
}
