"use client";

import { useCallback, useMemo, useState } from "react";

import Link from "next/link";

import { useParams } from "next/navigation";

import { useSelector } from "react-redux";

import { toast } from "react-toastify";

import {
  Calendar,
  Copy,
  FileText,
  Layers3,
  TrendingUp,
  User,
  Users,
  Video,
  Wallet,
} from "lucide-react";

import { Button } from "@/components/ui/button";

import type { HostPayoutSummaryBlock } from "@/actions/host-payouts";

import type { HostStatsSummary } from "@/hooks/useHostStats";

import { EventStatCard } from "./event-stat-card";

import { RecentEventCard } from "./recent-event-card";

import { AchievementCard } from "./achievement-card";

import { useHostSession } from "@/hooks/use-host-session";

import type { RootState } from "@/redux/store";

import { GenerateQrButton } from "./generate-qr-button";

import { getPublicAbsoluteUrl } from "@/lib/site-config";

import { ACHIEVEMENTS } from "@/constants";

import type { Event } from "@/types";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";

import { useForm } from "react-hook-form";

import { CreatorFormData, creatorSchema } from "@/schemas/creator.schema";

import { zodResolver } from "@hookform/resolvers/zod";

import {
  getCreatorProfileForEditHostAction,
  updateCreatorProfileHostAction,
} from "@/actions/host-creator";

import { Input } from "../ui/input";

import { cn, formatNextUsernameChange } from "@/lib/utils";

import { useImageUpload } from "@/hooks/use-image-upload";

import { dispatchCreatorUsernameChanged } from "@/lib/creator-username-alias";

import { migrateCreatorProfileCacheUsername } from "@/lib/drawer-prefetch-cache";

import { tryUploadImage } from "@/lib/cloudinary";

import { Textarea } from "../ui/textarea";

interface Props {
  events: Event[];
  stats: HostStatsSummary | null;
  payoutSummary?: HostPayoutSummaryBlock | null;
}

type SubmissionFilter =
  | "all"
  | "content_only"
  | "event_only"
  | "event_and_content";

const SUBMISSION_FILTERS: {
  value: SubmissionFilter;
  label: string;
  shortLabel: string;
  icon: typeof Layers3;
}[] = [
  {
    value: "all",
    label: "All",
    shortLabel: "All",
    icon: Layers3,
  },
  {
    value: "content_only",
    label: "Content only",
    shortLabel: "Content",
    icon: FileText,
  },
  {
    value: "event_only",
    label: "Event only",
    shortLabel: "Events",
    icon: Calendar,
  },
  {
    value: "event_and_content",
    label: "Event + content",
    shortLabel: "Event and content",
    icon: Video,
  },
];

const normalizeSubmissionKind = (value?: string | null): SubmissionFilter => {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  if (normalized === "content_only") {
    return "content_only";
  }

  if (normalized === "event_only") {
    return "event_only";
  }

  if (
    normalized === "event_and_content" ||
    normalized === "event_content" ||
    normalized === "event_andcontent"
  ) {
    return "event_and_content";
  }

  return "event_only";
};

