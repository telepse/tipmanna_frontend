"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Bookmark,
  CircleQuestionMark,
  Eye,
  MessageCircleMore,
  Share2,
  Tv,
  UsersRound,
} from "lucide-react";
import { ProgramCountdown } from "@/components/program/program-countdown";
import { SetReminderButton } from "@/components/program/set-reminder-button";
import type { ProgramBootstrap } from "@/lib/program-types";
import { buildContentSharePath } from "@/lib/public-video-url";
import { getPublicAbsoluteUrl } from "@/lib/site-config";
import { getYoutubeThumbnail } from "@/lib/extractYoutubeID";
import { formatProgramScheduleWithTimezone } from "@/lib/utils";
import {
  AUTH_MODAL_OVERLAY_Z_INDEX,
  AUTH_MODAL_Z_INDEX,
} from "@/lib/drawer-z-index";
import { cn } from "@/lib/utils";

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

function contentItemHref(item: { eventId: string; channelId: string }): string {
  return buildContentSharePath({
    eventId: item.eventId,
    channelId: item.channelId,
  });
}

export type ProgramLandingContentProps = {
  program: ProgramBootstrap;
  communityId?: string;
  enforcementId: string;
  variant?: "page" | "drawer";
  stackModalsAboveDrawer?: boolean;
};

