"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import { Loader2, Plus, Trash2, ExternalLink } from "lucide-react";
import { toast } from "react-toastify";

import {
  createTipLinkDraftAction,
  deleteTipLinkAction,
  getTipLinkCreateEligibilityAction,
  listEventTipLinksAction,
  suggestTipLinkSlugAction,
  suggestTipLinkStoreLinksAction,
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
import {
  isSubscriptionLapsedError,
  isSubscriptionRequiredError,
  subscriptionActionErrorMessage,
} from "@/lib/host-subscription-errors";
import { setHostSubscriptionResume } from "@/lib/host-subscription-resume";
import {
  openTipLinkCreateSubscriptionPrompt,
  shouldPreGateTipLinkCreate,
  TIPLINK_DRAFT_CREATE_TOAST_ID,
} from "@/lib/tiplink-create-subscription-gate";
import { buildTipLinkManageHref } from "@/lib/tiplink-manage-navigation";
import { PremiumFeatureBadge } from "@/components/dashboard/premium-feature-badge";
import { useHostPlanCapabilities } from "@/hooks/useHostPlanCapabilities";
import { useHostSubscriptionPrompt } from "@/hooks/use-host-subscription-prompt";
import { useHostSession } from "@/hooks/use-host-session";
import { useImageUpload } from "@/hooks/use-image-upload";
import { tryUploadImage } from "@/lib/cloudinary";
import {
  TIPLINK_STORE_FIELDS,
  TipLinkStoreIcon,
} from "@/components/tiplink/tiplink-store-icons";
import { TIPLINK_SOCIAL_PLATFORMS } from "@/components/tiplink/tiplink-social-icons";
import { cn } from "@/lib/utils";
import { TIPLINK_MONEY_FOR_MAX } from "@/lib/tiplink-raised-line";
import {
  isCommunityBankChannel,
  isTipLinkEligibleEventRoomChannel,
} from "@/lib/tiplink-channel-eligibility";

type Content = {
  id: string;
  title: string;
  description?: string | null;
  url: string;
  communityBankEntry?: {
    status?: string | null;
    visibility?: string | null;
  } | null;
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
    subscriptionStatus: string;
  } | null>(null);
  const [creatingForChannel, setCreatingForChannel] = useState<string>("");
  const [editing, setEditing] = useState<TipLinkSummary | null>(null);
  const [playlists, setPlaylists] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [playlistPlan, setPlaylistPlan] = useState<
    "ok" | "required" | "lapsed" | "error"
  >("ok");
  const [saving, setSaving] = useState(false);
  const [previewRevision, setPreviewRevision] = useState(0);
  const [suggestingStoreLinks, setSuggestingStoreLinks] = useState(false);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autosavingRef = useRef(false);
  const skipAutosaveRef = useRef(true);
  const pathname = usePathname();
  const { eventSlug } = useHostSession();
  const { hasActivePremium } = useHostPlanCapabilities();
  const {
    handleSubscriptionActionError,
    openForRequired,
    openForLapsed,
    SubscriptionPromptModal,
  } = useHostSubscriptionPrompt({ focusTier: "premium" });

  const [form, setForm] = useState({
    eventChannelId: "",
    slug: "",
    pitch: "",
    moneyFor: "",
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
    bannerAspect: "landscape" as "landscape" | "square",
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
          subscriptionStatus: eligRes.data.subscriptionStatus,
        });
      }
      if (plRes.success && plRes.data) {
        setPlaylistPlan("ok");
        setPlaylists(
          (plRes.data.playlists ?? []).map(p => ({ id: p.id, name: p.name }))
        );
      } else if (isSubscriptionRequiredError(plRes.validationBody)) {
        setPlaylists([]);
        setPlaylistPlan("required");
      } else if (isSubscriptionLapsedError(plRes.validationBody)) {
        setPlaylists([]);
        setPlaylistPlan("lapsed");
      } else if (!plRes.success) {
        setPlaylists([]);
        setPlaylistPlan("error");
        toast.error(
          subscriptionActionErrorMessage(
            plRes.validationBody,
            plRes.message ?? "Could not load playlists"
          )
        );
      }
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    if (hasActivePremium && playlistPlan !== "ok") {
      void load();
    }
  }, [hasActivePremium, load, playlistPlan]);

  const resumePathForPlaylistSubscribe = useCallback(() => {
    if (typeof window === "undefined") {
      return pathname ?? "";
    }
    return `${window.location.pathname}${window.location.search}`;
  }, [pathname]);

  const openFeaturedPlaylistSubscribe = useCallback(() => {
    setHostSubscriptionResume({
      kind: "create-playlist",
      returnPath: resumePathForPlaylistSubscribe(),
    });
    openForRequired("premium");
  }, [openForRequired, resumePathForPlaylistSubscribe]);

  const openFeaturedPlaylistRenew = useCallback(() => {
    setHostSubscriptionResume({
      kind: "create-playlist",
      returnPath: resumePathForPlaylistSubscribe(),
    });
    openForLapsed("premium");
  }, [openForLapsed, resumePathForPlaylistSubscribe]);

  useEffect(() => {
    void load();
  }, [load]);

  const channelsWithoutTipLink = useMemo(() => {
    const used = new Set(tipLinks.map(t => t.eventChannelId));
    return contents.filter(
      c => !used.has(c.id) && isTipLinkEligibleEventRoomChannel(c)
    );
  }, [contents, tipLinks]);

  const selectableVideos = useMemo(() => {
    if (!editing) return [];
    const usedByOther = new Set(
      tipLinks.filter(t => t.id !== editing.id).map(t => t.eventChannelId)
    );
    return contents.filter(
      c =>
        (c.id === editing.eventChannelId || !usedByOther.has(c.id)) &&
        (c.id === editing.eventChannelId ||
          isTipLinkEligibleEventRoomChannel(c))
    );
  }, [contents, editing, tipLinks]);

  const activeVideoUrl = useMemo(() => {
    if (!editing) return "";
    const selectedId = form.eventChannelId || editing.eventChannelId;
    const selected = contents.find(c => c.id === selectedId);
    return selected?.url ?? editing.videoUrl;
  }, [contents, editing, form.eventChannelId]);

  const isCommunityBankDraft = useMemo(() => {
    if (!editing) return false;
    const selectedId = form.eventChannelId || editing.eventChannelId;
    const selected = contents.find(c => c.id === selectedId);
    return selected ? isCommunityBankChannel(selected) : false;
  }, [contents, editing, form.eventChannelId]);

  const suggestStoreLinks = useCallback(async () => {
    const title = form.title.trim() || editing?.title?.trim() || "";
    if (!title) {
      toast.error("Add a title before searching store links");
      return;
    }
    setSuggestingStoreLinks(true);
    try {
      const res = await suggestTipLinkStoreLinksAction({
        title,
        youtubeUrl: activeVideoUrl || null,
      });
      if (!res.success || !res.data) {
        toast.error(res.message ?? "Could not find store links");
        return;
      }
      setForm(f => ({
        ...f,
        appleMusicUrl: f.appleMusicUrl.trim() || res.data!.appleMusicUrl || "",
        spotifyUrl: f.spotifyUrl.trim() || res.data!.spotifyUrl || "",
        audiomackUrl: f.audiomackUrl.trim() || res.data!.audiomackUrl || "",
      }));
      toast.success("Store link suggestions applied to empty fields");
    } finally {
      setSuggestingStoreLinks(false);
    }
  }, [activeVideoUrl, editing?.title, form.title]);

  useEffect(() => {
    setPreviewRevision(0);
    skipAutosaveRef.current = true;
  }, [editing?.id]);

  const thumbFor = (url: string) => {
    const id = extractYoutubeID(url);
    return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
  };

  const resumeTipLinkCreate = useCallback(
    (channelId: string, title: string) => {
      const slug = eventSlug?.trim();
      const search = searchParams.toString();
      const returnPath = slug
        ? buildTipLinkManageHref(slug, eventId, channelId)
        : `${pathname ?? ""}${search ? `?${search}` : ""}`;
      setHostSubscriptionResume({
        kind: "create-tiplink-draft",
        returnPath,
        channelId,
        eventId,
        title,
      });
    },
    [eventId, eventSlug, pathname, searchParams]
  );

  const startCreate = useCallback(
    async (channelId: string, title: string) => {
      if (shouldPreGateTipLinkCreate(eligibility)) {
        resumeTipLinkCreate(channelId, title);
        openTipLinkCreateSubscriptionPrompt({
          eligibility,
          openForRequired,
          openForLapsed,
          focusTier: "premium",
        });
        return;
      }
      setCreatingForChannel(channelId);
      toast.info("Creating TipLink draft…", {
        toastId: TIPLINK_DRAFT_CREATE_TOAST_ID,
      });
      try {
        const slugRes = await suggestTipLinkSlugAction(title);
        const slug =
          slugRes.success && slugRes.data ? slugRes.data.slug : "link";
        const res = await createTipLinkDraftAction({
          eventChannelId: channelId,
          slug,
        });
        if (!res.success || !res.data) {
          if (handleSubscriptionActionError(res, { focusTier: "premium" })) {
            toast.dismiss(TIPLINK_DRAFT_CREATE_TOAST_ID);
            resumeTipLinkCreate(channelId, title);
            return;
          }
          toast.dismiss(TIPLINK_DRAFT_CREATE_TOAST_ID);
          toast.error(res.message ?? "Could not create TipLink");
          return;
        }
        toast.dismiss(TIPLINK_DRAFT_CREATE_TOAST_ID);
        toast.success("TipLink draft created");
        const channel = contents.find(c => c.id === channelId);
        setEditing(res.data.tipLink);
        setForm(f => ({
          ...f,
          eventChannelId: channelId,
          slug: res.data!.tipLink.slug,
          pitch: "",
          moneyFor: "",
          title: channel?.title ?? res.data!.tipLink.title ?? "",
          description:
            channel?.description ?? res.data!.tipLink.description ?? "",
        }));
        await load();
      } finally {
        setCreatingForChannel("");
      }
    },
    [
      contents,
      eligibility,
      handleSubscriptionActionError,
      load,
      openForLapsed,
      openForRequired,
      resumeTipLinkCreate,
    ]
  );

  const openEdit = (row: TipLinkSummary) => {
    setEditing(row);
    handleRemoveBanner();
    setForm({
      eventChannelId: row.eventChannelId,
      slug: row.slug,
      pitch: row.pitch ?? "",
      moneyFor: row.moneyFor ?? "",
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
      bannerAspect: row.bannerAspect ?? "landscape",
    });
  };

  useEffect(() => {
    if (
      loading ||
      editing ||
      !autoCreateChannelId ||
      autoCreateAttemptedRef.current
    ) {
      return;
    }
    autoCreateAttemptedRef.current = true;
    const existing = tipLinks.find(
      t => t.eventChannelId === autoCreateChannelId
    );
    if (existing) {
      openEdit(existing);
      return;
    }
    const channel = contents.find(c => c.id === autoCreateChannelId);
    if (!channel || !isTipLinkEligibleEventRoomChannel(channel)) {
      return;
    }
    void startCreate(channel.id, channel.title);
  }, [autoCreateChannelId, contents, editing, loading, startCreate, tipLinks]);

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

  const persistDraft = async (
    options: {
      silent?: boolean;
      includeSlug?: boolean;
      bumpPreview?: boolean;
      reloadList?: boolean;
    } = {}
  ): Promise<boolean> => {
    const {
      silent = false,
      includeSlug = true,
      bumpPreview = false,
      reloadList = true,
    } = options;
    if (!editing) return false;
    try {
      let bannerUrl = form.bannerUrl ?? editing.bannerUrl;
      let bannerSource = form.bannerSource ?? editing.bannerSource;
      if (bannerPreview) {
        const uploaded = await tryUploadImage(bannerPreview);
        if (!uploaded.ok) {
          if (!silent) toast.error(uploaded.message);
          return false;
        }
        if (!uploaded.data?.secure_url) {
          if (!silent) toast.error("Could not upload banner image");
          return false;
        }
        bannerUrl = uploaded.data.secure_url;
        bannerSource = "upload";
      }

      const isRebinding =
        Boolean(form.eventChannelId) &&
        form.eventChannelId !== editing.eventChannelId;
      const usesThumbnailBanner =
        bannerSource === "thumbnail" ||
        (bannerSource == null && editing.bannerSource === "thumbnail");

      const res = await updateTipLinkAction(editing.id, {
        ...(includeSlug ? { slug: form.slug } : {}),
        ...(isRebinding && includeSlug
          ? { eventChannelId: form.eventChannelId }
          : {}),
        pitch: form.pitch || null,
        moneyFor: form.moneyFor.trim() || null,
        ...(!isRebinding || !includeSlug
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
        ...(includeSlug
          ? {
              ...(playlistPlan === "ok"
                ? { featuredPlaylistId: form.featuredPlaylistId || null }
                : {}),
              socials: buildSocials(),
            }
          : {}),
        ...(!(isRebinding && usesThumbnailBanner)
          ? {
              bannerUrl,
              bannerSource,
              bannerAspect: form.bannerAspect,
            }
          : {}),
      });
      if (!res.success || !res.data) {
        if (!silent) toast.error(res.message ?? "Save failed");
        return false;
      }
      if (!silent) toast.success("Draft saved");
      setEditing(res.data.tipLink);
      if (bumpPreview) {
        setPreviewRevision(revision => revision + 1);
      }
      if (reloadList) {
        await load();
      }
      return true;
    } catch {
      if (!silent) toast.error("Save failed");
      return false;
    }
  };

  const saveDraft = async () => {
    setSaving(true);
    try {
      await persistDraft({ bumpPreview: true });
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
      const savedOk = await persistDraft({ bumpPreview: true });
      if (!savedOk) return;
      const res = await updateTipLinkAction(editing.id, {
        status: "published",
        pitch: form.pitch.trim(),
      });
      if (!res.success) {
        toast.error(res.message ?? "Publish failed");
        return;
      }
      setPreviewRevision(revision => revision + 1);
      toast.success("TipLink published");
      setEditing(null);
      await load();
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!editing) return;

    if (skipAutosaveRef.current) {
      skipAutosaveRef.current = false;
      return;
    }
    if (saving || autosavingRef.current) return;

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = setTimeout(() => {
      autosavingRef.current = true;
      void persistDraft({
        silent: true,
        includeSlug: false,
        bumpPreview: true,
        reloadList: false,
      }).finally(() => {
        autosavingRef.current = false;
      });
    }, 1000);

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [
    editing,
    saving,
    form.title,
    form.description,
    form.pitch,
    form.moneyFor,
    form.appleMusicUrl,
    form.spotifyUrl,
    form.audiomackUrl,
    form.tiktokUrl,
    form.customLinkLabel,
    form.customLinkUrl,
    form.bannerUrl,
    form.bannerSource,
    form.bannerAspect,
    bannerPreview,
  ]);

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
                      ) : shouldPreGateTipLinkCreate(eligibility) ? (
                        <PremiumFeatureBadge
                          className="ml-auto size-4"
                          label="Additional TipLink requires Host Growth or Community"
                        />
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
                className="break-words whitespace-pre-wrap"
              />
            </div>
            <div className="space-y-2">
              <Label>TipLink money for</Label>
              <Input
                maxLength={TIPLINK_MONEY_FOR_MAX}
                placeholder="charity and upkeep"
                value={form.moneyFor}
                onChange={e =>
                  setForm(f => ({ ...f, moneyFor: e.target.value }))
                }
              />
              <p className="text-muted-foreground text-xs">
                Shown on the pitch as “towards …” in front of amount raised.
              </p>
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
              <div className="flex gap-2 pt-1">
                <Button
                  type="button"
                  size="sm"
                  variant={
                    form.bannerAspect === "landscape" ? "default" : "outline"
                  }
                  onClick={() =>
                    setForm(f => ({ ...f, bannerAspect: "landscape" }))
                  }
                >
                  Landscape
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={
                    form.bannerAspect === "square" ? "default" : "outline"
                  }
                  onClick={() =>
                    setForm(f => ({ ...f, bannerAspect: "square" }))
                  }
                >
                  Square
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={suggestingStoreLinks}
                onClick={() => void suggestStoreLinks()}
              >
                {suggestingStoreLinks ? "Searching…" : "Find store links"}
              </Button>
              <p className="text-muted-foreground text-xs">
                Fills empty Apple, Spotify, and Audiomack fields only.
              </p>
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
            {!isCommunityBankDraft ? (
              <div className="space-y-2">
                <Label>Featured playlist</Label>
                {playlistPlan === "ok" ? (
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
                ) : (
                  <div className="space-y-2 rounded-md border border-dashed p-3 text-sm">
                    <p className="text-muted-foreground">
                      {playlistPlan === "lapsed"
                        ? "Featuring a playlist on your TipLink requires an active Host Growth or Community plan."
                        : "Featuring a playlist on your TipLink requires Host Growth or Community."}
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="inline-flex items-center gap-1.5"
                      onClick={
                        playlistPlan === "lapsed"
                          ? openFeaturedPlaylistRenew
                          : openFeaturedPlaylistSubscribe
                      }
                    >
                      <PremiumFeatureBadge
                        className="size-3.5"
                        label="Requires Host Growth — tap to subscribe or renew"
                      />
                      {playlistPlan === "lapsed"
                        ? "Renew plan"
                        : "Subscribe to Host Growth"}
                    </Button>
                  </div>
                )}
              </div>
            ) : null}
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
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-sm font-medium">Live preview</p>
              <Link
                href={`/l/preview/${editing.id}`}
                target="_blank"
                className="text-primary inline-flex items-center gap-1 text-sm underline"
              >
                Open in new tab
                <ExternalLink className="size-3.5" />
              </Link>
            </div>
            <div className="overflow-hidden rounded-lg border bg-black/90">
              <iframe
                key={`${editing.id}-${previewRevision}`}
                title="TipLink preview"
                src={`/l/preview/${editing.id}`}
                className="aspect-[9/16] max-h-[min(70vh,720px)] w-full bg-black"
              />
            </div>
          </div>
        </div>
      )}
      {SubscriptionPromptModal}
    </div>
  );
}