export const HostStats = ({ events, stats }: Props) => {
  const user = useSelector((state: RootState) => state.auth.user);
  const hostSession = useHostSession();
  const params = useParams();

  const [, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creatorProfileCopied, setCreatorProfileCopied] = useState(false);

  const [tabType, setTabType] = useState<"recent_events" | "creator_profile">(
    "creator_profile"
  );

  const [submissionFilter, setSubmissionFilter] =
    useState<SubmissionFilter>("all");

  /*
   * Keep the stats visible as long as an authenticated user exists.
   *
   * The previous strict:
   *
   *   user.role !== "HOST"
   *
   * could cause the entire component to return null if the runtime
   * role value differs in casing or representation.
   */

  const creatorForm = useForm<CreatorFormData>({
    resolver: zodResolver(creatorSchema),
    defaultValues: {
      username: hostSession.username || "",
      pageDescription: "",
      profileImageUrl: null,
      externalLinkUrl: "",
      externalLinkLabel: "",
    },
  });

  const savedProfileImageUrl = creatorForm.watch("profileImageUrl");

  const [bannerAvatarUrl, setBannerAvatarUrl] = useState<string | null>(null);
  const [pendingProfileImageUrl, setPendingProfileImageUrl] = useState<
    string | null
  >(null);
  const [modalAvatarUrl, setModalAvatarUrl] = useState<string | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [canChangeUsername, setCanChangeUsername] = useState(true);

  const [loadedHostUsername, setLoadedHostUsername] = useState<string | null>(
    null
  );

  const [nextUsernameChangeAt, setNextUsernameChangeAt] = useState<
    string | null
  >(null);

  const [usernameChangeOverride, setUsernameChangeOverride] = useState(false);

  const resolveKnownAvatarUrl = useCallback(
    () =>
      bannerAvatarUrl ??
      modalAvatarUrl ??
      pendingProfileImageUrl ??
      savedProfileImageUrl ??
      null,
    [
      bannerAvatarUrl,
      modalAvatarUrl,
      pendingProfileImageUrl,
      savedProfileImageUrl,
    ]
  );

  const {
    readableImage,
    error: imageError,
    inputRef,
    handleImageUpload,
    handleChangeImage,
    handleRemoveImage,
    setReadableImage,
  } = useImageUpload({
    maxSizeMB: 2,
  });

  const dialogAvatarSrc =
    (readableImage?.startsWith("data:") ? readableImage : null) ??
    modalAvatarUrl ??
    readableImage ??
    pendingProfileImageUrl ??
    bannerAvatarUrl ??
    savedProfileImageUrl ??
    null;

  const applyProfileImage = useCallback(
    (imageUrl: string | null) => {
      if (imageUrl) {
        setBannerAvatarUrl(imageUrl);
        setPendingProfileImageUrl(imageUrl);
        setModalAvatarUrl(imageUrl);
        setReadableImage(imageUrl);
        creatorForm.setValue("profileImageUrl", imageUrl);
      } else {
        setBannerAvatarUrl(null);
        setPendingProfileImageUrl(null);
        setModalAvatarUrl(null);
        setReadableImage(null);
        creatorForm.setValue("profileImageUrl", null);
      }
    },
    [creatorForm, setReadableImage]
  );

  const onSubmitCreator = async (values: CreatorFormData) => {
    setSaving(true);

    try {
      let profileImageUrl: string | null =
        pendingProfileImageUrl ?? bannerAvatarUrl ?? null;

      if (readableImage?.startsWith("data:")) {
        const uploaded = await tryUploadImage(readableImage);

        if (!uploaded.ok) {
          toast.error(uploaded.message);
          return;
        }

        profileImageUrl = uploaded.data?.secure_url ?? null;

        if (!profileImageUrl) {
          toast.error("Could not upload profile picture. Try again.");
          return;
        }
      } else if (readableImage?.startsWith("http")) {
        profileImageUrl = readableImage;
      } else if (!readableImage && !pendingProfileImageUrl) {
        profileImageUrl = null;
      }

      const previousUsername =
        loadedHostUsername ?? creatorForm.getValues("username") ?? "";

      const res = await updateCreatorProfileHostAction({
        username: values.username.trim(),
        profileImageUrl,
        pageDescription: values.pageDescription?.trim() || null,
        externalLinkUrl: values.externalLinkUrl?.trim() || null,
        externalLinkLabel: values.externalLinkLabel?.trim() || null,
        previousUsername,
      });

      if (!res.success || !res.data) {
        toast.error(res.message ?? "Could not update creator profile");
        return;
      }

      const updated = res.data;

      applyProfileImage(updated.profileImageUrl);
      setCanChangeUsername(updated.canChangeUsername);
      setNextUsernameChangeAt(updated.nextUsernameChangeAt);
      setUsernameChangeOverride(updated.usernameChangeOverride);

      if (updated.username !== previousUsername) {
        setLoadedHostUsername(updated.username);

        migrateCreatorProfileCacheUsername(previousUsername, updated.username);

        dispatchCreatorUsernameChanged({
          previousUsername,
          username: updated.username,
        });
      }

      toast.success("Creator profile updated successfully");
    } finally {
      setSaving(false);
    }
  };

  const loadCreatorProfile = useCallback(async () => {
    setLoadingProfile(true);

    try {
      const res = await getCreatorProfileForEditHostAction();

      if (!res.success || !res.data) {
        toast.error(res.message ?? "Could not load creator profile");
        return;
      }

      const profile = res.data;

      setLoadedHostUsername(profile.username);

      creatorForm.reset({
        username: profile.username,
        pageDescription: profile.pageDescription ?? "",
        profileImageUrl:
          profile.profileImageUrl ?? creatorForm.getValues("profileImageUrl"),
        externalLinkUrl: profile.externalLink?.url ?? "",
        externalLinkLabel: profile.externalLink?.label ?? "",
      });

      if (profile.profileImageUrl) {
        applyProfileImage(profile.profileImageUrl);
      }

      setCanChangeUsername(profile.canChangeUsername);
      setNextUsernameChangeAt(profile.nextUsernameChangeAt);
      setUsernameChangeOverride(profile.usernameChangeOverride);
    } finally {
      setLoadingProfile(false);
    }
  }, [applyProfileImage, creatorForm]);

  const totalEventsCreated = stats?.totalEventsCreated ?? 0;
  const totalAttendeesReached = stats?.totalAttendeesReached ?? 0;
  const numOfTips = stats?.totalTips ?? 0;
  const totalAmountRaised = stats?.totalTipsEarned ?? 0;

  const earnings = Number((totalAmountRaised * 0.7).toFixed(2));

  const achievementChecks = [
    totalEventsCreated >= 1,
    totalAttendeesReached >= 1000,
    totalEventsCreated >= 25,
  ];

  const progress =
    (achievementChecks.filter(Boolean).length / achievementChecks.length) * 100;

  const metCount = achievementChecks.filter(Boolean).length;
  const totalCount = achievementChecks.length;
  const fractionProgress = `${metCount}/${totalCount}`;

  /*
   * Submission-kind counts.
   *
   * These are calculated from the complete events collection so the
   * numbers remain stable when the user switches between filters.
   */
  const submissionCounts = useMemo(() => {
    return events.reduce(
      (counts, event) => {
        const kind = normalizeSubmissionKind(event.submissionKind);

        counts[kind] += 1;
        counts.all += 1;

        return counts;
      },
      {
        all: 0,
        content_only: 0,
        event_only: 0,
        event_and_content: 0,
      } satisfies Record<SubmissionFilter, number>
    );
  }, [events]);

  /*
   * Apply the selected submission-kind filter before limiting the list
   * to the five most recent events.
   */
  const filteredRecentEvents = useMemo(() => {
    const filtered =
      submissionFilter === "all"
        ? events
        : events.filter(
            event =>
              normalizeSubmissionKind(event.submissionKind) === submissionFilter
          );

    return filtered.slice(0, 5);
  }, [events, submissionFilter]);

  if (!user) return null;

  const eventSlug =
    typeof params?.slug === "string"
      ? params.slug
      : (hostSession.eventSlug ?? ("eventSlug" in user ? user.eventSlug : ""));

  const eventCode = hostSession.eventCode;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(String(eventCode ?? ""));
      setCopied(true);
      toast.success("Event code copied");
    } catch (error) {
      console.error(error);
    }
  };

  const handleCreatorProfileCopy = async () => {
    try {
      await navigator.clipboard.writeText(
        `${process.env.NEXT_PUBLIC_SITE_URL}/@${String(
          hostSession.username ?? ""
        )}`
      );
      setCreatorProfileCopied(true);
      toast.success("Creator profile copied");
    } catch (error) {
      console.error(error);
    }
  };

  const fullLink = getPublicAbsoluteUrl(
    `/join-host/${eventSlug}?eventCode=${encodeURIComponent(
      String(eventCode ?? "")
    )}`
  );

  return (
    <div className="grid w-full min-w-0 grid-cols-12 gap-6 overflow-x-hidden">
      {/* =========================================================
          LEFT / MAIN COLUMN
          ========================================================= */}
      <div className="col-span-full min-w-0 space-y-6 lg:col-span-7">
        {/* Event statistics */}
        <div className="bg-card min-w-0 space-y-6 rounded-xl border p-4 shadow-sm sm:p-6">
          <h2 className="text-2xl font-semibold">Event statistics</h2>

          <div className="grid grid-cols-2 gap-4">
            <EventStatCard
              title="Channels Created"
              value={totalEventsCreated}
              icon={Calendar}
            />

            <EventStatCard
              title="Tips"
              value={numOfTips}
              icon={Users}
            />

            <EventStatCard
              title="Tips Received"
              value={totalAmountRaised}
              icon={Wallet}
              isMoney
            />

            <EventStatCard
              title="Earnings"
              value={earnings}
              icon={TrendingUp}
              isMoney
            />
          </div>
        </div>

        {/* Recent events / Creator profile */}
        <div className="bg-card min-w-0 space-y-6 overflow-hidden rounded-xl border p-4 shadow-sm sm:p-6">
          <div className="flex min-w-0 flex-col gap-4">
            <Tabs
              value={tabType}
              onValueChange={val =>
                setTabType(val as "recent_events" | "creator_profile")
              }
              className="flex min-w-0 flex-col gap-4"
            >
              <TabsList className="scrollbar-hide flex h-14! w-full max-w-full touch-pan-x justify-start gap-1 overflow-x-auto overflow-y-hidden overscroll-x-contain sm:justify-center">
                <TabsTrigger
                  value="creator_profile"
                  className="data-[state=active]:border-b-primary h-13! shrink-0 rounded-none bg-white px-4 font-semibold data-[state=active]:border-b-2"
                >
                  Creator profile
                </TabsTrigger>

                <TabsTrigger
                  value="recent_events"
                  className="data-[state=active]:border-b-primary h-13! shrink-0 rounded-none bg-white px-4 font-semibold data-[state=active]:border-b-2"
                >
                  Event rooms
                </TabsTrigger>
              </TabsList>

              {/* =====================================================
                  RECENT EVENTS
                  ===================================================== */}
              <TabsContent
                value="recent_events"
                className="space-y-4"
              >
                {/* Event code section */}
                <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex min-w-0 flex-col gap-3 rounded-lg bg-gray-200 p-3 sm:flex-row sm:flex-wrap sm:items-center">
                    <span className="shrink-0 font-medium">
                      Host event code
                    </span>

                    <div className="flex items-center gap-2">
                      <Button
                        onClick={handleCopy}
                        className="w-fit max-w-full"
                      >
                        <Copy />

                        <span className="max-w-[180px] truncate">
                          {eventCode}
                        </span>
                      </Button>

                      <div className="w-full sm:w-auto">
                        <GenerateQrButton link={fullLink} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent events heading */}
                <div className="flex min-w-0 items-center justify-between gap-2">
                  <h2 className="text-2xl font-semibold">Recent events</h2>

                  <Link
                    href={`/join-host/${eventSlug}?eventCode=${eventCode}`}
                    className="text-muted-foreground w-fit text-sm"
                    target="_blank"
                  >
                    View all events
                  </Link>
                </div>

                {/* =====================================================
                    SUBMISSION KIND FILTER
                    ===================================================== */}
                <div className="min-w-0">
                  <div className="scrollbar-hide flex w-full min-w-0 gap-2 overflow-x-auto pb-1">
                    {SUBMISSION_FILTERS.map(filter => {
                      const Icon = filter.icon;
                      const isActive = submissionFilter === filter.value;
                      const count = submissionCounts[filter.value];

                      return (
                        <button
                          key={filter.value}
                          type="button"
                          onClick={() => setSubmissionFilter(filter.value)}
                          className={cn(
                            "inline-flex h-7 shrink-0 items-center gap-2 rounded-lg border px-1 text-xs font-medium transition-all sm:text-sm",
                            isActive
                              ? "border-primary bg-primary text-primary-foreground shadow-sm"
                              : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                          )}
                          aria-pressed={isActive}
                        >
                          <Icon className="size-4 shrink-0" />

                          <span className="sm:hidden">{filter.shortLabel}</span>

                          <span className="hidden sm:inline">
                            {filter.label}
                          </span>

                          <span
                            className={cn(
                              "inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] leading-5 font-semibold",
                              isActive
                                ? "bg-primary-foreground/15 text-primary-foreground"
                                : "bg-muted text-muted-foreground"
                            )}
                          >
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Recent event cards */}
                <div className="h-[270px] min-w-0 space-y-4 overflow-y-auto">
                  {filteredRecentEvents.length > 0 ? (
                    filteredRecentEvents.map((event: Event) => (
                      <RecentEventCard
                        key={event.id}
                        id={event.id}
                        eventName={event.eventName}
                        eventDate={event.eventDate}
                        numOfTips={event.numOfTips}
                        amountRaised={event.amountRaised}
                        accessMode={event.accessMode}
                        amountToRaise={event.amountToRaise}
                        submissionKind={event.submissionKind ?? ""}
                        organizationName={event.organizationName}
                        eventReminders={Number(event.eventReminders ?? 0)}
                      />
                    ))
                  ) : (
                    <div className="flex h-full min-h-[180px] items-center justify-center rounded-lg border border-dashed">
                      <div className="text-center">
                        <div className="bg-muted mx-auto mb-3 flex size-10 items-center justify-center rounded-full">
                          {submissionFilter === "content_only" ? (
                            <FileText className="text-muted-foreground size-5" />
                          ) : submissionFilter === "event_only" ? (
                            <Calendar className="text-muted-foreground size-5" />
                          ) : submissionFilter === "event_and_content" ? (
                            <Video className="text-muted-foreground size-5" />
                          ) : (
                            <Layers3 className="text-muted-foreground size-5" />
                          )}
                        </div>

                        <p className="text-sm font-medium">
                          No{" "}
                          {submissionFilter === "content_only"
                            ? "content-only"
                            : submissionFilter === "event_only"
                              ? "event-only"
                              : submissionFilter === "event_and_content"
                                ? "event + content"
                                : ""}{" "}
                          rooms yet
                        </p>

                        <p className="text-muted-foreground mt-1 text-xs">
                          Your matching rooms will appear here.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* =====================================================
                  CREATOR PROFILE
                  ===================================================== */}
              <TabsContent
                value="creator_profile"
                className="space-y-4"
              >
                <Button
                  variant="outline"
                  onClick={handleCreatorProfileCopy}
                  className="w-fit max-w-full"
                >
                  <Copy />

                  <span className="max-w-[180px] truncate">
                    Your public handle
                  </span>
                </Button>

                {loadingProfile ? (
                  <p className="text-muted-foreground text-sm">
                    Loading profile…
                  </p>
                ) : null}

                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={handleChangeImage}
                      className="relative size-20 shrink-0 overflow-hidden rounded-full border bg-neutral-100"
                    >
                      {dialogAvatarSrc ? (
                        <img
                          src={dialogAvatarSrc}
                          alt=""
                          className="size-full object-cover"
                        />
                      ) : (
                        <div className="flex size-full items-center justify-center">
                          <User className="text-muted-foreground size-10" />
                        </div>
                      )}
                    </button>

                    <div className="min-w-0 space-y-2">
                      <input
                        ref={inputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={handleImageUpload}
                      />

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleChangeImage}
                      >
                        Upload photo
                      </Button>

                      {dialogAvatarSrc ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => {
                            handleRemoveImage();
                            setModalAvatarUrl(null);
                            setPendingProfileImageUrl(null);
                            creatorForm.setValue("profileImageUrl", null);
                          }}
                        >
                          Remove photo
                        </Button>
                      ) : null}

                      {imageError ? (
                        <p className="text-destructive text-xs">{imageError}</p>
                      ) : null}
                    </div>
                  </div>

                  <Form {...creatorForm}>
                    <form
                      onSubmit={creatorForm.handleSubmit(onSubmitCreator)}
                      className="space-y-5"
                    >
                      <fieldset
                        disabled={loadingProfile || saving}
                        className="space-y-5"
                      >
                        <FormField
                          control={creatorForm.control}
                          name="username"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Username</FormLabel>

                              <FormControl>
                                <Input
                                  {...field}
                                  disabled={!canChangeUsername}
                                  className={cn(
                                    !canChangeUsername &&
                                      "cursor-not-allowed opacity-60"
                                  )}
                                />
                              </FormControl>

                              {!canChangeUsername && nextUsernameChangeAt ? (
                                <FormDescription>
                                  Usernames can be changed once per month. Next
                                  change available{" "}
                                  {formatNextUsernameChange(
                                    nextUsernameChangeAt
                                  )}
                                  {usernameChangeOverride
                                    ? " (override active)"
                                    : ""}
                                  .
                                </FormDescription>
                              ) : (
                                <FormDescription>
                                  Your public handle is @
                                  {field.value || "username"}.
                                  {usernameChangeOverride
                                    ? " Username change override is active."
                                    : ""}
                                </FormDescription>
                              )}

                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={creatorForm.control}
                          name="pageDescription"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Page description</FormLabel>

                              <FormControl>
                                <Textarea
                                  {...field}
                                  rows={4}
                                  placeholder="Tell followers what your page is about"
                                />
                              </FormControl>

                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="space-y-3 rounded-md border p-3">
                          <p className="text-sm font-medium">External link</p>

                          <FormField
                            control={creatorForm.control}
                            name="externalLinkLabel"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Link label</FormLabel>

                                <FormControl>
                                  <Input
                                    {...field}
                                    placeholder="My website"
                                  />
                                </FormControl>

                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={creatorForm.control}
                            name="externalLinkUrl"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Link URL</FormLabel>

                                <FormControl>
                                  <Input
                                    {...field}
                                    placeholder="https://example.com"
                                  />
                                </FormControl>

                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <Button
                          type="submit"
                          disabled={saving || loadingProfile}
                        >
                          {saving ? "Saving…" : "Save"}
                        </Button>
                      </fieldset>
                    </form>
                  </Form>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* =========================================================
          RIGHT COLUMN — ACHIEVEMENTS
          ========================================================= */}
      <aside className="col-span-full min-w-0 space-y-6 lg:col-span-5">
        <div className="bg-card min-w-0 space-y-6 overflow-hidden rounded-xl border p-4 shadow-sm sm:p-6">
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-2xl font-semibold">Achievements</h2>

            <span className="text-muted-foreground shrink-0">
              {fractionProgress}
            </span>
          </div>

          <div className="text-muted-foreground flex justify-between gap-4">
            <span>Progress</span>

            <span className="text-right">
              {Math.min(Math.max(progress, 0), 100).toFixed(2)}% complete
            </span>
          </div>

          <div className="-mt-4 h-2 w-full overflow-hidden rounded-md bg-black">
            <div
              className="bg-primary h-full transition-all duration-300"
              style={{
                width: `${Math.min(Math.max(progress, 0), 100)}%`,
              }}
            />
          </div>

          <div className="space-y-4">
            {ACHIEVEMENTS.map((achievement, index) => {
              const Icon = achievement.icon;

              return (
                <AchievementCard
                  key={achievement.title}
                  title={achievement.title}
                  subtitle={achievement.subtitle}
                  icon={Icon}
                  iconColor={achievement.iconColor}
                  met={achievementChecks[index] ?? false}
                />
              );
            })}
          </div>
        </div>
      </aside>
    </div>
  );
};
