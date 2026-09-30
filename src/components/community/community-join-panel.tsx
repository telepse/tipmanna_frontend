"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { toast } from "react-toastify";
import { useSelector } from "react-redux";
import { Copy, Loader2, UserRound } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { TipperEmailOtpSignInDialog } from "@/components/auth/tipper-email-otp-sign-in-dialog";
import type { RootState } from "@/redux/store";
import {
  getApprovedCommunityContentBankAction,
  type CommunityFeaturedVideo,
} from "@/actions/communities";
import {
  E2E_JOIN_COMMUNITY_ID,
  E2E_JOIN_FORM_PUBLIC,
} from "@/lib/e2e-explore-fixtures";
import { isExploreE2eFixturesEnabled } from "@/lib/explore-e2e-fixtures-gate";
import { CommunityHowToJoinSection } from "@/components/community/community-how-to-join-section";
import { CommunityMemberInfo } from "@/components/community/community-member-info";
import { CommunitySearchBrowseSection } from "@/components/community/community-search-browse-section";
import { exploreCommunityJoinHref } from "@/lib/community-links";
import { formatCommunityTypeLabel } from "@/lib/community-type-labels";
import type { CommunityType } from "@/schemas/community.schema";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { extractYoutubeID } from "@/lib/extractYoutubeID";
import { EVENT_VIDEO_TYPE_OPTIONS } from "@/lib/event-video-type-options";
import { copyShareUrl } from "@/lib/copy-share-url";
import { buildContentShareUrl } from "@/lib/public-video-url";
import { formatBankDuration } from "@/lib/utils";
import { formatMetaMetricsLine } from "@/lib/creator-profile-metadata";
import { usePathname } from "next/navigation";
import {
  buildCommunityJoinPlayHref,
  parseOverlayPlayFromSearchParams,
  syncOverlayPlayOnExploreJoin,
} from "@/lib/playback-overlay-url";
import { writeOverlayPlaySeed } from "@/lib/playback-overlay-seed-handoff";
import { exploreDrawerSignInRedirectPath } from "@/lib/explore-url-sync-policy";
import { DRAWER_DATA_LOAD_TIMEOUT_MS } from "@/lib/drawer-data-timeout";
import { TopContentCard } from "../home/top-content-card";
import { FeaturedContentCard } from "./featured-content-card";
import { isCommunityAlreadyIn } from "@/lib/community-already-in";
import {
  fetchCommunityAccessStateCached,
  getCachedCommunityAccessState,
} from "@/lib/drawer-prefetch-cache";
import { CommunityPublicMembersRoster } from "@/components/community/community-public-members-roster";
import { invalidateCommunityPublicMembersCache } from "@/lib/community-public-members";

const communityFeatureOn =
  process.env.NEXT_PUBLIC_COMMUNITY_FEATURE_ENABLED === "true";

const ContentPlaybackOverlay = dynamic(
  () =>
    import("@/components/events/content-playback-overlay").then(m => ({
      default: m.ContentPlaybackOverlay,
    })),
  { ssr: false }
);

type JoinFormPublic = {
  name: string;
  logoUrl: string | null;
  description?: string | null;
  communityType?: CommunityType | null;
  createdAt?: string | null;
  totalTips?: number;
  memberCount?: number;
  numVideos?: number;
  joinMethod?: "request" | "subscription";
  customQuestion: string | null;
  officialEmailDomain: string | null;
  officialEmailDomainRequired: boolean;
  joinFormRequireAccessCode: boolean;
  defaultMonths: number;
  subscriptionFeeGbp?: string | null;
};

type CommunityContentBankVideo = {
  id: string;
  status: string;
  visibility: string;
  createdAt: string;
  submittedBy: {
    id: string;
    fullName: string;
    username: string;
  };
  channel: {
    id: string;
    title: string;
    url: string;
    isLive: boolean;
    eventVideoType: string | null;
    sharePath: string;
    shareUrl: string;
    eventId?: string;
  };
  metrics: {
    encounters: number;
    completes: number;
    saves: number;
    shares: number;
    comments: number;
    numOfTips: number;
    durationSeconds: number;
    amountRaised: number;
  };
};

