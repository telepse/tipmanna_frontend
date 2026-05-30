"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

// Third-party imports
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Link as CopyLink, Copy } from "lucide-react";
import { toast } from "react-toastify";
import { OVERLAY_Z_INDEX } from "@/lib/drawer-z-index";

// Local imports
import { formatDateUK, getTimeDifference } from "@/lib/utils";
import { getGoogleCalendarUrl } from "@/lib/getGoogleCalendarUrl";
import { getPublicAbsoluteUrl } from "@/lib/site-config";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";

interface Props {
  eventId: string;
  eventName: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  venueLocation: string;
  organizationName: string;
  hostName: string;
  totalAttendees: number;
  onClose?: () => void;
}

export const EventDialog = ({
  eventId,
  eventName,
  eventDate,
  startTime,
  endTime,
  venueLocation,
  organizationName,
  hostName,
  totalAttendees,
  onClose,
}: Props) => {
  const [open, setOpen] = useState(true);

  // Call onClose when dialog is manually closed
  const handleDialogClose = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen && onClose) {
      onClose(); // Notify parent
    }
  };

  const paymentCompleted = useSelector(
    (state: RootState) => state.tip.paymentCompleted
  );

  // Always interpret event date/time as UK time
  function buildUKDate(eventDate: string, startTime: string) {
    const dateObj = new Date(eventDate);

    if (isNaN(dateObj.getTime())) {
      throw new Error("Invalid eventDate passed to buildUKDate");
    }

    const year = dateObj.getUTCFullYear();
    const month = dateObj.getUTCMonth(); // already zero-based
    const day = dateObj.getUTCDate();

    const [hours, minutes] = startTime.split(":").map(Number);

    // Construct a UK (GMT/BST) date/time in UTC
    return new Date(Date.UTC(year, month, day, hours, minutes));
  }

  // NEW:
  const eventDateTime = buildUKDate(eventDate, startTime);

  const now = new Date();
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const {
    days,
    hours: hrs,
    minutes: mins,
  } = getTimeDifference(eventDateTime, now);

  const roomUrl = getPublicAbsoluteUrl(`/room/${eventId}`);

  const eventDesc = `${eventName} by ${organizationName}.\n\n${venueLocation}\n\nJoin here -> ${roomUrl}`;

  const googleUrl = getGoogleCalendarUrl({
    title: eventName,
    description: eventDesc,
    location: roomUrl,
    date: eventDate,
    startTime,
    endTime,
  });

  const handleYesClick = async () => {
    setLoading(true);

    const ipRes = await fetch("https://api.ipify.org?format=json");
    const { ip } = await ipRes.json();

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/events/attend`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, ip }), // <-- must match backend
      }
    );

    const data = await res.json();

    if (data.alreadyCounted) {
      toast.error("You already joined this event");
      setLoading(false);
    } else {
      toast.success("You joined this event");
      setLoading(false);
    }
  };

  const shareUrl =
    typeof window !== "undefined" ? window.location.href : roomUrl;

  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback
      const textArea = document.createElement("textarea");
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  useEffect(() => {
    if (paymentCompleted) {
      setOpen(false); // Close the dialog
    }
  }, [paymentCompleted]);

  return (
    <Dialog
      open={open}
      onOpenChange={handleDialogClose}
    >
      <DialogContent
        className={`${OVERLAY_Z_INDEX} max-h-[70vh] space-y-2 bg-white p-6 sm:max-w-md`}
      >
        <DialogHeader>
          <DialogTitle className="flex items-baseline gap-2">
            Event invitation{" "}
            <span className="text-muted-foreground text-center text-sm">
              starting
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-4">
          <div className="flex flex-col items-center justify-center rounded-2xl bg-black p-1.5 text-white">
            <h2 className="text-2xl font-bold sm:text-3xl">{days}</h2>{" "}
            <p>days</p>
          </div>
          <div className="flex flex-col items-center justify-center rounded-2xl bg-black p-1.5 text-white">
            <h5 className="text-2xl font-bold sm:text-3xl">{hrs}</h5>{" "}
            <p>hours</p>
          </div>
          <div className="flex flex-col items-center justify-center rounded-2xl bg-black p-1.5 text-white">
            <h5 className="text-2xl font-bold sm:text-3xl">{mins}</h5>{" "}
            <p>minutes</p>
          </div>
        </div>

        <div className="flex w-fit items-center justify-center gap-2 rounded-md border bg-black px-2 py-1 text-center text-sm">
          <a
            href={googleUrl}
            target="_blank"
            className="mr-4 flex items-center gap-1"
          >
            <span className="text-sm text-white">Add to</span>

            <Image
              src="https://calendar.google.com/calendar/images/ext/gc_button1_en.gif"
              alt="Google Calendar"
              width={100}
              height={60}
              className="invert-100"
            />
          </a>
        </div>

        <div className="space-y-1">
          <h6 className="font-semibold">
            {eventName}{" "}
            <span className="text-muted-foreground text-[13px]">
              by {organizationName}
            </span>
          </h6>
          <p className="text-muted-foreground text-sm">
            Host: {organizationName}
          </p>
          <p className="text-muted-foreground flex items-center justify-between gap-2 text-[12px]">
            <span>{formatDateUK(eventDate)}</span>
          </p>
          <p className="text-muted-foreground flex items-center justify-between gap-2 text-[12px]">
            {startTime} - {endTime} (Europe/London)
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-sm">Will you be joining the event?</p>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                disabled={loading}
                onClick={handleYesClick}
              >
                {loading ? "Joining..." : "Yes"}
              </Button>

              {/* Num of attendees */}
              <span className="text-sm">
                {totalAttendees} attendee{totalAttendees > 1 ? "s" : ""}
              </span>
            </div>

            <Button
              variant="default"
              onClick={handleCopyLink}
              className="flex items-center gap-1"
            >
              {copied ? (
                <>
                  <Copy className="size-4" /> Copied
                </>
              ) : (
                <>
                  <CopyLink className="size-4" /> Share link
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
