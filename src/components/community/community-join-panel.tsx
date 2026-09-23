"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { toast } from "react-toastify";
import { useSelector } from "react-redux";
import {
  CircleStop,
  Copy,
  Loader2,
  Pause,
  Play,
  UserRound,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
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
import { YoutubeChromeMask } from "@/components/youtube-chrome-mask";
import { formatBankDuration } from "@/lib/utils";
import { formatMetaMetricsLine } from "@/lib/creator-profile-metadata";
import { OVERLAY_Z_INDEX } from "@/lib/drawer-z-index";
import { useOpenContentWithReturn } from "@/hooks/use-open-content-with-return";
import { usePathname } from "next/navigation";
import { TopContentCard } from "../home/top-content-card";
import { FeaturedContentCard } from "./featured-content-card";
import VideoPlayer, {
  VideoPlayerRef,
  loadReelSoundPref,
} from "../events/video-player";
import { VideoFeatureCardBanner } from "@/components/video-feature/video-feature-card-banner";
import { createFeatureCardOverlayPlaybackHandlers } from "@/lib/feature-card-overlay-playback";
import { isCommunityAlreadyIn } from "@/lib/community-already-in";
import { fetchCommunityAccessStateCached } from "@/lib/drawer-prefetch-cache";
import { CommunityPublicMembersRoster } from "@/components/community/community-public-members-roster";
import { invalidateCommunityPublicMembersCache } from "@/lib/community-public-members";

const communityFeatureOn =
  process.env.NEXT_PUBLIC_COMMUNITY_FEATURE_ENABLED === "true";

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

function formatPlaybackTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
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

function FeaturedCommunityVideoOverlay({
  video,
  onClose,
}: {
  video: CommunityFeaturedVideo;
  onClose: () => void;
}) {
  const videoRef = useRef<VideoPlayerRef>(null);
  const featureOverlayWasPlayingRef = useRef(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [loadingPlayer, setLoadingPlayer] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(() => !loadReelSoundPref());
  const [audioUnlocked, setAudioUnlocked] = useState(() => loadReelSoundPref());

  useEffect(() => {
    setPlayerReady(false);
    setLoadingPlayer(true);
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(true);

    const timer = window.setTimeout(() => {
      setPlayerReady(true);
      setLoadingPlayer(false);
    }, 100);

    return () => window.clearTimeout(timer);
  }, [video.id]);

  useEffect(() => {
    if (!playerReady) return;

    const interval = window.setInterval(() => {
      const player = videoRef.current;
      if (!player?.isReady()) return;
      setCurrentTime(player.getCurrentTime());
      setDuration(player.getDuration());
    }, 500);

    return () => window.clearInterval(interval);
  }, [playerReady, video.id]);

  const togglePlayPause = () => {
    const player = videoRef.current;
    if (!player) return;
    if (isPlaying) {
      player.pause();
      setIsPlaying(false);
    } else {
      player.play();
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    const player = videoRef.current;
    if (!player) return;
    if (isMuted) {
      player.unmute();
      setAudioUnlocked(true);
    } else {
      player.mute();
    }
  };

  const handleUnmute = () => {
    const player = videoRef.current;
    if (!player) return;
    player.unmute();
    player.setvolume(100);
    setAudioUnlocked(true);
  };

  return (
    <div
      className={`${OVERLAY_Z_INDEX} fixed inset-0 flex items-center justify-center bg-black/80 p-4`}
      role="dialog"
      aria-modal="true"
      aria-label={`Playing ${video.title}`}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl rounded-md bg-white shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Close video"
          onClick={onClose}
          className="absolute top-3 right-3 z-20 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80"
        >
          <X className="size-4" />
        </button>

        <div className="relative flex gap-3 p-4 pt-10">
          <div className="flex shrink-0 flex-col gap-2">
            <button
              type="button"
              aria-label={isPlaying ? "Pause video" : "Play video"}
              onClick={togglePlayPause}
            >
              {isPlaying ? (
                <Pause className="size-5" />
              ) : (
                <Play className="size-5" />
              )}
            </button>

            <button
              type="button"
              aria-label="Stop video"
              onClick={() => videoRef.current?.stop()}
            >
              <CircleStop className="-ml-1 size-7 fill-black text-white" />
            </button>

            <button
              type="button"
              aria-label={isMuted ? "Unmute video" : "Mute video"}
              onClick={toggleMute}
            >
              {isMuted ? (
                <VolumeX className="size-5" />
              ) : (
                <Volume2 className="size-5" />
              )}
            </button>

            {!audioUnlocked && !loadingPlayer ? (
              <button
                type="button"
                onClick={handleUnmute}
                className="text-muted-foreground flex items-center gap-1 text-[10px] whitespace-nowrap"
              >
                <VolumeX className="size-4" />
              </button>
            ) : null}
          </div>

          <div className="relative min-h-[200px] min-w-0 flex-1 overflow-hidden rounded-lg bg-black">
            {loadingPlayer ? (
              <div className="flex h-[min(55vh,420px)] w-full items-center justify-center">
                <span className="animate-pulse text-sm text-white/70">
                  Loading video…
                </span>
              </div>
            ) : null}
            {playerReady && !loadingPlayer ? (
              <div className="relative h-[min(55vh,420px)] w-full">
                {video.channelId &&
                process.env.NEXT_PUBLIC_VIDEO_REQUESTS_ENABLED !== "false" ? (
                  <div className="pointer-events-none absolute bottom-16 left-2 z-[62] max-w-[min(280px,calc(100%-1rem))]">
                    <VideoFeatureCardBanner
                      surfaceChannelId={video.channelId}
                      hostSurfaceChannelId={video.channelId}
                      compact
                      showEngageCta={false}
                      onOverlayOpenChange={createFeatureCardOverlayPlaybackHandlers(
                        videoRef,
                        featureOverlayWasPlayingRef,
                        { getWasPlaying: () => isPlaying }
                      )}
                      className="pointer-events-auto"
                    />
                  </div>
                ) : null}
                <VideoPlayer
                  ref={videoRef}
                  key={video.id}
                  videoUrl={video.url}
                  isChannel
                  className="h-full w-full"
                  initialMuted={!loadReelSoundPref()}
                  disableGlobalAudioUnlock
                  onPlayStateChange={setIsPlaying}
                  onMuteStateChange={setIsMuted}
                  loadingBackdropClassName="bg-black"
                />
                <YoutubeChromeMask blockClicks />
              </div>
            ) : null}
          </div>
        </div>

        <div className="space-y-2 px-4 pb-4">
          <h4 className="line-clamp-2 text-sm font-medium">{video.title}</h4>
          <input
            type="range"
            min={0}
            max={duration || 0}
            value={currentTime}
            step={0.1}
            aria-label="Video scrubber"
            onChange={e => {
              const seekTo = Number.parseFloat(e.target.value);
              videoRef.current?.seekTo(seekTo);
              setCurrentTime(seekTo);
            }}
            className="accent-primary h-2 w-full rounded-full bg-black"
          />
          <div className="flex justify-between px-1 text-xs">
            <span>{formatPlaybackTime(currentTime)}</span>
            <span>{formatPlaybackTime(duration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export type CommunityJoinPanelProps = {
  communityId: string;
  /** Full path + query for sign-in redirect (e.g. `/explore?tab=join&joinCommunity=…`). */
  signInRedirectPath: string;
  variant?: "page" | "drawer";
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
}: CommunityJoinPanelProps) {
  const isDrawer = variant === "drawer";
  const router = useRouter();
  const pathname = usePathname();
  const openContentWithReturn = useOpenContentWithReturn();
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
  const [signInReturnTo, setSignInReturnTo] = useState(signInRedirectPath);
  const formLoadedForRef = useRef<string | null>(null);
  const activeCommunityIdRef = useRef(communityId);
  activeCommunityIdRef.current = communityId;

  const shouldReduceMotion = useReducedMotion();

  const [overlayVideo, setOverlayVideo] =
    useState<CommunityFeaturedVideo | null>(null);

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
  }, [communityId]);

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
      const data = await fetchCommunityAccessStateCached(communityId, {
        force: options?.force,
      });
      if (activeCommunityIdRef.current !== requestCommunityId) return;
      if (!data) {
        toast.error("Could not load community");
        setForm(null);
        formLoadedForRef.current = null;
        return;
      }

      type AccessPayload = {
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

      const d = data as AccessPayload;
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
    void loadForm({
      background: formLoadedForRef.current === communityId,
    });
  }, [loadForm]);

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
      <div className="flex min-h-[30vh] items-center justify-center">
        <Loader2 className="text-muted-foreground size-8 animate-spin" />
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
                        onPlayClick={() => setOverlayVideo(video)}
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
                      onPlayClick={() => setOverlayVideo(video)}
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
                          const eventId = eventMatch?.[1];
                          if (!eventId) return;
                          openContentWithReturn({
                            eventId,
                            channelId: video.channel.id,
                            returnTo: signInRedirectPath || pathname,
                            label: "Back to community",
                            drawer: {
                              type: "community",
                              communityId,
                            },
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
            signInRedirectPath={signInRedirectPath}
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
      {!isDrawer && overlayVideo ? (
        <FeaturedCommunityVideoOverlay
          video={overlayVideo}
          onClose={() => setOverlayVideo(null)}
        />
      ) : null}
      <TipperEmailOtpSignInDialog
        open={signInOpen}
        onOpenChange={setSignInOpen}
        signInTitle="Sign in to join this community"
        signupSurface="community_join"
        getRedirectPathAfterVerify={() => signInReturnTo}
        onVerified={() => {
          if (signInReturnTo === signInRedirectPath) {
            void loadForm({ background: true, force: true });
          } else {
            router.push(signInReturnTo);
          }
        }}
      />
    </>
  );
}