function formatEventVideoTypeLabel(value: string | null | undefined) {
  if (!value) return "Other";
  return (
    EVENT_VIDEO_TYPE_OPTIONS.find(option => option.value === value)?.label ??
    value.replace(/_/g, " ").toLowerCase()
  );
}

function getCommunityContentBankThumbnail(video: CommunityContentBankVideo) {
  const videoId = extractYoutubeID(video.channel.url);

  return videoId
    ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
    : "/default-event-image.jpg";
}

function getFeaturedVideoShareUrl(
  video: CommunityFeaturedVideo
): string | null {
  if (!video.eventId?.trim() || !video.channelId?.trim()) return null;
  return buildContentShareUrl({
    eventId: video.eventId,
    channelId: video.channelId,
  });
}

function CommunityContentBankVideoCard({
  video,
  onPlay,
}: {
  video: CommunityFeaturedVideo;
  onPlay: () => void;
}) {
  const thumbnail = useMemo(() => {
    const videoId = extractYoutubeID(video.url);

    return videoId
      ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
      : "/default-event-image.jpg";
  }, [video.url]);

  return (
    <button
      type="button"
      onClick={onPlay}
      className="group relative aspect-[9/16] w-full overflow-hidden bg-black"
      aria-label={`Play ${video.title}`}
    >
      <img
        src={thumbnail}
        alt=""
        className="size-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
      />

      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent px-2 pt-10 pb-2">
        <p className="line-clamp-2 text-left text-xs font-medium text-white">
          {video.title}
        </p>

        <p className="mt-1 line-clamp-2 text-left text-[10px] leading-tight text-white/80">
          {video.numOfTips ?? 0} tips · {video.numOfSaves ?? 0} saves ·{" "}
          {video.numOfSeen ?? 0} seen · {video.numOfComments ?? 0} comments
        </p>
      </div>
    </button>
  );
}

function CommunityContentBankVideoGrid({
  videos,
  onPlay,
}: {
  videos: CommunityFeaturedVideo[];
  onPlay: (video: CommunityFeaturedVideo) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {videos.map(video => (
        <CommunityContentBankVideoCard
          key={video.id}
          video={video}
          onPlay={() => onPlay(video)}
        />
      ))}
    </div>
  );
}

export type CommunityJoinPanelProps = {
  communityId: string;
  /** Full path + query for sign-in redirect (e.g. `/explore?tab=join&joinCommunity=…`). */
  signInRedirectPath: string;
  variant?: "page" | "drawer";
  /** Close the Explore community glance after new-tab featured play (v2). */
  onDrawerDismiss?: () => void;
};

type CommunityAccessPayload = {
  joinFormPublic: {
    name: string;
    logoUrl: string | null;
    description?: string | null;
    communityType?: CommunityType | null;
    createdAt?: string | null;
    totalTips?: number;
    memberCount?: number;
    numVideos?: number;
    joinMethod?: "request" | "subscription";
    customQuestion: string | null;
    officialEmailDomain: string | null;
    officialEmailDomainRequired: boolean;
    joinFormRequireAccessCode: boolean;
    defaultMonths: number;
    subscriptionFeeGbp?: string | null;
  };
  featuredVideos?: CommunityFeaturedVideo[];
  subscriptionExpiresAt: string | null;
  isMember: boolean;
  membershipStatus: string | null;
  membershipExpiresAt: string | null;
  viewerHostsCommunity: boolean;
};

// Constants for better maintainability
const PATHS = {
  trophy: "/icons/trophy.png",
  fun: "/icons/fun.png",
  diamond: "/icons/diamond.png",
  flash: "/icons/flash.png",
} as const;

