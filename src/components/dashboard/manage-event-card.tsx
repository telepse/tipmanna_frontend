"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Clock, Eye, Share2, Star, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";

import { changeEventVideoDisplaySettingsAction } from "@/actions/events";
import { EventRoomVideosModal } from "@/components/dashboard/event-room-videos-modal";
import { formatDate } from "@/lib/formatDate";
import { RootState } from "@/redux/store";

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
  hostSubscriptionTier?: "NONE" | "HOST_PREMIUM" | "HOST_COMMUNITY";
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
  hostSubscriptionTier = "NONE",
}: Props) {
  const user = useSelector((state: RootState) => state.auth.user);
  const params = useParams();
  const hostSlug = typeof params?.slug === "string" ? params.slug : "";

  const [videosOpen, setVideosOpen] = useState(false);
  const [showAmountRaised, setShowAmountRaised] = useState(
    showAmountRaisedOnVideos
  );
  const [showViewCount, setShowViewCount] = useState(showViewCountOnVideos);
  const [displaySaving, setDisplaySaving] = useState(false);

  useEffect(() => {
    setShowAmountRaised(showAmountRaisedOnVideos);
    setShowViewCount(showViewCountOnVideos);
  }, [showAmountRaisedOnVideos, showViewCountOnVideos]);

  const premiumHost =
    hostSubscriptionTier === "HOST_PREMIUM" ||
    hostSubscriptionTier === "HOST_COMMUNITY";

  let eventCode;
  if (user?.role === "HOST") {
    eventCode = user?.eventCode;
  }

  const persistVideoDisplaySettings = async (next: {
    showAmountRaisedOnVideos: boolean;
    showViewCountOnVideos: boolean;
  }) => {
    setDisplaySaving(true);
    try {
      const res = await changeEventVideoDisplaySettingsAction(next, id);
      if (!res.success) {
        toast.error(res.message ?? "Could not update video display settings");
        setShowAmountRaised(showAmountRaisedOnVideos);
        setShowViewCount(showViewCountOnVideos);
        return;
      }
      toast.success("Video display settings updated");
    } finally {
      setDisplaySaving(false);
    }
  };

  return (
    <>
      <div className="bg-card flex flex-wrap items-center justify-between gap-4 rounded-md border p-6">
        <div className="space-y-2">
          <h5 className="text-xl font-semibold">{eventName}</h5>
          <p className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
            {formatDate(eventDate)} <Clock className="size-4" /> {startTime} -{" "}
            {endTime} &middot; Performers:{" "}
          </p>
          <p className="text-muted-foreground flex items-center gap-2 text-sm">
            <span className="text-primary">Tips raised:</span>{" "}
            <span className="text-primary font-semibold">
              &pound;{amountRaised || 0}
            </span>{" "}
            <span>Event code: {eventCode}</span>
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
          {premiumHost && approved ? (
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between gap-4">
                <Label
                  htmlFor={`show-amount-${id}`}
                  className="text-muted-foreground text-sm font-normal"
                >
                  Show amount raised on videos
                </Label>
                <Switch
                  id={`show-amount-${id}`}
                  checked={showAmountRaised}
                  disabled={displaySaving}
                  onCheckedChange={checked => {
                    setShowAmountRaised(checked);
                    void persistVideoDisplaySettings({
                      showAmountRaisedOnVideos: checked,
                      showViewCountOnVideos: showViewCount,
                    });
                  }}
                />
              </div>
              <div className="flex items-center justify-between gap-4">
                <Label
                  htmlFor={`show-views-${id}`}
                  className="text-muted-foreground text-sm font-normal"
                >
                  Show view count on videos
                </Label>
                <Switch
                  id={`show-views-${id}`}
                  checked={showViewCount}
                  disabled={displaySaving}
                  onCheckedChange={checked => {
                    setShowViewCount(checked);
                    void persistVideoDisplaySettings({
                      showAmountRaisedOnVideos: showAmountRaised,
                      showViewCountOnVideos: checked,
                    });
                  }}
                />
              </div>
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
          <Button
            type="button"
            disabled={!approved}
            className="bg-secondary/20 w-fit text-black"
            onClick={() => setVideosOpen(true)}
          >
            <Video className="size-4" /> View videos
          </Button>
          <Button
            asChild
            disabled={!approved || !hostSlug}
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
          <Button
            disabled={!approved}
            className="bg-secondary/20 w-fit text-black"
          >
            <Share2 /> Share
          </Button>
        </div>
      </div>

      <EventRoomVideosModal
        open={videosOpen}
        onOpenChange={setVideosOpen}
        eventId={id}
        eventName={eventName}
      />
    </>
  );
}
