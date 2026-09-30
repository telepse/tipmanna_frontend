"use client";

import Link from "next/link";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DrawerTitle } from "@/components/ui/drawer";

type Props = {
  title: string;
  openHref: string | null;
  openLabel: string;
  onClose: () => void;
};

/** Glance header: Open full page in a new tab so Explore does not navigate away. */
export function GlanceDrawerChrome({
  title,
  openHref,
  openLabel,
  onClose,
}: Props) {
  return (
    <div className="flex shrink-0 items-center justify-between gap-2 border-b px-4 py-3">
      <DrawerTitle className="min-w-0 truncate text-base font-semibold">
        {title}
      </DrawerTitle>
      <div className="flex shrink-0 items-center gap-2">
        {openHref ? (
          <Button
            asChild
            variant="outline"
            size="sm"
          >
            <Link
              href={openHref}
              target="_blank"
              rel="noopener noreferrer"
            >
              {openLabel}
            </Link>
          </Button>
        ) : null}
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground rounded-md p-1"
          aria-label="Close"
          onClick={onClose}
        >
          <X className="size-5" />
        </button>
      </div>
    </div>
  );
}