export function CommunityJoinPanel({
  communityId,
  signInRedirectPath,
  variant = "page",
  onDrawerDismiss,
}: CommunityJoinPanelProps) {
  const isDrawer = variant === "drawer";
  const router = useRouter();
  const pathname = usePathname();
  const effectiveSignInRedirectPath = isDrawer
    ? exploreDrawerSignInRedirectPath(pathname ?? "/explore")
    : signInRedirectPath;
  const { user, isAuthenticated } = useSelector((s: RootState) => s.auth);

  const [form, setForm] = useState<JoinFormPublic | null>(null);

  const [doneMessage, setDoneMessage] = useState<string | null>(null);
  const [isMember, setIsMember] = useState(false);
  const [viewerHostsCommunity, setViewerHostsCommunity] = useState(false);
  const [membershipStatus, setMembershipStatus] = useState<string | null>(null);
  const [membershipExpiresAt, setMembershipExpiresAt] = useState<string | null>(
    null
  );
  const [subscriptionExpiresAt, setSubscriptionExpiresAt] = useState<
    string | null
  >(null);
  const [featuredVideos, setFeaturedVideos] = useState<
    CommunityFeaturedVideo[]
  >([]);
  const [contentBankVideos, setContentBankVideos] = useState<
    CommunityContentBankVideo[]
  >([]);
  const [signInOpen, setSignInOpen] = useState(false);
  const [signInReturnTo, setSignInReturnTo] = useState(
    effectiveSignInRedirectPath
  );
  const [formLoadTimedOut, setFormLoadTimedOut] = useState(false);
  const [formLoadFailed, setFormLoadFailed] = useState(false);
  const formLoadedForRef = useRef<string | null>(null);
  const activeCommunityIdRef = useRef(communityId);
  activeCommunityIdRef.current = communityId;

  const shouldReduceMotion = useReducedMotion();

  const [overlayPlay, setOverlayPlay] = useState<{
    eventId: string;
    channelId: string;
    url?: string;
    title?: string;
  } | null>(null);

  const overlayPlayHydratedRef = useRef(false);

  const dismissOverlayPlay = useCallback(() => {
    setOverlayPlay(null);
    if (!isDrawer) {
      syncOverlayPlayOnExploreJoin(null);
    }
  }, [isDrawer]);

  const openOverlayPlay = useCallback(
    (
      eventId: string,
      channelId: string,
      meta?: { url?: string; title?: string }
    ) => {
      if (isDrawer) return;
      const play = { eventId, channelId, ...meta };
      setOverlayPlay(play);
      syncOverlayPlayOnExploreJoin({ eventId, channelId });
    },
    [isDrawer]
  );

  useEffect(() => {
    if (isDrawer || overlayPlayHydratedRef.current) return;
    overlayPlayHydratedRef.current = true;
    if (typeof window === "undefined") return;
    const play = parseOverlayPlayFromSearchParams(
      new URLSearchParams(window.location.search)
    );
    if (play) setOverlayPlay(play);
  }, [isDrawer]);

  const featuredVideosRef = useRef<HTMLDivElement>(null);
  const [membersRosterRefresh, setMembersRosterRefresh] = useState(0);

  useEffect(() => {
    formLoadedForRef.current = null;
    setDoneMessage(null);
    setForm(null);
    setIsMember(false);
    setViewerHostsCommunity(false);
    setMembershipStatus(null);
    setMembershipExpiresAt(null);
    setSubscriptionExpiresAt(null);
    setFeaturedVideos([]);
    setContentBankVideos([]);
    setFormLoadTimedOut(false);
    setFormLoadFailed(false);
  }, [communityId]);

  useEffect(() => {
    if (!communityId || form || !isDrawer) return;
    const timer = window.setTimeout(
      () => setFormLoadTimedOut(true),
      DRAWER_DATA_LOAD_TIMEOUT_MS
    );
    return () => window.clearTimeout(timer);
  }, [communityId, form, isDrawer]);

  useEffect(() => {
    if (form) setFormLoadTimedOut(false);
  }, [form]);

  const playFeaturedFromDrawer = useCallback(
    (
      eventId: string,
      channelId: string,
      meta?: { url?: string; title?: string }
    ) => {
      writeOverlayPlaySeed({
        eventId,
        channelId,
        url: meta?.url,
        title: meta?.title,
      });
      window.open(
        buildCommunityJoinPlayHref(communityId, eventId, channelId),
        "_blank",
        "noopener,noreferrer"
      );
      onDrawerDismiss?.();
    },
    [communityId, onDrawerDismiss]
  );

  const loadForm = useCallback(
    async (options?: { background?: boolean; force?: boolean }) => {
      if (!communityId) return;
      const requestCommunityId = communityId;
      const background =
        options?.background ?? formLoadedForRef.current === communityId;
      if (
        typeof window !== "undefined" &&
        isExploreE2eFixturesEnabled(window.location.search) &&
        communityId === E2E_JOIN_COMMUNITY_ID
      ) {
        setForm(E2E_JOIN_FORM_PUBLIC);
        formLoadedForRef.current = communityId;
        return;
      }
      if (!options?.force) {
        const cached = getCachedCommunityAccessState(communityId);
        if (
          cached &&
          typeof cached === "object" &&
          "joinFormPublic" in cached
        ) {
          const d = cached as CommunityAccessPayload;
          const jp = d.joinFormPublic;
          setForm({
            name: jp.name,
            logoUrl: jp.logoUrl,
            description: jp.description ?? null,
            communityType: jp.communityType ?? null,
            createdAt: jp.createdAt ?? null,
            totalTips: jp.totalTips,
            memberCount: jp.memberCount,
            numVideos: jp.numVideos,
            joinMethod: jp.joinMethod,
            customQuestion: jp.customQuestion,
            officialEmailDomain: jp.officialEmailDomain,
            officialEmailDomainRequired: jp.officialEmailDomainRequired,
            joinFormRequireAccessCode: jp.joinFormRequireAccessCode,
            defaultMonths: jp.defaultMonths,
            subscriptionFeeGbp: jp.subscriptionFeeGbp ?? null,
          });
          setFeaturedVideos(d.featuredVideos ?? []);
          setIsMember(Boolean(d.isMember));
          setViewerHostsCommunity(Boolean(d.viewerHostsCommunity));
          formLoadedForRef.current = communityId;
        }
      }
      const data = await fetchCommunityAccessStateCached(communityId, {
        force: options?.force,
      });
      if (activeCommunityIdRef.current !== requestCommunityId) return;
      if (!data) {
        toast.error("Could not load community");
        setForm(null);
        formLoadedForRef.current = null;
        setFormLoadFailed(true);
        return;
      }
      setFormLoadFailed(false);

      const d = data as CommunityAccessPayload;
      const jp = d.joinFormPublic;
      const nextForm: JoinFormPublic = {
        name: jp.name,
        logoUrl: jp.logoUrl,
        description: jp.description ?? null,
        communityType: jp.communityType ?? null,
        createdAt: jp.createdAt ?? null,
        totalTips: jp.totalTips,
        memberCount: jp.memberCount,
        numVideos: jp.numVideos,
        joinMethod: jp.joinMethod,
        customQuestion: jp.customQuestion,
        officialEmailDomain: jp.officialEmailDomain,
        officialEmailDomainRequired: jp.officialEmailDomainRequired,
        joinFormRequireAccessCode: jp.joinFormRequireAccessCode,
        defaultMonths: jp.defaultMonths,
        subscriptionFeeGbp: jp.subscriptionFeeGbp ?? null,
      };
      setForm(nextForm);
      setIsMember(d.isMember);
      setViewerHostsCommunity(Boolean(d.viewerHostsCommunity));
      setMembershipStatus(d.membershipStatus ?? null);
      setMembershipExpiresAt(d.membershipExpiresAt ?? null);
      setSubscriptionExpiresAt(d.subscriptionExpiresAt ?? null);
      setFeaturedVideos(d.featuredVideos ?? []);

      formLoadedForRef.current = communityId;

      if (
        !background &&
        isCommunityAlreadyIn({
          isMember: d.isMember,
          viewerHostsCommunity: d.viewerHostsCommunity,
        })
      ) {
        toast.success("You already belong to this community.");
      }
    },
    [communityId]
  );

  useEffect(() => {
    if (!communityId || isDrawer) return;

    let cancelled = false;

    const loadContentBankVideos = async () => {
      const res = await getApprovedCommunityContentBankAction(communityId);

      if (cancelled) return;

      if (!res.success || !res.data) {
        console.error("Could not load community content bank:", res.message);
        setContentBankVideos([]);
        return;
      }

      setContentBankVideos(res.data.approved ?? []);
    };

    void loadContentBankVideos();

    return () => {
      cancelled = true;
    };
  }, [communityId, isDrawer]);

  const copyFeaturedVideoLink = async (video: CommunityFeaturedVideo) => {
    const shareUrl = getFeaturedVideoShareUrl(video);
    if (!shareUrl) {
      toast.error("Could not build video link");
      return;
    }
    try {
      await copyShareUrl(shareUrl);
      toast.success("Link copied");
    } catch {
      toast.error("Could not copy link");
    }
  };

  useEffect(() => {
    const hadCache = Boolean(getCachedCommunityAccessState(communityId));
    void loadForm({
      background: hadCache || formLoadedForRef.current === communityId,
    });
  }, [loadForm, communityId]);

  const alreadyIn = isCommunityAlreadyIn({
    isMember,
    viewerHostsCommunity,
  });

  if (!communityFeatureOn) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <p className="text-muted-foreground text-sm">
          Community features are disabled.
        </p>
      </div>
    );
  }

  let joinBody: ReactNode;

  if (!communityId) {
    joinBody = (
      <p className="text-muted-foreground p-6 text-sm">Missing community.</p>
    );
  } else if (!form) {
    joinBody = (
      <div className="flex min-h-[30vh] flex-col items-center justify-center gap-3 px-4 py-10">
        {formLoadFailed ? (
          <p className="text-muted-foreground text-center text-sm">
            Could not load this community.
          </p>
        ) : (
          <Loader2 className="text-muted-foreground size-8 animate-spin" />
        )}
        {formLoadTimedOut || formLoadFailed ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setFormLoadTimedOut(false);
              setFormLoadFailed(false);
              void loadForm({ force: true });
            }}
          >
            Retry
          </Button>
        ) : null}
      </div>
    );
  } else {
    const communityLogoSrc = form.logoUrl?.trim();
    const typeLabel = formatCommunityTypeLabel(form.communityType);

    joinBody = (
      <section
        className={
          isDrawer
            ? "relative min-h-0 space-y-0 bg-white"
            : "relative min-h-screen space-y-0 bg-cover bg-fixed bg-center bg-no-repeat"
        }
        style={
          isDrawer
            ? undefined
            : { backgroundImage: `url(/patterns/bg_pattern.webp)` }
        }
      >
        {!isDrawer ? (
          <>
            <Image
              src={PATHS.trophy}
              alt="Trophy icon"
              width={50}
              height={50}
              className="absolute top-0 left-4 size-12 object-contain opacity-50 sm:top-8 sm:size-16 lg:left-8"
              loading="lazy"
              priority={false}
              aria-hidden="true"
            />

            {/* Fun Icon */}
            <Image
              src={PATHS.fun}
              alt="Fun icon"
              width={50}
              height={50}
              className="absolute top-0 right-4 size-12 sm:top-8 sm:size-16 lg:right-8"
              loading="lazy"
              priority={false}
              aria-hidden="true"
            />

            {/* Diamond Icon */}
            <Image
              src={PATHS.diamond}
              alt="Diamond icon"
              width={50}
              height={50}
              className="absolute bottom-0 left-8 size-8 -rotate-[15deg] object-contain opacity-50 sm:left-8 sm:size-12"
              loading="lazy"
              priority={false}
              aria-hidden="true"
            />

            {/* Flash Icon */}
            <Image
              src={PATHS.flash}
              alt="Flash icon"
              width={50}
              height={50}
              className="absolute right-12 bottom-0 size-10 rotate-[30deg] object-contain opacity-50 sm:size-16 lg:right-22"
              loading="lazy"
              priority={false}
              aria-hidden="true"
            />

            <div className="mx-auto max-w-4xl p-4">
              <CommunitySearchBrowseSection
                compact
                deferCatalogLoad
                isAuthenticated={isAuthenticated}
              />
            </div>
          </>
        ) : null}

        <section className="relative mx-auto flex min-h-[25vh] max-w-4xl flex-col items-center justify-center rounded-2xl bg-cover bg-fixed bg-center bg-no-repeat bg-blend-multiply lg:min-h-[30vh]">
          <Image
            src="/patterns/tip_what_you_can.webp"
            fill
            alt=""
            aria-hidden
            priority={false}
          />

          <motion.div
            initial={{ y: 0 }}
            animate={shouldReduceMotion ? {} : { y: [-5, 0, -5] }}
            transition={{ repeat: Infinity, duration: 1.2 }}
            className="absolute top-16 left-8 -rotate-[90deg]"
          >
            <Image
              src="/vectors/bolt_right.webp"
              alt="Bolt right"
              width={50}
              height={50}
              className="size-10 drop-shadow-[5px_5px_0px_black] sm:size-12"
            />
          </motion.div>

          <motion.div
            initial={{ y: 0 }}
            animate={shouldReduceMotion ? {} : { y: [-5, 0, -5] }}
            transition={{ repeat: Infinity, duration: 1.2 }}
            className="absolute top-8 right-8"
          >
            <Image
              src="/vectors/bolt_right.webp"
              alt="Bolt right"
              width={50}
              height={50}
              className="size-10 drop-shadow-[5px_5px_0px_black] sm:size-12"
            />
          </motion.div>

          <div className="bg-secondary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-md p-3 shadow-lg">
            {communityLogoSrc ? (
              <Image
                src={communityLogoSrc!}
                alt={form.name}
                width={100}
                height={100}
                className="size-[100px] rounded object-cover"
                unoptimized={communityLogoSrc?.startsWith("http")}
              />
            ) : (
              <div className="border-moonstone-blue flex size-24 items-center justify-center rounded-md border-2 bg-white">
                <UserRound className="size-12" />
              </div>
            )}
          </div>
        </section>

        <div className="mx-auto max-w-4xl space-y-4 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-semibold">{form.name}</h2>
            {isAuthenticated ? (
              alreadyIn ? (
                <Badge variant="default">Member</Badge>
              ) : (
                <Badge variant="outline">Not a member</Badge>
              )
            ) : null}
          </div>

          {doneMessage ? (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-900">
              {doneMessage}
            </div>
          ) : null}

          {alreadyIn ? (
            <CommunityMemberInfo
              communityName={form.name}
              membershipStatus={membershipStatus}
              membershipExpiresAt={membershipExpiresAt}
              subscriptionExpiresAt={subscriptionExpiresAt}
            />
          ) : null}

          {isDrawer && featuredVideos.length > 0 ? (
            <div className="space-y-2 border-t pt-4">
              <h5 className="text-muted-foreground text-sm font-medium">
                Featured community videos
              </h5>
              <div className="grid grid-cols-3 gap-1">
                {featuredVideos.slice(0, 3).map(video => {
                  const videoId = extractYoutubeID(video.url);
                  const thumb = videoId
                    ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
                    : "/default-event-image.jpg";
                  const eventId = video.eventId?.trim() ?? "";
                  const channelId =
                    video.channelId?.trim() ?? video.id?.trim() ?? "";
                  return (
                    <button
                      key={video.id}
                      type="button"
                      className="relative aspect-[9/16] overflow-hidden rounded bg-neutral-100"
                      disabled={!eventId || !channelId}
                      onClick={() => {
                        if (eventId && channelId) {
                          playFeaturedFromDrawer(eventId, channelId, {
                            url: video.url,
                            title: video.title,
                          });
                        }
                      }}
                      aria-label={`Play ${video.title}`}
                    >
                      <img
                        src={thumb}
                        alt=""
                        className="size-full object-cover"
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          <h5 className="text-muted-foreground text-lg font-medium underline underline-offset-2">
            Community details
          </h5>
          <p className="leading-relaxed">{form.description}</p>

          {form.communityType ? (
            <p className="text-muted-foreground text-sm font-medium">
              {typeLabel}
            </p>
          ) : null}

          <div className="grid grid-cols-2 gap-4">
            <div className="border-primary bg-secondary/10 flex w-[150px] flex-col gap-1 rounded-xl border p-6 lg:w-[200px]">
              <h5>Total tips</h5>
              <p className="text-muted-foreground font-medium">
                {form.totalTips ?? 0}
              </p>
            </div>
            <div className="border-primary bg-secondary/10 flex w-[150px] flex-col gap-1 rounded-xl border p-6 lg:w-[200px]">
              <h5>Members</h5>
              <p className="text-muted-foreground font-medium">
                {form.memberCount ?? 0}
              </p>
            </div>
            <div className="border-primary bg-secondary/10 flex w-[150px] flex-col gap-1 rounded-xl border p-6 lg:w-[200px]">
              <h5>Videos</h5>
              <p className="text-muted-foreground font-medium">
                {form.numVideos ?? 0}
              </p>
            </div>
            <div className="border-primary bg-secondary/10 flex w-[150px] flex-col gap-1 rounded-xl border p-6 lg:w-[200px]">
              <h5>Created</h5>
              <p className="text-muted-foreground font-medium">
                {form.createdAt
                  ? new Date(form.createdAt).toLocaleDateString()
                  : "—"}
              </p>
            </div>
          </div>

          {!isDrawer && featuredVideos.length > 0 ? (
            <div className="space-y-4 pt-2">
              <h5 className="text-muted-foreground text-lg font-medium">
                Featured community videos
              </h5>

              {/* Small and medium screens */}
              <div className="no-scrollbar hide__scrollbar relative flex items-center gap-4 overflow-x-auto lg:hidden">
                <div className="flex w-full snap-x snap-mandatory space-x-4">
                  {featuredVideos.map(video => (
                    <div
                      key={video.id}
                      className="w-[85%] flex-shrink-0 snap-center transition-transform duration-300 sm:w-[50%]"
                    >
                      <FeaturedContentCard
                        key={video.id}
                        channelId={video.eventId ?? ""}
                        roomId={video.id}
                        videoId={video.id}
                        eventBanner={(() => {
                          const videoId = extractYoutubeID(video.url);
                          return videoId
                            ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
                            : "";
                        })()}
                        eventName={video.title}
                        numOfTips={video.numOfTips ?? 0}
                        numOfEncounters={video.numOfSeen ?? 0}
                        numOfSaves={video.numOfSaves ?? 0}
                        numOfShares={video.numOfShares ?? 0}
                        numOfComments={video.numOfComments}
                        startTime={""}
                        endTime={""}
                        duration={video.durationSeconds ?? 0}
                        videoUrl={video.url}
                        onPlayClick={() => {
                          const eventId = video.eventId?.trim() ?? "";
                          const channelId =
                            video.channelId?.trim() ?? video.id?.trim() ?? "";
                          if (eventId && channelId) {
                            openOverlayPlay(eventId, channelId, {
                              url: video.url,
                              title: video.title,
                            });
                          }
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {/* LARGE SCREENS */}
          {!isDrawer ? (
            <div className="no-scrollbar hide__scrollbar relative hidden items-center gap-4 overflow-x-auto lg:flex">
              <div
                ref={featuredVideosRef}
                className="flex w-[550px] snap-x snap-mandatory space-x-4"
              >
                {featuredVideos.map(video => (
                  <div
                    key={video.id}
                    className="w-[85%] flex-shrink-0 snap-center transition-transform duration-300 sm:w-[50%]"
                  >
                    <FeaturedContentCard
                      key={video.id}
                      channelId={video.eventId ?? ""}
                      roomId={video.id}
                      videoId={video.id}
                      eventBanner={(() => {
                        const videoId = extractYoutubeID(video.url);
                        return videoId
                          ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
                          : "";
                      })()}
                      eventName={video.title}
                      numOfTips={video.numOfTips ?? 0}
                      numOfEncounters={video.numOfSeen ?? 0}
                      numOfSaves={video.numOfSaves ?? 0}
                      numOfShares={video.numOfShares ?? 0}
                      numOfComments={video.numOfComments}
                      startTime={""}
                      endTime={""}
                      duration={video.durationSeconds ?? 0}
                      videoUrl={video.url}
                      onPlayClick={() => {
                        const eventId = video.eventId?.trim() ?? "";
                        const channelId =
                          video.channelId?.trim() ?? video.id?.trim() ?? "";
                        if (eventId && channelId) {
                          openOverlayPlay(eventId, channelId, {
                            url: video.url,
                            title: video.title,
                          });
                        }
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {!isDrawer && contentBankVideos.length > 0 ? (
            <div className="space-y-4 pt-6">
              <h5 className="text-muted-foreground text-lg font-medium">
                Community videos {!isMember && "(only shown to members)"}
              </h5>

              {isMember && (
                <div className="grid grid-cols-3 gap-0.5 sm:grid-cols-4 md:grid-cols-5">
                  {contentBankVideos.map(video => {
                    const thumbnail = getCommunityContentBankThumbnail(video);

                    return (
                      <button
                        key={video.id}
                        type="button"
                        className="group relative aspect-[9/16] overflow-hidden bg-neutral-100 text-left"
                        onClick={() => {
                          const sharePath = video.channel.sharePath ?? "";
                          const eventMatch =
                            sharePath.match(/\/content\/([^/?]+)/);
                          const eventId =
                            video.channel.eventId?.trim() ||
                            eventMatch?.[1]?.trim();
                          if (!eventId) return;
                          openOverlayPlay(eventId, String(video.channel.id), {
                            url: video.channel.url,
                            title: video.channel.title,
                          });
                        }}
                        title={video.channel.title}
                        aria-label={video.channel.title}
                      >
                        <img
                          src={thumbnail}
                          alt={video.channel.title}
                          className="size-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                        />

                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-1.5 pt-10 pb-1.5">
                          <p className="line-clamp-2 text-[10px] font-medium text-white">
                            {video.channel.title}
                          </p>

                          <p className="mt-0.5 line-clamp-2 text-[9px] leading-tight text-white/80">
                            {video.metrics.numOfTips ?? 0} tips ·{" "}
                            {video.metrics.saves ?? 0} saves ·{" "}
                            {video.metrics.encounters ?? 0} seen ·{" "}
                            {video.metrics.comments ?? 0} comments
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : null}

          <CommunityHowToJoinSection
            communityId={communityId}
            signInRedirectPath={effectiveSignInRedirectPath}
            className="mt-6 border-t pt-6 lg:mt-12"
            showMemberInfo={false}
            onDoneMessageChange={setDoneMessage}
            onJoined={() => {
              invalidateCommunityPublicMembersCache(communityId);
              setMembersRosterRefresh(n => n + 1);
              void loadForm({ background: true, force: true });
            }}
          />

          {!isDrawer ? (
            <CommunityPublicMembersRoster
              communityId={communityId}
              refreshNonce={membersRosterRefresh}
              className="mt-8 border-t pt-6"
            />
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <>
      {joinBody}
      {!isDrawer && overlayPlay ? (
        <ContentPlaybackOverlay
          eventId={overlayPlay.eventId}
          channelId={overlayPlay.channelId}
          seed={overlayPlay}
          onDismiss={dismissOverlayPlay}
        />
      ) : null}
      <TipperEmailOtpSignInDialog
        open={signInOpen}
        onOpenChange={setSignInOpen}
        signInTitle="Sign in to join this community"
        signupSurface="community_join"
        getRedirectPathAfterVerify={() => signInReturnTo}
        onVerified={() => {
          if (signInReturnTo === effectiveSignInRedirectPath) {
            void loadForm({ background: true, force: true });
          } else {
            router.push(signInReturnTo);
          }
        }}
      />
    </>
  );
}
