"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, Loader2 } from "lucide-react";
import { toast } from "react-toastify";

import { getEventChannels } from "@/actions/events";
import {
  getExploreChannelMetricsBatchAction,
  type ExploreChannelMetrics,
} from "@/actions/contents";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { buildChannelShareUrl } from "@/lib/public-video-url";

type ChannelRow = {
  id: string;
  title: string;
  url: string;
  numOfTips?: number;
  restricted?: boolean;
};

type ChannelWithMetrics = ChannelRow & {
  shareUrl: string;
  metrics: ExploreChannelMetrics | null;
  metricsLoading: boolean;
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  eventName: string;
}

function ChannelMetricsRow({ item }: { item: ChannelWithMetrics }) {
  const [copied, setCopied] = useState(false);

  const copyShareUrl = async () => {
    try {
      await navigator.clipboard.writeText(item.shareUrl);
      setCopied(true);
      toast.success("Share link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy link");
    }
  };

  return (
    <div className="bg-muted/40 rounded-lg border p-4">
      <p className="font-medium">{item.title || "Untitled video"}</p>
      <p className="text-muted-foreground mt-1 truncate text-xs">{item.url}</p>
      <div className="text-muted-foreground mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        <span>Tips: {item.numOfTips ?? 0}</span>
        {item.metricsLoading ? (
          <span className="col-span-3 inline-flex items-center gap-1">
            <Loader2 className="size-3 animate-spin" /> Loading metrics…
          </span>
        ) : item.metrics ? (
          <>
            <span>Views: {item.metrics.encounters}</span>
            <span>Completes: {item.metrics.completes}</span>
            <span>Saves: {item.metrics.saves}</span>
          </>
        ) : (
          <span className="col-span-3">Metrics unavailable</span>
        )}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-3"
        onClick={() => void copyShareUrl()}
      >
        {copied ? (
          <>
            <Check className="mr-1 size-4" /> Copied
          </>
        ) : (
          <>
            <Copy className="mr-1 size-4" /> Copy share link
          </>
        )}
      </Button>
    </div>
  );
}

export function EventRoomVideosModal({
  open,
  onOpenChange,
  eventId,
  eventName,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<ChannelWithMetrics[]>([]);

  const loadChannels = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    try {
      const res = await getEventChannels(eventId);
      if (!res.success || !Array.isArray(res.data)) {
        toast.error(res.message ?? "Could not load videos");
        setRows([]);
        return;
      }

      const channels = (res.data as ChannelRow[]).filter(
        ch => !ch.restricted && ch.id
      );

      const initial: ChannelWithMetrics[] = channels.map(ch => ({
        ...ch,
        title: ch.title || "Untitled video",
        shareUrl: buildChannelShareUrl({ eventId, channelId: ch.id }),
        metrics: null,
        metricsLoading: true,
      }));
      setRows(initial);

      const metricsRes = await getExploreChannelMetricsBatchAction(
        initial.map(ch => ch.id)
      );
      const metricsMap =
        metricsRes.success && metricsRes.data?.metrics
          ? metricsRes.data.metrics
          : {};

      setRows(
        initial.map(ch => {
          const raw = metricsMap[ch.id];
          const metrics =
            raw && !("restricted" in raw) ? raw : null;
          return {
            ...ch,
            metricsLoading: false,
            metrics,
          };
        })
      );
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    if (open) void loadChannels();
  }, [open, loadChannels]);

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="flex max-h-[min(90dvh,720px)] flex-col gap-0 overflow-hidden sm:max-w-lg">
        <DialogHeader className="shrink-0 pr-6">
          <DialogTitle>Event videos</DialogTitle>
          <DialogDescription>
            Videos for {eventName}. Copy a share link or review engagement
            metrics per channel.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="min-h-0 flex-1 pr-4">
          <div className="space-y-3 pb-2">
            {loading && rows.length === 0 ? (
              <p className="text-muted-foreground flex items-center gap-2 text-sm">
                <Loader2 className="size-4 animate-spin" /> Loading videos…
              </p>
            ) : rows.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No videos on this event yet.
              </p>
            ) : (
              rows.map(item => (
                <ChannelMetricsRow
                  key={item.id}
                  item={item}
                />
              ))
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
