"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import { useSelector } from "react-redux";

import { getCommentLikesActivityAction } from "@/actions/messages";
import { getSavedVideosForTipper, getMyTippedVideos } from "@/actions/events";

import { extractYoutubeID } from "@/lib/extractYoutubeID";
import { buildContentSharePath } from "@/lib/public-video-url";

import { Button } from "@/components/ui/button";

import type { RootState } from "@/redux/store";

type ActivityRow = {
  id: string;
  likedAt: string;
  comment: {
    id: string;
    username: string;
    text: string | null;
  };
  video: {
    id: string;
    title: string;
    url: string;
    eventId: string;
  } | null;
};

type SaveItem = {
  id: string;
  channelId: string;
  hostId: string;
  tipperId: string | null;
  visitorId: string | null;
  channel: {
    id: string;
    eventId: string;
    title: string;
    url: string;
    description: string | null;
    createdAt: string;
    updatedAt: string;
    numOfTips: number;
  };
};

type TipItem = {
  eventId: string;
  eventName: string;
  lastTippedAt: string;
  paymentSurfaces: string[];
  tipCount: number;
  totalAmount: number;
  videoChannelId: string;
  videoDurationSeconds: number;
  videoTitle: string;
};

type Tab = "likes" | "saves" | "tips";

function VideoPlaceholder() {
  return (
    <div className="flex size-16 shrink-0 items-center justify-center rounded bg-neutral-100">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        className="size-7 text-neutral-400"
        aria-hidden="true"
      >
        <rect
          x="3"
          y="5"
          width="18"
          height="14"
          rx="2"
          ry="2"
        />
        <path d="m10 9 5 3-5 3V9Z" />
      </svg>
    </div>
  );
}

function VideoThumbnail({
  url,
  alt = "",
}: {
  url?: string | null;
  alt?: string;
}) {
  const yt = url ? extractYoutubeID(url) : null;

  if (!yt) {
    return <VideoPlaceholder />;
  }

  const poster = `https://i.ytimg.com/vi/${yt}/hqdefault.jpg`;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={poster}
      alt={alt}
      className="size-16 shrink-0 rounded object-cover"
    />
  );
}

function ActivityVideoLink({
  eventId,
  channelId,
  title,
}: {
  eventId: string;
  channelId: string;
  title: string;
}) {
  return (
    <Link
      href={buildContentSharePath({
        eventId,
        channelId,
      })}
      className="text-primary mt-1 inline-block text-sm font-medium underline"
    >
      {title}
    </Link>
  );
}

export function ProfileActivityTab() {
  const user = useSelector((s: RootState) => s.auth.user);

  const [tab, setTab] = useState<Tab>("likes");

  const [likes, setLikes] = useState<ActivityRow[]>([]);
  const [saves, setSaves] = useState<SaveItem[]>([]);
  const [tips, setTips] = useState<TipItem[]>([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    void Promise.all([
      getCommentLikesActivityAction(),
      getSavedVideosForTipper(),
      getMyTippedVideos(),
    ]).then(([likesRes, savesRes, tipsRes]) => {
      if (cancelled) return;

      setLoading(false);

      if (likesRes.success && Array.isArray(likesRes.data)) {
        setLikes(likesRes.data as ActivityRow[]);
      }

      if (savesRes.success && Array.isArray(savesRes.data)) {
        setSaves(savesRes.data as SaveItem[]);
      }

      if (tipsRes.success && Array.isArray(tipsRes.data)) {
        setTips(tipsRes.data as TipItem[]);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  if (loading) {
    return <p className="text-muted-foreground text-sm">Loading activity…</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["likes", "Likes"],
            ["saves", "Saves"],
            ["tips", "Tips"],
          ] as const
        ).map(([key, label]) => (
          <Button
            key={key}
            type="button"
            size="sm"
            variant={tab === key ? "default" : "outline"}
            onClick={() => setTab(key)}
          >
            {label}
          </Button>
        ))}
      </div>

      {tab === "likes" ? (
        likes.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Comments you like will appear here.
          </p>
        ) : (
          <ul className="space-y-4">
            {likes.map(row => {
              const yt = row.video?.url
                ? extractYoutubeID(row.video.url)
                : null;

              const poster = yt
                ? `https://i.ytimg.com/vi/${yt}/hqdefault.jpg`
                : null;

              return (
                <li
                  key={row.id}
                  className="flex gap-3 rounded-md border p-3"
                >
                  {poster ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={poster}
                      alt=""
                      className="size-16 shrink-0 rounded object-cover"
                    />
                  ) : (
                    <VideoPlaceholder />
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="text-sm">
                      Liked comment by{" "}
                      <span className="font-medium">
                        {row.comment.username}
                      </span>
                    </p>

                    {row.comment.text ? (
                      <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
                        {row.comment.text}
                      </p>
                    ) : null}

                    {row.video ? (
                      <ActivityVideoLink
                        eventId={row.video.eventId}
                        channelId={row.video.id}
                        title={row.video.title}
                      />
                    ) : null}

                    <p className="text-muted-foreground mt-1 text-xs">
                      {new Date(row.likedAt).toLocaleString()}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )
      ) : tab === "saves" ? (
        saves.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Saved videos will appear here.
          </p>
        ) : (
          <ul className="space-y-4">
            {saves.map(item => {
              const channel = item.channel;

              return (
                <li
                  key={item.id}
                  className="flex gap-3 rounded-md border p-3"
                >
                  <VideoThumbnail url={channel.url} />

                  <div className="min-w-0 flex-1">
                    <p className="text-sm">Saved video</p>

                    <ActivityVideoLink
                      eventId={channel.eventId}
                      channelId={channel.id}
                      title={channel.title}
                    />

                    <p className="text-muted-foreground mt-1 text-xs">
                      {channel.createdAt
                        ? `Added ${new Date(
                            channel.createdAt
                          ).toLocaleString()}`
                        : "Saved video"}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )
      ) : tips.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Videos you tipped will appear here.
        </p>
      ) : (
        <ul className="space-y-4">
          {tips.map((item, idx) => (
            <li
              key={`${item.videoChannelId}-${item.eventId}-${idx}`}
              className="flex gap-3 rounded-md border p-3"
            >
              <VideoPlaceholder />

              <div className="min-w-0 flex-1">
                <p className="text-sm">Tipped video</p>

                <ActivityVideoLink
                  eventId={item.eventId}
                  channelId={item.videoChannelId}
                  title={item.videoTitle}
                />

                <p className="text-muted-foreground mt-1 text-xs">
                  {item.tipCount} {item.tipCount === 1 ? "tip" : "tips"}
                  {" · "}
                  &pound;{item.totalAmount.toLocaleString()} raised
                </p>

                <p className="text-muted-foreground mt-1 text-xs">
                  {new Date(item.lastTippedAt).toLocaleString()}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
