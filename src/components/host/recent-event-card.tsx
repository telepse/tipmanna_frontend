"use client";

import { useState } from "react";

import {
  Calendar,
  Users,
  Globe2,
  Lock,
  Video,
  FileText,
  Copy,
  Check,
  QrCode,
  Building2,
  ChevronDown,
  Bell,
} from "lucide-react";

import { formatDate } from "@/lib/formatDate";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  id: string;
  eventName: string;
  eventDate: string;
  numOfTips: number;
  amountRaised: number;
  accessMode: string;
  amountToRaise: number;
  submissionKind: string;
  organizationName: string;
  eventReminders: number;
}

export const RecentEventCard = ({
  id,
  eventName,
  eventDate,
  numOfTips,
  amountRaised,
  accessMode,
  amountToRaise,
  submissionKind,
  organizationName,
  eventReminders,
}: Props) => {
  const [copiedLink, setCopiedLink] = useState<"overlay" | "screen" | null>(
    null
  );

  const [showQr, setShowQr] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  const overlayLink = `${siteUrl}/room/${id}/overlay`;
  const screenLink = `${siteUrl}/room/${id}/screen`;
  const roomLink = `${siteUrl}/room/${id}`;

  const formatLabel = (value: string) =>
    value
      .toLowerCase()
      .replace(/_/g, " ")
      .replace(/\b\w/g, char => char.toUpperCase());

  const normalizedAccessMode = accessMode.toLowerCase();

  const isPublic = normalizedAccessMode === "public";

  const AccessIcon = isPublic ? Globe2 : Lock;

  const normalizedSubmissionKind = submissionKind
    .toLowerCase()
    .trim()
    .replace(/[\s-]+/g, "_");

  const isContentOnly = normalizedSubmissionKind === "content_only";

  const SubmissionIcon =
    normalizedSubmissionKind === "content_only"
      ? FileText
      : normalizedSubmissionKind === "event_and_content"
        ? Video
        : Calendar;

  const formattedSubmissionKind =
    normalizedSubmissionKind === "content_only"
      ? "Content only"
      : normalizedSubmissionKind === "event_only"
        ? "Event only"
        : normalizedSubmissionKind === "event_and_content"
          ? "Event + content"
          : formatLabel(submissionKind);

  const handleCopy = async (link: string, type: "overlay" | "screen") => {
    try {
      await navigator.clipboard.writeText(link);

      setCopiedLink(type);

      setTimeout(() => {
        setCopiedLink(null);
      }, 2000);
    } catch (error) {
      console.error("Failed to copy link:", error);
    }
  };

  return (
    <>
      <div className="border-primary bg-primary/10 rounded-xl border p-5 shadow-sm transition-shadow hover:shadow-md">
        <div className="flex flex-col">
          {/* Main event information */}
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h5 className="truncate font-medium">{eventName}</h5>

              <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs sm:text-sm">
                {/* Date */}
                {!isContentOnly ? (
                  <span className="flex items-center gap-2">
                    <Calendar className="size-4 shrink-0" />

                    {formatDate(eventDate)}
                  </span>
                ) : null}

                {/* Tips */}
                <span className="flex items-center gap-2">
                  <Users className="size-4 shrink-0" />
                  {numOfTips} Tips
                </span>

                {/* Reminders */}
                <span
                  className="inline-flex items-center gap-1.5"
                  title={`${eventReminders} ${
                    eventReminders === 1 ? "reminder" : "reminders"
                  } set`}
                >
                  <Bell className="size-4 shrink-0" />

                  <span>
                    {eventReminders}{" "}
                    {eventReminders === 1 ? "Reminder" : "Reminders"}
                  </span>
                </span>
              </div>
            </div>

            <p className="text-primary shrink-0 text-xs font-semibold">
              £{amountRaised} / £{amountToRaise}
            </p>
          </div>

          {/* Organiser + expand button */}
          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="text-muted-foreground flex min-w-0 items-center gap-2 text-sm">
              <Building2 className="size-4 shrink-0" />

              <span className="truncate text-xs">
                Organised by{" "}
                <span className="text-foreground font-medium">
                  {organizationName}
                </span>
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsExpanded(prev => !prev)}
              className="text-muted-foreground hover:text-foreground hover:bg-background inline-flex size-8 shrink-0 items-center justify-center rounded-md transition-colors"
              aria-label={
                isExpanded ? "Collapse event details" : "Expand event details"
              }
              aria-expanded={isExpanded}
            >
              <ChevronDown
                className={`size-4 transition-transform duration-200 ${
                  isExpanded ? "rotate-180" : ""
                }`}
              />
            </button>
          </div>

          {/* Expandable details */}
          <div
            className={`grid transition-all duration-200 ease-in-out ${
              isExpanded
                ? "mt-4 grid-rows-[1fr] opacity-100"
                : "grid-rows-[0fr] opacity-0"
            }`}
          >
            <div className="overflow-hidden">
              <div className="border-t pt-4">
                {/* Event metadata */}
                <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
                  {/* Access mode */}
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-xs">
                      Access mode
                    </span>

                    <span className="bg-background inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium">
                      <AccessIcon className="size-3.5" />

                      {formatLabel(accessMode)}
                    </span>
                  </div>

                  {/* Submission kind */}
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-xs">
                      Submission kind
                    </span>

                    <span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs font-medium">
                      <SubmissionIcon className="size-3.5" />

                      {formattedSubmissionKind}
                    </span>
                  </div>
                </div>

                {/* Room actions */}
                <div className="mt-4 flex items-center gap-1 border-t pt-3">
                  {/* Overlay link */}
                  <button
                    type="button"
                    onClick={() => handleCopy(overlayLink, "overlay")}
                    className="text-muted-foreground hover:text-foreground hover:bg-background inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors"
                    title="Copy overlay link"
                  >
                    {copiedLink === "overlay" ? (
                      <Check className="size-3.5" />
                    ) : (
                      <Copy className="size-3.5" />
                    )}

                    {copiedLink === "overlay" ? "Copied" : "Overlay link"}
                  </button>

                  {/* Screen link */}
                  <button
                    type="button"
                    onClick={() => handleCopy(screenLink, "screen")}
                    className="text-muted-foreground hover:text-foreground hover:bg-background inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors"
                    title="Copy screen display link"
                  >
                    {copiedLink === "screen" ? (
                      <Check className="size-3.5" />
                    ) : (
                      <Copy className="size-3.5" />
                    )}

                    {copiedLink === "screen" ? "Copied" : "Screen link"}
                  </button>

                  {/* Event QR */}
                  <button
                    type="button"
                    onClick={() => setShowQr(true)}
                    className="text-muted-foreground hover:text-foreground hover:bg-background inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors"
                    title="View event room QR code"
                  >
                    <QrCode className="size-3.5" />
                    Event QR
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* QR Dialog */}
      <Dialog
        open={showQr}
        onOpenChange={setShowQr}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Event room QR code</DialogTitle>

            <DialogDescription>
              Scan this QR code to open the event room.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center gap-5 py-4">
            <div className="bg-muted flex h-48 w-48 items-center justify-center rounded-xl">
              <div className="text-muted-foreground text-center text-sm">
                QR code
              </div>
            </div>

            <div className="bg-muted w-full rounded-lg px-4 py-3">
              <p className="text-muted-foreground mb-1 text-xs">Event room</p>

              <p className="text-foreground text-xs font-medium break-all">
                {roomLink}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
