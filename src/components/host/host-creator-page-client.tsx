"use client";

import Link from "next/link";
import Image from "next/image";
import {
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
  MessageCircleMore,
  Share2,
  SquarePen,
  Tv,
  ChevronDown,
  CircleX,
  Copy,
  Check,
  UserRound,
  Rocket,
  Plus,
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
import { SaveHostToggleButton } from "@/components/events/save-host-toggle-button";
import {
  EditCreatorProfileDialog,
  type CreatorProfileSavedPayload,
} from "@/components/host/edit-creator-profile-dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigateToExploreVideo } from "@/hooks/use-navigate-to-explore-video";
import { exploreCommunityJoinHref } from "@/lib/community-links";
import { extractYoutubeID } from "@/lib/extractYoutubeID";
import {
  buildCreatorProfileSharePath,
  buildCreatorProfileShareUrl,
} from "@/lib/creator-profile-url";
import { copyShareUrl } from "@/lib/copy-share-url";
import { cn } from "@/lib/utils";
import type { RootState } from "@/redux/store";
import { formatCreatorProfileCategoryLabel } from "@/schemas/creator.schema";
import { usePathname, useRouter } from "next/navigation";
import { TopEventCard } from "../home/top-event-card";
import { CreatorEventCard } from "../events/creator-event-card";
import { useMediaQuery } from "react-responsive";
import { NotificationBadge } from "../notifications/notification-badge";
import { CommunityHowToJoinSection } from "@/components/community/community-how-to-join-section";
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
import { prefetchExploreFeedInitial } from "@/lib/explore-feed-prefetch-cache";
import { awaitProfileDrawerPrefetch } from "@/lib/drawer-prefetch-cache";

const PLACEHOLDER_AVATAR =
  "https://res.cloudinary.com/tipmanna/image/upload/v1786172267/user_sce6gw.png";

const DEFAULT_EVENT_BANNER =
  "https://res.cloudinary.com/tipmanna/image/upload/v1786171632/event_banner_hcqybl.webp";

const EVENT_TAB_SUBMISSION_KINDS = new Set(["event_only", "event_and_content"]);

const CO_OWNED_CHANNELS_SUBTAB_ID = "__co_owned_videos__";

const TABS = [
  { id: "channels", label: "Channels" },
  { id: "events", label: "Events" },
  { id: "communities", label: "Community" },
  { id: "playlists", label: "Playlist" },
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
  const { host, stats, events, communities, coOwnedVideos = [] } = profile;
  const navigateToExplore = useNavigateToExploreVideo();

  const pathname = usePathname();
  const router = useRouter();

  const user = useSelector((state: RootState) => state.auth.user);
  const isAuthenticated = useSelector(
    (state: RootState) => state.auth.isAuthenticated
  );

  const isOwnProfile =
    user?.role === "HOST" &&
    (user.id === host.id ||
      user.username?.toLowerCase() === host.username.toLowerCase());

  const editProfileHref =
    isOwnProfile && user && "eventSlug" in user && user.eventSlug
      ? `/host/${user.eventSlug}/profile`
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

  const playVideo = (video: HostCreatorVideo) => {
    if (video.locked) return;
    onVideoPlay?.();
    navigateToExplore({
      id: video.id,
      url: video.url,
      title: video.title,
      event: {
        id: video.event.id,
        eventName: video.event.eventName,
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

  const userRole = useSelector((s: RootState) => s.auth.user?.role);
  const isSignedIn =
    useSelector((s: RootState) => s.auth.isAuthenticated) &&
    (userRole === "HOST" || userRole === "TIPPER");

  const accountHref = getAccountNavHref(user, isAuthenticated);

  const openCreateDialog = (entry: CreateDialogEntry) => {
    setCreateDialogEntry(entry);
    setIsCreatePopupOpen(true);
  };

  const handleSignInSuccess = (payload: SignInModalPayload) => {
    setSignInOpen(false);

    const hostUsername =
      payload.role === "HOST"
        ? (payload.username ??
          (user && "username" in user ? user.username : undefined))
        : undefined;

    if (hostUsername) {
      router.push(buildCreatorProfileSharePath(hostUsername));
    }

    if (pendingStartCommunity) {
      setPendingStartCommunity(false);
      setStartCommunityOpen(true);
    }
  };

  const handleMyAccountClick = () => {
    if (isAuthenticated && user) {
      router.push(accountHref);
      return;
    }
    setSignInOpen(true);
  };

  const openStartCommunityFlow = () => {
    if (isAuthenticated && user) {
      setStartCommunityOpen(true);
      return;
    }
    setPendingStartCommunity(true);
    setSignInOpen(true);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-[1000] shrink-0 bg-white">
        <div
          className={cn(
            "mx-auto grid max-w-4xl items-center gap-2 px-4 py-2 sm:max-w-2xl md:max-w-4xl",
            isDrawer ? "grid-cols-[1fr_auto]" : "grid-cols-[1fr_auto_1fr]",
            isOwnProfile ? "grid-cols-[1fr_auto]" : "grid-cols-[1fr_auto_1fr]",
            !isOwnProfile ? "grid-cols-[1fr_auto]" : "grid-cols-[1fr_auto_1fr]"
          )}
        >
          <Link
            href="/explore"
            className="racing_sans_one justify-self-start text-xl sm:text-2xl"
          >
            <span className="text-primary">tip</span>manna
          </Link>

          {isOwnProfile && !isDrawer ? (
            <nav
              className="flex items-center justify-center gap-4 sm:gap-6"
              aria-label="Creator page navigation"
            >
              <Link
                href="/tv"
                className="hover:text-primary flex flex-col items-center gap-0.5 sm:flex-row sm:gap-1.5"
              >
                <Tv className="size-4 sm:size-5" />
                <span className="text-[8px] sm:text-xs">Watch TV</span>
              </Link>
              <Link
                href="/explore"
                className="hover:text-primary flex flex-col items-center gap-0.5 sm:flex-row sm:gap-1.5"
                onClick={() => {
                  setIsCreatePopupOpen(false);
                  setIsProfileDrawerOpen(false);
                }}
              >
                <Rocket className="size-4 sm:size-5" />
                <span className="text-[8px] sm:text-xs">Explore</span>
              </Link>
            </nav>
          ) : null}

          <Button
            type="button"
            size="sm"
            className={`${isOwnProfile ? "hidden" : "justify-self-end"}`}
            onClick={handleMyAccountClick}
          >
            My Account
          </Button>
        </div>
      </header>

      <SignInDialog
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
        allowInlineSignUp
        onSuccess={handleSignInSuccess}
      />

      <CreateDialog
        openPopup={isCreatePopupOpen}
        setOpenPopup={open => {
          setIsCreatePopupOpen(open);
          if (!open) setCreateDialogEntry("default");
        }}
        entry={createDialogEntry}
        forceTypePicker={createDialogEntry === "event-room"}
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

      <section className="relative -z-50 -mt-4 flex-1 sm:-mt-2">
        <div
          className={cn(
            "relative mx-auto max-w-lg bg-white sm:max-w-2xl md:max-w-4xl",
            !isOwnProfile && !isDrawer && "pb-20",
            className ?? "min-h-screen"
          )}
        >
          <ProfileHeader
            host={host}
            stats={stats}
            isOwnProfile={isOwnProfile}
            editProfileHref={editProfileHref}
          />

          <Tabs
            defaultValue="channels"
            className="-mt-4 gap-0 px-2"
          >
            <div className="sticky top-11 z-10 border-b bg-white">
              <TabsList className="scrollbar-none h-auto w-full justify-start gap-0 overflow-x-auto rounded-none bg-transparent p-0">
                {TABS.map(tab => (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="data-[state=active]:border-b-primary h-13! rounded-none bg-white font-semibold data-[state=active]:border-b-2"
                  >
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <TabsContent value="channels">
              <ChannelsTabContent
                events={events}
                coOwnedVideos={coOwnedVideos}
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
                onStartCommunity={openStartCommunityFlow}
              />
            </TabsContent>

            <TabsContent value="playlists">
              <EmptyTabMessage message="Playlists are not available yet." />
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {!isOwnProfile && !isDrawer ? (
        <div className="fixed right-0 bottom-0 left-0 z-40 border-t border-black/20 bg-white px-4 py-1 pb-[max(0.25rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
            <Link
              href="/tv"
              className="group flex flex-col items-center justify-center gap-1"
            >
              <Tv className="group-hover:text-primary size-5 group-hover:stroke-2" />
              <span className="text-[8px]">Watch TV</span>
            </Link>

            <Link
              href="/explore"
              className="flex cursor-pointer flex-col items-center justify-center gap-1"
              onPointerEnter={prefetchExploreFeedInitial}
              onClick={() => {
                setIsCreatePopupOpen(false);
                setIsProfileDrawerOpen(false);
              }}
            >
              <Rocket
                className="size-5"
                strokeWidth={2}
              />
              <span className="text-[8px]">Explore</span>
            </Link>

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
              <UserRound
                className={`size-5 ${isProfileDrawerOpen ? "text-primary" : ""}`}
                strokeWidth={isProfileDrawerOpen ? 3.75 : 2}
              />
              <NotificationBadge
                variant="dot"
                className="-top-0.5 right-6"
              />
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
}: {
  host: HostCreatorPublicProfile["host"];
  stats: HostCreatorPublicProfile["stats"];
  isOwnProfile: boolean;
  editProfileHref: string | null;
}) {
  const router = useRouter();
  const [showSecondaryStats, setShowSecondaryStats] = useState(false);
  const [openCreatorDialog, setOpenCreatorDialog] = useState(false);
  const [displayUsername, setDisplayUsername] = useState(host.username);
  const [profileImageUrl, setProfileImageUrl] = useState(host.profileImageUrl);
  const [pageDescription, setPageDescription] = useState(host.pageDescription);
  const [externalLink, setExternalLink] = useState(host.externalLink);
  const [profileCategory, setProfileCategory] = useState(host.profileCategory);

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
    <section className="section relative z-100 bg-white">
      {/* <div className="absolute top-2 right-2 flex items-center gap-2 sm:top-4 sm:right-4">
        
      </div> */}

      <EditCreatorProfileDialog
        open={openCreatorDialog}
        onOpenChange={setOpenCreatorDialog}
        initialAvatarUrl={profileImageUrl}
        onSaved={handleProfileSaved}
      />

      <Image
        src="/patterns/bg_pattern.webp"
        alt="Wave pattern"
        width={1000}
        height={150}
        className="absolute top-0 left-0 -z-100 h-[150px] w-full object-cover"
      />

      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <div className="relative size-24 shrink-0 overflow-hidden rounded-full sm:size-28">
          <img
            src={profileImageUrl ?? PLACEHOLDER_AVATAR}
            alt={host.fullName || "Creator avatar"}
            className="size-full border border-gray-200 object-cover"
          />
        </div>

        <div className="min-w-0 flex-1 space-y-2 text-center sm:text-left">
          <div className="flex flex-col items-center gap-1 sm:flex-row sm:gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold">
                {host.fullName.split(" ")[0]}
              </span>
              <SaveHostToggleButton
                hostId={host.id}
                className="cursor-pointer rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-black/90"
                iconClassName="size-4"
              />

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
            className={` ${showSecondaryStats ? "" : "-mt-4 flex items-center justify-center gap-2 sm:justify-start"}`}
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
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0"
              aria-label={
                copied ? "Creator link copied" : "Copy creator profile link"
              }
              title={copied ? "Copied!" : "Copy creator profile link"}
              onClick={() => void copyLink()}
            >
              {copied ? (
                <Check className="size-4" />
              ) : (
                <Copy className="size-4" />
              )}
            </Button>

            {isOwnProfile && editProfileHref ? (
              <Button
                variant="outline"
                size="sm"
                className="w-fit"
                onClick={() => setOpenCreatorDialog(true)}
              >
                <SquarePen className="mr-1.5 size-4" />
                Edit
              </Button>
            ) : null}
          </div>
        </div>
      </div>
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
    <section className="sm:ml-none -mt-4 ml-4 flex items-center justify-center gap-4 sm:justify-start">
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

/** Channels tab: co-owned videos first, then sub-tabs per event channel. */
function ChannelsTabContent({
  events,
  coOwnedVideos,
  onPlay,
  isOwnProfile,
  onAddVideo,
}: {
  events: HostCreatorEvent[];
  coOwnedVideos: HostCreatorVideo[];
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

  const showCoOwnedSubtab = coOwnedVideos.length > 0 || isOwnProfile;

  const subtabItems = useMemo(() => {
    const items: { id: string }[] = [];
    if (showCoOwnedSubtab) {
      items.push({ id: CO_OWNED_CHANNELS_SUBTAB_ID });
    }
    items.push(...sortedEvents.map(event => ({ id: event.id })));
    return items;
  }, [sortedEvents, showCoOwnedSubtab]);

  const {
    activeId: activeChannelId,
    selectById,
    subtabScrollRef,
  } = useSubtabScrollSync(subtabItems);

  const isCoOwnedActive = activeChannelId === CO_OWNED_CHANNELS_SUBTAB_ID;
  const activeChannel = sortedEvents.find(
    event => event.id === activeChannelId
  );

  if (sortedEvents.length === 0 && !showCoOwnedSubtab && !isOwnProfile) {
    return <EmptyTabMessage message="No channels created yet." />;
  }

  return (
    <div>
      <CreatorSubtabBar
        stickyClassName="top-[5.75rem]"
        subtabScrollRef={subtabScrollRef}
        action={
          isOwnProfile && !isCoOwnedActive
            ? { label: "+ Add video", onClick: onAddVideo }
            : null
        }
      >
        {showCoOwnedSubtab ? (
          <CreatorSubtabButton
            subtabId={CO_OWNED_CHANNELS_SUBTAB_ID}
            active={isCoOwnedActive}
            onClick={() => selectById(CO_OWNED_CHANNELS_SUBTAB_ID)}
          >
            Co-owned videos
          </CreatorSubtabButton>
        ) : null}
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

      {isCoOwnedActive ? (
        coOwnedVideos.length === 0 ? (
          <p className="text-muted-foreground px-4 py-8 text-center text-sm">
            No co-owned videos yet.
          </p>
        ) : (
          <VideoCardGrid
            videos={coOwnedVideos}
            onPlay={onPlay}
          />
        )
      ) : activeChannel ? (
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
        <EmptyTabMessage message="Add a video to one of your channels or create a new channel." />
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
    return <EmptyTabMessage message="No events created yet." />;
  }

  return (
    <div>
      <CreatorSubtabBar
        stickyClassName="top-[5.75rem]"
        subtabScrollRef={subtabScrollRef}
        action={
          isOwnProfile
            ? { label: "+ Add live event", onClick: onAddLiveEvent }
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
        <EmptyTabMessage message="Create a live event room to start streaming." />
      ) : null}
    </div>
  );
}

function CommunitiesTabContent({
  communities,
  isOwnProfile,
  onStartCommunity,
}: {
  communities: HostCreatorCommunity[];
  isOwnProfile: boolean;
  onStartCommunity: () => void;
}) {
  const { activeId, selectById, carouselRef, subtabScrollRef } =
    useSnapCarouselSync(communities);

  const activeCommunity = communities.find(
    community => community.id === activeId
  );

  if (communities.length === 0 && !isOwnProfile) {
    return <EmptyTabMessage message="No communities created yet." />;
  }

  return (
    <div>
      <CreatorSubtabBar
        stickyClassName="top-[5.75rem]"
        subtabScrollRef={subtabScrollRef}
        action={
          isOwnProfile
            ? { label: "+ Start community", onClick: onStartCommunity }
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
                  compact
                />
              </SnapCarouselSlide>
            ))}
          </MobileSnapCarousel>

          <div className="hidden px-1 pt-2 lg:block">
            {activeCommunity ? (
              <CommunityBannerSection community={activeCommunity} />
            ) : null}
          </div>
        </>
      ) : isOwnProfile ? (
        <EmptyTabMessage message="Send a start community request to tell us about your idea." />
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
}: {
  children: ReactNode;
  stickyClassName: string;
  action?: { label: string; onClick: () => void } | null;
  subtabScrollRef?: RefObject<HTMLDivElement | null>;
}) {
  return (
    <div
      className={cn(
        "sticky z-10 flex items-stretch border-b bg-white",
        stickyClassName
      )}
    >
      <div
        ref={subtabScrollRef}
        className="scrollbar-none hide__scrollbar min-w-0 flex-1 overflow-x-auto py-2 pl-2"
      >
        <div className="flex gap-2">{children}</div>
      </div>
      {action ? (
        <div className="flex shrink-0 items-center border-l bg-white py-2 pr-2 pl-2">
          <CreatorSubtabButton
            active={false}
            variant="action"
            onClick={action.onClick}
          >
            {action.label}
          </CreatorSubtabButton>
        </div>
      ) : null}
    </div>
  );
}

function CreatorSubtabButton({
  children,
  active,
  onClick,
  variant = "default",
  subtabId,
}: {
  children: ReactNode;
  active: boolean;
  onClick: () => void;
  variant?: "default" | "action";
  subtabId?: string;
}) {
  return (
    <button
      type="button"
      data-subtab-id={subtabId}
      onClick={onClick}
      className={cn(
        "shrink-0 cursor-pointer rounded-md px-2 py-1 text-sm font-medium transition-colors",
        variant === "action"
          ? "border border-dashed border-neutral-400 bg-white text-neutral-700 hover:bg-neutral-50"
          : active
            ? "bg-black text-white"
            : "bg-neutral-100 hover:bg-neutral-200"
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
        <TopEventCard
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
}: {
  community: HostCreatorCommunity;
  compact?: boolean;
}) {
  const joinHref = exploreCommunityJoinHref(community.id);
  const bannerSrc = community.eventRoomBanner?.trim() || DEFAULT_EVENT_BANNER;
  const logoSrc = community.logoUrl?.trim() || null;
  const description = community.description?.trim() || null;

  const shouldReduceMotion = useReducedMotion();

  return (
    <article
      className={cn(
        "w-full max-w-full overflow-hidden rounded-3xl border-2 border-gray-200 shadow-md",
        compact && "mx-auto"
      )}
    >
      <Link
        href={community.locked ? "#" : joinHref}
        aria-disabled={community.locked}
        className={cn(
          "relative block w-full bg-neutral-100",
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
      </Link>

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

        <CommunityHowToJoinSection
          communityId={community.id}
          signInRedirectPath={joinHref}
          className="border-t pt-4"
          showCancelLink={false}
          joinDisabled={community.locked}
        />

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
      </div>
    </article>
  );
}

function VideoCardGrid({
  videos,
  onPlay,
  forceLocked = false,
}: {
  videos: HostCreatorVideo[];
  onPlay: (video: HostCreatorVideo) => void;
  forceLocked?: boolean;
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
}: {
  video: HostCreatorVideo;
  locked: boolean;
  onPlay: () => void;
}) {
  const thumb = useMemo(() => {
    const videoId = extractYoutubeID(video.url);
    return videoId
      ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
      : "/default-event-image.jpg";
  }, [video.url]);

  const router = useRouter();

  return (
    <button
      type="button"
      // onClick={() => {
      //   if (!locked) onPlay();
      // }}
      // onClick={() => {
      //   if (!locked)
      //     router.push(`/content/${video.event.id}?v=${video.id}`);
      // }}
      disabled={locked}
      className={cn(
        "group relative aspect-[9/16] overflow-hidden bg-neutral-100",
        locked ? "cursor-not-allowed" : "cursor-pointer"
      )}
      title={video.title}
      aria-label={locked ? `${video.title} (locked)` : video.title}
    >
      <Link
        href={locked ? "#" : `/content/${video.event.id}?v=${video.id}`}
        target="_blank"
      >
        <img
          src={thumb}
          alt=""
          className={cn(
            "size-full object-cover transition-transform duration-200",
            !locked && "group-hover:scale-[1.03]"
          )}
        />
      </Link>
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

function EmptyTabMessage({ message }: { message: string }) {
  return (
    <p className="text-muted-foreground px-4 py-12 text-center text-sm">
      {message}
    </p>
  );
}
