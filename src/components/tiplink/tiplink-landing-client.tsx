/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useSelector } from "react-redux";
import {
  Bookmark,
  ChevronDown,
  ExternalLink,
  Link2,
  MessageCircleMore,
  Share2,
  UserRound,
} from "lucide-react";
import { toast } from "react-toastify";

import type { TipLinkPublicPayload } from "@/actions/tiplink";
import { postTipLinkVisitAction } from "@/actions/tiplink";
import { TipSection } from "@/components/events/tip-section";
import VideoPlayer, {
  type VideoPlayerRef,
} from "@/components/events/video-player";
import { ProfileDrawer } from "@/components/tv/profile-drawer";
import { Button } from "@/components/ui/button";
import SignInDialog from "@/components/auth/sign-in-dialog";
import { TippingElementsProvider } from "@/components/payments/tipping-elements-provider";
import { useGlobalTipStream } from "@/hooks/use-global-tip-stream";
import { usePaymentAnimationPlayer } from "@/hooks/use-payment-animation-player";
import { usePayerOriginAnimationRecovery } from "@/hooks/use-payer-origin-animation-recovery";
import { usePaymentPlaybackRestore } from "@/hooks/use-payment-playback-restore";
import { useAutoDropTip } from "@/hooks/use-auto-drop-tip";
import { useEventRoomRealtime } from "@/hooks/use-event-room-realtime";
import { useTipPresentation } from "@/hooks/use-tip-presentation";
import { useWalletTopupTipResume } from "@/hooks/use-wallet-topup-tip-resume";
import { buildCreatorProfileSharePath } from "@/lib/creator-profile-url";
import { copyShareUrl } from "@/lib/copy-share-url";
import { extractYoutubeID } from "@/lib/extractYoutubeID";
import { TV_RAIL_Z_INDEX } from "@/lib/drawer-z-index";
import { needsCreateHostAuth } from "@/lib/needs-create-host-auth";
import { startContentOnlyCreateJourney } from "@/lib/start-content-only-create-journey";
import {
  flushTvAnalytics,
  initTvAnalyticsRuntime,
  setTvAnalyticsContext,
  trackTvVideoEncounter,
  trackTvVideoStart,
  trackTvWatchDuration,
} from "@/lib/tvAnalytics";
import {
  formatSaveVideoError,
  toggleChannelSaveForUser,
} from "@/lib/save-video-client";
import type { RootState } from "@/redux/store";
import type { RoomCharacter } from "@/types";
import { cn } from "@/lib/utils";
import { getPrimaryOrigin } from "@/lib/site-config";

const TipDrawer = dynamic(
  () =>
    import("@/components/events/tip-drawer").then(m => ({
      default: m.TipDrawer,
    })),
  { ssr: false }
);
const CommentDrawer = dynamic(
  () =>
    import("@/components/events/comment-drawer").then(m => ({
      default: m.CommentDrawer,
    })),
  { ssr: false }
);
const TipsDrawer = dynamic(
  () =>
    import("@/components/events/tips-drawer").then(m => ({
      default: m.TipsDrawer,
    })),
  { ssr: false }
);

type Props = {
  payload: TipLinkPublicPayload;
  characters: any[];
  characterSets: any[];
  preview?: boolean;
};

