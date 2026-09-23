"use client";

import { useEffect, useState } from "react";
import { Copy, ExternalLink } from "lucide-react";
import { toast } from "react-toastify";

import { Button } from "@/components/ui/button";
import { linkifyText } from "@/lib/linkify-text";

export type ReminderProgramCardPost = {
  id: string;
  title: string;
  body?: string | null;
  scheduledAt: string;
  imageUrl?: string | null;
  landingUrl?: string | null;
  durationSec?: number | null;
};

type Props = {
  post: ReminderProgramCardPost;
  offsetLabels: Record<number, string>;
  offsets: number[];
  onSetReminder?: (offsetMinutes: number) => void;
  showReminderActions?: boolean;
};

function Countdown({ scheduledAt }: { scheduledAt: string }) {
  const [label, setLabel] = useState("");
  useEffect(() => {
    const tick = () => {
      const ms = new Date(scheduledAt).getTime() - Date.now();
      if (ms <= 0) {
        setLabel("Starting soon");
        return;
      }
      const h = Math.floor(ms / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      setLabel(h > 0 ? `${h}h ${m}m` : `${m}m`);
    };
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, [scheduledAt]);
  return <span className="text-primary text-[11px] font-medium">{label}</span>;
}

export function ReminderProgramCard({
  post,
  offsetLabels,
  offsets,
  onSetReminder,
  showReminderActions = true,
}: Props) {
  const copyLanding = async (url: string) => {
    await navigator.clipboard.writeText(url);
    toast.success("Link copied");
  };

  return (
    <li className="rounded-lg border p-3">
      <div className="flex gap-3">
        {post.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.imageUrl}
            alt=""
            className="size-14 rounded object-cover"
          />
        ) : null}
        <div className="min-w-0 flex-1">
          {post.landingUrl ? (
            <button
              type="button"
              className="text-left text-sm font-medium underline-offset-2 hover:underline"
              onClick={() => window.open(post.landingUrl!, "_blank")}
            >
              {post.title}
            </button>
          ) : (
            <p className="text-sm font-medium">{post.title}</p>
          )}
          {post.body ? (
            <p className="text-muted-foreground mt-1 text-xs whitespace-pre-wrap">
              {linkifyText(post.body)}
            </p>
          ) : null}
          <p className="text-muted-foreground mt-2 text-[11px]">
            {new Date(post.scheduledAt).toLocaleString()}
            {post.durationSec
              ? ` · ${Math.round(post.durationSec / 60)} min`
              : ""}
          </p>
          <Countdown scheduledAt={post.scheduledAt} />
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {post.landingUrl ? (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => window.open(post.landingUrl!, "_blank")}
            >
              <ExternalLink className="mr-1 size-3" /> Landing
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => void copyLanding(post.landingUrl!)}
            >
              <Copy className="mr-1 size-3" /> Copy URL
            </Button>
          </>
        ) : null}
        {showReminderActions && onSetReminder
          ? offsets.map(min => (
              <Button
                key={`${post.id}-${min}`}
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={e => {
                  e.stopPropagation();
                  onSetReminder(min);
                }}
              >
                {offsetLabels[min] ?? `${min}m`}
              </Button>
            ))
          : null}
      </div>
    </li>
  );
}
