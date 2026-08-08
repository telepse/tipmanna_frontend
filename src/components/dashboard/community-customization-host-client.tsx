"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search, User, UserRound } from "lucide-react";
import { useSelector } from "react-redux";
import { useSearchParams } from "next/navigation";
import { toast } from "react-toastify";

import {
  getCommunityContentBankAction,
  getCommunityCustomizationAction,
  patchCommunityBrandingAction,
  patchCommunityDetailsAction,
  patchCommunityFeaturedVideosAction,
} from "@/actions/communities";
import { DashboardHeading } from "@/components/dashboard/dashboard-heading";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useImageUpload } from "@/hooks/use-image-upload";
import { uploadImage } from "@/lib/cloudinary";
import { COMMUNITY_TYPE_LABELS } from "@/lib/community-type-labels";
import { cn, formatBankDuration } from "@/lib/utils";
import type { RootState } from "@/redux/store";
import {
  COMMUNITY_TYPE_OPTIONS,
  type CommunityType,
} from "@/schemas/community.schema";
import { extractYoutubeID } from "@/lib/extractYoutubeID";
import { EVENT_VIDEO_TYPE_OPTIONS } from "@/lib/event-video-type-options";

type BankItem = {
  id: string;
  status: "approved" | "pending" | "rejected";
  channel: {
    id: string;
    title: string;
    url: string;
    eventVideoType?: string;
  };
  submittedBy?: {
    fullName: string;
    username: string;
  } | null;
  metrics: {
    durationSeconds: number;
    numOfTips?: number;
    amountRaised?: number;
  };
};

function formatEventVideoTypeLabel(value: string | null | undefined) {
  if (!value) return "Other";
  return (
    EVENT_VIDEO_TYPE_OPTIONS.find(option => option.value === value)?.label ??
    value.replace(/_/g, " ").toLowerCase()
  );
}

