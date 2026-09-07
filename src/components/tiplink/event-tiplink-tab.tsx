"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
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
    slug: "",
    pitch: "",
    titleOverride: "",
    descriptionOverride: "",
    appleMusicUrl: "",
    spotifyUrl: "",
    audiomackUrl: "",
    tiktokUrl: "",
    featuredPlaylistId: "",
    socialPlatform1: "",
    socialUrl1: "",
    socialPlatform2: "",
    socialUrl2: "",
  });

  const {
    readableImage: bannerPreview,
    inputRef: bannerInputRef,
    handleImageUpload: handleBannerUpload,
    handleRemoveImage: handleRemoveBanner,
  } = useImageUpload({ maxSizeMB: 2 });

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

  const thumbFor = (url: string) => {
    const id = extractYoutubeID(url);
    return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
  };

  const startCreate = async (channelId: string, title: string) => {
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
      const slug = slugRes.success && slugRes.data ? slugRes.data.slug : "link";
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
  };

  const openEdit = (row: TipLinkSummary) => {
    setEditing(row);
    setForm({
      slug: row.slug,
      pitch: row.pitch ?? "",
      titleOverride: row.title,
      descriptionOverride: row.description ?? "",
      appleMusicUrl: row.appleMusicUrl ?? "",
      spotifyUrl: row.spotifyUrl ?? "",
      audiomackUrl: row.audiomackUrl ?? "",
      tiktokUrl: row.tiktokUrl ?? "",
      featuredPlaylistId: row.featuredPlaylistId ?? "",
      socialPlatform1: row.socials[0]?.platform ?? "",
      socialUrl1: row.socials[0]?.url ?? "",
      socialPlatform2: row.socials[1]?.platform ?? "",
      socialUrl2: row.socials[1]?.url ?? "",
    });
  };

  const buildSocials = () => {
    const socials = [];
    if (form.socialUrl1.trim()) {
      socials.push({
        platform: form.socialPlatform1.trim() || "link",
        url: form.socialUrl1.trim(),
      });
    }
    if (form.socialUrl2.trim()) {
      socials.push({
        platform: form.socialPlatform2.trim() || "link",
        url: form.socialUrl2.trim(),
      });
    }
    return socials;
  };

  const saveDraft = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      let bannerUrl = editing.bannerUrl;
      let bannerSource = editing.bannerSource;
      if (bannerPreview) {
        const uploaded = await uploadImage(bannerPreview);
        if (!uploaded) {
          toast.error("Could not upload banner image");
          return;
        }
        bannerUrl = uploaded;
        bannerSource = "upload";
      }

      const res = await updateTipLinkAction(editing.id, {
        slug: form.slug,
        pitch: form.pitch || null,
        titleOverride: form.titleOverride || null,
        descriptionOverride: form.descriptionOverride || null,
        appleMusicUrl: form.appleMusicUrl || null,
        spotifyUrl: form.spotifyUrl || null,
        audiomackUrl: form.audiomackUrl || null,
        tiktokUrl: form.tiktokUrl || null,
        featuredPlaylistId: form.featuredPlaylistId || null,
        socials: buildSocials(),
        bannerUrl,
        bannerSource,
      });
      if (!res.success || !res.data) {
        toast.error(res.message ?? "Save failed");
        return;
      }
      toast.success("Draft saved");
      setEditing(res.data.tipLink);
      await load();
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
      await saveDraft();
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
                      {row.status} · {row.pageVisits90d} visits (90d) · /l/
                      {row.slug}
                    </p>
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
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={form.titleOverride}
                onChange={e =>
                  setForm(f => ({ ...f, titleOverride: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={form.descriptionOverride}
                onChange={e =>
                  setForm(f => ({ ...f, descriptionOverride: e.target.value }))
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
              <input
                ref={bannerInputRef}
                type="file"
                accept="image/*"
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
              {bannerPreview ? (
                <div className="relative mt-2 h-32 w-full">
                  <Image
                    src={bannerPreview}
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
                    onClick={handleRemoveBanner}
                  >
                    Remove
                  </Button>
                </div>
              ) : null}
            </div>
            {(
              [
                "appleMusicUrl",
                "spotifyUrl",
                "audiomackUrl",
                "tiktokUrl",
              ] as const
            ).map(key => (
              <div
                key={key}
                className="space-y-2"
              >
                <Label>{key.replace("Url", "")}</Label>
                <Input
                  value={form[key]}
                  onChange={e =>
                    setForm(f => ({ ...f, [key]: e.target.value }))
                  }
                  placeholder="https://"
                />
              </div>
            ))}
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
                  <Input
                    placeholder="Platform"
                    value={
                      n === 1 ? form.socialPlatform1 : form.socialPlatform2
                    }
                    onChange={e =>
                      setForm(f =>
                        n === 1
                          ? { ...f, socialPlatform1: e.target.value }
                          : { ...f, socialPlatform2: e.target.value }
                      )
                    }
                  />
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
