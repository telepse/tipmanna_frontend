"use client";

import Link from "next/link";
import Image from "next/image";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";

// Third-party imports
import { useSelector } from "react-redux";
import {
  ExternalLink,
  Bookmark,
  Lock,
  Link2,
  MessageCircleMore,
  Share2,
  SquarePen,
  Tv,
  ChevronDown,
  CircleStar,
  CircleX,
  Copy,
  Check,
  UserRound,
  Rocket,
  Plus,
  Zap,
} from "lucide-react";
import { toast } from "react-toastify";
import { motion, useReducedMotion } from "framer-motion";

// Local imports
import type {
  HostCreatorCommunity,
  HostCreatorEvent,
  HostCreatorPublicProfile,
  HostCreatorVideo,
} from "@/actions/host-creator";
import type { HostPlaylistSummary } from "@/actions/host-playlist";
import type { TipLinkSummary } from "@/actions/tiplink";
import { TipLinkCreatePickerDialog } from "@/components/tiplink/tiplink-create-picker-dialog";
import { useTipLinkProfileCreate } from "@/hooks/use-tip-link-profile-create";
import {
  tipLinkListThumb,
  tipLinkThumbClassName,
} from "@/lib/tiplink-eligible-videos";
import {
  getCommunityAccessStateAction,
  type CommunityFeaturedVideo,
} from "@/actions/communities";
import { SaveHostToggleButton } from "@/components/events/save-host-toggle-button";
import { TipperEmailOtpSignInDialog } from "@/components/auth/tipper-email-otp-sign-in-dialog";
import { useHostSubscriptionPrompt } from "@/hooks/use-host-subscription-prompt";
import { useHostPlanCapabilities } from "@/hooks/useHostPlanCapabilities";
import {
  EditCreatorProfileDialog,
  type CreatorProfileSavedPayload,
} from "@/components/host/edit-creator-profile-dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { exploreCommunityJoinHref } from "@/lib/community-links";
import { CommunityPublicMembersRoster } from "@/components/community/community-public-members-roster";
import { extractYoutubeID } from "@/lib/extractYoutubeID";
import {
  buildCreatorProfileSharePath,
  buildCreatorProfileShareUrl,
} from "@/lib/creator-profile-url";
import { copyShareUrl } from "@/lib/copy-share-url";
import {
  HOST_SUBSCRIPTION_RESUME_CHANNEL_ID,
  HOST_SUBSCRIPTION_RESUME_EVENT_ID,
  HOST_SUBSCRIPTION_RESUME_QUERY,
  HOST_SUBSCRIPTION_RESUME_TITLE,
  parseResumeKindFromSearch,
  setHostSubscriptionResume,
  type HostSubscriptionResumeKind,
} from "@/lib/host-subscription-resume";
import { cn } from "@/lib/utils";
import { useHostSession } from "@/hooks/use-host-session";
import type { RootState } from "@/redux/store";
import { formatCreatorProfileCategoryLabel } from "@/schemas/creator.schema";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useOpenContentWithReturn } from "@/hooks/use-open-content-with-return";
import { peekPlaybackReturn } from "@/lib/playback-return-stack";
import { restoreProfileUiScroll } from "@/lib/playback-return-restore";
import { postCreatorProfileVisitAction } from "@/actions/host-creator";
import { JoinCommunityModal } from "@/components/community/join-community-modal";
import { CommunityMemberInfo } from "@/components/community/community-member-info";
import { AddCommunityBankVideoDialog } from "@/components/community/add-community-bank-video-dialog";
import { OVERLAY_Z_INDEX } from "@/lib/drawer-z-index";
import type { HostCreatorDefaultTab } from "@/schemas/creator.schema";
import { CompactEventCard } from "../events/compact-event-card";
import { CreatorEventCard } from "../events/creator-event-card";
import { useMediaQuery } from "react-responsive";
import { NotificationBadge } from "../notifications/notification-badge";
import SignInDialog, {
  type SignInModalPayload,
} from "@/components/auth/sign-in-dialog";
import { getAccountNavHref } from "@/lib/account-nav-href";
import {
  CreateDialog,
  type CreateDialogEntry,
} from "@/components/home/create-dialog";
import { ProfileDrawer } from "@/components/tv/profile-drawer";
import { StartCommunityRequestDialog } from "@/components/community/start-community-request-dialog";
import { useHostCapabilityWithAuth } from "@/hooks/use-host-capability-with-auth";
import {
  shouldOpenStartCommunityFromSearch,
  START_COMMUNITY_RESUME_QUERY,
} from "@/lib/start-community-resume";
import {
  resolveStartCommunityAfterGuestModal,
  START_COMMUNITY_CHECKING_HOST_LABEL,
} from "@/lib/start-community-guest-resume";
import { buildTipLinkManageHref } from "@/lib/tiplink-manage-navigation";
import { prefetchExploreFeedInitial } from "@/lib/explore-feed-prefetch-cache";
import {
  expressNavigateToCommunity,
  expressNavigateToDiscover,
  expressNavigateToExplore,
  expressNavigateToTv,
} from "@/lib/express-surface-navigation";
import { awaitProfileDrawerPrefetch } from "@/lib/drawer-prefetch-cache";
import { isCommunityAlreadyIn } from "@/lib/community-already-in";
import { syncCreatorProfileTabToUrl } from "@/lib/creator-profile-tab-url";
import { HostPlaylistCreateDialog } from "./host-playlist-create-dialog";

const PLACEHOLDER_AVATAR =
  "https://res.cloudinary.com/tipmanna/image/upload/v1786172267/user_sce6gw.png";

const DEFAULT_EVENT_BANNER =
  "https://res.cloudinary.com/tipmanna/image/upload/v1786171632/event_banner_hcqybl.webp";

const EVENT_TAB_SUBMISSION_KINDS = new Set(["event_only", "event_and_content"]);

const CO_OWNED_VIDEOS_SUBTAB_ID = "__co_owned_videos__";

const ADD_COMMUNITY_VIDEO_QUERY = "addCommunityVideo";
const ADD_COMMUNITY_VIDEO_ID_QUERY = "addCommunityVideoId";

const TABS = [
  { id: "all_videos", label: "" },
  { id: "channels", label: "Content" },
  { id: "events", label: "Event" },
  { id: "communities", label: "Community" },
  { id: "playlists", label: "List" },
] as const;

type Props = {
  profile: HostCreatorPublicProfile;
  className?: string;
  onVideoPlay?: () => void;
  variant?: "page" | "drawer";
};