export function TipLinkLandingClient({
  payload,
  characters,
  characterSets,
  preview = false,
}: Props) {
  const pathname = usePathname();
  const user = useSelector((s: RootState) => s.auth.user);
  const userRole = (user as { role?: string } | null)?.role;
  const userId = user?.id;
  const videoRef = useRef<VideoPlayerRef>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullView, setIsFullView] = useState(false);
  const [isProfileDrawerOpen, setIsProfileDrawerOpen] = useState(false);
  const [isTipDrawerOpen, setIsTipDrawerOpen] = useState(false);
  const [showCommentDrawer, setShowCommentDrawer] = useState(false);
  const [showTipsDrawer, setShowTipsDrawer] = useState(false);
  const [showDescription, setShowDescription] = useState(false);
  const [saved, setSaved] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  const [pendingCreateHref, setPendingCreateHref] = useState<string | null>(
    null
  );

  const { eventId, channel, event, host, metrics, tipLink } = payload;
  const channelId = channel.id;
  const paymentChannelId = channelId;

  const baseTipChars = Array.isArray(characters) ? characters : [];
  const baseTipSets = Array.isArray(characterSets) ? characterSets : [];

  const tipPres = useTipPresentation(eventId, baseTipChars as RoomCharacter[], {
    paymentSurface: "tiplink",
  });

  useGlobalTipStream({ eventId, surface: "tiplink" });
  usePaymentAnimationPlayer({
    eventId,
    characters: tipPres.strip as RoomCharacter[],
    surface: "tiplink",
  });
  usePayerOriginAnimationRecovery({
    eventId,
    paymentSurface: "tiplink",
    characters: tipPres.strip as RoomCharacter[],
    surface: "tiplink",
  });
  usePaymentPlaybackRestore({
    paymentSurface: "tiplink",
    videoRef,
    currentChannelId: channelId,
    onMuteChange: setIsMuted,
  });
  useAutoDropTip(eventId, true);

  const { openWalletModalNonce } = useWalletTopupTipResume(
    eventId,
    setIsTipDrawerOpen
  );

  const {
    amountRaised: liveAmountRaised,
    numOfTips: liveNumOfTips,
    channelNumOfTips: liveChannelNumOfTips,
  } = useEventRoomRealtime({
    eventId,
    initialAmountRaised: event.amountRaised ?? 0,
    initialNumOfTips: event.numOfTips ?? 0,
    channelId,
    initialChannelNumOfTips: channel.numOfTips ?? 0,
  });

  const watchSegStartRef = useRef(0);
  const prevPlayingRef = useRef(false);

  useEffect(() => {
    initTvAnalyticsRuntime();
  }, []);

  useEffect(() => {
    if (!preview) {
      void postTipLinkVisitAction(tipLink.slug, pathname || tipLink.landingUrl);
    }
  }, [pathname, preview, tipLink.landingUrl, tipLink.slug]);

  useEffect(() => {
    if (!eventId || !channelId) return;
    void flushTvAnalytics().then(() => {
      setTvAnalyticsContext({
        eventId,
        channelId,
        surface: "tiplink",
        communityId: event.communityId,
      });
    });
  }, [channelId, event.communityId, eventId]);

  const emitEncounter = useCallback(() => {
    if (!eventId || !channelId) return;
    trackTvVideoEncounter(`tiplink-${tipLink.slug}`, {
      channelId,
      mode: "LOCAL",
      scheduleIndex: 0,
    });
  }, [channelId, eventId, tipLink.slug]);

  useEffect(() => {
    if (isPlaying && !prevPlayingRef.current) {
      trackTvVideoStart(channelId, "LOCAL", 0, channelId);
    }
    prevPlayingRef.current = isPlaying;
  }, [channelId, isPlaying]);

  useEffect(() => {
    if (!eventId || !channelId) return;
    if (!isPlaying) {
      if (watchSegStartRef.current > 0) {
        const sec = (Date.now() - watchSegStartRef.current) / 1000;
        watchSegStartRef.current = 0;
        if (sec > 0.3) {
          trackTvWatchDuration(
            channelId,
            Math.min(sec, 600),
            "LOCAL",
            channelId
          );
        }
      }
      return;
    }
    if (watchSegStartRef.current === 0) {
      watchSegStartRef.current = Date.now();
    }
  }, [channelId, eventId, isPlaying]);

  const bannerSrc = useMemo(() => {
    if (tipLink.bannerUrl?.trim()) return tipLink.bannerUrl;
    const vid = extractYoutubeID(channel.url);
    return vid
      ? `https://img.youtube.com/vi/${vid}/hqdefault.jpg`
      : "/default-event-image.jpg";
  }, [channel.url, tipLink.bannerUrl]);

  const shareUrl = useMemo(() => {
    const origin = getPrimaryOrigin();
    return `${origin}${tipLink.landingUrl}`;
  }, [tipLink.landingUrl]);

  const handleShare = useCallback(async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: channel.title, url: shareUrl });
        return;
      } catch {
        /* fall through */
      }
    }
    await copyShareUrl(shareUrl);
    toast.success("TipLink link copied");
  }, [channel.title, shareUrl]);

  const handleSave = useCallback(async () => {
    try {
      const res = await toggleChannelSaveForUser({
        channelId,
        role: userRole,
        userId,
      });
      if (!res.success) {
        toast.error(res.error ?? res.message ?? "Could not save video");
        return;
      }
      setSaved(res.data?.toggledTo === "saved");
      toast.success(
        res.data?.toggledTo === "saved"
          ? "Saved to your list"
          : "Removed from saves"
      );
    } catch (err) {
      toast.error(formatSaveVideoError(err));
    }
  }, [channelId, userId, userRole]);

  const handleCreateYours = useCallback(() => {
    startContentOnlyCreateJourney({
      needsHostAuth: needsCreateHostAuth(user),
      openSignIn: (intent, href) => {
        setPendingCreateHref(href);
        setSignInOpen(true);
      },
      navigate: (href, options) => {
        if (options?.newTab) {
          window.open(href, "_blank", "noopener,noreferrer");
        } else {
          window.location.href = href;
        }
      },
    });
  }, [user]);

  const metricsLine = [
    `${metrics.saves} saves`,
    `${metrics.shares} shares`,
    `${metrics.comments} comments`,
    `${metrics.encounters} seen`,
    `${metrics.pageVisits90d} visits (90d)`,
  ].join(" · ");

  const storeLinks = [
    { label: "Apple Music", url: tipLink.appleMusicUrl, verb: "Play" },
    { label: "Spotify", url: tipLink.spotifyUrl, verb: "Play" },
    { label: "Audiomack", url: tipLink.audiomackUrl, verb: "Play" },
    { label: "TikTok", url: tipLink.tiktokUrl, verb: "Use video" },
  ].filter(l => Boolean(l.url?.trim()));

  const tipDrawerMounted = isTipDrawerOpen || openWalletModalNonce > 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-black text-white">
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-white/10 bg-black/70 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            className="rounded-full"
            onClick={handleCreateYours}
          >
            Create Yours
          </Button>
          <button
            type="button"
            aria-label="Profile"
            className="rounded-full border border-white/20 p-2"
            onClick={() => setIsProfileDrawerOpen(true)}
          >
            <UserRound className="size-5" />
          </button>
        </div>
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold tracking-wide"
        >
          <span className="text-primary">Tipmanna</span>
          <span className="text-sm text-white/70">link</span>
        </Link>
      </header>

      {preview ? (
        <div className="bg-amber-500/20 px-4 py-2 text-center text-sm text-amber-100">
          Preview mode — not indexed publicly
        </div>
      ) : null}

      <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6">
        <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <TippingElementsProvider
            tippingCharacters={tipPres.strip as RoomCharacter[]}
            textTipUnitPrice={tipPres.textUnitPrice}
          >
            <TipSection
              eventId={eventId}
              tippingCharacters={tipPres.strip as RoomCharacter[]}
              characterSets={baseTipSets}
              paymentSurface="tiplink"
              paymentChannelId={paymentChannelId}
              textTipUnitPrice={tipPres.textUnitPrice}
              sectionCtaLabel={tipPres.sectionCtaLabel}
              payLabel={tipPres.payLabel}
              tipQuoteContext={tipPres.quoteCtx}
            />
          </TippingElementsProvider>
        </section>

        <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-black">
          <div
            className={cn(
              "relative aspect-video w-full",
              isFullView && "fixed inset-0 z-[200] aspect-auto h-full"
            )}
          >
            <VideoPlayer
              ref={videoRef}
              videoUrl={channel.url}
              initialMuted={isMuted}
              onMuteStateChange={setIsMuted}
              onPlayStateChange={setIsPlaying}
              playbackActive
              onVideoLoaded={emitEncounter}
            />
            <div
              id="global-animation-layer"
              className={cn(
                "pointer-events-none absolute inset-0",
                TV_RAIL_Z_INDEX
              )}
            />
            <div
              id="preview-animation-root"
              className="pointer-events-none absolute inset-0"
            />
          </div>
          <div className="flex items-center justify-between px-3 py-2 text-sm">
            <button
              type="button"
              className="rounded-md bg-white/10 px-3 py-1"
              onClick={() => {
                if (isPlaying) videoRef.current?.pause();
                else videoRef.current?.play();
              }}
            >
              {isPlaying ? "Pause" : "Play"}
            </button>
            <button
              type="button"
              className="rounded-md bg-white/10 px-3 py-1"
              onClick={() => setIsMuted(m => !m)}
            >
              {isMuted ? "Unmute" : "Mute"}
            </button>
            <button
              type="button"
              className="rounded-md bg-white/10 px-3 py-1"
              onClick={() => setIsFullView(v => !v)}
            >
              {isFullView ? "Close" : "Enlarge"}
            </button>
          </div>
        </section>

        <section className="space-y-3 text-sm text-white/80">
          <p>{metricsLine}</p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCommentDrawer(true)}
            >
              <MessageCircleMore className="mr-1 size-4" /> Comments
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSave}
              disabled={saved}
            >
              <Bookmark className="mr-1 size-4" /> {saved ? "Saved" : "Save"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
            >
              <Share2 className="mr-1 size-4" /> Share
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTipsDrawer(true)}
            >
              Tips ({liveChannelNumOfTips ?? channel.numOfTips})
            </Button>
          </div>
        </section>

        <section className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h1 className="text-2xl font-bold">{channel.title}</h1>
            {channel.contentCountry && channel.contentCountry !== "all" ? (
              <span className="rounded bg-white/10 px-2 py-0.5 text-xs uppercase">
                {channel.contentCountry}
              </span>
            ) : null}
          </div>
          {channel.description ? (
            <button
              type="button"
              className="flex items-center gap-1 text-sm text-white/70"
              onClick={() => setShowDescription(true)}
            >
              About this video <ChevronDown className="size-4" />
            </button>
          ) : null}
          {event.showAmountRaisedOnVideos !== false ? (
            <p className="text-primary text-sm">
              £{liveAmountRaised.toFixed(2)} raised · {liveNumOfTips} tips
            </p>
          ) : null}
        </section>

        {storeLinks.length > 0 ? (
          <section className="grid gap-2 sm:grid-cols-2">
            {storeLinks.map(link => (
              <a
                key={link.label}
                href={link.url!}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:border-primary/50 flex items-center justify-between rounded-xl border border-white/15 bg-white/5 px-4 py-3 transition"
              >
                <span>{link.label}</span>
                <span className="text-primary text-xs">{link.verb}</span>
              </a>
            ))}
          </section>
        ) : null}

        {tipLink.pitch ? (
          <section className="overflow-hidden rounded-2xl border border-white/10">
            <div className="relative h-40 w-full">
              <Image
                src={bannerSrc}
                alt=""
                fill
                className="object-cover"
                unoptimized
              />
            </div>
            <p className="px-4 py-3 text-lg font-medium">{tipLink.pitch}</p>
          </section>
        ) : null}

        {payload.featuredPlaylist ? (
          <section className="rounded-2xl border border-white/10 p-4">
            <p className="mb-2 text-sm text-white/60">Featured playlist</p>
            <Link
              href={`/playlist/${payload.featuredPlaylist.id}`}
              target="_blank"
              className="flex items-center gap-3 rounded-lg bg-white/5 p-3 hover:bg-white/10"
            >
              {payload.featuredPlaylist.bannerUrl ? (
                <Image
                  src={payload.featuredPlaylist.bannerUrl}
                  alt=""
                  width={64}
                  height={64}
                  className="rounded-md object-cover"
                  unoptimized
                />
              ) : null}
              <div>
                <p className="font-semibold">{payload.featuredPlaylist.name}</p>
                {payload.featuredPlaylist.description ? (
                  <p className="line-clamp-2 text-sm text-white/60">
                    {payload.featuredPlaylist.description}
                  </p>
                ) : null}
              </div>
              <ExternalLink className="ml-auto size-4 text-white/50" />
            </Link>
          </section>
        ) : null}

        <section className="rounded-2xl border border-white/10 p-4">
          <p className="mb-3 text-sm text-white/60">Connect with me</p>
          <div className="flex flex-wrap gap-3">
            <Link
              href={buildCreatorProfileSharePath(host.username)}
              className="bg-primary/20 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium"
            >
              <span className="font-bold">t</span> Tipmanna
            </Link>
            {tipLink.socials.map(social => (
              <a
                key={social.url}
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm"
              >
                <Link2 className="size-4" />
                {social.label || social.platform}
              </a>
            ))}
            {host.externalLink ? (
              <a
                href={host.externalLink.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm"
              >
                {host.externalLink.label}
              </a>
            ) : null}
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 px-4 py-8 text-center">
        <p className="mb-4 text-lg font-semibold">Watch · Engage · Support</p>
        <Button
          variant="secondary"
          className="mb-6 rounded-full"
          onClick={handleCreateYours}
        >
          Create Yours
        </Button>
        <p className="text-xs text-white/50">Powered by Tipmanna.tv</p>
      </footer>

      {tipDrawerMounted ? (
        <TippingElementsProvider
          tippingCharacters={tipPres.strip as RoomCharacter[]}
          textTipUnitPrice={tipPres.textUnitPrice}
        >
          <TipDrawer
            open={isTipDrawerOpen}
            onOpenChange={setIsTipDrawerOpen}
            eventId={eventId}
            tippingCharacters={tipPres.strip as RoomCharacter[]}
            characterSets={baseTipSets}
            paymentSurface="tiplink"
            paymentChannelId={paymentChannelId}
            openWalletModalNonce={openWalletModalNonce}
            textTipUnitPrice={tipPres.textUnitPrice}
            payLabel={tipPres.payLabel}
            tipQuoteContext={tipPres.quoteCtx}
          />
        </TippingElementsProvider>
      ) : null}

      <CommentDrawer
        isCommentDrawerOpen={showCommentDrawer}
        setIsCommentDrawerOpen={setShowCommentDrawer}
        eventId={eventId}
        channelId={channelId}
        videoTitle={channel.title}
        videoDescription={channel.description ?? undefined}
        hostName={host.fullName}
        hostUsername={host.username}
      />

      <TipsDrawer
        open={showTipsDrawer}
        onOpenChange={setShowTipsDrawer}
        eventId={eventId}
        channelId={channelId}
      />

      <ProfileDrawer
        isProfileDrawerOpen={isProfileDrawerOpen}
        setIsProfileDrawerOpen={setIsProfileDrawerOpen}
      />

      {showDescription && channel.description ? (
        <div className="fixed inset-0 z-[300] flex items-end bg-black/60 sm:items-center sm:justify-center">
          <div className="max-h-[80vh] w-full overflow-y-auto rounded-t-2xl bg-zinc-900 p-6 sm:max-w-lg sm:rounded-2xl">
            <h2 className="mb-3 text-lg font-semibold">{channel.title}</h2>
            <p className="text-sm whitespace-pre-wrap text-white/80">
              {channel.description}
            </p>
            <Button
              className="mt-4 w-full"
              onClick={() => setShowDescription(false)}
            >
              Close
            </Button>
          </div>
        </div>
      ) : null}

      <SignInDialog
        open={signInOpen}
        onOpenChange={setSignInOpen}
        signupSurface="event_inline"
        onSuccess={() => {
          setSignInOpen(false);
          if (pendingCreateHref) {
            window.open(pendingCreateHref, "_blank", "noopener,noreferrer");
            setPendingCreateHref(null);
          }
        }}
      />
    </div>
  );
}
