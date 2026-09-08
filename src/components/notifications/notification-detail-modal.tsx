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
import { isHostTipNotificationKind } from "@/lib/tip-notification-display";
import { TipNotificationDetails } from "@/components/notifications/tip-notification-details";

type Props = {
  row: FeedNotificationRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deepLink: string | null;
  onMarkRead?: (row: FeedNotificationRow) => void | Promise<void>;
};

function payloadLinkFields(row: FeedNotificationRow): {
  linkUrl: string | null;
  linkText: string | null;
  openLightbox: boolean;
} {
  const payload = (row.payloadJson as Record<string, unknown> | null) ?? null;
  const linkUrl =
    typeof payload?.linkUrl === "string" ? payload.linkUrl.trim() : null;
  const linkText =
    typeof payload?.linkText === "string" ? payload.linkText.trim() : null;
  const openLightbox = payload?.openLightbox === true;
  return {
    linkUrl: linkUrl || null,
    linkText: linkText || null,
    openLightbox,
  };
}

function canTrackAnalytics(row: FeedNotificationRow): boolean {
  return row.source === "personal" && /^[0-9a-f-]{36}$/i.test(row.id);
}

export function NotificationDetailModal({
  row,
  open,
  onOpenChange,
  deepLink,
  onMarkRead,
}: Props) {
  const token = useSelector((s: RootState) => s.auth.token);

  useEffect(() => {
    if (!open || !row || !canTrackAnalytics(row)) return;
    void recordNotificationViewAction(row.id, token ?? undefined);
  }, [open, row, token]);

  if (!row) return null;

  const { linkUrl, linkText, openLightbox } = payloadLinkFields(row);
  const customLinkLabel = linkText || "Open link";

  const onOpenLink = () => {
    void onMarkRead?.(row);
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
              {isHostTipNotificationKind(row.kind) ? (
                <TipNotificationDetails
                  payload={
                    (row.payloadJson as Record<string, unknown> | null) ?? null
                  }
                  includeHost={Boolean(
                    (row.payloadJson as { audience?: string } | null)
                      ?.audience === "admin"
                  )}
                />
              ) : null}
              <p className="text-[11px]">
                {new Date(row.createdAt).toLocaleString()}
                {row.source !== "personal" ? " · Public" : ""}
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:justify-start">
          {linkUrl ? (
            linkUrl.startsWith("/") && !openLightbox ? (
              <Button
                asChild
                size="sm"
                variant="default"
              >
                <Link
                  href={linkUrl}
                  onClick={onOpenLink}
                >
                  {customLinkLabel}
                </Link>
              </Button>
            ) : (
              <Button
                asChild
                size="sm"
                variant="default"
              >
                <a
                  href={linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={onOpenLink}
                >
                  {customLinkLabel}
                </a>
              </Button>
            )
          ) : null}
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
