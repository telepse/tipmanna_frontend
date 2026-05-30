"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, Copy, Play, Share2 } from "lucide-react";

import { ProgramCountdown } from "@/components/program/program-countdown";
import { SetReminderButton } from "@/components/program/set-reminder-button";
import { Button } from "@/components/ui/button";
import type { ProgramBootstrap } from "@/lib/program-types";
import { buildContentSharePath } from "@/lib/public-video-url";
import { getPublicAbsoluteUrl } from "@/lib/site-config";
import { getYoutubeThumbnail } from "@/lib/extractYoutubeID";

function formatDuration(totalSec: number) {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const rm = m % 60;
    return rm > 0 ? `${h}h ${rm}m` : `${h}h`;
  }
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function contentItemHref(item: {
  eventId: string;
  channelId: string;
}): string {
  return buildContentSharePath({
    eventId: item.eventId,
    channelId: item.channelId,
  });
}

export function ProgramLanding({
  program,
  communityId,
  enforcementId,
}: {
  program: ProgramBootstrap;
  communityId?: string;
  enforcementId: string;
}) {
  const [copied, setCopied] = useState(false);

  const landingPath = communityId
    ? `/c/${communityId}/program/${enforcementId}`
    : `/program/${enforcementId}`;

  const shareUrl = getPublicAbsoluteUrl(landingPath);
  const firstPlayable = program.items.find(i => i.contentUrl);
  const watchNowHref = firstPlayable
    ? contentItemHref(firstPlayable)
    : null;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* noop */
    }
  };

  const heroThumb =
    program.landingBannerUrl ??
    program.items.find(i => i.thumbnailUrl)?.thumbnailUrl ??
    (program.items.find(i => i.contentUrl)?.contentUrl
      ? getYoutubeThumbnail(program.items.find(i => i.contentUrl)!.contentUrl!)
      : null);

  return (
    <div className="mx-auto min-h-screen max-w-3xl px-4 py-8">
      {program.community ? (
        <div className="mb-4 flex items-center gap-3">
          {program.community.logoUrl ? (
            <Image
              src={program.community.logoUrl}
              alt=""
              width={40}
              height={40}
              className="rounded-full object-cover"
            />
          ) : null}
          <div>
            <p className="text-muted-foreground text-xs tracking-wide uppercase">
              Community program
            </p>
            <p className="font-medium">{program.community.name}</p>
          </div>
        </div>
      ) : (
        <p className="text-muted-foreground mb-4 text-xs tracking-wide uppercase">
          Tipmanna TV program
        </p>
      )}

      <div className="bg-card overflow-hidden rounded-xl border shadow-sm">
        {heroThumb ? (
          <div className="bg-muted relative aspect-video w-full">
            <Image
              src={heroThumb}
              alt=""
              fill
              className="object-cover"
              unoptimized
            />
          </div>
        ) : null}

        <div className="space-y-4 p-6">
          <div>
            <h1 className="text-2xl font-semibold">{program.title}</h1>
            <ProgramCountdown
              scheduledAt={program.scheduledAt}
              durationSec={program.durationSec}
              className="mt-2"
            />
            <p className="text-muted-foreground mt-1 text-sm">
              {new Date(program.scheduledAt).toLocaleString()} ·{" "}
              {formatDuration(program.durationSec)} · {program.items.length}{" "}
              {program.items.length === 1 ? "video" : "videos"}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {watchNowHref ? (
              <Button asChild>
                <Link href={watchNowHref}>
                  <Play className="mr-1 size-4" />
                  Watch now
                </Link>
              </Button>
            ) : null}
            <SetReminderButton
              programTitle={program.title}
              scheduledAt={program.scheduledAt}
              offsetOptions={program.reminderConfig.options}
              defaultOffset={program.reminderConfig.defaultOffset}
              enforcementId={communityId ? program.id : undefined}
              globalEnforcementId={communityId ? undefined : program.id}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void copyLink()}
            >
              {copied ? (
                <Check className="mr-1 size-4" />
              ) : (
                <Copy className="mr-1 size-4" />
              )}
              {copied ? "Copied" : "Copy link"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                if (typeof navigator !== "undefined" && navigator.share) {
                  void navigator.share({ title: program.title, url: shareUrl });
                } else {
                  void copyLink();
                }
              }}
            >
              <Share2 className="mr-1 size-4" />
              Share
            </Button>
          </div>
        </div>
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-medium">Program lineup</h2>
        <ol className="space-y-2">
          {program.items.map((item, idx) => {
            const thumb =
              item.thumbnailUrl ??
              (item.contentUrl ? getYoutubeThumbnail(item.contentUrl) : null);
            const itemHref = item.contentUrl ? contentItemHref(item) : null;
            return (
              <li
                key={item.id}
                className="flex items-center gap-3 rounded-lg border p-3"
              >
                <span className="text-muted-foreground w-6 shrink-0 text-sm">
                  {idx + 1}
                </span>
                {thumb ? (
                  <Image
                    src={thumb}
                    alt=""
                    width={80}
                    height={45}
                    className="rounded object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="bg-muted h-[45px] w-20 shrink-0 rounded" />
                )}
                <div className="min-w-0 flex-1">
                  {itemHref ? (
                    <Link
                      href={itemHref}
                      className="truncate font-medium hover:underline"
                    >
                      {item.title}
                    </Link>
                  ) : (
                    <p className="truncate font-medium">{item.title}</p>
                  )}
                  <p className="text-muted-foreground text-xs">
                    {formatDuration(item.durationSec)}
                  </p>
                </div>
                {itemHref ? (
                  <Button
                    asChild
                    size="sm"
                    variant="ghost"
                  >
                    <Link href={itemHref}>Open</Link>
                  </Button>
                ) : null}
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
