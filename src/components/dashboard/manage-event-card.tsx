"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSWRConfig } from "swr";

import { Clock, Eye, MoveUpRight, Share2, Star, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "react-toastify";

import { changeEventVideoDisplaySettingsAction } from "@/actions/events";
import { EventRoomVideosModal } from "@/components/dashboard/event-room-videos-modal";
import { PremiumFeatureBadge } from "@/components/dashboard/premium-feature-badge";
import { useHostPlanCapabilities } from "@/hooks/useHostPlanCapabilities";
import { useHostSession } from "@/hooks/use-host-session";
import {
  useHostSubscriptionPrompt,
  type HostSubscriptionPromptFns,
} from "@/hooks/use-host-subscription-prompt";
import { HOST_EVENTS_TABS_SWR_KEY } from "@/hooks/useHostEventsTabs";
import { formatDate } from "@/lib/formatDate";
import { buildChannelSharePath } from "@/lib/public-video-url";
import { setHostSubscriptionResume } from "@/lib/host-subscription-resume";

interface DefaultChannelInfo {
  id: string;
  title: string;
  url: string;
  numOfTips?: number;
}

interface Props {
  id: string;
  eventName: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  approved: boolean;
  amountRaised: number;
  numOfTips: number;
  showAmountRaisedOnVideos?: boolean;
  showViewCountOnVideos?: boolean;
  showEncounterOnVideos?: boolean;
  hostSubscriptionTier?: "NONE" | "HOST_PREMIUM" | "HOST_COMMUNITY";
  variant?: "event" | "channel";
  defaultChannel?: DefaultChannelInfo;
  subscriptionPrompt?: HostSubscriptionPromptFns;
}

export function ManageEventCard({
  id,
  eventName,
  eventDate,
  startTime,
  endTime,
  approved,
  amountRaised,
  numOfTips,
  showAmountRaisedOnVideos = true,
  showViewCountOnVideos = false,
  showEncounterOnVideos = false,
  variant = "event",
  defaultChannel,
  subscriptionPrompt,
}: Props) {
  const hostSession = useHostSession();
  const params = useParams();
  const hostSlug = typeof params?.slug === "string" ? params.slug : "";
  const { capabilities, status } = useHostPlanCapabilities();
  const localPrompt = useHostSubscriptionPrompt({ focusTier: "premium" });
  const { openForLapsed, openForRequired, handleSubscriptionActionError } =
    subscriptionPrompt ?? localPrompt;
  const { mutate } = useSWRConfig();

  const [videosOpen, setVideosOpen] = useState(false);
  const [showAmountRaised, setShowAmountRaised] = useState(
    showAmountRaisedOnVideos
  );
  const [showViewCount, setShowViewCount] = useState(showViewCountOnVideos);
  const [showEncounter, setShowEncounter] = useState(showEncounterOnVideos);
  const [displaySaving, setDisplaySaving] = useState(false);

  useEffect(() => {
    setShowAmountRaised(showAmountRaisedOnVideos);
    setShowViewCount(showViewCountOnVideos);
    setShowEncounter(showEncounterOnVideos);
  }, [showAmountRaisedOnVideos, showViewCountOnVideos, showEncounterOnVideos]);

  const eventCode = hostSession.eventCode;

  const canToggleDisplay = capabilities.toggleVideoDisplaySettings;
  const canAccessTipLayout = capabilities.accessTipLayout;
  const isChannelVariant = variant === "channel";

  const promptPremiumAccess = () => {
    if (status === "lapsed") {
      openForLapsed("premium");
      return;
    }
    openForRequired("premium");
  };

  const promptTipLayoutAccess = () => {
    if (hostSlug) {
      setHostSubscriptionResume({
        kind: "return-path",
        returnPath: `/host/${hostSlug}/tip-customization/${id}`,
      });
    }
    promptPremiumAccess();
  };

  const displayTitle = isChannelVariant
    ? defaultChannel?.title?.trim() || "Default channel"
    : eventName;
  const channelSharePath =
    isChannelVariant && defaultChannel
      ? buildChannelSharePath({ eventId: id, channelId: defaultChannel.id })
      : null;

  const persistVideoDisplaySettings = async (next: {
    showAmountRaisedOnVideos: boolean;
    showViewCountOnVideos: boolean;
    showEncounterOnVideos: boolean;
  }) => {
    if (!canToggleDisplay) {
      promptPremiumAccess();
      return;
    }
    setDisplaySaving(true);
    try {
      const res = await changeEventVideoDisplaySettingsAction(next, id);
      if (!res.success) {
        if (handleSubscriptionActionError(res, { focusTier: "premium" })) {
          setShowAmountRaised(showAmountRaisedOnVideos);
          setShowViewCount(showViewCountOnVideos);
          setShowEncounter(showEncounterOnVideos);
          return;
        }
        toast.error(res.message ?? "Could not update video display settings");
        setShowAmountRaised(showAmountRaisedOnVideos);
        setShowViewCount(showViewCountOnVideos);
        setShowEncounter(showEncounterOnVideos);
        return;
      }
      toast.success("Video display settings updated");
      void mutate(HOST_EVENTS_TABS_SWR_KEY);
    } finally {
      setDisplaySaving(false);
    }
  };

  const premiumToggleRow = (
    idSuffix: string,
    label: string,
    checked: boolean,
    onCheckedChange: (checked: boolean) => void
  ) => (
    <div className="flex items-center justify-between gap-4">
      <Label
        htmlFor={`${idSuffix}-${id}`}
        className="text-muted-foreground flex items-center gap-1.5 text-sm font-normal"
      >
        {label}
        {!canToggleDisplay ? (
          <PremiumFeatureBadge label="Requires Host Growth — tap to subscribe or renew" />
        ) : null}
      </Label>
      <Switch
        id={`${idSuffix}-${id}`}
        checked={checked}
        disabled={displaySaving}
        onCheckedChange={onCheckedChange}
      />
    </div>
  );

  const router = useRouter();

  return (
    <>
      <div className="bg-card flex flex-wrap items-center justify-between gap-4 rounded-md border p-6">
        <div className="space-y-2">
          <h5 className="flex items-center gap-2 text-xl font-semibold">
            {displayTitle}{" "}
            <button
              type="button"
              onClick={() =>
                router.push(`/host/${hostSlug}/manage-event/${id}`)
              }
              className="text-primary flex cursor-pointer items-center gap-1 px-3 py-2 text-sm"
            >
              <MoveUpRight className="size-3 sm:size-4" />{" "}
              <span className="underline underline-offset-2">edit</span>
            </button>
          </h5>
          {isChannelVariant ? (
            <p className="text-muted-foreground text-sm">
              Event room: {eventName}
            </p>
          ) : null}
          {isChannelVariant && defaultChannel?.url ? (
            <p className="text-muted-foreground truncate text-xs">
              {defaultChannel.url}
            </p>
          ) : null}
          <p className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
            {formatDate(eventDate)} <Clock className="size-4" /> {startTime} -{" "}
            {endTime}
            {!isChannelVariant ? <> &middot; Performers: </> : null}
          </p>
          <p className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
            <span className="text-primary">Tips raised:</span>{" "}
            <span className="text-primary font-semibold">
              &pound;{amountRaised || 0}
            </span>{" "}
            {isChannelVariant && defaultChannel ? (
              <span>Channel tips: {defaultChannel.numOfTips ?? 0}</span>
            ) : (
              <span>Event code: {eventCode}</span>
            )}
          </p>
          <p className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
            <span>Tippers engaged:</span>{" "}
            <span className="font-semibold">{numOfTips || 0}</span>{" "}
            <Star className="text-primary fill-primary size-4" />{" "}
            <span>Avg rating:</span>5{" "}
            <span>
              {approved ? (
                <span className="rounded-md bg-green-600 px-2 py-1 text-sm text-white">
                  Approved
                </span>
              ) : (
                <span className="text-primary bg-primary/20 rounded-md px-2 py-1 text-sm">
                  Pending
                </span>
              )}
            </span>
          </p>
          {approved && variant !== "channel" ? (
            <div className="space-y-2 pt-1">
              {premiumToggleRow(
                "show-amount",
                "Show amount raised on videos",
                showAmountRaised,
                checked => {
                  if (!canToggleDisplay) {
                    promptPremiumAccess();
                    return;
                  }
                  setShowAmountRaised(checked);
                  void persistVideoDisplaySettings({
                    showAmountRaisedOnVideos: checked,
                    showViewCountOnVideos: showViewCount,
                    showEncounterOnVideos: showEncounter,
                  });
                }
              )}
              {premiumToggleRow(
                "show-views",
                "Show view count on videos (10s+)",
                showViewCount,
                checked => {
                  if (!canToggleDisplay) {
                    promptPremiumAccess();
                    return;
                  }
                  setShowViewCount(checked);
                  void persistVideoDisplaySettings({
                    showAmountRaisedOnVideos: showAmountRaised,
                    showViewCountOnVideos: checked,
                    showEncounterOnVideos: showEncounter,
                  });
                }
              )}
              {premiumToggleRow(
                "show-encounter",
                "Show video encounters on videos",
                showEncounter,
                checked => {
                  if (!canToggleDisplay) {
                    promptPremiumAccess();
                    return;
                  }
                  setShowEncounter(checked);
                  void persistVideoDisplaySettings({
                    showAmountRaisedOnVideos: showAmountRaised,
                    showViewCountOnVideos: showViewCount,
                    showEncounterOnVideos: checked,
                  });
                }
              )}
              {!canToggleDisplay ? (
                <p className="text-muted-foreground text-xs">
                  <button
                    type="button"
                    className="text-primary underline"
                    onClick={promptPremiumAccess}
                  >
                    Subscribe to Host Growth
                  </button>{" "}
                  to control public video metrics.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col items-start gap-1 md:items-end">
          {approved ? (
            <Button
              asChild
              className="bg-secondary/20 text-black"
            >
              <Link
                href={`/room/${id}`}
                prefetch={true}
                className="inline-flex items-center gap-2"
              >
                <Eye /> View event room
              </Link>
            </Button>
          ) : (
            <Button
              disabled
              className="bg-secondary/20 text-black"
            >
              <Eye /> View event room
            </Button>
          )}
          {isChannelVariant ? (
            approved && channelSharePath ? (
              <Button
                asChild
                className="bg-secondary/20 w-fit text-black"
              >
                <Link
                  href={channelSharePath}
                  prefetch={false}
                  className="inline-flex items-center gap-2"
                >
                  <Video className="size-4" /> View default channel
                </Link>
              </Button>
            ) : (
              <Button
                disabled
                className="bg-secondary/20 w-fit text-black"
              >
                <Video className="size-4" /> View default channel
              </Button>
            )
          ) : (
            <Button
              type="button"
              disabled={!approved}
              className="bg-secondary/20 w-fit text-black"
              onClick={() => setVideosOpen(true)}
            >
              <Video className="size-4" /> View videos
            </Button>
          )}
          {canAccessTipLayout && approved && hostSlug ? (
            <Button
              asChild
              className="bg-secondary/20 w-fit text-black"
            >
              <Link
                href={`/host/${hostSlug}/tip-customization/${id}`}
                prefetch={false}
                className="inline-flex items-center gap-2"
              >
                Tip layout
              </Link>
            </Button>
          ) : approved && hostSlug ? (
            <Button
              type="button"
              className="bg-secondary/20 inline-flex w-fit items-center gap-2 text-black"
              onClick={promptTipLayoutAccess}
            >
              <PremiumFeatureBadge className="size-3.5" />
              Tip layout
            </Button>
          ) : null}
          <Button
            disabled={!approved}
            className="bg-secondary/20 w-fit text-black"
          >
            <Share2 /> Share
          </Button>
        </div>
      </div>

      {!isChannelVariant ? (
        <EventRoomVideosModal
          open={videosOpen}
          onOpenChange={setVideosOpen}
          eventId={id}
          eventName={eventName}
        />
      ) : null}
      {!subscriptionPrompt ? localPrompt.SubscriptionPromptModal : null}
    </>
  );
}
