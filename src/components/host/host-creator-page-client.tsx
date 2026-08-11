"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

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

const PLACEHOLDER_AVATAR =
  "https://res.cloudinary.com/tipmanna/image/upload/v1786172267/user_sce6gw.png";

const DEFAULT_EVENT_BANNER =
  "https://res.cloudinary.com/tipmanna/image/upload/v1786171632/event_banner_hcqybl.webp";

const EVENT_TAB_SUBMISSION_KINDS = new Set(["event_only", "event_and_content"]);

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
};

export function HostCreatorPageClient({
  profile,
  className,
  onVideoPlay,
}: Props) {
  const { host, stats, events, communities } = profile;
  const navigateToExplore = useNavigateToExploreVideo();

  const pathname = usePathname();
  console.log("pathname", pathname);

  const user = useSelector((state: RootState) => state.auth.user);

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

  const isMobile = useMediaQuery({ maxWidth: "500px" });

  const [isCreatePopupOpen, setIsCreatePopupOpen] = useState(false);
  const [isProfileDrawerOpen, setIsProfileDrawerOpen] = useState(false);

  const userRole = useSelector((s: RootState) => s.auth.user?.role);
  const authToken = useSelector((s: RootState) => s.auth.token);
  const isSignedIn =
    useSelector((s: RootState) => s.auth.isAuthenticated) &&
    (userRole === "HOST" || userRole === "TIPPER");

  return (
    <section className="relative">
      <div className="absolute top-4 left-4">
        <h1 className="racing_sans_one text-2xl sm:text-3xl">
          <Link href="/explore">
            <span className="text-primary">tip</span>manna
          </Link>
        </h1>
      </div>

      {/* {isOwnProfile && editProfileHref ? ( */}
      <Button
        variant="outline"
        size="sm"
        className="absolute top-4 right-4 w-fit"
        // onClick={() => setOpenCreatorDialog(true)}
      >
        <SquarePen className="mr-1.5 size-4" />
        Edit
      </Button>
      {/* ) : null} */}

      <div
        className={cn(
          "relative mx-auto max-w-lg bg-white pb-8 sm:max-w-2xl md:max-w-4xl",
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
          className="gap-0 px-2"
        >
          <div className="sticky top-0 z-10 border-b bg-white">
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
              onPlay={playVideo}
            />
          </TabsContent>

          <TabsContent value="events">
            {eventTabEvents.length === 0 ? (
              <EmptyTabMessage message="No events created yet." />
            ) : (
              <>
                {/* LARGE SCREENS */}
                <div className="hidden flex-col gap-4 lg:flex">
                  {eventTabEvents.map(event => (
                    <EventBannerSection
                      key={event.id}
                      event={event}
                      hostFullName={host.fullName}
                    />
                  ))}
                </div>

                {/* SMALL SCREENS */}
                <div className="no-scrollbar hide__scrollbar relative flex items-center gap-4 overflow-x-auto lg:hidden">
                  <div className="flex w-[320px] snap-x snap-mandatory space-x-4">
                    {eventTabEvents.map(event => (
                      <EventBannerSection
                        key={event.id}
                        event={event}
                        hostFullName={host.fullName}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="communities">
            {communities.length === 0 ? (
              <EmptyTabMessage message="No communities created yet." />
            ) : (
              <div className="space-y-6 divide-y">
                {communities.map(community => (
                  <CommunityBannerSection
                    key={community.id}
                    community={community}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="playlists">
            <EmptyTabMessage message="Playlists are not available yet." />
          </TabsContent>
        </Tabs>
      </div>

      {/* Bottom section - MOBILE */}
      <div
        className={cn(
          "absolute right-2 bottom-0 left-2 flex flex-col border-t px-4 py-1"
        )}
      >
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/tv"
            className="group flex flex-col items-center justify-center gap-1"
          >
            <Tv className="group-hover:text-primary size-5 group-hover:stroke-2" />{" "}
            <span className="text-[8px]">Watch TV</span>
          </Link>

          <Link
            href="/explore"
            className="flex cursor-pointer flex-col items-center justify-center gap-1"
            // onPointerEnter={prefetchExploreFeedInitial}
            onClick={() => {
              setIsCreatePopupOpen(false);
              setIsProfileDrawerOpen(false);
            }}
          >
            <Rocket
              className="size-5"
              strokeWidth={2}
            />{" "}
            <span className="text-[8px]">Explore</span>
          </Link>

          <div className="flex flex-col items-center justify-center">
            <button
              type="button"
              className="cursor-pointer rounded-full bg-black/20 p-[3px]"
              onClick={() => {
                setIsCreatePopupOpen(true);
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
              // void awaitProfileDrawerPrefetch();
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
    </section>
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
      <>
        <div className="absolute top-2 right-2 flex items-center gap-4 sm:top-4 sm:right-4">
          <Link
            href="/tv"
            className="group flex flex-col items-center justify-center gap-1"
          >
            <Tv className="group-hover:text-primary size-5 group-hover:stroke-2" />{" "}
            <span className="text-[8px]">Watch TV</span>
          </Link>

          <Link
            href="/explore"
            className="flex cursor-pointer flex-col items-center justify-center gap-1"
            // onPointerEnter={prefetchExploreFeedInitial}
            onClick={() => {
              // setIsCreatePopupOpen(false);
              // setIsProfileDrawerOpen(false);
            }}
          >
            <Rocket
              className="size-5"
              strokeWidth={2}
            />{" "}
            <span className="text-[8px]">Explore</span>
          </Link>

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
              <>
                <Check className="size-4" />
              </>
            ) : (
              <>
                <Copy className="size-4" />
              </>
            )}
          </Button>

          {/* {isOwnProfile && editProfileHref ? (
            <Button
              variant="outline"
              size="sm"
              className="w-fit"
              onClick={() => setOpenCreatorDialog(true)}
            >
              <SquarePen className="mr-1.5 size-4" />
              Edit
            </Button>
          ) : null} */}
        </div>

        <EditCreatorProfileDialog
          open={openCreatorDialog}
          onOpenChange={setOpenCreatorDialog}
          initialAvatarUrl={profileImageUrl}
          onSaved={handleProfileSaved}
        />
      </>

      <div className="absolute top-1 left-1">
        <h1 className="racing_sans_one text-2xl sm:text-3xl lg:hidden">
          <Link href="/explore">
            <span className="text-primary">tip</span>manna
          </Link>
        </h1>
      </div>

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

          <div className={` ${showSecondaryStats ? "" : "-mt-4"}`}>
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

/** Channels tab: sub-tabs per event channel, defaulting to the latest channel. */
function ChannelsTabContent({
  events,
  onPlay,
}: {
  events: HostCreatorEvent[];
  onPlay: (video: HostCreatorVideo) => void;
}) {
  const sortedEvents = useMemo(
    () =>
      [...events].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [events]
  );

  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(
    null
  );

  const activeChannelId = selectedChannelId ?? sortedEvents[0]?.id ?? null;
  const activeChannel = sortedEvents.find(
    event => event.id === activeChannelId
  );

  if (sortedEvents.length === 0) {
    return <EmptyTabMessage message="No channels created yet." />;
  }

  return (
    <div>
      <div className="sticky top-[52px] z-10 border-b bg-white px-2">
        <div className="scrollbar-none hide__scrollbar flex gap-2 overflow-x-auto py-2">
          {sortedEvents.map(event => (
            <button
              key={event.id}
              type="button"
              onClick={() => setSelectedChannelId(event.id)}
              className={cn(
                "shrink-0 cursor-pointer rounded-md px-2 py-1 text-sm font-medium transition-colors",
                activeChannelId === event.id
                  ? "bg-black text-white"
                  : "bg-neutral-100 hover:bg-neutral-200"
              )}
            >
              {event.eventName}
            </button>
          ))}
        </div>
      </div>

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
      ) : null}
    </div>
  );
}

function EventBannerSection({
  event,
  hostFullName,
}: {
  event: HostCreatorEvent;
  hostFullName: string;
}) {
  const organizationName =
    event.organizationName?.trim() || hostFullName.trim() || "Creator";

  const isMobile = useMediaQuery({
    maxWidth: "500px",
  });

  return (
    <>
      {isMobile ? (
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
}: {
  community: HostCreatorCommunity;
}) {
  const joinHref = exploreCommunityJoinHref(community.id);
  const bannerSrc = community.eventRoomBanner?.trim() || DEFAULT_EVENT_BANNER;
  const logoSrc = community.logoUrl?.trim() || null;
  const description = community.description?.trim() || null;

  const shouldReduceMotion = useReducedMotion();

  return (
    <article className="w-full overflow-hidden rounded-3xl border-2 border-gray-200 shadow-md">
      <Link
        href={community.locked ? "#" : joinHref}
        aria-disabled={community.locked}
        className={cn(
          "relative block w-full bg-neutral-100",
          community.locked && "pointer-events-none"
        )}
      >
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
