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
  comment: { id: string; username: string; text: string | null };
  video: {
    id: string;
    title: string;
    url: string;
    eventId: string;
  } | null;
};

type Tab = "likes" | "saves" | "tips";

export function ProfileActivityTab() {
  const user = useSelector((s: RootState) => s.auth.user);
  const [tab, setTab] = useState<Tab>("likes");
  const [likes, setLikes] = useState<ActivityRow[]>([]);
  const [saves, setSaves] = useState<unknown[]>([]);
  const [tips, setTips] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    void Promise.all([
      getCommentLikesActivityAction(),
      getSavedVideosForTipper(),
      getMyTippedVideos(),
    ]).then(([likesRes, savesRes, tipsRes]) => {
      setLoading(false);
      if (likesRes.success && Array.isArray(likesRes.data)) {
        setLikes(likesRes.data as ActivityRow[]);
      }
      if (savesRes.success && Array.isArray(savesRes.data)) {
        setSaves(savesRes.data);
      }
      if (tipsRes.success && Array.isArray(tipsRes.data)) {
        setTips(tipsRes.data);
      }
    });
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
                  ) : null}
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
                      <Link
                        href={buildContentSharePath({
                          eventId: row.video.eventId,
                          channelId: row.video.id,
                        })}
                        className="text-primary mt-1 inline-block text-sm underline"
                      >
                        {row.video.title}
                      </Link>
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
          <ul className="space-y-2">
            {saves.map((item, idx) => (
              <li
                key={idx}
                className="rounded-md border p-3 text-sm"
              >
                {JSON.stringify(item)}
              </li>
            ))}
          </ul>
        )
      ) : tips.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Videos you tipped will appear here.
        </p>
      ) : (
        <ul className="space-y-2">
          {tips.map((item, idx) => (
            <li
              key={idx}
              className="rounded-md border p-3 text-sm"
            >
              {JSON.stringify(item)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
