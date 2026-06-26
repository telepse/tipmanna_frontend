"use client";

import { useMemo, useState, type RefObject } from "react";
import {
  Bookmark,
  MessageCircleMore,
  Share2,
  Volume2,
  VolumeX,
} from "lucide-react";
import {
  FacebookIcon,
  FacebookShareButton,
  TwitterIcon,
  TwitterShareButton,
  WhatsappIcon,
  WhatsappShareButton,
} from "next-share";
import { CommentDrawer } from "@/components/events/comment-drawer";
import { TipsDrawer } from "@/components/events/tips-drawer";
import { SaveHostToggleButton } from "@/components/events/save-host-toggle-button";
import { ShareCopyLinkControl } from "@/components/shared/share-copy-link-control";
import type { RoomCharacter } from "@/types";
import type { VideoPlayerRef } from "@/components/events/video-player";
import { trackTvShareClick } from "@/lib/tvAnalytics";
import { buildContentShareUrl } from "@/lib/public-video-url";
import { cn } from "@/lib/utils";

type Props = {
  eventId: string;
  channelId: string | null;
  videoTitle: string;
  videoDescription: string;
  numOfTips: number;
  characters: RoomCharacter[];
  /** Opens tip drawer after comment flow */
  onContinueToTip?: () => void;
  hostName?: string | null;
  isSaved: boolean;
  saveBusy: boolean;
  onSaveClick: () => void;
  commentOpen: boolean;
  onCommentOpenChange: (open: boolean) => void;
  /** Positioning wrapper — parent supplies placement (channel uses absolute right-8 bottom-4). */
  className?: string;
  /** Optional density overrides for immersive reel desktop scaling. */
  iconButtonClassName?: string;
  iconClassName?: string;
  stackClassName?: string;
  tipsChipClassName?: string;
  /** When true, omit tips chip on the rail (tips sit above progress bar like channel-client). */
  hideTipsChip?: boolean;
  /** Override share link (defaults via `getPublicAbsoluteUrl` to `/content/{eventId}`). */
  shareUrl?: string;
  /** Social share title / quote (defaults from video title). */
  shareTitle?: string;
  /** Optional: Explore reel — toggles underlying YouTube mute. */
  videoPlayerRef?: RefObject<VideoPlayerRef | null>;
  reelMuted?: boolean;
  videoTipCount?: number;
  eventRoomTipCount?: number;
  /** Passed through to CommentDrawer to refetch share/save counts. */
  metricsRefreshKey?: number;
  /** Called when the share menu opens (parent bumps metricsRefreshKey). */
  onShareOpen?: () => void;
  /** When true, omit host save and volume controls (shown elsewhere). */
  hideHostAndAudio?: boolean;
};

/**
 * Vertical save, share, comment, and tips stack used on Explore reel (and other immersive video UIs).
 */