export function HostCreatorPageClient({
  profile,
  className,
  onVideoPlay,
  variant = "page",
}: Props) {
  const isDrawer = variant === "drawer";
  const {
    host,
    stats,
    events,
    communities,
    playlists = [],
    tipLinks = [],
    coOwnedVideos = [],
    coOwnerPartyVideos = [],
    coOwnerPartyName = null,
  } = profile;
  const openContentWithReturn = useOpenContentWithReturn();

  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const user = useSelector((state: RootState) => state.auth.user);
  const hostSession = useHostSession();
  const isAuthenticated = useSelector(
    (state: RootState) => state.auth.isAuthenticated
  );

  const isOwnProfile =
    !isDrawer &&
    user != null &&
    (user.id === host.id ||
      user.username?.toLowerCase() === host.username.toLowerCase());

  const showBottomExpressNav =
    !isDrawer &&
    !isOwnProfile &&
    (!isAuthenticated || user?.role === "TIPPER" || user?.role === "VISITOR");

  const viewerCreatorProfileHref =
    isAuthenticated &&
    hostSession.isActive &&
    hostSession.username?.trim() &&
    !isOwnProfile
      ? buildCreatorProfileSharePath(hostSession.username)
      : null;

  const editProfileHref =
    isOwnProfile && hostSession.isActive && hostSession.eventSlug
      ? `/host/${hostSession.eventSlug}/profile`
      : host.eventSlug
        ? `/host/${host.eventSlug}/profile`
        : null;

  const eventTabEvents = useMemo(
    () =>
      events.filter(
        event =>
          event.submissionKind != null &&
          EVENT_TAB_SUBMISSION_KINDS.has(event.submissionKind)
      ),
    [events]
  );

  const defaultTab =
    (host.creatorDefaultTab as HostCreatorDefaultTab | undefined) ??
    "all_videos";
  const tabFromUrl = searchParams.get("tab");
  const initialTab =
    tabFromUrl && TABS.some(t => t.id === tabFromUrl) ? tabFromUrl : defaultTab;
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && TABS.some(t => t.id === tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  useEffect(() => {
    restoreProfileUiScroll(peekPlaybackReturn());
  }, []);

  useEffect(() => {
    const path = isDrawer
      ? `drawer:/@${host.username}`
      : `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}` ||
        `/creator/${host.username}`;
    void postCreatorProfileVisitAction(host.username, path);
  }, [host.username, isDrawer, pathname, searchParams]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    const nextHref = syncCreatorProfileTabToUrl({
      variant: isDrawer ? "drawer" : "page",
      pathname: pathname ?? "",
      currentQuery: searchParams.toString(),
      tab,
    });
    if (nextHref) {
      router.replace(nextHref, { scroll: false });
    }
  };

  const {
    pickerOpen: tipLinkPickerOpen,
    setPickerOpen: setTipLinkPickerOpen,
    eligibleEvents: tipLinkEligibleEvents,
    communityBankVideos: tipLinkCommunityBankVideos,
    creatingChannelId: tipLinkCreatingChannelId,
    draftTipLinks,
    openPicker: openTipLinkPicker,
    createDraftForVideo,
    createDraftForChannelVideo,
    HostAuthModal: TipLinkCreateHostAuthModal,
    SubscriptionPromptModal: TipLinkCreateSubscriptionModal,
  } = useTipLinkProfileCreate({
    events,
    communities,
    tipLinks,
    isOwnProfile,
    onDraftCreated: () => {
      handleTabChange("playlists");
    },
  });

  const playVideo = (video: HostCreatorVideo) => {
    if (video.locked) return;
    onVideoPlay?.();
    const returnPath = isDrawer
      ? pathname
      : `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
    openContentWithReturn({
      eventId: video.event.id,
      channelId: video.id,
      returnTo: returnPath,
      label: `Back to @${host.username}`,
      drawer: isDrawer
        ? { type: "creator", username: host.username }
        : undefined,
      profileUi: {
        tab: activeTab,
        scrollY: typeof window !== "undefined" ? window.scrollY : 0,
      },
    });
  };

  const [isCreatePopupOpen, setIsCreatePopupOpen] = useState(false);
  const [isProfileDrawerOpen, setIsProfileDrawerOpen] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  const [createDialogEntry, setCreateDialogEntry] =
    useState<CreateDialogEntry>("default");
  const [startCommunityOpen, setStartCommunityOpen] = useState(false);
  const [pendingStartCommunity, setPendingStartCommunity] = useState(false);
  const startCommunityResumeHandledRef = useRef(false);

  const userRole = useSelector((s: RootState) => s.auth.user?.role);
  const isSignedIn =
    useSelector((s: RootState) => s.auth.isAuthenticated) &&
    (userRole === "HOST" || userRole === "TIPPER");

  const startCommunityUpgradeReturnTo = useMemo(() => {
    const q = searchParams.toString();
    const base = q ? `${pathname}?${q}` : pathname;
    const url = new URL(base, "https://tipmanna.tv");
    url.searchParams.set(START_COMMUNITY_RESUME_QUERY, "1");
    return `${url.pathname}${url.search}`;
  }, [pathname, searchParams]);

  const {
    canWriteAsHost,
    capability,
    sessionLoading,
    requestHostAuth,
    HostAuthModal,
  } = useHostCapabilityWithAuth({
    requireHostAccount: true,
    hostUpgradeReturnToOverride: startCommunityUpgradeReturnTo,
  });

  const hostCapabilityLoading =
    capability.status === "loading" || sessionLoading;

  const accountHref = getAccountNavHref(user, isAuthenticated, {
    hostSessionActive: hostSession.isActive,
    hostEventSlug: hostSession.eventSlug,
    hostUsername: hostSession.username,
  });

  const openStartCommunityForm = useCallback(() => {
    setStartCommunityOpen(true);
  }, []);

  const resumeStartCommunityAfterAuth = useCallback(() => {
    if (canWriteAsHost) {
      openStartCommunityForm();
      return;
    }
    const outcome = requestHostAuth(openStartCommunityForm);
    if (outcome === "noop") {
      toast.error(
        "A host account is required. Add an email to your tipper profile or create a host account."
      );
    }
  }, [canWriteAsHost, openStartCommunityForm, requestHostAuth]);

  const openStartCommunityFlow = useCallback(() => {
    if (hostCapabilityLoading) return;
    if (!isAuthenticated || !user) {
      setPendingStartCommunity(true);
      setSignInOpen(true);
      return;
    }
    if (canWriteAsHost) {
      openStartCommunityForm();
      return;
    }
    const outcome = requestHostAuth(openStartCommunityForm);
    if (outcome === "noop") {
      toast.error(
        "A host account is required. Add an email to your tipper profile or create a host account."
      );
    }
  }, [
    canWriteAsHost,
    hostCapabilityLoading,
    isAuthenticated,
    openStartCommunityForm,
    requestHostAuth,
    user,
  ]);

  const openCreateDialog = (entry: CreateDialogEntry) => {
    setCreateDialogEntry(entry);
    setIsCreatePopupOpen(true);
  };

  const handleSignInSuccess = (payload: SignInModalPayload) => {
    setSignInOpen(false);

    const hostUsername =
      payload.username ??
      (user && "username" in user ? user.username : undefined);

    if (hostUsername && !pendingStartCommunity) {
      router.push(buildCreatorProfileSharePath(hostUsername));
    }

    if (pendingStartCommunity) {
      setPendingStartCommunity(false);
      if (resolveStartCommunityAfterGuestModal(payload.role) === "openForm") {
        openStartCommunityForm();
      } else {
        resumeStartCommunityAfterAuth();
      }
    }
  };

  const handleMyAccountClick = () => {
    if (isAuthenticated && user) {
      if (hostSession.isActive && viewerCreatorProfileHref) {
        router.push(viewerCreatorProfileHref);
        return;
      }
      router.push(accountHref);
      return;
    }
    setSignInOpen(true);
  };

  const [copied, setCopied] = useState(false);
  const [playlistDialogOpen, setPlaylistDialogOpen] = useState(false);
  const [pendingOpenPlaylist, setPendingOpenPlaylist] = useState(false);
  const [pendingTipLinkDraft, setPendingTipLinkDraft] = useState<{
    channelId: string;
    eventId: string;
    title: string;
  } | null>(null);
  const hostSubscriptionResumeClaimedRef = useRef<string | null>(null);
  const { hasActivePremium, isLoading: hostPlanLoading } =
    useHostPlanCapabilities();
  const {
    openForRequired: openPlaylistPlanRequired,
    SubscriptionPromptModal: PlaylistSubscriptionModal,
  } = useHostSubscriptionPrompt({ focusTier: "premium" });

  const creatorProfileReturnPath = useCallback(() => {
    if (typeof window === "undefined") {
      return buildCreatorProfileSharePath(host.username);
    }
    return `${window.location.pathname}${window.location.search}`;
  }, [host.username]);

  const tryOpenCreatePlaylist = useCallback(() => {
    if (!isOwnProfile) return;
    if (hasActivePremium) {
      setPlaylistDialogOpen(true);
      return;
    }
    setPendingOpenPlaylist(true);
    setHostSubscriptionResume({
      kind: "create-playlist",
      returnPath: creatorProfileReturnPath(),
    });
    openPlaylistPlanRequired("premium");
  }, [
    creatorProfileReturnPath,
    hasActivePremium,
    isOwnProfile,
    openPlaylistPlanRequired,
  ]);

  useEffect(() => {
    if (!pendingOpenPlaylist || !hasActivePremium) return;
    setPendingOpenPlaylist(false);
    setPlaylistDialogOpen(true);
  }, [hasActivePremium, pendingOpenPlaylist]);

  const replayTipLinkDraft = useCallback(
    (payload: { channelId: string; eventId: string; title: string }) => {
      const event = events.find(e => e.id === payload.eventId);
      createDraftForVideo({
        channelId: payload.channelId,
        eventId: payload.eventId,
        eventSlug: event?.eventSlug ?? null,
        title: payload.title,
        url: event?.videos.find(v => v.id === payload.channelId)?.url ?? "",
        thumb: null,
        source: "event_room",
      });
    },
    [createDraftForVideo, events]
  );

  useEffect(() => {
    if (!pendingTipLinkDraft || hostPlanLoading || !hasActivePremium) return;
    const payload = pendingTipLinkDraft;
    setPendingTipLinkDraft(null);
    replayTipLinkDraft(payload);
  }, [
    hasActivePremium,
    hostPlanLoading,
    pendingTipLinkDraft,
    replayTipLinkDraft,
  ]);

  useEffect(() => {
    if (
      !shouldOpenStartCommunityFromSearch(
        searchParams.get(START_COMMUNITY_RESUME_QUERY)
      )
    ) {
      startCommunityResumeHandledRef.current = false;
      return;
    }
    if (hostCapabilityLoading) return;
    if (startCommunityResumeHandledRef.current) return;
    startCommunityResumeHandledRef.current = true;

    const cleanParams = new URLSearchParams(searchParams.toString());
    cleanParams.delete(START_COMMUNITY_RESUME_QUERY);
    const cleanQ = cleanParams.toString();
    router.replace(cleanQ ? `${pathname}?${cleanQ}` : (pathname ?? ""), {
      scroll: false,
    });

    if (canWriteAsHost) {
      openStartCommunityForm();
    } else if (isAuthenticated && user) {
      resumeStartCommunityAfterAuth();
    }
  }, [
    canWriteAsHost,
    hostCapabilityLoading,
    isAuthenticated,
    openStartCommunityForm,
    pathname,
    resumeStartCommunityAfterAuth,
    router,
    searchParams,
    user,
  ]);

  const [profileSubscriptionResume, setProfileSubscriptionResume] =
    useState<HostSubscriptionResumeKind | null>(null);

  useEffect(() => {
    const kind = parseResumeKindFromSearch(
      searchParams.get(HOST_SUBSCRIPTION_RESUME_QUERY)
    );
    if (!kind || !isOwnProfile) return;

    if (
      kind === "return-path" &&
      searchParams.get(ADD_COMMUNITY_VIDEO_QUERY) === "1"
    ) {
      return;
    }

    const resumeChannelId = searchParams.get(
      HOST_SUBSCRIPTION_RESUME_CHANNEL_ID
    );
    const resumeEventId = searchParams.get(HOST_SUBSCRIPTION_RESUME_EVENT_ID);
    const resumeTitle = searchParams.get(HOST_SUBSCRIPTION_RESUME_TITLE);

    const claimKey = `${kind}:${resumeChannelId ?? ""}:${resumeEventId ?? ""}:${searchParams.toString()}`;
    if (hostSubscriptionResumeClaimedRef.current === claimKey) return;
    hostSubscriptionResumeClaimedRef.current = claimKey;

    const params = new URLSearchParams(searchParams.toString());
    params.delete(HOST_SUBSCRIPTION_RESUME_QUERY);
    params.delete(HOST_SUBSCRIPTION_RESUME_CHANNEL_ID);
    params.delete(HOST_SUBSCRIPTION_RESUME_EVENT_ID);
    params.delete(HOST_SUBSCRIPTION_RESUME_TITLE);
    const nextQuery = params.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : (pathname ?? ""), {
      scroll: false,
    });

    if (kind === "create-playlist") {
      if (hasActivePremium) {
        setPlaylistDialogOpen(true);
      } else {
        setPendingOpenPlaylist(true);
      }
      return;
    }

    if (kind === "create-tiplink-draft") {
      if (!resumeChannelId) return;
      const payload = {
        channelId: resumeChannelId,
        eventId: resumeEventId ?? "",
        title: resumeTitle ?? "link",
      };
      if (hostPlanLoading) {
        setPendingTipLinkDraft(payload);
        return;
      }
      if (hasActivePremium) {
        replayTipLinkDraft(payload);
      } else {
        setPendingTipLinkDraft(payload);
      }
      return;
    }

    setProfileSubscriptionResume(kind);
  }, [
    hasActivePremium,
    hostPlanLoading,
    isOwnProfile,
    pathname,
    replayTipLinkDraft,
    router,
    searchParams,
  ]);

  const hasVideosToDisplay = useMemo(() => {
    const allVideos = events.flatMap(event => event.videos);
    const hasPartyCoOwnerVideos = coOwnerPartyVideos.length > 0;
    const coOwnedSubtabVideos = hasPartyCoOwnerVideos
      ? coOwnerPartyVideos
      : coOwnedVideos;
    return allVideos.length > 0 || coOwnedSubtabVideos.length > 0;
  }, [coOwnedVideos, coOwnerPartyVideos, events]);

  const tryOpenTipLink = useCallback(() => {
    if (!hasVideosToDisplay) {
      toast.info("Add a video first");
      openCreateDialog("add-video");
      return;
    }
    openTipLinkPicker();
  }, [hasVideosToDisplay, openTipLinkPicker]);

  const copyLink = async () => {
    const shareUrl = buildCreatorProfileShareUrl(host.username);
    if (!shareUrl.trim()) {
      toast.error("Creator profile link is unavailable");
      return;
    }

    try {
      await copyShareUrl(shareUrl);
      setCopied(true);
      toast.success("Creator page link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy link");
    }
  };

  return (
    <div className={cn("flex flex-col", isDrawer ? "min-h-0" : "min-h-screen")}>
      {!isDrawer ? (
        <header className="sticky top-0 z-50 shrink-0 bg-white">
          <div className="mx-auto flex max-w-4xl items-center justify-between gap-2 px-4 py-2 sm:max-w-2xl md:max-w-4xl">
            <Link
              href="/explore"
              className="racing_sans_one justify-self-start text-xl sm:text-2xl"
            >
              <span className="text-primary">tip</span>manna
            </Link>

            {isOwnProfile && !isDrawer ? (
              <nav
                className="flex items-center gap-4 sm:gap-6"
                aria-label="Creator page navigation"
              >
                <button
                  type="button"
                  className="hover:text-primary flex flex-row items-center gap-0.5 gap-1.5"
                  onClick={() => expressNavigateToTv()}
                >
                  <Tv className="size-4 sm:size-5" />
                  <span className="text-xs">Watch TV</span>
                </button>
                <button
                  type="button"
                  className="hover:text-primary flex flex-row items-center gap-0.5 gap-1.5"
                  onClick={() => {
                    setIsCreatePopupOpen(false);
                    setIsProfileDrawerOpen(false);
                    expressNavigateToExplore();
                  }}
                >
                  <Rocket className="size-4 sm:size-5" />
                  <span className="text-xs">Explore</span>
                </button>
              </nav>
            ) : !isDrawer ? (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 px-1 py-0.5"
                  aria-label={
                    copied ? "Creator link copied" : "Copy creator profile link"
                  }
                  title={copied ? "Copied!" : "Copy creator profile link"}
                  onClick={() => void copyLink()}
                >
                  {copied ? (
                    <Check className="size-3.5" />
                  ) : (
                    <Copy className="size-3.5" />
                  )}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleMyAccountClick}
                >
                  My Account
                </Button>
              </div>
            ) : null}
          </div>
        </header>
      ) : null}

      <SignInDialog
        freezeTipperTab={true}
        open={signInOpen}
        onOpenChange={open => {
          setSignInOpen(open);
          if (!open) setPendingStartCommunity(false);
        }}
        title={
          pendingStartCommunity ? "Sign in to start a community" : "Sign in"
        }
        returnTo={pathname}
        defaultUserType="host"
        hostRequiredNotice={!pendingStartCommunity}
        allowInlineSignUp
        signupSurface="creator_profile"
        onSuccess={handleSignInSuccess}
      />

      {HostAuthModal}

      <CreateDialog
        openPopup={isCreatePopupOpen}
        setOpenPopup={open => {
          setIsCreatePopupOpen(open);
          if (!open) setCreateDialogEntry("default");
        }}
        entry={createDialogEntry}
      />

      <StartCommunityRequestDialog
        open={startCommunityOpen}
        onOpenChange={setStartCommunityOpen}
      />

      {!isDrawer ? (
        <ProfileDrawer
          isProfileDrawerOpen={isProfileDrawerOpen}
          setIsProfileDrawerOpen={setIsProfileDrawerOpen}
        />
      ) : null}

      <TipLinkCreatePickerDialog
        open={tipLinkPickerOpen}
        onOpenChange={setTipLinkPickerOpen}
        events={tipLinkEligibleEvents}
        communityVideos={tipLinkCommunityBankVideos}
        creatingChannelId={tipLinkCreatingChannelId}
        onSelect={createDraftForVideo}
      />
      {TipLinkCreateHostAuthModal}
      {TipLinkCreateSubscriptionModal}
      {PlaylistSubscriptionModal}

      <section className="relative z-[1000] flex-1 bg-white">
        <div
          className={cn(
            "relative mx-auto max-w-lg bg-white sm:max-w-2xl md:max-w-4xl",
            showBottomExpressNav && "pb-20",
            className ?? (isDrawer ? "min-h-0" : "min-h-screen")
          )}
        >
          <ProfileHeader
            host={host}
            stats={stats}
            isOwnProfile={isOwnProfile}
            editProfileHref={editProfileHref}
            subscriptionResume={profileSubscriptionResume}
            onSubscriptionResumeHandled={() =>
              setProfileSubscriptionResume(null)
            }
            creatorProfileReturnPath={creatorProfileReturnPath()}
          />

          {isDrawer ? (
            <div className="px-4 pt-2">
              <Link
                href={buildCreatorProfileSharePath(host.username)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary text-sm font-semibold hover:underline"
              >
                @{host.username.replace(/^@/, "")}
              </Link>
            </div>
          ) : null}

          <Tabs
            value={activeTab}
            onValueChange={handleTabChange}
            className="-mt-4 gap-0 px-2"
          >
            <div className="sticky top-11 z-10 border-b bg-white">
              <TabsList className="scrollbar-none h-auto w-full justify-start gap-0 overflow-x-auto rounded-none bg-transparent p-0">
                {TABS.map(tab => (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className={`${tab.id === "all_videos" ? "w-fit px-0!" : ""} data-[state=active]:bg-secondary/30 data-[state=active]:border-b-primary h-8! rounded-none border-r-2 border-t-gray-200 border-r-gray-200 border-l-gray-200 bg-white font-semibold data-[state=active]:border-b-2`}
                  >
                    {tab.label}{" "}
                    {tab.id === "all_videos" && (
                      <Zap className="size-3.5 sm:size-5" />
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <TabsContent value="all_videos">
              <AllVideosTabContent
                events={events}
                coOwnedVideos={coOwnedVideos}
                coOwnerPartyVideos={coOwnerPartyVideos}
                coOwnerPartyName={coOwnerPartyName}
                onPlay={playVideo}
                isOwnProfile={isOwnProfile}
                hostEventSlug={host.eventSlug}
                openTipLinkPicker={openTipLinkPicker}
                createDraftForChannelVideo={createDraftForChannelVideo}
                onAddVideo={() => openCreateDialog("add-video")}
              />
            </TabsContent>

            <TabsContent value="channels">
              <ChannelsTabContent
                events={events}
                onPlay={playVideo}
                isOwnProfile={isOwnProfile}
                onAddVideo={() => openCreateDialog("add-video")}
              />
            </TabsContent>

            <TabsContent value="events">
              <EventsTabContent
                events={eventTabEvents}
                hostFullName={host.fullName}
                isOwnProfile={isOwnProfile}
                onAddLiveEvent={() => openCreateDialog("event-room")}
              />
            </TabsContent>

            <TabsContent value="communities">
              <CommunitiesTabContent
                communities={communities}
                isOwnProfile={isOwnProfile}
                isDrawer={isDrawer}
                onStartCommunity={openStartCommunityFlow}
                startCommunityLoading={hostCapabilityLoading}
              />
            </TabsContent>

            <TabsContent value="playlists">
              <PlaylistsTabContent
                playlists={playlists}
                tipLinks={tipLinks}
                isOwnProfile={isOwnProfile}
                hostEventSlug={host.eventSlug}
                events={events}
                draftTipLinks={draftTipLinks}
                onTryOpenTipLink={tryOpenTipLink}
                onCreatePlaylist={tryOpenCreatePlaylist}
              />

              <HostPlaylistCreateDialog
                open={playlistDialogOpen}
                onOpenChange={setPlaylistDialogOpen}
              />
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {showBottomExpressNav ? (
        <div className="fixed right-0 bottom-0 left-0 z-[1100] border-t border-black/20 bg-white px-4 py-1 pb-[max(0.25rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
            <button
              type="button"
              className="group flex flex-col items-center justify-center gap-1"
              onClick={() => expressNavigateToTv()}
            >
              <Tv className="group-hover:text-primary size-5 group-hover:stroke-2" />
              <span className="text-[8px]">Watch TV</span>
            </button>

            <button
              type="button"
              className="flex cursor-pointer flex-col items-center justify-center gap-1"
              onPointerEnter={prefetchExploreFeedInitial}
              onClick={() => {
                setIsCreatePopupOpen(false);
                setIsProfileDrawerOpen(false);
                expressNavigateToExplore();
              }}
            >
              <Rocket
                className="size-5"
                strokeWidth={2}
              />
              <span className="text-[8px]">Explore</span>
            </button>

            <div className="flex flex-col items-center justify-center">
              <button
                type="button"
                className="cursor-pointer rounded-full bg-black/20 p-[3px]"
                onClick={() => {
                  openCreateDialog("default");
                  setIsProfileDrawerOpen(false);
                }}
              >
                <Plus
                  className={`size-5 ${isCreatePopupOpen ? "text-primary" : ""}`}
                  strokeWidth={isCreatePopupOpen ? 3.75 : 2}
                />
              </button>
              <span className="text-[8px]">Create</span>
            </div>

            <button
              type="button"
              className="mt-[5px] flex cursor-pointer flex-col items-center"
              onPointerDown={() => {
                void awaitProfileDrawerPrefetch();
              }}
              onClick={() => {
                setIsCreatePopupOpen(false);
                setIsProfileDrawerOpen(true);
              }}
            >
              <span className="relative inline-flex">
                <UserRound
                  className={`size-5 ${isProfileDrawerOpen ? "text-primary" : ""}`}
                  strokeWidth={isProfileDrawerOpen ? 3.75 : 2}
                />
                <NotificationBadge
                  variant="dot"
                  className="-top-1 -right-1"
                />
              </span>
              <span className="max-w-[4.5rem] truncate text-[8px] text-black">
                {isSignedIn
                  ? "Signed in"
                  : userRole === "VISITOR"
                    ? "Guest"
                    : "Not signed in"}
              </span>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ProfileHeader({
  host,
  stats,
  isOwnProfile,
  editProfileHref,
  subscriptionResume,
  onSubscriptionResumeHandled,
  creatorProfileReturnPath,
}: {
  host: HostCreatorPublicProfile["host"];
  stats: HostCreatorPublicProfile["stats"];
  isOwnProfile: boolean;
  editProfileHref: string | null;
  subscriptionResume: HostSubscriptionResumeKind | null;
  onSubscriptionResumeHandled: () => void;
  creatorProfileReturnPath: string;
}) {
  const router = useRouter();
  const { requestHostAuth, HostAuthModal } = useHostCapabilityWithAuth();
  const [showSecondaryStats, setShowSecondaryStats] = useState(false);
  const [openCreatorDialog, setOpenCreatorDialog] = useState(false);
  const [displayUsername, setDisplayUsername] = useState(host.username);
  const [profileImageUrl, setProfileImageUrl] = useState(host.profileImageUrl);
  const [pageDescription, setPageDescription] = useState(host.pageDescription);
  const [externalLink, setExternalLink] = useState(host.externalLink);
  const [profileCategory, setProfileCategory] = useState(host.profileCategory);

  useEffect(() => {
    if (subscriptionResume) {
      setOpenCreatorDialog(true);
    }
  }, [subscriptionResume]);

  useEffect(() => {
    setDisplayUsername(host.username);
    setProfileImageUrl(host.profileImageUrl);
    setPageDescription(host.pageDescription);
    setExternalLink(host.externalLink);
    setProfileCategory(host.profileCategory);
  }, [
    host.username,
    host.profileImageUrl,
    host.pageDescription,
    host.externalLink,
    host.profileCategory,
  ]);

  const handleProfileSaved = (payload: CreatorProfileSavedPayload) => {
    setProfileImageUrl(payload.profileImageUrl);
    setPageDescription(payload.pageDescription);
    setExternalLink(payload.externalLink);
    setProfileCategory(payload.profileCategory);

    const nextUsername = payload.username.trim();
    const previousUsername = displayUsername.trim();
    setDisplayUsername(nextUsername);

    if (
      nextUsername &&
      previousUsername &&
      nextUsername.toLowerCase() !== previousUsername.toLowerCase()
    ) {
      router.replace(buildCreatorProfileSharePath(nextUsername));
    }
  };

  const [copied, setCopied] = useState(false);
  const [saveHostSignInOpen, setSaveHostSignInOpen] = useState(false);
  const [saveHostSignInToken, setSaveHostSignInToken] = useState(0);
  const saveHostSignInPath =
    typeof window !== "undefined"
      ? `${window.location.pathname}${window.location.search}`
      : buildCreatorProfileSharePath(host.username);

  const copyLink = async () => {
    const shareUrl = buildCreatorProfileShareUrl(displayUsername);
    if (!shareUrl.trim()) {
      toast.error("Creator profile link is unavailable");
      return;
    }

    try {
      await copyShareUrl(shareUrl);
      setCopied(true);
      toast.success("Creator page link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy link");
    }
  };

  return (
    <section className="section relative overflow-hidden pt-2! sm:pt-6">
      <Image
        src="/patterns/bg_pattern.webp"
        alt=""
        fill
        sizes="100vw"
        className="pointer-events-none z-0 object-cover object-center"
        aria-hidden
      />

      <EditCreatorProfileDialog
        open={openCreatorDialog}
        onOpenChange={setOpenCreatorDialog}
        initialAvatarUrl={profileImageUrl}
        onSaved={handleProfileSaved}
        onClose={() => setOpenCreatorDialog(false)}
        subscriptionResume={subscriptionResume}
        onSubscriptionResumeHandled={onSubscriptionResumeHandled}
        creatorProfileReturnPath={creatorProfileReturnPath}
      />

      {HostAuthModal}

      <div className="relative z-10 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <div className="relative size-24 shrink-0 overflow-hidden rounded-full sm:size-28">
          <img
            src={profileImageUrl ?? PLACEHOLDER_AVATAR}
            alt={host.fullName || "Creator avatar"}
            className="z-50 size-full border border-gray-200 object-cover"
          />
        </div>

        <div className="min-w-0 flex-1 space-y-2 text-center sm:text-left">
          <div className="flex flex-col items-center gap-1 sm:flex-row sm:gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold">
                {host.fullName.split(" ")[0]} {!host.fullName && <i>Creator</i>}
              </span>
              {host.creatorPayoutVerifiedAt ? (
                <div
                  className="bg-moonstone-blue flex items-center gap-1 rounded-md px-2 py-0.5"
                  title="Verified creator"
                >
                  <CircleStar className="size-3.5 text-black" />
                  <span className="text-[10px] font-medium text-black sm:text-xs">
                    Verified
                  </span>
                </div>
              ) : null}
              {!isOwnProfile ? (
                <SaveHostToggleButton
                  hostId={host.id}
                  className="cursor-pointer rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-black/90"
                  iconClassName="size-4"
                  onRequireSignIn={() => setSaveHostSignInOpen(true)}
                  signInCompletedToken={saveHostSignInToken}
                />
              ) : null}

              <button
                type="button"
                className="cursor-pointer"
                onClick={() => setShowSecondaryStats(!showSecondaryStats)}
              >
                {showSecondaryStats ? <CircleX /> : <ChevronDown />}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm font-semibold">
                @{displayUsername}
              </span>

              <span className="rounded-md bg-gray-200 px-2 py-1 text-sm">
                {formatCreatorProfileCategoryLabel(profileCategory)}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-4 sm:justify-start">
            <TikTokStat
              value={stats.totalVideos}
              label="videos"
            />
            <TikTokStat
              value={stats.totalEncounters}
              label="seen"
            />
            <TikTokStat
              value={`${stats.totalTipCount}`}
              label="no. of tips"
            />
            <TikTokStat
              value={stats.totalSubscribers}
              label="subscribers"
            />
          </div>

          <div className="text-muted-foreground -mt-4 py-4 text-center text-sm leading-relaxed sm:text-left">
            {pageDescription ? (
              <p className="line-clamp-3">{pageDescription}</p>
            ) : isOwnProfile ? (
              <p className="italic">
                Add a page description to tell followers what your page is
                about.
              </p>
            ) : (
              <p className="italic">
                {host.fullName} has not added a page description yet.
              </p>
            )}
          </div>

          {showSecondaryStats ? <SecondaryStats stats={stats} /> : null}

          <div
            className={cn(
              "relative z-20",
              showSecondaryStats
                ? ""
                : "-mt-4 flex items-center justify-center gap-2 sm:justify-start"
            )}
          >
            {externalLink?.url && externalLink.url !== "#" ? (
              <a
                href={externalLink.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary inline-flex items-center gap-1 text-sm font-medium underline-offset-4 hover:underline"
              >
                <ExternalLink className="size-4 shrink-0" />
                {externalLink.label}
              </a>
            ) : externalLink?.label ? (
              <p className="text-muted-foreground inline-flex items-center gap-1 text-sm">
                <ExternalLink className="size-4 shrink-0" />
                {externalLink.label}
              </p>
            ) : null}

            {isOwnProfile && editProfileHref ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-fit px-1! py-0.5! text-xs"
                onClick={() =>
                  requestHostAuth(() => setOpenCreatorDialog(true))
                }
              >
                <SquarePen className="size-3.5" />
                Edit
              </Button>
            ) : null}
            {isOwnProfile ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 px-1 py-0.5"
                aria-label={
                  copied ? "Creator link copied" : "Copy creator profile link"
                }
                title={copied ? "Copied!" : "Copy creator profile link"}
                onClick={() => void copyLink()}
              >
                {copied ? (
                  <Check className="size-3.5" />
                ) : (
                  <Copy className="size-3.5" />
                )}
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <TipperEmailOtpSignInDialog
        open={saveHostSignInOpen}
        onOpenChange={setSaveHostSignInOpen}
        signInTitle="Sign in to save this host"
        signupSurface="creator_profile"
        getRedirectPathAfterVerify={() => saveHostSignInPath}
        onVerified={() => {
          setSaveHostSignInToken(t => t + 1);
        }}
      />
    </section>
  );
}

function TikTokStat({
  value,
  label,
}: {
  value: string | number;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center text-center sm:flex-row sm:gap-1 sm:text-left">
      <p className="font-semibold">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      <p className="text-muted-foreground text-xs font-medium sm:text-sm">
        {label}
      </p>
    </div>
  );
}

function SecondaryStats({
  stats,
}: {
  stats: HostCreatorPublicProfile["stats"];
}) {
  const items = [
    { label: "saves", value: stats.totalSaves, icon: Bookmark },
    { label: "shares", value: stats.totalShares, icon: Share2 },
    { label: "TV features", value: stats.totalTvFeatures, icon: Tv },
    {
      label: "comments",
      value: stats.totalComments,
      icon: MessageCircleMore,
    },
  ];

  return (
    <section className="-mt-4 flex items-center justify-center gap-4 sm:justify-start">
      {items.map(item => (
        <div
          key={item.label}
          className="flex flex-wrap items-center gap-1 text-center sm:text-left"
        >
          <item.icon className="text-muted-foreground size-4 shrink-0" />
          <p className="text-xs font-semibold">{item.value.toLocaleString()}</p>
          <p className="text-muted-foreground text-[10px]">{item.label}</p>
        </div>
      ))}
    </section>
  );
}

/** All videos tab */
function AllVideosTabContent({
  events,
  coOwnedVideos,
  coOwnerPartyVideos,
  coOwnerPartyName,
  onPlay,
  isOwnProfile,
  hostEventSlug,
  openTipLinkPicker,
  onAddVideo,
  createDraftForChannelVideo,
}: {
  events: HostCreatorEvent[];
  coOwnedVideos: HostCreatorVideo[];
  coOwnerPartyVideos: HostCreatorVideo[];
  coOwnerPartyName: string | null;
  onPlay: (video: HostCreatorVideo) => void;
  isOwnProfile: boolean;
  hostEventSlug: string | null;
  openTipLinkPicker: () => void;
  createDraftForChannelVideo: (
    eventId: string,
    channelId: string,
    title: string
  ) => void;
  onAddVideo: () => void;
}) {
  const allVideos = useMemo(
    () => events.flatMap(event => event.videos),
    [events]
  );

  /**
   * Party co-owner videos: approved submissions this creator was invited to.
   * Kept separate from own-event `coOwnedVideos` and never merged into All.
   */
  const hasPartyCoOwnerVideos = coOwnerPartyVideos.length > 0;
  const trimmedCoOwnerInviteName = coOwnerPartyName?.trim() ?? "";

  const coOwnedSubtabVideos = hasPartyCoOwnerVideos
    ? coOwnerPartyVideos
    : coOwnedVideos;

  const coOwnedSubtabLabel = trimmedCoOwnerInviteName
    ? `${trimmedCoOwnerInviteName} co-owner videos`
    : "Co-owned videos";

  const showCoOwnedSubtab = coOwnedSubtabVideos.length > 0;

  const [activeVideosSubtab, setActiveVideosSubtab] = useState<
    "all" | typeof CO_OWNED_VIDEOS_SUBTAB_ID
  >("all");

  useEffect(() => {
    if (allVideos.length === 0 && hasPartyCoOwnerVideos) {
      setActiveVideosSubtab(CO_OWNED_VIDEOS_SUBTAB_ID);
    }
  }, [allVideos.length, hasPartyCoOwnerVideos]);

  /**
   * Don't hide the co-owned subtab simply because the creator
   * has no regular channel videos.
   */
  const hasVideosToDisplay =
    allVideos.length > 0 || coOwnedSubtabVideos.length > 0;

  const tryOpenTipLink = () => {
    if (!hasVideosToDisplay) {
      toast.info("Add a video first");
      onAddVideo();
      return;
    }
    openTipLinkPicker();
  };

  return (
    <div>
      {isOwnProfile ? (
        <div className="flex items-center justify-end gap-2 px-2 pt-2">
          <button
            type="button"
            onClick={tryOpenTipLink}
            className="border-primary/30 text-primary inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold"
          >
            <Plus className="size-3.5" />
            Create TipLink
          </button>
        </div>
      ) : null}

      <CreatorSubtabBar stickyClassName="top-[5.75rem]">
        <CreatorSubtabButton
          subtabId="all"
          active={activeVideosSubtab === "all"}
          onClick={() => setActiveVideosSubtab("all")}
        >
          All
        </CreatorSubtabButton>

        {showCoOwnedSubtab ? (
          <CreatorSubtabButton
            subtabId={CO_OWNED_VIDEOS_SUBTAB_ID}
            active={activeVideosSubtab === CO_OWNED_VIDEOS_SUBTAB_ID}
            onClick={() => setActiveVideosSubtab(CO_OWNED_VIDEOS_SUBTAB_ID)}
            subtabLabel={coOwnedSubtabLabel}
          >
            {coOwnedSubtabLabel}
          </CreatorSubtabButton>
        ) : null}

        {isOwnProfile ? (
          <CreatorSubtabButton
            subtabId="add-content"
            active={false}
            onClick={onAddVideo}
          >
            Add content
          </CreatorSubtabButton>
        ) : null}
      </CreatorSubtabBar>

      {!hasVideosToDisplay ? (
        isOwnProfile ? (
          <EmptyTabMessage
            title="Turn content into support."
            message="Add a video or create a TipLink."
            ctas={[
              {
                label: "Add content",
                onClick: () => onAddVideo(),
              },
              {
                label: "Create tiplink",
                onClick: () => tryOpenTipLink(),
              },
            ]}
          />
        ) : (
          <EmptyTabMessage
            title=""
            message={
              <>
                Nothing here yet. <br className="sm:hidden" /> Discover what&apos;s
                happening on Tipmanna
              </>
            }
            ctas={[
              {
                icon: <Rocket className="size-3.5" />,
                label: "Explore Tipmanna",
                onClick: () => expressNavigateToExplore(),
              },
            ]}
          />
        )
      ) : (
        <>
          {activeVideosSubtab === CO_OWNED_VIDEOS_SUBTAB_ID ? (
            coOwnedSubtabVideos.length === 0 ? (
              <p className="text-muted-foreground px-4 py-8 text-center text-sm">
                No co-owned videos yet.
              </p>
            ) : (
              <VideoCardGrid
                videos={coOwnedSubtabVideos}
                onPlay={onPlay}
              />
            )
          ) : allVideos.length === 0 ? (
            <EmptyTabMessage
              title={
                isOwnProfile
                  ? "Turn content into support."
                  : "Add a video or create a TipLink."
              }
              message={
                isOwnProfile ? (
                  <>
                    Add your first video and <br className="sm:hidden" /> start
                    building your presence on Tipmanna
                  </>
                ) : (
                  <>
                    Nothing here yet. <br className="sm:hidden" /> Discover
                    what’s happening on Tipmanna
                  </>
                )
              }
              ctas={
                !isOwnProfile
                  ? [
                      {
                        icon: <Rocket className="size-3.5" />,
                        label: "Explore Tipmanna",
                        onClick: () => expressNavigateToExplore(),
                      },
                    ]
                  : undefined
              }
            />
          ) : (
            <VideoCardGrid
              videos={allVideos}
              onPlay={onPlay}
              onTipLinkManage={
                isOwnProfile && hostEventSlug
                  ? video =>
                      createDraftForChannelVideo(
                        video.event.id,
                        video.id,
                        video.title
                      )
                  : undefined
              }
            />
          )}
        </>
      )}
    </div>
  );
}

/** Channels tab: co-owned videos first, then sub-tabs per event channel. */
function ChannelsTabContent({
  events,
  onPlay,
  isOwnProfile,
  onAddVideo,
}: {
  events: HostCreatorEvent[];
  onPlay: (video: HostCreatorVideo) => void;
  isOwnProfile: boolean;
  onAddVideo: () => void;
}) {
  const sortedEvents = useMemo(
    () =>
      [...events].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [events]
  );

  const subtabItems = useMemo(
    () => sortedEvents.map(event => ({ id: event.id })),
    [sortedEvents]
  );

  const {
    activeId: activeChannelId,
    selectById,
    subtabScrollRef,
  } = useSubtabScrollSync(subtabItems);

  const activeChannel = sortedEvents.find(
    event => event.id === activeChannelId
  );

  if (sortedEvents.length === 0 && !isOwnProfile) {
    return (
      <EmptyTabMessage
        message={
          <>
            No content here yet. <br className="sm:hidden" /> Discover creators
            and videos on Tipmanna
          </>
        }
        ctas={
          !isOwnProfile
            ? [
                {
                  icon: <Rocket className="size-3.5" />,
                  label: "Explore Tipmanna",
                  onClick: () => expressNavigateToExplore(),
                },
              ]
            : undefined
        }
      />
    );
  }

  return (
    <div>
      <CreatorSubtabBar
        stickyClassName="top-[5.75rem] left-0"
        subtabScrollRef={subtabScrollRef}
        action={
          isOwnProfile ? { label: "+ Add video", onClick: onAddVideo } : null
        }
      >
        {sortedEvents.map(event => (
          <CreatorSubtabButton
            key={event.id}
            subtabId={event.id}
            active={activeChannelId === event.id}
            onClick={() => selectById(event.id)}
          >
            {event.eventName}
          </CreatorSubtabButton>
        ))}
      </CreatorSubtabBar>

      {activeChannel ? (
        activeChannel.videos.length === 0 ? (
          <p className="text-muted-foreground px-4 py-8 text-center text-sm">
            No videos in this channel.
          </p>
        ) : (
          <VideoCardGrid
            videos={activeChannel.videos}
            onPlay={onPlay}
            forceLocked={activeChannel.locked}
          />
        )
      ) : isOwnProfile ? (
        <EmptyTabMessage
          title="Your creator profile starts here."
          message="Add your first video and start building your presence on Tipmanna."
          ctas={[
            {
              label: "Add your first video",
              onClick: () => onAddVideo(),
            },
          ]}
        />
      ) : null}
    </div>
  );
}

function EventsTabContent({
  events,
  hostFullName,
  isOwnProfile,
  onAddLiveEvent,
}: {
  events: HostCreatorEvent[];
  hostFullName: string;
  isOwnProfile: boolean;
  onAddLiveEvent: () => void;
}) {
  const { activeId, selectById, carouselRef, subtabScrollRef } =
    useSnapCarouselSync(events);

  const activeEvent = events.find(event => event.id === activeId);

  if (events.length === 0 && !isOwnProfile) {
    return (
      <EmptyTabMessage
        message={
          <>
            No events here yet. <br className="sm:hidden" /> Find something
            happening live.
          </>
        }
        ctas={
          !isOwnProfile
            ? [
                {
                  icon: <Rocket className="size-3.5" />,
                  label: "Discover Events",
                  onClick: () => expressNavigateToDiscover(),
                },
              ]
            : undefined
        }
      />
    );
  }

  return (
    <div>
      <CreatorSubtabBar
        stickyClassName="top-[5.75rem]"
        subtabScrollRef={subtabScrollRef}
        action={
          isOwnProfile
            ? { label: "+ Create an event", onClick: onAddLiveEvent }
            : null
        }
      >
        {events.map(event => (
          <CreatorSubtabButton
            key={event.id}
            subtabId={event.id}
            active={activeId === event.id}
            onClick={() => selectById(event.id)}
          >
            {event.eventName}
          </CreatorSubtabButton>
        ))}
      </CreatorSubtabBar>

      {events.length > 0 ? (
        <>
          <MobileSnapCarousel carouselRef={carouselRef}>
            {events.map(event => (
              <SnapCarouselSlide
                key={event.id}
                slideId={event.id}
              >
                <EventBannerSection
                  event={event}
                  hostFullName={hostFullName}
                  compact
                />
              </SnapCarouselSlide>
            ))}
          </MobileSnapCarousel>

          <div className="hidden px-1 pt-2 lg:block">
            {activeEvent ? (
              <EventBannerSection
                event={activeEvent}
                hostFullName={hostFullName}
              />
            ) : null}
          </div>
        </>
      ) : isOwnProfile ? (
        <EmptyTabMessage
          title={
            <>
              Reach more people <br className="sm:hidden" /> with your event.
            </>
          }
          message={
            <>
              Create an Event Room to stream live and{" "}
              <br className="sm:hidden" /> let people join and support from
              anywhere
            </>
          }
          ctas={[
            {
              label: "Create an event",
              onClick: () => onAddLiveEvent(),
            },
          ]}
        />
      ) : null}
    </div>
  );
}

function CommunitiesTabContent({
  communities,
  isOwnProfile,
  isDrawer = false,
  onStartCommunity,
  startCommunityLoading = false,
}: {
  communities: HostCreatorCommunity[];
  isOwnProfile: boolean;
  isDrawer?: boolean;
  onStartCommunity: () => void;
  startCommunityLoading?: boolean;
}) {
  const startCommunityLabel = startCommunityLoading
    ? START_COMMUNITY_CHECKING_HOST_LABEL
    : "Start your community";
  const startCommunityBarLabel = startCommunityLoading
    ? START_COMMUNITY_CHECKING_HOST_LABEL
    : "+ Start your community";
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const {
    status: hostPlanStatus,
    hostSubscriptionTier,
    isLoading: hostPlanLoading,
  } = useHostPlanCapabilities();
  const communityPlanActive =
    hostSubscriptionTier === "HOST_COMMUNITY" && hostPlanStatus === "active";
  const [resumeAddVideoId, setResumeAddVideoId] = useState<string | null>(null);
  const addCommunityVideoResumeHandledRef = useRef(false);

  const { activeId, selectById, carouselRef, subtabScrollRef } =
    useSnapCarouselSync(communities);

  const activeCommunity = communities.find(
    community => community.id === activeId
  );

  const buildAddCommunityVideoReturnPath = useCallback(
    (communityId: string) => {
      const q = searchParams.toString();
      const base = q ? `${pathname}?${q}` : (pathname ?? "");
      const url = new URL(base, "https://tipmanna.tv");
      url.searchParams.set(ADD_COMMUNITY_VIDEO_QUERY, "1");
      url.searchParams.set(ADD_COMMUNITY_VIDEO_ID_QUERY, communityId);
      return `${url.pathname}${url.search}`;
    },
    [pathname, searchParams]
  );

  const onAddCommunityVideoSubscribeRequired = useCallback(
    (communityId: string) => {
      setHostSubscriptionResume({
        kind: "return-path",
        returnPath: buildAddCommunityVideoReturnPath(communityId),
      });
    },
    [buildAddCommunityVideoReturnPath]
  );

  const onAddVideoResumeOpened = useCallback(() => {
    setResumeAddVideoId(null);
  }, []);

  useEffect(() => {
    if (!isOwnProfile || isDrawer) return;
    if (searchParams.get(ADD_COMMUNITY_VIDEO_QUERY) !== "1") return;
    const targetId = searchParams.get(ADD_COMMUNITY_VIDEO_ID_QUERY)?.trim();
    if (!targetId) return;
    if (hostPlanLoading) return;
    if (addCommunityVideoResumeHandledRef.current) return;
    addCommunityVideoResumeHandledRef.current = true;

    selectById(targetId);

    const params = new URLSearchParams(searchParams.toString());
    params.delete(ADD_COMMUNITY_VIDEO_QUERY);
    params.delete(ADD_COMMUNITY_VIDEO_ID_QUERY);
    params.delete(HOST_SUBSCRIPTION_RESUME_QUERY);
    params.delete(HOST_SUBSCRIPTION_RESUME_CHANNEL_ID);
    params.delete(HOST_SUBSCRIPTION_RESUME_EVENT_ID);
    params.delete(HOST_SUBSCRIPTION_RESUME_TITLE);
    const nextQuery = params.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : (pathname ?? ""), {
      scroll: false,
    });

    if (communityPlanActive) {
      setResumeAddVideoId(targetId);
    }
  }, [
    communityPlanActive,
    hostPlanLoading,
    isDrawer,
    isOwnProfile,
    pathname,
    router,
    searchParams,
    selectById,
  ]);

  if (communities.length === 0 && !isOwnProfile) {
    return (
      <EmptyTabMessage
        message={
          <>
            No community here yet. <br className="sm:hidden" /> Find communities
            to join and belong to.
          </>
        }
        ctas={
          !isOwnProfile
            ? [
                {
                  icon: <Rocket className="size-3.5" />,
                  label: "Explore Communities",
                  onClick: () => expressNavigateToCommunity(),
                },
              ]
            : undefined
        }
      />
    );
  }

  return (
    <div>
      <CreatorSubtabBar
        stickyClassName="top-[5.75rem]"
        subtabScrollRef={subtabScrollRef}
        action={
          isOwnProfile && communities.length === 0
            ? {
                label: startCommunityBarLabel,
                onClick: onStartCommunity,
                disabled: startCommunityLoading,
              }
            : null
        }
      >
        {communities.map(community => (
          <CreatorSubtabButton
            key={community.id}
            subtabId={community.id}
            active={activeId === community.id}
            onClick={() => selectById(community.id)}
          >
            {community.name}
          </CreatorSubtabButton>
        ))}
      </CreatorSubtabBar>

      {communities.length > 0 ? (
        <>
          <MobileSnapCarousel carouselRef={carouselRef}>
            {communities.map(community => (
              <SnapCarouselSlide
                key={community.id}
                slideId={community.id}
              >
                <CommunityBannerSection
                  community={community}
                  isOwnProfile={isOwnProfile}
                  isDrawer={isDrawer}
                  compact
                  onAddCommunityVideoSubscribeRequired={
                    onAddCommunityVideoSubscribeRequired
                  }
                />
              </SnapCarouselSlide>
            ))}
          </MobileSnapCarousel>

          <div className="hidden px-1 pt-2 lg:block">
            {activeCommunity ? (
              <CommunityBannerSection
                community={activeCommunity}
                isOwnProfile={isOwnProfile}
                isDrawer={isDrawer}
                openAddVideoOnResume={activeCommunity.id === resumeAddVideoId}
                onAddCommunityVideoSubscribeRequired={
                  onAddCommunityVideoSubscribeRequired
                }
                onAddVideoResumeOpened={onAddVideoResumeOpened}
              />
            ) : null}
          </div>
        </>
      ) : isOwnProfile ? (
        <EmptyTabMessage
          title={
            <>
              Turn your audience <br className="sm:hidden" /> into a community.
            </>
          }
          message={
            <>
              Create a space where your people can <br className="sm:hidden" />{" "}
              join, engage and belong.
            </>
          }
          ctas={[
            {
              label: startCommunityLabel,
              onClick: () => onStartCommunity(),
              disabled: startCommunityLoading,
            },
          ]}
        />
      ) : null}
    </div>
  );
}

function useSubtabScrollSync<T extends { id: string }>(items: T[]) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const subtabScrollRef = useRef<HTMLDivElement>(null);
  const isProgrammaticSubtabScrollRef = useRef(false);
  const programmaticSubtabTimerRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);

  const activeId = selectedId ?? items[0]?.id ?? null;

  const markProgrammaticSubtabScroll = useCallback((duration = 450) => {
    isProgrammaticSubtabScrollRef.current = true;
    if (programmaticSubtabTimerRef.current) {
      clearTimeout(programmaticSubtabTimerRef.current);
    }
    programmaticSubtabTimerRef.current = setTimeout(() => {
      isProgrammaticSubtabScrollRef.current = false;
    }, duration);
  }, []);

  const scrollSubtabIntoView = useCallback(
    (id: string, behavior: ScrollBehavior = "smooth") => {
      const container = subtabScrollRef.current;
      if (!container) return;

      const subtabBtn = container.querySelector<HTMLElement>(
        `[data-subtab-id="${CSS.escape(id)}"]`
      );
      if (!subtabBtn) return;

      markProgrammaticSubtabScroll(behavior === "smooth" ? 450 : 80);
      scrollWithinContainerHorizontally(container, subtabBtn, behavior);
    },
    [markProgrammaticSubtabScroll]
  );

  const selectById = useCallback(
    (id: string) => {
      setSelectedId(id);
      scrollSubtabIntoView(id);
    },
    [scrollSubtabIntoView]
  );

  useEffect(() => {
    const container = subtabScrollRef.current;
    if (!container || items.length === 0) return;

    let raf = 0;
    const onScroll = () => {
      if (isProgrammaticSubtabScrollRef.current) return;

      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const id = getFocusedItemId(
          container,
          "[data-subtab-id]",
          "data-subtab-id"
        );
        if (!id) return;

        setSelectedId(prev => {
          const current = prev ?? items[0]?.id ?? null;
          if (current === id) return prev;
          return id;
        });
      });
    };

    container.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [items]);

  useEffect(
    () => () => {
      if (programmaticSubtabTimerRef.current) {
        clearTimeout(programmaticSubtabTimerRef.current);
      }
    },
    []
  );

  return { activeId, selectById, subtabScrollRef };
}

function useSnapCarouselSync<T extends { id: string }>(items: T[]) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const subtabScrollRef = useRef<HTMLDivElement>(null);
  const isProgrammaticScrollRef = useRef(false);
  const isProgrammaticSubtabScrollRef = useRef(false);
  const programmaticTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const programmaticSubtabTimerRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);

  const activeId = selectedId ?? items[0]?.id ?? null;

  const markProgrammaticScroll = useCallback((duration = 450) => {
    isProgrammaticScrollRef.current = true;
    if (programmaticTimerRef.current) {
      clearTimeout(programmaticTimerRef.current);
    }
    programmaticTimerRef.current = setTimeout(() => {
      isProgrammaticScrollRef.current = false;
    }, duration);
  }, []);

  const markProgrammaticSubtabScroll = useCallback((duration = 450) => {
    isProgrammaticSubtabScrollRef.current = true;
    if (programmaticSubtabTimerRef.current) {
      clearTimeout(programmaticSubtabTimerRef.current);
    }
    programmaticSubtabTimerRef.current = setTimeout(() => {
      isProgrammaticSubtabScrollRef.current = false;
    }, duration);
  }, []);

  const scrollSubtabIntoView = useCallback(
    (id: string, behavior: ScrollBehavior = "smooth") => {
      const container = subtabScrollRef.current;
      if (!container) return;

      const subtabBtn = container.querySelector<HTMLElement>(
        `[data-subtab-id="${CSS.escape(id)}"]`
      );
      if (!subtabBtn) return;

      markProgrammaticSubtabScroll(behavior === "smooth" ? 450 : 80);
      scrollWithinContainerHorizontally(container, subtabBtn, behavior);
    },
    [markProgrammaticSubtabScroll]
  );

  const scrollCarouselToId = useCallback(
    (id: string, behavior: ScrollBehavior = "smooth") => {
      const container = carouselRef.current;
      if (!container) return;

      if (window.matchMedia("(min-width: 1024px)").matches) return;

      const slide = container.querySelector<HTMLElement>(
        `[data-carousel-slide="${CSS.escape(id)}"]`
      );
      if (!slide) return;

      markProgrammaticScroll(behavior === "smooth" ? 450 : 80);
      container.scrollTo({ left: slide.offsetLeft, behavior });
    },
    [markProgrammaticScroll]
  );

  const selectById = useCallback(
    (id: string) => {
      setSelectedId(id);
      scrollCarouselToId(id);
      scrollSubtabIntoView(id);
    },
    [scrollCarouselToId, scrollSubtabIntoView]
  );

  useEffect(() => {
    const container = subtabScrollRef.current;
    if (!container || items.length === 0) return;

    let raf = 0;
    const onScroll = () => {
      if (isProgrammaticSubtabScrollRef.current) return;

      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const id = getFocusedItemId(
          container,
          "[data-subtab-id]",
          "data-subtab-id"
        );
        if (!id) return;

        setSelectedId(prev => {
          const current = prev ?? items[0]?.id ?? null;
          if (current === id) return prev;
          scrollCarouselToId(id, "smooth");
          return id;
        });
      });
    };

    container.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [items, scrollCarouselToId]);

  useEffect(() => {
    const container = carouselRef.current;
    if (!container || items.length === 0) return;

    let raf = 0;
    const onScroll = () => {
      if (isProgrammaticScrollRef.current) return;

      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const id = getFocusedItemId(
          container,
          "[data-carousel-slide]",
          "data-carousel-slide"
        );
        if (!id) return;

        setSelectedId(prev => {
          const current = prev ?? items[0]?.id ?? null;
          if (current === id) return prev;
          scrollSubtabIntoView(id, "smooth");
          return id;
        });
      });
    };

    container.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [items, scrollSubtabIntoView]);

  useEffect(
    () => () => {
      if (programmaticTimerRef.current) {
        clearTimeout(programmaticTimerRef.current);
      }
      if (programmaticSubtabTimerRef.current) {
        clearTimeout(programmaticSubtabTimerRef.current);
      }
    },
    []
  );

  return { activeId, selectById, carouselRef, subtabScrollRef };
}

/** Pick the child whose center is closest to the scroll container center. */
function getFocusedItemId(
  container: HTMLElement,
  selector: string,
  idAttribute: string
): string | null {
  const containerRect = container.getBoundingClientRect();
  const containerCenter = containerRect.left + containerRect.width / 2;

  const elements = container.querySelectorAll<HTMLElement>(selector);
  let bestId: string | null = null;
  let bestDistance = Infinity;

  elements.forEach(element => {
    const rect = element.getBoundingClientRect();
    const elementCenter = rect.left + rect.width / 2;
    const distance = Math.abs(elementCenter - containerCenter);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestId = element.getAttribute(idAttribute);
    }
  });

  return bestId;
}

/** Scroll horizontally within a container without moving the page vertically. */
function scrollWithinContainerHorizontally(
  container: HTMLElement,
  element: HTMLElement,
  behavior: ScrollBehavior = "smooth"
) {
  const elementLeft = element.offsetLeft;
  const elementWidth = element.offsetWidth;
  const containerWidth = container.clientWidth;
  const scrollLeft = container.scrollLeft;

  if (elementLeft < scrollLeft) {
    container.scrollTo({ left: elementLeft, behavior });
    return;
  }

  if (elementLeft + elementWidth > scrollLeft + containerWidth) {
    container.scrollTo({
      left: elementLeft + elementWidth - containerWidth,
      behavior,
    });
  }
}

function MobileSnapCarousel({
  carouselRef,
  children,
}: {
  carouselRef: RefObject<HTMLDivElement | null>;
  children: ReactNode;
}) {
  return (
    <div
      ref={carouselRef}
      className="no-scrollbar hide__scrollbar flex w-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch] lg:hidden"
    >
      {children}
    </div>
  );
}

function SnapCarouselSlide({
  slideId,
  children,
}: {
  slideId: string;
  children: ReactNode;
}) {
  return (
    <div
      data-carousel-slide={slideId}
      className="box-border w-full max-w-full min-w-0 shrink-0 grow-0 basis-full snap-center px-1 pt-2"
    >
      <div className="max-w-full min-w-0 overflow-hidden">{children}</div>
    </div>
  );
}

function CreatorSubtabBar({
  children,
  stickyClassName,
  action = null,
  subtabScrollRef,
  actions = [],
}: {
  children: ReactNode;
  stickyClassName: string;
  action?: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
  } | null;
  subtabScrollRef?: RefObject<HTMLDivElement | null>;
  actions?: Array<{
    label: string;
    onClick: () => void;
  }>;
}) {
  return (
    <div
      className={cn(
        "sticky z-10 flex items-stretch border-b bg-white",
        stickyClassName
      )}
    >
      {action ? (
        <div className="flex shrink-0 items-center border-r bg-white py-2 pr-2 pl-2">
          <CreatorSubtabButton
            active={false}
            variant="action"
            onClick={action.onClick}
            disabled={action.disabled}
            aria-busy={action.disabled}
          >
            {action.label}
          </CreatorSubtabButton>
        </div>
      ) : null}
      <div
        ref={subtabScrollRef}
        className="scrollbar-none hide__scrollbar min-w-0 flex-1 overflow-x-auto py-2 pl-2"
      >
        <div className="flex gap-2">
          {children}

          {actions.map(action => (
            <CreatorSubtabButton
              key={action.label}
              subtabId={`action-${action.label}`}
              active={false}
              onClick={action.onClick}
            >
              {action.label}
            </CreatorSubtabButton>
          ))}
        </div>
      </div>
    </div>
  );
}

function CreatorSubtabButton({
  children,
  active,
  onClick,
  variant = "default",
  subtabId,
  subtabLabel,
  disabled = false,
  "aria-busy": ariaBusy,
}: {
  children: ReactNode;
  active: boolean;
  onClick: () => void;
  variant?: "default" | "action";
  subtabId?: string;
  subtabLabel?: string;
  disabled?: boolean;
  "aria-busy"?: boolean;
}) {
  return (
    <button
      type="button"
      data-subtab-id={subtabId}
      onClick={onClick}
      disabled={disabled}
      aria-busy={ariaBusy}
      className={cn(
        "shrink-0 cursor-pointer rounded-md px-2 py-1 text-[8px] font-medium transition-colors",
        variant === "action"
          ? "border border-dashed border-neutral-400 bg-white text-neutral-700 hover:bg-neutral-50"
          : active
            ? "bg-black text-white"
            : "bg-neutral-100 hover:bg-neutral-200",
        subtabLabel === "Co-owner videos"
          ? "bg-secondary/30 hover:bg-secondary/40 text-black"
          : ""
      )}
    >
      {children}
    </button>
  );
}

function EventBannerSection({
  event,
  hostFullName,
  compact = false,
}: {
  event: HostCreatorEvent;
  hostFullName: string;
  compact?: boolean;
}) {
  const organizationName =
    event.organizationName?.trim() || hostFullName.trim() || "Creator";

  const isMobile = useMediaQuery({
    maxWidth: "500px",
  });

  const useCompactCard = compact || isMobile;

  return (
    <>
      {useCompactCard ? (
        <CompactEventCard
          key={event.id}
          channelId={event.id}
          roomId={event.id}
          eventBanner={event.eventBanner ?? ""}
          eventName={event.eventName}
          organizationName={organizationName}
          amountRaised={event.amountRaised}
          numOfTips={event.numOfTips}
          eventDate={event.eventDate}
          startTime={event.startTime}
          endTime={event.endTime}
        />
      ) : (
        <CreatorEventCard
          key={event.id}
          channelId={event.id}
          roomId={event.id}
          eventBanner={event.eventBanner ?? ""}
          eventName={event.eventName}
          organizationName={organizationName}
          amountRaised={event.amountRaised}
          numOfTips={event.numOfTips}
          eventDate={event.eventDate}
          startTime={event.startTime}
          endTime={event.endTime}
        />
      )}
    </>
  );
}

function CommunityBannerSection({
  community,
  compact = false,
  isOwnProfile = false,
  isDrawer = false,
  openAddVideoOnResume = false,
  onAddCommunityVideoSubscribeRequired,
  onAddVideoResumeOpened,
}: {
  community: HostCreatorCommunity;
  compact?: boolean;
  isOwnProfile?: boolean;
  isDrawer?: boolean;
  openAddVideoOnResume?: boolean;
  onAddCommunityVideoSubscribeRequired?: (communityId: string) => void;
  onAddVideoResumeOpened?: () => void;
}) {
  const hostSession = useHostSession();
  const { requestHostAuth, HostAuthModal } = useHostCapabilityWithAuth();
  const { status: hostPlanStatus, hostSubscriptionTier } =
    useHostPlanCapabilities();
  const { openForRequired, SubscriptionPromptModal } =
    useHostSubscriptionPrompt({
      focusTier: "community",
    });
  const communityPlanActive =
    hostSubscriptionTier === "HOST_COMMUNITY" && hostPlanStatus === "active";
  const pathname = usePathname();
  const hostSlug = hostSession.eventSlug?.trim() || "";
  const joinHref = exploreCommunityJoinHref(community.id);
  const communityTvHref = `/tv?community=${community.id}`;
  const logoSrc = community.logoUrl?.trim() || null;
  const description = community.description?.trim() || null;
  const tvActivated = Boolean(community.tvActivatedAt?.trim());
  const [joinOpen, setJoinOpen] = useState(false);
  const [addVideoOpen, setAddVideoOpen] = useState(false);
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
  const [overlayVideo, setOverlayVideo] =
    useState<CommunityFeaturedVideo | null>(null);

  const alreadyIn = isCommunityAlreadyIn({
    isMember,
    viewerHostsCommunity,
  });
  const canAccessMemberActions = isOwnProfile || alreadyIn;

  const reloadAccessState = useCallback(async () => {
    const res = await getCommunityAccessStateAction(community.id);
    if (!res.success || !res.data) return;
    const d = res.data as {
      featuredVideos?: CommunityFeaturedVideo[];
      isMember?: boolean;
      viewerHostsCommunity?: boolean;
      membershipStatus?: string | null;
      membershipExpiresAt?: string | null;
      subscriptionExpiresAt?: string | null;
    };
    setFeaturedVideos((d.featuredVideos ?? []).slice(0, 3));
    setIsMember(Boolean(d.isMember));
    setViewerHostsCommunity(Boolean(d.viewerHostsCommunity));
    setMembershipStatus(d.membershipStatus ?? null);
    setMembershipExpiresAt(d.membershipExpiresAt ?? null);
    setSubscriptionExpiresAt(d.subscriptionExpiresAt ?? null);
  }, [community.id]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await getCommunityAccessStateAction(community.id);
      if (cancelled || !res.success || !res.data) return;
      const d = res.data as {
        featuredVideos?: CommunityFeaturedVideo[];
        isMember?: boolean;
        viewerHostsCommunity?: boolean;
        membershipStatus?: string | null;
        membershipExpiresAt?: string | null;
        subscriptionExpiresAt?: string | null;
      };
      setFeaturedVideos((d.featuredVideos ?? []).slice(0, 3));
      setIsMember(Boolean(d.isMember));
      setViewerHostsCommunity(Boolean(d.viewerHostsCommunity));
      setMembershipStatus(d.membershipStatus ?? null);
      setMembershipExpiresAt(d.membershipExpiresAt ?? null);
      setSubscriptionExpiresAt(d.subscriptionExpiresAt ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [community.id]);

  const openJoinGate = useCallback(() => {
    if (community.locked) return;
    setJoinOpen(true);
  }, [community.locked]);

  const openMemberDestination = useCallback(
    (href: string) => {
      if (canAccessMemberActions) {
        window.open(href, "_blank", "noopener,noreferrer");
        return;
      }
      openJoinGate();
    },
    [canAccessMemberActions, openJoinGate]
  );

  const copyDedicatedLink = useCallback(() => {
    if (!canAccessMemberActions) {
      openJoinGate();
      return;
    }
    const url = `${window.location.origin}/community/side-chick/${community.id}`;
    void navigator.clipboard.writeText(url).then(
      () => toast.success("Dedicated mode link copied"),
      () => toast.error("Could not copy link")
    );
  }, [canAccessMemberActions, community.id, openJoinGate]);

  const openAddCommunityVideo = useCallback(() => {
    requestHostAuth(() => {
      if (communityPlanActive) {
        setAddVideoOpen(true);
        return;
      }
      onAddCommunityVideoSubscribeRequired?.(community.id);
      openForRequired("community");
    });
  }, [
    community.id,
    communityPlanActive,
    onAddCommunityVideoSubscribeRequired,
    openForRequired,
    requestHostAuth,
  ]);

  useEffect(() => {
    if (!openAddVideoOnResume) return;
    setAddVideoOpen(true);
    onAddVideoResumeOpened?.();
  }, [openAddVideoOnResume, onAddVideoResumeOpened]);

  const shouldReduceMotion = useReducedMotion();
  const displayedFeatured = featuredVideos.slice(0, 3);

  return (
    <article
      className={cn(
        "w-full max-w-full overflow-hidden rounded-3xl border-2 border-gray-200 shadow-md",
        compact && "mx-auto"
      )}
    >
      {HostAuthModal}
      {SubscriptionPromptModal}
      <button
        type="button"
        disabled={community.locked}
        onClick={() => openMemberDestination(joinHref)}
        className={cn(
          "relative block w-full bg-neutral-100 text-left",
          community.locked && "pointer-events-none"
        )}
      >
        <section
          className={cn(
            "relative mx-auto flex flex-col items-center justify-center rounded-2xl bg-cover bg-center bg-no-repeat bg-blend-multiply",
            compact
              ? "min-h-[22vh] bg-scroll"
              : "min-h-[25vh] max-w-4xl bg-fixed lg:min-h-[30vh]"
          )}
        >
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

          <div className="bg-secondary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-md p-3">
            {logoSrc ? (
              <Image
                src={logoSrc}
                alt={community.name}
                width={100}
                height={100}
                className="size-[100px] rounded object-cover"
              />
            ) : (
              <div className="border-moonstone-blue flex size-24 items-center justify-center rounded-md border-2 bg-white">
                <UserRound className="size-12" />
              </div>
            )}
          </div>
        </section>

        {community.locked ? (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40">
            <LockedBadge />
          </div>
        ) : null}
      </button>

      <div className="space-y-3 px-4 py-4">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            <h3 className="font-semibold">{community.name}</h3>
            {description ? (
              <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap">
                {description}
              </p>
            ) : (
              <p className="text-muted-foreground text-sm italic">
                No community description yet.
              </p>
            )}
          </div>
        </div>

        <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <p>
            <span className="text-foreground font-medium">
              {community.numEventRoomTips.toLocaleString()}
            </span>{" "}
            tips
          </p>
          <p>
            <span className="text-foreground font-medium">
              {community.memberCount.toLocaleString()}
            </span>{" "}
            members
          </p>
          <p>
            <span className="text-foreground font-medium">
              {community.numVideos.toLocaleString()}
            </span>{" "}
            videos
          </p>
        </div>

        {alreadyIn ? (
          <CommunityMemberInfo
            communityName={community.name}
            membershipStatus={membershipStatus}
            membershipExpiresAt={membershipExpiresAt}
            subscriptionExpiresAt={subscriptionExpiresAt}
          />
        ) : null}

        {!isDrawer && !compact ? (
          <CommunityPublicMembersRoster
            communityId={community.id}
            className="border-t pt-4"
          />
        ) : null}

        <div className="flex flex-wrap items-center gap-4 text-sm">
          <button
            type="button"
            className="underline underline-offset-2"
            onClick={() => openMemberDestination(joinHref)}
          >
            Community page
          </button>
          {tvActivated ? (
            <button
              type="button"
              className="underline underline-offset-2"
              onClick={() => openMemberDestination(communityTvHref)}
            >
              Community TV
            </button>
          ) : null}
          <button
            type="button"
            className="underline underline-offset-2"
            onClick={copyDedicatedLink}
          >
            Copy dedicated link
          </button>
        </div>

        {!isDrawer && displayedFeatured.length > 0 ? (
          <div className="space-y-2 border-t pt-4">
            <h4 className="text-sm font-medium">Featured videos</h4>
            <div className="grid grid-cols-3 gap-1 sm:grid-cols-4">
              {displayedFeatured.map(video => {
                const videoId = extractYoutubeID(video.url);
                const thumb = videoId
                  ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
                  : "/default-event-image.jpg";
                return (
                  <button
                    key={video.id}
                    type="button"
                    className="relative aspect-[9/16] overflow-hidden bg-neutral-100"
                    onClick={() => setOverlayVideo(video)}
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

        {isOwnProfile && !isDrawer && hostSlug ? (
          <div className="flex flex-wrap gap-3 border-t pt-4">
            <Button
              asChild
              variant="outline"
              size="sm"
            >
              <Link
                href={`/host/${hostSlug}/host-community?communityId=${encodeURIComponent(community.id)}`}
              >
                Manage community
              </Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => openAddCommunityVideo()}
            >
              Add community video
            </Button>
            <AddCommunityBankVideoDialog
              open={addVideoOpen}
              onOpenChange={setAddVideoOpen}
              communityId={community.id}
              hostSlug={hostSlug}
              pathname={pathname ?? undefined}
            />
          </div>
        ) : null}

        {!isOwnProfile && !alreadyIn ? (
          <div className="border-t pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={openJoinGate}
              disabled={community.locked}
            >
              Join community
            </Button>
          </div>
        ) : null}

        <JoinCommunityModal
          open={joinOpen}
          onOpenChange={setJoinOpen}
          communityId={community.id}
          signInRedirectPath={joinHref}
          joinDisabled={community.locked}
          onJoined={() => {
            setJoinOpen(false);
            void reloadAccessState();
          }}
        />
      </div>
      {!isDrawer && overlayVideo ? (
        <CommunityFeaturedVideoOverlay
          video={overlayVideo}
          onClose={() => setOverlayVideo(null)}
        />
      ) : null}
    </article>
  );
}

function CommunityFeaturedVideoOverlay({
  video,
  onClose,
}: {
  video: CommunityFeaturedVideo;
  onClose: () => void;
}) {
  return (
    <div
      className={`${OVERLAY_Z_INDEX} fixed inset-0 flex items-center justify-center bg-black/80 p-4`}
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl rounded-md bg-white p-4 shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Close video"
          onClick={onClose}
          className="absolute top-3 right-3 rounded-full bg-black/60 p-1.5 text-white"
        >
          <CircleX className="size-4" />
        </button>
        <div className="aspect-video overflow-hidden rounded-lg bg-black">
          <iframe
            title={video.title}
            src={`https://www.youtube.com/embed/${extractYoutubeID(video.url) ?? ""}`}
            className="size-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
        <p className="mt-3 text-sm font-medium">{video.title}</p>
      </div>
    </div>
  );
}

function VideoCardGrid({
  videos,
  onPlay,
  forceLocked = false,
  onTipLinkManage,
}: {
  videos: HostCreatorVideo[];
  onPlay: (video: HostCreatorVideo) => void;
  forceLocked?: boolean;
  onTipLinkManage?: (video: HostCreatorVideo) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-0.5 sm:grid-cols-4 md:grid-cols-5">
      {videos.map(video => {
        const locked = forceLocked || video.locked;
        return (
          <VideoCard
            key={video.id}
            video={video}
            locked={locked}
            onPlay={() => onPlay(video)}
            onTipLinkManage={
              onTipLinkManage ? () => onTipLinkManage(video) : undefined
            }
          />
        );
      })}
    </div>
  );
}

function VideoCard({
  video,
  locked,
  onPlay,
  onTipLinkManage,
}: {
  video: HostCreatorVideo;
  locked: boolean;
  onPlay: () => void;
  onTipLinkManage?: () => void;
}) {
  const thumb = useMemo(() => {
    const videoId = extractYoutubeID(video.url);
    return videoId
      ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
      : "/default-event-image.jpg";
  }, [video.url]);

  return (
    <button
      type="button"
      onClick={() => {
        if (!locked) onPlay();
      }}
      disabled={locked}
      className={cn(
        "group relative aspect-[9/16] overflow-hidden bg-neutral-100 text-left",
        locked ? "cursor-not-allowed" : "cursor-pointer"
      )}
      title={video.title}
      aria-label={locked ? `${video.title} (locked)` : video.title}
    >
      <img
        src={thumb}
        alt=""
        className={cn(
          "size-full object-cover transition-transform duration-200",
          !locked && "group-hover:scale-[1.03]"
        )}
      />
      {onTipLinkManage ? (
        <button
          type="button"
          aria-label={`Create TipLink for ${video.title}`}
          className="absolute top-1 right-1 z-10 rounded-full bg-black/70 p-1.5 text-white hover:bg-black/90"
          onClick={e => {
            e.stopPropagation();
            onTipLinkManage();
          }}
        >
          <Link2 className="size-3.5" />
        </button>
      ) : null}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent px-1.5 pt-8 pb-1.5">
        <p className="line-clamp-2 text-left text-[10px] font-medium text-white">
          {video.title}
        </p>
        <p className="mt-0.5 line-clamp-2 text-left text-[9px] leading-tight text-white/80">
          {video.numOfTips} tips · {video.numOfSaves ?? 0} saves ·{" "}
          {video.numOfSeen ?? 0} seen · {video.numOfComments ?? 0} comments
        </p>
      </div>
      {locked ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/50">
          <Lock className="size-5 text-white" />
          <span className="text-[10px] font-medium text-white/90">
            Pending admin approval
          </span>
        </div>
      ) : null}
    </button>
  );
}

