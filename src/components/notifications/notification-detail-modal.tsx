"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useSelector } from "react-redux";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { FeedNotificationRow } from "@/actions/notifications";
import {
  recordNotificationClickAction,
  recordNotificationViewAction,
} from "@/actions/notifications";
import type { RootState } from "@/redux/store";

type Props = {
  row: FeedNotificationRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deepLink: string | null;
};

function canTrackAnalytics(row: FeedNotificationRow): boolean {
  return row.source === "personal" && /^[0-9a-f-]{36}$/i.test(row.id);
}

export function NotificationDetailModal({
  row,
  open,
  onOpenChange,
  deepLink,
}: Props) {
  const token = useSelector((s: RootState) => s.auth.token);

  useEffect(() => {
    if (!open || !row || !canTrackAnalytics(row)) return;
    void recordNotificationViewAction(row.id, token ?? undefined);
  }, [open, row, token]);

  if (!row) return null;

  const onOpenLink = () => {
    if (canTrackAnalytics(row)) {
      void recordNotificationClickAction(row.id, token ?? undefined);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{row.title}</DialogTitle>
          <DialogDescription asChild>
            <div className="text-muted-foreground mt-2 space-y-2 text-sm whitespace-pre-wrap">
              {row.body}
              <p className="text-[11px]">
                {new Date(row.createdAt).toLocaleString()}
                {row.source !== "personal" ? " · Public" : ""}
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:justify-start">
          {deepLink ? (
            deepLink.startsWith("/") ? (
              <Button
                asChild
                size="sm"
                variant="default"
              >
                <Link
                  href={deepLink}
                  onClick={onOpenLink}
                >
                  Open
                </Link>
              </Button>
            ) : (
              <Button
                asChild
                size="sm"
                variant="default"
              >
                <a
                  href={deepLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={onOpenLink}
                >
                  Open
                </a>
              </Button>
            )
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