export function ProgramLandingContent({
  program,
  communityId,
  enforcementId,
  variant = "page",
  stackModalsAboveDrawer = false,
}: ProgramLandingContentProps) {
  const [, setCopied] = useState(false);
  const [contentModalOpen, setContentModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<
    ProgramBootstrap["items"][number] | null
  >(null);

  const landingPath = communityId
    ? `/c/${communityId}/program/${enforcementId}`
    : `/program/${enforcementId}`;

  const shareUrl = getPublicAbsoluteUrl(landingPath);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* noop */
    }
  };

  const firstContentUrl = program.items.find(i =>
    i.contentUrl?.trim()
  )?.contentUrl;
  const heroThumb =
    program.landingBannerUrl?.trim() ||
    (firstContentUrl ? getYoutubeThumbnail(firstContentUrl) : null);

  const isDrawer = variant === "drawer";

  const detailDialogOverlay = stackModalsAboveDrawer
    ? AUTH_MODAL_OVERLAY_Z_INDEX
    : undefined;
  const detailDialogContent = stackModalsAboveDrawer
    ? AUTH_MODAL_Z_INDEX
    : undefined;

  return (
    <div
      className={cn(
        "space-y-6",
        isDrawer ? "px-1 py-2" : "mx-auto min-h-screen max-w-3xl px-4 py-8"
      )}
    >
      <div className="flex w-full flex-col sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-full items-center justify-between sm:w-auto">
          {program.community ? (
            <div className="flex min-w-0 items-center gap-3">
              {program.community.logoUrl ? (
                <Image
                  src={program.community.logoUrl}
                  alt=""
                  width={40}
                  height={40}
                  className="size-10 shrink-0 rounded-full object-cover"
                />
              ) : null}

              <div className="min-w-0">
                <p className="text-muted-foreground text-sm font-medium sm:text-lg sm:font-semibold sm:tracking-wide">
                  Community program
                </p>

                <p className="truncate font-semibold">
                  {program.community.name}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-lg font-semibold tracking-wide">
              Tipmanna TV program
            </p>
          )}

          <Button
            type="button"
            variant="outline"
            size="icon"
            className="ml-3 shrink-0 sm:hidden"
            aria-label="Share program"
            onClick={() => {
              if (typeof navigator !== "undefined" && navigator.share) {
                void navigator.share({
                  title: program.title,
                  url: shareUrl,
                });
              } else {
                void copyLink();
              }
            }}
          >
            <Share2 className="size-5" />
          </Button>
        </div>

        <div className="w-full sm:w-auto">
          <ProgramCountdown
            scheduledAt={program.scheduledAt}
            durationSec={program.durationSec}
          />
        </div>
      </div>

      <div
        className={cn(
          "bg-card border-muted-foreground/20 relative overflow-hidden rounded-md border-2 shadow-lg",
          !isDrawer && "-mt-4 sm:mt-0"
        )}
      >
        {heroThumb ? (
          <div className="relative aspect-video w-full">
            <Image
              src={heroThumb}
              alt=""
              fill
              className="object-cover"
              unoptimized
            />
          </div>
        ) : null}

        <div className="absolute top-full right-4 left-1/2 size-40 w-full -translate-x-1/2 bg-[radial-gradient(circle_at_center,rgba(255,128,0,0.9),transparent_75%)] blur-lg"></div>

        <div className="space-y-4 px-4 py-6">
          <div className="space-y-0.5">
            <h1 className="line-clamp-3 text-2xl font-semibold sm:line-clamp-none">
              {program.title}
            </h1>

            <p className="text-sm">
              <span className="font-medium">Time:</span>{" "}
              <span className="text-muted-foreground">
                {formatProgramScheduleWithTimezone(program.scheduledAt)}
              </span>
            </p>

            <p className="text-sm">
              <span className="font-medium">Duration:</span>{" "}
              <span className="text-muted-foreground">
                {formatDuration(program.durationSec)} &middot;{" "}
                {program.items.length}{" "}
                {program.items.length === 1 ? "video" : "videos"}
              </span>
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="default"
              size="sm"
              className="sm:py-none flex-1 py-1.5 sm:flex-none"
              onClick={() =>
                window.open(
                  `/tv?community=${program.community?.id ?? ""}`,
                  "_blank"
                )
              }
            >
              <Tv />
              {program.community ? "Watch Community TV" : "Watch Tipmanna TV"}
            </Button>

            <div className="flex gap-2">
              <div className="flex-1 sm:flex-none">
                <SetReminderButton
                  programTitle={program.title}
                  scheduledAt={program.scheduledAt}
                  offsetOptions={program.reminderConfig.options}
                  defaultOffset={program.reminderConfig.defaultOffset}
                  enforcementId={communityId ? program.id : undefined}
                  globalEnforcementId={communityId ? undefined : program.id}
                  communityId={communityId}
                  stackModalsAboveDrawer={stackModalsAboveDrawer}
                />
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="hidden flex-1 sm:flex sm:flex-none"
                onClick={() => {
                  if (typeof navigator !== "undefined" && navigator.share) {
                    void navigator.share({
                      title: program.title,
                      url: shareUrl,
                    });
                  } else {
                    void copyLink();
                  }
                }}
              >
                <Share2 />
                Share
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h5 className="text-lg font-medium">Program lineup</h5>

        <div className="space-y-4">
          {program.items.map((item, idx) => {
            const ytThumb = item.contentUrl
              ? getYoutubeThumbnail(item.contentUrl)
              : null;
            const itemHref =
              item.eventId && item.channelId ? contentItemHref(item) : null;

            return (
              <div
                key={item.id}
                className="relative flex flex-col gap-2 rounded-md border border-black px-2 py-4 sm:px-4"
              >
                <div className="relative">
                  {ytThumb ? (
                    <Image
                      src={ytThumb}
                      alt=""
                      width={80}
                      height={50}
                      className="aspect-video h-auto w-full rounded-md object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="bg-muted h-[45px] w-20 shrink-0 rounded" />
                  )}

                  <span className="bg-primary absolute top-4 left-2 flex size-8 shrink-0 items-center justify-center rounded-full text-lg text-black">
                    {idx + 1}
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedItem(item);
                      setContentModalOpen(true);
                    }}
                    className="absolute top-4 right-2 cursor-pointer rounded-full bg-black/70 p-1 text-xs underline sm:text-sm"
                  >
                    <CircleQuestionMark className="size-4 text-white" />
                  </button>

                  <span className="absolute right-2 bottom-4 rounded-md bg-black px-2 py-0.5 text-xs text-white">
                    {formatDuration(item.durationSec)}
                  </span>
                </div>

                <div className="flex min-w-0 flex-1 items-center gap-2">
                  {itemHref ? (
                    <p className="-leading-[0.1] line-clamp-2 truncate text-sm font-medium text-wrap break-words hover:underline sm:line-clamp-none sm:text-base">
                      {item.title}
                    </p>
                  ) : (
                    <p className="-leading-[0.1] line-clamp-2 truncate text-sm font-medium text-wrap break-words sm:line-clamp-none sm:text-base">
                      {item.title}
                    </p>
                  )}
                </div>

                <div className="text-muted-foreground flex items-center gap-1 text-xs sm:text-sm">
                  <span className="flex items-center gap-1">
                    <UsersRound className="size-4" /> {item.stats.tips} tips
                  </span>{" "}
                  &middot;{" "}
                  <span className="flex items-center gap-1">
                    <Eye className="size-4" />
                    {item.stats.encounters} seen
                  </span>{" "}
                  &middot;
                  <span className="flex items-center gap-1">
                    <Bookmark className="size-4" /> {item.stats.saves}{" "}
                  </span>
                  &middot;{" "}
                  <span className="flex items-center gap-1">
                    <Share2 className="size-4" />
                    {item.stats.shares}
                  </span>{" "}
                  &middot;{" "}
                  <span className="flex items-center gap-1">
                    <MessageCircleMore className="size-4" />{" "}
                    {item.stats.comments}{" "}
                  </span>{" "}
                  &middot;{" "}
                </div>
              </div>
            );
          })}
        </div>

        <Dialog
          open={contentModalOpen}
          onOpenChange={open => {
            setContentModalOpen(open);

            if (!open) {
              setSelectedItem(null);
            }
          }}
        >
          <DialogContent
            overlayClassName={detailDialogOverlay}
            className={cn("max-w-sm", detailDialogContent)}
          >
            {selectedItem && (
              <>
                <DialogHeader>
                  <DialogTitle>{selectedItem.title}</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 text-sm">
                  <div className="text-xs sm:text-sm">
                    Creator:{" "}
                    <span className="font-medium">
                      {selectedItem.creator?.name ?? "-"}
                    </span>{" "}
                    &middot; Username:{" "}
                    <span className="font-medium">
                      {selectedItem.creator?.username ?? "-"}
                    </span>
                  </div>

                  {selectedItem.eventId && selectedItem.channelId ? (
                    <Button
                      asChild
                      size="sm"
                      variant="ghost"
                      className="absolute right-4 bottom-0"
                    >
                      <Link
                        href={contentItemHref(selectedItem)}
                        className="flex items-center gap-2 border border-black hover:bg-black hover:text-white"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Play video
                      </Link>
                    </Button>
                  ) : null}

                  <p>{selectedItem.description || "No description"}</p>

                  <p className="text-xs sm:text-sm">
                    Duration: {formatDuration(selectedItem.durationSec)}
                  </p>

                  <div className="text-xs sm:text-sm">
                    Channel tips: {selectedItem.stats.tips} &middot; Saves:{" "}
                    {selectedItem.stats.saves} &middot; Shares:{" "}
                    {selectedItem.stats.shares} &middot; Comments:{" "}
                    {selectedItem.stats.comments}
                  </div>

                  <div className="mb-8 flex w-fit items-center gap-2 rounded-md border px-2 py-1 text-xs sm:text-sm">
                    Amount raised: &pound;{selectedItem.amountRaised} &middot;{" "}
                    <Eye className="size-4" /> {selectedItem.stats.encounters}{" "}
                    seen
                  </div>

                  {selectedItem.coOwners.length > 0 && (
                    <div>
                      <p className="font-medium">Co-owner(s)</p>

                      <ul className="list-disc pl-5">
                        {selectedItem.coOwners.map(owner => (
                          <li key={owner.id}>{owner.name}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