function LockedBadge() {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-black/70 px-3 py-1.5 text-xs font-medium text-white">
      <Lock className="size-3.5" />
      Awaiting approval
    </span>
  );
}

function PlaylistsTabContent({
  playlists,
  tipLinks,
  isOwnProfile,
  hostEventSlug,
  events,
  draftTipLinks,
  onTryOpenTipLink,
  onCreatePlaylist,
}: {
  playlists: HostPlaylistSummary[];
  tipLinks: TipLinkSummary[];
  isOwnProfile: boolean;
  hostEventSlug: string | null;
  events: HostCreatorEvent[];
  draftTipLinks: TipLinkSummary[];
  onTryOpenTipLink: () => void;
  onCreatePlaylist: () => void;
}) {
  const router = useRouter();
  const { requestHostAuth } = useHostCapabilityWithAuth();

  return (
    <div className="space-y-6 px-2 py-4">
      {isOwnProfile ? (
        <div className="flex items-center justify-between gap-3 px-2">
          <button
            type="button"
            onClick={onCreatePlaylist}
            className="border-primary/30 text-primary inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold"
          >
            <Plus className="size-3.5" />
            Create Playlist
          </button>

          {hostEventSlug ? (
            <button
              type="button"
              onClick={onTryOpenTipLink}
              className="border-primary/30 text-primary inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold"
            >
              <Plus className="size-3.5" />
              Create TipLink
            </button>
          ) : null}
        </div>
      ) : null}

      {tipLinks.length > 0 ? (
        <div className="space-y-2">
          <p className="text-muted-foreground px-2 text-xs font-semibold tracking-wide uppercase">
            TipLinks
          </p>
          <ul className="space-y-3">
            {tipLinks.map(tl => {
              const thumb = tipLinkListThumb(tl.bannerUrl, tl.videoUrl);
              const thumbClass = tipLinkThumbClassName(tl.bannerAspect);
              return (
                <li key={tl.id}>
                  <Link
                    href={tl.landingUrl}
                    className="hover:bg-muted/30 flex items-center gap-3 rounded-lg border p-3 transition-colors"
                  >
                    {thumb ? (
                      <Image
                        src={thumb}
                        alt=""
                        width={72}
                        height={tl.bannerAspect === "square" ? 72 : 54}
                        className={cn(thumbClass, "w-[72px] shrink-0")}
                        unoptimized
                      />
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <span className="block font-semibold">{tl.title}</span>
                      <span className="text-muted-foreground text-xs">
                        {tl.pageVisits90d} visits (90d) · {tl.videoTipCount}{" "}
                        tips · {tl.landingUrl}
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {isOwnProfile && draftTipLinks.length > 0 ? (
        <div className="space-y-2">
          <p className="text-muted-foreground px-2 text-xs font-semibold tracking-wide uppercase">
            Draft TipLinks
          </p>
          <ul className="space-y-3">
            {draftTipLinks.map(tl => {
              const eventSlug =
                events.find(e => e.id === tl.eventId)?.eventSlug ??
                hostEventSlug;
              return (
                <li key={tl.id}>
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed p-3">
                    <div className="min-w-0 flex-1">
                      <span className="block font-semibold">{tl.title}</span>
                      <span className="text-muted-foreground text-xs">
                        Draft · not published
                      </span>
                    </div>
                    {eventSlug ? (
                      <button
                        type="button"
                        className="border-primary/30 text-primary hover:bg-primary/5 flex min-h-9 min-w-[96px] cursor-pointer items-center justify-center rounded-full border px-4 py-2 text-xs font-semibold transition-colors active:scale-[0.98]"
                        onClick={() =>
                          requestHostAuth(() =>
                            router.push(
                              buildTipLinkManageHref(
                                eventSlug,
                                tl.eventId,
                                tl.eventChannelId
                              )
                            )
                          )
                        }
                      >
                        <span className="pointer-events-none">Complete</span>
                      </button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {playlists.length === 0 &&
      tipLinks.length === 0 &&
      draftTipLinks.length === 0 ? (
        <EmptyTabMessage
          title={isOwnProfile ? "Keep viewers watching." : undefined}
          message={
            isOwnProfile ? (
              <>
                Group your videos into <br className="sm:hidden" /> playlists or
                create a Tiplink.
              </>
            ) : (
              <>
                No playlists or TipLinks here yet. <br className="sm:hidden" />{" "}
                Discover more to watch.
              </>
            )
          }
          ctas={
            !isOwnProfile
              ? [
                  {
                    icon: <Tv className="size-3.5" />,
                    label: "Watch Tipmanna TV",
                    onClick: () => expressNavigateToTv(),
                  },
                ]
              : [
                  {
                    label: "Create a playlist",
                    onClick: () => onCreatePlaylist(),
                  },
                  {
                    label: "Create tiplink",
                    onClick: () => onTryOpenTipLink(),
                  },
                ]
          }
        />
      ) : playlists.length === 0 ? null : (
        <div className="space-y-2">
          <p className="text-muted-foreground px-2 text-xs font-semibold tracking-wide uppercase">
            Playlists
          </p>
          <ul className="space-y-3">
            {playlists.map(pl => (
              <li key={pl.id}>
                <Link
                  href={`/playlist/${pl.id}`}
                  className="hover:bg-muted/30 flex flex-col gap-1 rounded-lg border p-4 transition-colors"
                >
                  <span className="font-semibold">{pl.name}</span>
                  <span className="text-muted-foreground text-xs">
                    {pl.videoCount} videos · {pl.pageVisitCount} visits ·{" "}
                    {pl.totalTipCount} tips
                    {pl.kind === "community" && pl.communityName
                      ? ` · c ${pl.communityName}`
                      : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

type EmptyTabCta = {
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
};

function EmptyTabMessage({
  title,
  message,
  ctas,
}: {
  title?: React.ReactNode;
  message: React.ReactNode;
  ctas?: EmptyTabCta[];
}) {
  return (
    <div className="space-y-2 px-4 py-12">
      <h5 className="text-center text-lg leading-tight font-semibold">
        {title}
      </h5>
      <p className="text-muted-foreground text-center text-sm">{message}</p>

      {ctas && ctas.length > 0 ? (
        <div className="mt-4 flex flex-col items-center justify-center gap-2 sm:flex-row">
          {ctas.map((cta, index) => (
            <button
              type="button"
              className="relative flex w-fit items-center justify-center gap-2 rounded-full border-2 border-black/20 bg-black/50 px-3 py-1.5 text-[14px] font-medium text-white shadow-lg shadow-black/10 backdrop-blur-md transition-all duration-200 ease-out hover:border-white/30 hover:bg-black/70 hover:shadow-xl hover:shadow-black active:scale-95 disabled:pointer-events-none disabled:opacity-60"
              onClick={cta.onClick}
              disabled={cta.disabled}
              aria-busy={cta.disabled}
              key={`empty-tab-cta-${index}-${cta.label}`}
            >
              {cta.icon}
              {cta.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
