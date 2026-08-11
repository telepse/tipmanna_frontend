"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { RootState } from "@/redux/store";
import {
  getCommunityAccessStateAction,
  requestDomainOtpAction,
  submitJoinAction,
  validateAccessCodeTipperAction,
  verifyDomainOtpAction,
  getMyCommunitySubscriptionAction,
  type CommunityFeaturedVideo,
} from "@/actions/communities";
import {
  E2E_JOIN_COMMUNITY_ID,
  E2E_JOIN_FORM_PUBLIC,
} from "@/lib/e2e-explore-fixtures";
import { isExploreE2eFixturesEnabled } from "@/lib/explore-e2e-fixtures-gate";
import { CommunitySubscribeSection } from "@/components/community/community-subscribe-section";
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
import { OVERLAY_Z_INDEX } from "@/lib/drawer-z-index";
import { TopContentCard } from "../home/top-content-card";
import { FeaturedContentCard } from "./featured-content-card";
import VideoPlayer, { VideoPlayerRef } from "../events/video-player";

const EXPLORE_COMMUNITY_HUB_HREF = "/explore?tab=my-communities";

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

function formatEventVideoTypeLabel(value: string | null | undefined) {
  if (!value) return "Other";
  return (
    EVENT_VIDEO_TYPE_OPTIONS.find(option => option.value === value)?.label ??
    value.replace(/_/g, " ").toLowerCase()
  );
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

function FeaturedCommunityVideoOverlay({
  video,
  onClose,
}: {
  video: CommunityFeaturedVideo;
  onClose: () => void;
}) {
  const videoRef = useRef<VideoPlayerRef>(null);
  const [playerReady, setPlayerReady] = useState(false);
  const [loadingPlayer, setLoadingPlayer] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [audioUnlocked, setAudioUnlocked] = useState(false);

  useEffect(() => {
    setPlayerReady(false);
    setLoadingPlayer(true);
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(true);
    setIsMuted(true);
    setAudioUnlocked(false);

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
      setIsMuted(false);
      setAudioUnlocked(true);
    } else {
      player.mute();
      setIsMuted(true);
    }
  };

  const handleUnmute = () => {
    const player = videoRef.current;
    if (!player) return;
    player.unmute();
    player.setvolume(100);
    setIsMuted(false);
    setAudioUnlocked(true);
    setIsPlaying(true);
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
                <VideoPlayer
                  ref={videoRef}
                  key={video.id}
                  videoUrl={video.url}
                  isChannel
                  className="h-full w-full"
                  onPlayStateChange={setIsPlaying}
                  onMuteStateChange={setIsMuted}
                  loadingBackdropClassName="bg-black"
                />
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
}: CommunityJoinPanelProps) {
  const router = useRouter();
  const { user, isAuthenticated, requiresVerification } = useSelector(
    (s: RootState) => s.auth
  );

  const [gateOk, setGateOk] = useState(false);
  const [form, setForm] = useState<JoinFormPublic | null>(null);

  const [prefix, setPrefix] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [verifiedDomainEmail, setVerifiedDomainEmail] = useState<string | null>(
    null
  );
  const [accessCode, setAccessCode] = useState("");
  const [codeHint, setCodeHint] = useState<string | null>(null);
  const [customAnswer, setCustomAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [doneMessage, setDoneMessage] = useState<string | null>(null);
  const [paidSubExpiresAt, setPaidSubExpiresAt] = useState<string | null>(null);
  const [isMember, setIsMember] = useState(false);
  const [viewerHostsCommunity, setViewerHostsCommunity] = useState(false);
  const [featuredVideos, setFeaturedVideos] = useState<
    CommunityFeaturedVideo[]
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

  useEffect(() => {
    formLoadedForRef.current = null;
    setDoneMessage(null);
    setForm(null);
    setCodeHint(null);
    setVerifiedDomainEmail(null);
    setAccessCode("");
    setPrefix("");
    setOtpCode("");
    setCustomAnswer("");
    setGateOk(false);
    setIsMember(false);
    setViewerHostsCommunity(false);
    setFeaturedVideos([]);
  }, [communityId]);

  useEffect(() => {
    if (!communityFeatureOn) return;
    setGateOk(true);
  }, []);

  const loadForm = useCallback(
    async (options?: { background?: boolean }) => {
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
      const res = await getCommunityAccessStateAction(communityId);
      if (activeCommunityIdRef.current !== requestCommunityId) return;
      if (!res.success || !res.data) {
        toast.error(res.message ?? "Could not load community");
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
        viewerHostsCommunity: boolean;
      };

      const d = res.data as AccessPayload;
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
      setPaidSubExpiresAt(d.subscriptionExpiresAt ?? null);
      setIsMember(d.isMember);
      setViewerHostsCommunity(d.viewerHostsCommunity);
      setFeaturedVideos(d.featuredVideos ?? []);
      formLoadedForRef.current = communityId;

      if (!background) {
        if (d.isMember && !d.viewerHostsCommunity) {
          toast.success("You already belong to this community.");
        } else if (d.viewerHostsCommunity) {
          toast.info(
            "You operate this community as host — manage it from Host tools rather than joining as a tipper."
          );
        }
      }
    },
    [communityId]
  );

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

  const onSendOtp = async () => {
    if (!user?.id) return;
    const res = await requestDomainOtpAction(undefined, communityId, prefix);
    if (!res.success) {
      toast.error(res.message ?? "Could not send code");
      return;
    }
    toast.success("Check your inbox for the code");
  };

  const onVerifyOtp = async () => {
    if (!user?.id) return;
    const res = await verifyDomainOtpAction(
      undefined,
      communityId,
      prefix,
      otpCode
    );
    if (!res.success || !res.data) {
      toast.error(res.message ?? "Invalid code");
      return;
    }
    const d = res.data as { verifiedDomainEmail: string };
    setVerifiedDomainEmail(d.verifiedDomainEmail);
    toast.success("Email verified");
  };

  const onBlurValidateCode = async () => {
    const c = accessCode.trim();
    if (!c) {
      setCodeHint(null);
      return;
    }
    if (!user?.id) return;
    const res = await validateAccessCodeTipperAction(undefined, communityId, c);
    if (!res.success || !res.data) {
      setCodeHint(null);
      return;
    }
    const d = res.data as { valid: boolean; monthsGranted: number | null };
    setCodeHint(
      d.valid && d.monthsGranted != null
        ? `Valid code — ${d.monthsGranted} month(s) membership`
        : d.valid
          ? "Valid code"
          : "Invalid or exhausted code"
    );
  };

  const onSubmit = async () => {
    if (!user?.id) return;
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {};
      if (accessCode.trim()) body.accessCode = accessCode.trim();
      if (verifiedDomainEmail) body.verifiedDomainEmail = verifiedDomainEmail;
      if (customAnswer.trim()) body.customAnswer = customAnswer.trim();

      const res = await submitJoinAction(undefined, communityId, body);
      if (!res.success || !res.data) {
        toast.error(res.message ?? "Join failed");
        return;
      }
      const d = res.data as {
        path?: string;
        requestId?: string;
        message?: string;
      };
      if (d.path === "request") {
        setDoneMessage(
          "Your request was submitted. The community owner will review it."
        );
        toast.success("Request submitted");
      } else {
        toast.success("Welcome!");
        void loadForm({ background: true });
      }
    } finally {
      setSubmitting(false);
    }
  };

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
  } else if (!gateOk) {
    joinBody = (
      <div className="flex min-h-[30vh] items-center justify-center">
        <Loader2 className="text-muted-foreground size-8 animate-spin" />
      </div>
    );
  } else if (!form) {
    joinBody = (
      <div className="flex min-h-[30vh] items-center justify-center">
        <Loader2 className="text-muted-foreground size-8 animate-spin" />
      </div>
    );
  } else {
    const domainNorm = form.officialEmailDomain?.replace(/^@/, "") ?? "";
    const paidFee = form.subscriptionFeeGbp?.trim();
    const showPaidSubscribe =
      paidFee != null && paidFee !== "" && Number(paidFee) > 0;
    const communityLogoSrc = form.logoUrl?.trim();
    const typeLabel = formatCommunityTypeLabel(form.communityType);

    joinBody = (
      <section
        className="relative min-h-screen space-y-0 bg-cover bg-fixed bg-center bg-no-repeat"
        style={{ backgroundImage: `url(/patterns/bg_pattern.webp)` }}
      >
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
            isAuthenticated={isAuthenticated}
            onJoinSignInRequired={communityIdForSignIn => {
              setSignInReturnTo(exploreCommunityJoinHref(communityIdForSignIn));
              setSignInOpen(true);
            }}
          />
        </div>

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
              isMember ? (
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

          <h5 className="text-muted-foreground text-lg font-medium underline underline-offset-2">
            Community details
          </h5>
          <div className="-mt-4 flex items-start gap-4">
            {communityLogoSrc ? (
              <Image
                src={communityLogoSrc}
                alt={`${form.name} logo`}
                width={64}
                height={64}
                className="size-16 shrink-0 rounded-md object-cover"
                unoptimized={communityLogoSrc.startsWith("http")}
              />
            ) : (
              <div className="border-moonstone-blue flex size-16 shrink-0 items-center justify-center rounded-md border-2 bg-white">
                <UserRound className="size-8" />
              </div>
            )}
            <p className="line-clamp-3 min-w-0 flex-1 leading-relaxed">
              <span className="font-medium">
                {formatMetaMetricsLine({
                  members: form.memberCount ?? 0,
                  tips: form.totalTips ?? 0,
                  videos: form.numVideos ?? 0,
                })}
              </span>
              {form.description?.trim() ? (
                <span>{` · ${form.description.trim()}`}</span>
              ) : (
                <span className="text-muted-foreground">
                  {" · No description yet."}
                </span>
              )}
            </p>
          </div>

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

          {featuredVideos.length > 0 ? (
            <div className="space-y-4 pt-2">
              <h5 className="text-muted-foreground text-lg font-medium">
                Featured community videos
              </h5>
              {/* <div className="grid grid-cols-1 gap-4">
                {featuredVideos.map(video => {
                  const shareUrl = getFeaturedVideoShareUrl(video);

                  return (
                    <div
                      key={video.id}
                      className="flex min-w-0 cursor-pointer flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                      // onClick={openLightbox}
                    >
                      <div className="flex min-w-0 items-center gap-4">
                        <img
                          src={(() => {
                            const videoId = extractYoutubeID(video.url);
                            return videoId
                              ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
                              : "/default-event-image.jpg";
                          })()}
                          alt={video.title}
                          className="h-14 w-28 shrink-0 object-cover"
                        />

                        <div className="min-w-0 space-y-1">
                          <h5 className="font-semibold">{video.title}</h5>
                          <p className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
                            <span className="bg-primary size-2 shrink-0 rounded-full" />
                            {formatEventVideoTypeLabel(video.eventVideoType)}
                          </p>
                          <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                            <span>
                              Duration:{" "}
                              {formatBankDuration(video.durationSeconds ?? 0)}
                            </span>
                            {typeof video.numOfTips === "number" ? (
                              <span>{video.numOfTips} tips</span>
                            ) : null}
                            <span>{video.numOfSaves ?? 0} saves</span>
                            <span>{video.numOfShares ?? 0} shares</span>
                            <span>{video.numOfComments ?? 0} comments</span>
                            <span>{video.numOfSeen ?? 0} seen</span>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="shrink-0"
                              disabled={!shareUrl}
                              onClick={() => void copyFeaturedVideoLink(video)}
                            >
                              <Copy className="size-4" />
                              Copy link
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div> */}

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

          <div className="mt-6 space-y-4 border-t pt-6 lg:mt-12">
            {isMember ? (
              <div className="space-y-3 rounded-lg border bg-green-50/50 p-4">
                <h5 className="text-lg font-semibold">You&apos;re a member</h5>
                <p className="text-muted-foreground text-sm">
                  Browse your communities hub to watch content and manage your
                  membership.
                </p>
                <Button
                  asChild
                  variant="outline"
                >
                  <Link href={EXPLORE_COMMUNITY_HUB_HREF}>
                    Go to my communities
                  </Link>
                </Button>
              </div>
            ) : viewerHostsCommunity ? (
              <div className="space-y-3 rounded-lg border p-4">
                <h5 className="text-lg font-semibold">Community host</h5>
                <p className="text-muted-foreground text-sm">
                  You operate this community as host. Manage it from Host tools
                  rather than joining as a tipper.
                </p>
              </div>
            ) : (
              <>
                <h5 className="text-2xl">
                  How to join:{" "}
                  <span className="text-sm">
                    {form.joinMethod === "subscription"
                      ? "Paid subscription"
                      : "Submit a free request for approval"}
                  </span>
                </h5>

                {!isAuthenticated || requiresVerification ? (
                  <div className="bg-muted/40 space-y-3 rounded-lg p-4">
                    <p className="text-sm">
                      Sign in with your tipper email to submit a join request.
                    </p>
                    <Button
                      type="button"
                      onClick={() => {
                        setSignInReturnTo(signInRedirectPath);
                        setSignInOpen(true);
                      }}
                    >
                      Continue with email
                    </Button>
                  </div>
                ) : (
                  <div className="max-w-lg space-y-4">
                    <h2 className="text-lg font-semibold">Join {form.name}</h2>
                    <p className="text-muted-foreground mt-2 text-sm">
                      Signed in as {user?.email}. Default membership length when
                      using domain or approval: {form.defaultMonths} month(s).
                    </p>

                    {showPaidSubscribe && (
                      <div className="mt-6">
                        <CommunitySubscribeSection
                          communityId={communityId}
                          feeGbp={Number(paidFee).toFixed(2)}
                          activeUntil={paidSubExpiresAt}
                          onSubscriptionChange={async () => {
                            if (!user?.id) return;
                            const subRes =
                              await getMyCommunitySubscriptionAction(
                                undefined,
                                communityId
                              );
                            if (subRes.success && subRes.data) {
                              const d = subRes.data as {
                                subscription: {
                                  expiresAt: string | null;
                                } | null;
                              };
                              setPaidSubExpiresAt(
                                d.subscription?.expiresAt ?? null
                              );
                            }
                          }}
                        />
                        <p className="text-muted-foreground mt-4 text-xs">
                          Or use a join request, invite link, or access code
                          below.
                        </p>
                      </div>
                    )}

                    {form.joinFormRequireAccessCode && (
                      <div className="mt-6 space-y-2">
                        <Label htmlFor="acc">Access code</Label>
                        <Input
                          id="acc"
                          value={accessCode}
                          onChange={e => setAccessCode(e.target.value)}
                          onBlur={() => void onBlurValidateCode()}
                        />
                        {codeHint && (
                          <p className="text-muted-foreground text-xs">
                            {codeHint}
                          </p>
                        )}
                      </div>
                    )}

                    {!form.joinFormRequireAccessCode && (
                      <div className="mt-6 space-y-2">
                        <Label htmlFor="acc-opt">Access code (optional)</Label>
                        <Input
                          id="acc-opt"
                          value={accessCode}
                          onChange={e => setAccessCode(e.target.value)}
                          onBlur={() => void onBlurValidateCode()}
                          placeholder="Skip if you are requesting access"
                        />
                        {codeHint && (
                          <p className="text-muted-foreground text-xs">
                            {codeHint}
                          </p>
                        )}
                      </div>
                    )}

                    {form.officialEmailDomain &&
                      form.officialEmailDomainRequired &&
                      domainNorm && (
                        <div className="mt-6 space-y-3 rounded-lg border p-4">
                          <p className="text-sm font-medium">
                            Verify work email
                          </p>
                          <div className="flex flex-wrap items-end gap-2">
                            <div className="min-w-[120px] flex-1">
                              <Label htmlFor="prefix">Prefix</Label>
                              <Input
                                id="prefix"
                                value={prefix}
                                onChange={e => setPrefix(e.target.value)}
                                placeholder="you"
                              />
                            </div>
                            <p className="text-muted-foreground pb-2 text-sm">
                              @{domainNorm}
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => void onSendOtp()}
                          >
                            Send verification code
                          </Button>
                          <div>
                            <Label htmlFor="otp">Code from email</Label>
                            <Input
                              id="otp"
                              value={otpCode}
                              onChange={e => setOtpCode(e.target.value)}
                            />
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => void onVerifyOtp()}
                          >
                            Verify
                          </Button>
                          {verifiedDomainEmail && (
                            <p className="text-xs text-green-700">
                              Verified: {verifiedDomainEmail}
                            </p>
                          )}
                        </div>
                      )}

                    {form.customQuestion && (
                      <div className="mt-6 space-y-2">
                        <Label>{form.customQuestion}</Label>
                        <Textarea
                          value={customAnswer}
                          onChange={e => setCustomAnswer(e.target.value)}
                          rows={4}
                        />
                      </div>
                    )}

                    <div className="mt-8 flex flex-col gap-2">
                      <Button
                        type="button"
                        disabled={submitting}
                        onClick={() => void onSubmit()}
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="mr-2 size-4 animate-spin" />
                            Submitting…
                          </>
                        ) : (
                          "Submit"
                        )}
                      </Button>
                      <Button
                        asChild
                        variant="ghost"
                      >
                        <Link href={EXPLORE_COMMUNITY_HUB_HREF}>Cancel</Link>
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      {joinBody}
      {overlayVideo ? (
        <FeaturedCommunityVideoOverlay
          video={overlayVideo}
          onClose={() => setOverlayVideo(null)}
        />
      ) : null}
      <TipperEmailOtpSignInDialog
        open={signInOpen}
        onOpenChange={setSignInOpen}
        signInTitle="Sign in to join this community"
        getRedirectPathAfterVerify={() => signInReturnTo}
        onVerified={() => {
          if (signInReturnTo === signInRedirectPath) {
            void loadForm({ background: true });
          } else {
            router.push(signInReturnTo);
          }
        }}
      />
    </>
  );
}
