"use client";

import Image from "next/image";
import { Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { TipLinkPickerVideo } from "@/lib/tiplink-eligible-videos";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  videos: TipLinkPickerVideo[];
  creatingChannelId: string | null;
  onSelect: (video: TipLinkPickerVideo) => void;
};

export function TipLinkCreatePickerDialog({
  open,
  onOpenChange,
  videos,
  creatingChannelId,
  onSelect,
}: Props) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="max-h-[85vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create TipLink</DialogTitle>
        </DialogHeader>

        {videos.length === 0 ? (
          <div className="space-y-3 py-4 text-sm">
            <p className="text-muted-foreground">
              Add a video to one of your channels first, then come back to
              create a TipLink.
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </div>
        ) : (
          <ul className="space-y-2">
            {videos.map(video => {
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
            })}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