export function ImmersiveChannelActionsRail({
  eventId,
  channelId,
  videoTitle,
  videoDescription,
  numOfTips,
  characters,
  onContinueToTip,
  hostName,
  isSaved,
  saveBusy,
  onSaveClick,
  commentOpen,
  onCommentOpenChange,
  className,
  iconButtonClassName = "cursor-pointer rounded bg-black/50 p-1",
  iconClassName = "size-5 text-white",
  stackClassName = "gap-2",
  tipsChipClassName = "cursor-pointer rounded-md bg-black/70 px-1.5 py-0.5 text-center text-[10px] font-medium whitespace-nowrap text-white sm:text-xs",
  hideTipsChip = false,
  shareUrl: shareUrlProp,
  shareTitle: shareTitleProp,
  videoPlayerRef,
  reelMuted = true,
  videoTipCount,
  eventRoomTipCount,
  metricsRefreshKey,
  onShareOpen,
  hideHostAndAudio = false,
}: Props) {
  const [showShare, setShowShare] = useState(false);
  const [tipsOpen, setTipsOpen] = useState(false);

  const shareUrl = useMemo(() => {
    const trimmed = shareUrlProp?.trim();
    if (trimmed) return trimmed;
    if (channelId?.trim()) {
      return buildContentShareUrl({ eventId, channelId });
    }
    return buildContentShareUrl({ eventId });
  }, [shareUrlProp, eventId, channelId]);

  const shareTitle =
    shareTitleProp?.trim() || videoTitle?.trim() || "Watch on Tipmanna";

  return (
    <div className={className}>
      <div className={cn("flex flex-col items-center", stackClassName)}>
        <button
          type="button"
          disabled={saveBusy}
          title={isSaved ? "Unsave video" : "Save video"}
          onClick={e => {
            e.stopPropagation();
            if (!saveBusy) onSaveClick();
          }}
          className={iconButtonClassName}
        >
          {isSaved ? (
            <Bookmark className={cn("fill-moonstone-blue", iconClassName)} />
          ) : (
            <Bookmark className={iconClassName} />
          )}
        </button>

        {!hideHostAndAudio ? (
          <SaveHostToggleButton
            channelId={channelId}
            className={cn(iconButtonClassName, "text-white")}
            iconClassName={iconClassName}
          />
        ) : null}

        {!hideHostAndAudio && videoPlayerRef ? (
          <button
            type="button"
            title={reelMuted ? "Unmute" : "Mute"}
            className={iconButtonClassName}
            onClick={e => {
              e.stopPropagation();
              const p = videoPlayerRef.current;
              if (!p?.isReady()) return;
              if (reelMuted) p.unmute();
              else p.mute();
            }}
          >
            {reelMuted ? (
              <VolumeX className={iconClassName} />
            ) : (
              <Volume2 className={iconClassName} />
            )}
          </button>
        ) : null}

        <span className="relative">
          <button
            type="button"
            title="Share"
            className={iconButtonClassName}
            onClick={e => {
              e.stopPropagation();
              let willOpen = false;
              setShowShare(prev => {
                willOpen = !prev;
                return willOpen;
              });
              if (willOpen && channelId) trackTvShareClick(String(channelId));
              if (willOpen) onShareOpen?.();
              if (willOpen) onCommentOpenChange(false);
            }}
          >
            <Share2 className={iconClassName} />
          </button>
          {showShare ? (
            <div className="absolute top-1/2 right-full z-[100] mr-2 flex -translate-y-1/2 gap-2 rounded-md bg-white p-2 shadow-md">
              <ShareCopyLinkControl url={shareUrl} />
              <WhatsappShareButton
                url={shareUrl}
                title={shareTitle}
              >
                <WhatsappIcon
                  size={32}
                  round
                />
              </WhatsappShareButton>
              <FacebookShareButton
                url={shareUrl}
                quote={shareTitle}
              >
                <FacebookIcon
                  size={32}
                  round
                />
              </FacebookShareButton>
              <TwitterShareButton
                url={shareUrl}
                title={shareTitle}
              >
                <TwitterIcon
                  size={32}
                  round
                />
              </TwitterShareButton>
            </div>
          ) : null}
        </span>

        <button
          type="button"
          className={iconButtonClassName}
          onClick={e => {
            e.stopPropagation();
            setShowShare(false);
            onCommentOpenChange(true);
          }}
        >
          <MessageCircleMore className={iconClassName} />
        </button>

        {!hideTipsChip ? (
          <button
            type="button"
            title="View tips"
            className={tipsChipClassName}
            onClick={e => {
              e.stopPropagation();
              setTipsOpen(true);
              onCommentOpenChange(false);
            }}
          >
            {numOfTips} tip{numOfTips === 1 ? "" : "s"}
          </button>
        ) : null}
      </div>

      <CommentDrawer
        isCommentDrawerOpen={commentOpen}
        setIsCommentDrawerOpen={onCommentOpenChange}
        metricsRefreshKey={metricsRefreshKey}
        eventId={eventId}
        channelId={channelId}
        videoTitle={videoTitle}
        videoDescription={videoDescription}
        numOfTips={numOfTips}
        tippingCharacters={characters}
        onContinueToTip={onContinueToTip}
        hostName={hostName ?? undefined}
      />

      <TipsDrawer
        open={tipsOpen}
        onOpenChange={setTipsOpen}
        eventId={eventId}
        channelId={channelId}
        videoTipCount={videoTipCount ?? numOfTips}
        eventRoomTipCount={eventRoomTipCount ?? numOfTips}
      />
    </div>
  );
}
