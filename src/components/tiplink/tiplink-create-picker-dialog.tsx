"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { ArrowLeft, Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type {
  TipLinkPickerEvent,
  TipLinkPickerVideo,
} from "@/lib/tiplink-eligible-videos";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  events: TipLinkPickerEvent[];
  communityVideos: TipLinkPickerVideo[];
  creatingChannelId: string | null;
  onSelect: (video: TipLinkPickerVideo) => void;
  /** Dashboard picker: avoid showing empty catalog while fetching */
  loading?: boolean;
  error?: string | null;
};

export function TipLinkCreatePickerDialog({
  open,
  onOpenChange,
  events,
  communityVideos,
  creatingChannelId,
  onSelect,
  loading = false,
  error = null,
}: Props) {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [sourceTab, setSourceTab] = useState<"event_room" | "community_bank">(
    "event_room"
  );

  const selectedEvent = useMemo(
    () => events.find(event => event.id === selectedEventId) ?? null,
    [events, selectedEventId]
  );

  const hasCommunityVideos = communityVideos.length > 0;
  const hasEventVideos = events.length > 0;

  const resetPicker = () => {
    setSelectedEventId(null);
    setSourceTab("event_room");
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) resetPicker();
    onOpenChange(next);
  };

  const renderVideoButton = (video: TipLinkPickerVideo) => {
    const busy = creatingChannelId === video.channelId;
    return (
      <li key={video.channelId}>
        <button
          type="button"
          disabled={Boolean(creatingChannelId)}
          className="hover:bg-muted/50 flex w-full items-center gap-3 rounded-lg border p-2 text-left transition-colors disabled:opacity-60"
          onClick={() => onSelect(video)}
        >
          {video.thumb ? (
            <Image
              src={video.thumb}
              alt=""
              width={72}
              height={54}
              className="aspect-video rounded object-cover"
              unoptimized
            />
          ) : (
            <div className="bg-muted aspect-video w-[72px] rounded" />
          )}
          <span className="min-w-0 flex-1 text-sm font-medium">
            {video.title}
          </span>
          {busy ? (
            <Loader2 className="text-muted-foreground size-4 shrink-0 animate-spin" />
          ) : null}
        </button>
      </li>
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={handleOpenChange}
    >
      <DialogContent className="max-h-[85vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center">Create TipLink</DialogTitle>
        </DialogHeader>

        {creatingChannelId ? (
          <p className="text-muted-foreground flex items-center gap-2 text-sm">
            <Loader2 className="size-4 animate-spin" />
            Creating TipLink draft…
          </p>
        ) : null}

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="text-muted-foreground size-8 animate-spin" />
          </div>
        ) : error ? (
          <div className="space-y-3 py-4 text-sm">
            <p className="text-destructive text-center">{error}</p>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => handleOpenChange(false)}
            >
              Close
            </Button>
          </div>
        ) : !hasEventVideos && !hasCommunityVideos ? (
          <div className="space-y-3 py-4 text-sm">
            <p className="text-muted-foreground text-center">
              Add a video first, <br className="sm:hidden" /> then come back to
              create a TipLink.
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Close
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {hasCommunityVideos ? (
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={sourceTab === "event_room" ? "default" : "outline"}
                  onClick={() => {
                    setSourceTab("event_room");
                    setSelectedEventId(null);
                  }}
                >
                  Event rooms
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={
                    sourceTab === "community_bank" ? "default" : "outline"
                  }
                  onClick={() => {
                    setSourceTab("community_bank");
                    setSelectedEventId(null);
                  }}
                >
                  Community bank
                </Button>
              </div>
            ) : null}

            {sourceTab === "community_bank" && hasCommunityVideos ? (
              <ul className="space-y-2">
                {communityVideos.map(renderVideoButton)}
              </ul>
            ) : selectedEvent ? (
              <div className="space-y-3">
                <button
                  type="button"
                  className="text-muted-foreground inline-flex items-center gap-1 text-sm"
                  onClick={() => setSelectedEventId(null)}
                >
                  <ArrowLeft className="size-4" />
                  Back to event rooms
                </button>
                <p className="text-sm font-medium">{selectedEvent.eventName}</p>
                <ul className="space-y-2">
                  {selectedEvent.videos.map(renderVideoButton)}
                </ul>
              </div>
            ) : (
              <ul className="space-y-2">
                {events.map(event => (
                  <li key={event.id}>
                    <button
                      type="button"
                      disabled={Boolean(creatingChannelId)}
                      className="hover:bg-muted/50 flex w-full items-center justify-between rounded-lg border px-3 py-3 text-left text-sm font-medium transition-colors disabled:opacity-60"
                      onClick={() => setSelectedEventId(event.id)}
                    >
                      <span>{event.eventName}</span>
                      <span className="text-muted-foreground text-xs">
                        {event.videos.length} video
                        {event.videos.length === 1 ? "" : "s"}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