export function CommunityCustomizationHostClient({
  hostSlug,
}: {
  hostSlug: string;
}) {
  const authToken = useSelector((s: RootState) => s.auth.token);
  const searchParams = useSearchParams();
  const communityId = searchParams.get("communityId")?.trim() ?? "";

  const [loading, setLoading] = useState(false);
  const [headerColor, setHeaderColor] = useState("#1e293b");
  const [brandColor, setBrandColor] = useState("#6366f1");
  const [communityName, setCommunityName] = useState("");
  const [description, setDescription] = useState("");
  const [communityType, setCommunityType] = useState<CommunityType | null>(
    null
  );
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoMarkedForRemoval, setLogoMarkedForRemoval] = useState(false);

  const {
    readableImage,
    error: logoUploadError,
    inputRef: logoInputRef,
    handleImageUpload,
    handleChangeImage,
    handleRemoveImage,
    setReadableImage,
  } = useImageUpload({ maxSizeMB: 2 });

  const [bankVideos, setBankVideos] = useState<BankItem[]>([]);
  const [featuredSearchQuery, setFeaturedSearchQuery] = useState("");
  const [selectedFeaturedIds, setSelectedFeaturedIds] = useState<string[]>([]);
  const [savedFeaturedIds, setSavedFeaturedIds] = useState<string[]>([]);

  const [savingBranding, setSavingBranding] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);
  const [savingFeatured, setSavingFeatured] = useState(false);

  const loadedRef = useRef(false);

  const communityLogoSrc = logoMarkedForRemoval
    ? null
    : (readableImage ?? logoUrl ?? null);

  const brandingLogoSrc = communityLogoSrc;

  const filteredBankVideos = useMemo(() => {
    const q = featuredSearchQuery.trim().toLowerCase();
    if (!q) return bankVideos;

    return bankVideos.filter(item => {
      const hostName = item.submittedBy?.fullName?.toLowerCase() ?? "";
      const hostUsername = item.submittedBy?.username?.toLowerCase() ?? "";
      const typeLabel = formatEventVideoTypeLabel(
        item.channel.eventVideoType
      ).toLowerCase();

      return (
        item.channel.title.toLowerCase().includes(q) ||
        item.channel.url.toLowerCase().includes(q) ||
        typeLabel.includes(q) ||
        hostName.includes(q) ||
        hostUsername.includes(q) ||
        item.status.includes(q)
      );
    });
  }, [bankVideos, featuredSearchQuery]);

  const approvedBankIds = useMemo(
    () =>
      new Set(
        bankVideos
          .filter(item => item.status === "approved")
          .map(item => item.id)
      ),
    [bankVideos]
  );

  const hasFeaturedChanges = useMemo(() => {
    if (selectedFeaturedIds.length !== savedFeaturedIds.length) return true;
    return selectedFeaturedIds.some(
      (id, index) => id !== savedFeaturedIds[index]
    );
  }, [selectedFeaturedIds, savedFeaturedIds]);

  const load = useCallback(async () => {
    if (!communityId) return;
    setLoading(true);
    try {
      const [customRes, bankRes] = await Promise.all([
        getCommunityCustomizationAction(communityId),
        authToken
          ? getCommunityContentBankAction(authToken, communityId)
          : Promise.resolve(null),
      ]);

      if (customRes.success && customRes.data) {
        const { community, customization, featuredVideos } = customRes.data;
        setCommunityName(community.name);
        setDescription(community.description ?? "");
        setCommunityType(
          (community.communityType as CommunityType | null) ?? null
        );
        setLogoUrl(community.logoUrl);
        setReadableImage(community.logoUrl);
        setLogoMarkedForRemoval(false);
        const featuredIds = featuredVideos.map(video => video.id);
        setSelectedFeaturedIds(featuredIds);
        setSavedFeaturedIds(featuredIds);
        if (customization?.headerColor)
          setHeaderColor(customization.headerColor);
        if (customization?.brandColor) setBrandColor(customization.brandColor);
      }

      if (bankRes?.success && bankRes.data) {
        const data = bankRes.data as {
          approved?: BankItem[];
          pending?: BankItem[];
        };
        const allVideos = [...(data.approved ?? []), ...(data.pending ?? [])];
        setBankVideos(allVideos);
      }
    } finally {
      setLoading(false);
    }
  }, [authToken, communityId, setReadableImage]);

  useEffect(() => {
    if (!communityId) {
      loadedRef.current = false;
      return;
    }
    if (loadedRef.current) return;
    loadedRef.current = true;
    void load();
  }, [communityId, load]);

  const saveBranding = async () => {
    if (!communityId || !authToken) return;
    setSavingBranding(true);
    try {
      const res = await patchCommunityBrandingAction(authToken, communityId, {
        headerColor: headerColor || null,
        brandColor: brandColor || null,
        tvLogoUrl: "",
      });
      if (!res.success) throw new Error(res.message ?? "Save failed");
      toast.success("Branding saved.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSavingBranding(false);
    }
  };

  const saveDetails = async () => {
    if (!communityId || !authToken) return;
    setSavingDetails(true);
    try {
      let nextLogoUrl = logoUrl;
      if (logoMarkedForRemoval) {
        nextLogoUrl = null;
      } else if (readableImage?.startsWith("data:")) {
        const uploaded = await uploadImage(readableImage);
        nextLogoUrl = uploaded?.secure_url ?? null;
        if (!nextLogoUrl) {
          toast.error("Could not upload community logo.");
          return;
        }
      }

      const res = await patchCommunityDetailsAction(authToken, communityId, {
        description: description.trim() || null,
        communityType,
        logoUrl: nextLogoUrl,
      });
      if (!res.success) throw new Error(res.message ?? "Save failed");
      setLogoUrl(nextLogoUrl);
      setLogoMarkedForRemoval(false);
      if (nextLogoUrl) {
        setReadableImage(nextLogoUrl);
      } else {
        handleRemoveImage();
      }
      toast.success("Community details saved.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSavingDetails(false);
    }
  };

  const saveFeatured = async () => {
    if (!communityId || !authToken) return;

    const featuredContentBankEntryIds = selectedFeaturedIds.filter(id =>
      approvedBankIds.has(id)
    );

    setSavingFeatured(true);
    try {
      const res = await patchCommunityFeaturedVideosAction(
        authToken,
        communityId,
        featuredContentBankEntryIds
      );
      if (!res.success || !res.data) {
        throw new Error(res.message ?? "Save failed");
      }

      const nextFeaturedIds = res.data.featuredVideos.map(video => video.id);
      setSelectedFeaturedIds(nextFeaturedIds);
      setSavedFeaturedIds(nextFeaturedIds);
      toast.success("Featured videos updated.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSavingFeatured(false);
    }
  };

  const toggleFeatured = (entryId: string, selected: boolean) => {
    if (!approvedBankIds.has(entryId)) return;

    setSelectedFeaturedIds(current => {
      if (selected) {
        return current.includes(entryId) ? current : [...current, entryId];
      }
      return current.filter(id => id !== entryId);
    });
  };

  const handleLogoChangeClick = () => {
    handleChangeImage();
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLogoMarkedForRemoval(false);
    handleImageUpload(e);
  };

  const handleRemoveLogo = () => {
    setLogoMarkedForRemoval(true);
    handleRemoveImage();
  };

  const backHref = `/host/${hostSlug}/host-community`;

  if (!communityId) {
    return (
      <>
        <DashboardHeading
          title="Community branding"
          subtitle="Select a community from Community management."
        />
        <Button
          asChild
          variant="outline"
        >
          <Link href={backHref}>Back</Link>
        </Button>
      </>
    );
  }

  return (
    <section className="space-y-4">
      <Button
        asChild
        variant="outline"
        size="sm"
        className="mt-2"
      >
        <Link href={backHref}>Back</Link>
      </Button>

      <div className="section rounded-md border bg-white">
        <DashboardHeading
          title="Community branding"
          subtitle={
            communityName
              ? `Customize ${communityName} for dedicated mode and the public community page.`
              : "Header colors and logo for tipper dedicated mode (side-chick)."
          }
        />

        <div className="grid gap-4 sm:gap-8 lg:grid-cols-2">
          <div className="max-w-md space-y-4">
            <div className="space-y-2">
              <Label htmlFor="hc">Header color (hex)</Label>
              <div className="flex gap-2">
                <Input
                  id="hc"
                  value={headerColor}
                  onChange={e => setHeaderColor(e.target.value)}
                  placeholder="#1e293b"
                />
                <input
                  type="color"
                  className="h-10 w-14 cursor-pointer rounded border"
                  value={
                    /^#[0-9A-Fa-f]{6}$/.test(headerColor)
                      ? headerColor
                      : "#1e293b"
                  }
                  onChange={e => setHeaderColor(e.target.value)}
                  aria-label="Pick header color"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bc">Accent / brand color (hex)</Label>
              <div className="flex gap-2">
                <Input
                  id="bc"
                  value={brandColor}
                  onChange={e => setBrandColor(e.target.value)}
                  placeholder="#6366f1"
                />
                <input
                  type="color"
                  className="h-10 w-14 cursor-pointer rounded border"
                  value={
                    /^#[0-9A-Fa-f]{6}$/.test(brandColor)
                      ? brandColor
                      : "#6366f1"
                  }
                  onChange={e => setBrandColor(e.target.value)}
                  aria-label="Pick brand color"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>TV logo</Label>
              <div className="flex items-center gap-3">
                <div className="relative size-16 shrink-0 overflow-hidden rounded-full border bg-neutral-100">
                  {communityLogoSrc ? (
                    <img
                      src={communityLogoSrc}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center rounded-full">
                      <UserRound className="text-muted-foreground size-8" />
                    </div>
                  )}
                </div>
                <p className="text-muted-foreground text-xs">
                  Uses your uploaded community logo. Add or update it in
                  Community details below.
                </p>
              </div>
            </div>

            <Button
              type="button"
              disabled={savingBranding}
              onClick={() => void saveBranding()}
            >
              {savingBranding ? "Saving…" : "Save branding"}
            </Button>
          </div>

          <div className="space-y-2">
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Live preview
            </p>
            <div
              className="rounded-md border shadow-sm"
              style={{ borderColor: brandColor }}
            >
              <div
                className="flex items-center justify-between px-3 py-2 text-sm text-white"
                style={{ backgroundColor: headerColor }}
              >
                <div className="flex items-center gap-2">
                  {brandingLogoSrc ? (
                    <img
                      src={brandingLogoSrc}
                      alt=""
                      className="size-8 rounded object-cover"
                    />
                  ) : null}
                  <span className="font-medium">
                    {communityName || "Preview navbar"}
                  </span>
                </div>
                <span className="opacity-80">···</span>
              </div>
              <div className="space-y-2 bg-zinc-950 p-4 text-white">
                <p className="text-xs text-zinc-400">TV progress corner</p>
                <div className="flex items-end gap-2">
                  {brandingLogoSrc ? (
                    <img
                      src={brandingLogoSrc}
                      alt=""
                      className="size-10 object-contain"
                    />
                  ) : (
                    <div className="size-10 rounded bg-zinc-800" />
                  )}
                  <div className="h-2 flex-1 rounded bg-zinc-800">
                    <div
                      className="h-2 w-1/2 rounded"
                      style={{ backgroundColor: brandColor }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Loading community…</p>
      ) : null}

      <div className="section rounded-md border bg-white">
        <DashboardHeading
          title="Community details"
          subtitle="Description, type, and logo shown on your public community page."
        />

        <div className="max-w-xl space-y-4">
          <div className="space-y-2">
            <Label htmlFor="community-desc">Description</Label>
            <Textarea
              id="community-desc"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={4}
              placeholder="Tell members what this community is about"
            />
          </div>

          <div className="space-y-2">
            <Label>Community type</Label>
            <div className="flex flex-wrap gap-2">
              {COMMUNITY_TYPE_OPTIONS.map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setCommunityType(type)}
                  className={cn(
                    "cursor-pointer rounded-md border px-2 py-1 text-xs font-medium sm:text-sm",
                    communityType === type
                      ? "border-black bg-black text-white"
                      : "bg-neutral-100 hover:bg-neutral-200"
                  )}
                >
                  {COMMUNITY_TYPE_LABELS[type]}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Community logo</Label>
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={handleLogoChangeClick}
                className="relative size-20 shrink-0 overflow-hidden rounded-full border bg-neutral-100"
              >
                {communityLogoSrc ? (
                  <img
                    src={communityLogoSrc}
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
                  ref={logoInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleLogoChangeClick}
                    className="w-fit"
                  >
                    Change photo
                  </Button>
                  {communityLogoSrc ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive w-fit"
                      onClick={handleRemoveLogo}
                    >
                      Remove photo
                    </Button>
                  ) : null}
                  {logoUploadError ? (
                    <p className="text-destructive text-xs">
                      {logoUploadError}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <Button
            type="button"
            disabled={savingDetails}
            onClick={() => void saveDetails()}
          >
            {savingDetails ? "Saving…" : "Save community details"}
          </Button>
        </div>
      </div>

      <div className="section rounded-md border bg-white">
        <DashboardHeading
          title="Featured videos"
          subtitle="Choose content bank videos to highlight on your individual community page."
        />

        <div className="space-y-4">
          {selectedFeaturedIds.length > 0 ? (
            <div className="rounded-md border bg-gray-50 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium">
                    {selectedFeaturedIds.length} video
                    {selectedFeaturedIds.length !== 1 ? "s" : ""} selected to
                    feature
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Click &quot;Save featured videos&quot; to publish your
                    selection on the community page.
                  </p>
                </div>
                <Button
                  type="button"
                  disabled={savingFeatured || !hasFeaturedChanges}
                  onClick={() => void saveFeatured()}
                >
                  {savingFeatured ? "Saving…" : "Save featured videos"}
                </Button>
              </div>
            </div>
          ) : null}

          <div className="flex items-center gap-2 rounded-md border p-4">
            <Search className="text-muted-foreground size-4 shrink-0" />
            <input
              type="text"
              placeholder="Search content bank videos…"
              className="w-full focus-visible:outline-none"
              value={featuredSearchQuery}
              onChange={e => setFeaturedSearchQuery(e.target.value)}
            />
          </div>

          {featuredSearchQuery.trim() ? (
            <p className="text-muted-foreground text-sm">
              Found {filteredBankVideos.length} video
              {filteredBankVideos.length !== 1 ? "s" : ""} matching &quot;
              {featuredSearchQuery.trim()}&quot;
            </p>
          ) : null}

          {bankVideos.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No content bank videos found for this community.
            </p>
          ) : filteredBankVideos.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No videos match your search.
            </p>
          ) : (
            <div className="space-y-2">
              {filteredBankVideos.map(item => {
                const checked = selectedFeaturedIds.includes(item.id);
                const canFeature = item.status === "approved";
                const hostLabel =
                  item.submittedBy?.fullName ||
                  item.submittedBy?.username ||
                  "Community host";

                return (
                  <div
                    key={item.id}
                    className={cn(
                      "flex items-center justify-between gap-4 rounded-md border p-4",
                      !canFeature && "bg-muted/20"
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-4">
                      <Checkbox
                        checked={checked}
                        disabled={!canFeature}
                        onCheckedChange={value =>
                          toggleFeatured(item.id, value === true)
                        }
                        className="cursor-pointer border-black"
                      />
                      <img
                        src={(() => {
                          const videoId = extractYoutubeID(item.channel.url);
                          return videoId
                            ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
                            : "/default-event-image.jpg";
                        })()}
                        alt={item.channel.title}
                        className="h-14 w-28 shrink-0 object-cover"
                      />

                      <div className="min-w-0 space-y-1">
                        <h5 className="font-semibold">{item.channel.title}</h5>
                        <p className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
                          {hostLabel}
                          <span className="bg-primary size-2 shrink-0 rounded-full" />
                          {formatEventVideoTypeLabel(
                            item.channel.eventVideoType
                          )}
                          {!canFeature ? (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-900">
                              {item.status === "pending"
                                ? "Awaiting approval"
                                : "Not approved"}
                            </span>
                          ) : checked ? (
                            <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-900">
                              Featured
                            </span>
                          ) : null}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          Duration:{" "}
                          {formatBankDuration(item.metrics.durationSeconds)}
                          {typeof item.metrics.numOfTips === "number"
                            ? ` · ${item.metrics.numOfTips} tips`
                            : ""}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {selectedFeaturedIds.length === 0 ? (
            <Button
              type="button"
              disabled={savingFeatured || !hasFeaturedChanges}
              onClick={() => void saveFeatured()}
            >
              {savingFeatured ? "Saving…" : "Save featured videos"}
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
