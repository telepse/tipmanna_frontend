"use client";

import { useRef } from "react";
import { ChevronsUpDownIcon, X } from "lucide-react";

import {
  DiscoverPanel,
  type DiscoverPanelProps,
} from "@/components/tv/discover-panel";
import { cn } from "@/lib/utils";
import Link from "next/link";

type Props = DiscoverPanelProps & {
  open: boolean;
  onClose: () => void;
  /** Client-side navigation to /explore?tab=discover (full Discover tab). */
  onExpandToDiscover?: () => void;
};

export function DiscoverSheet({
  open,
  onClose,
  onExpandToDiscover,
  className,
  ...panelProps
}: Props) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  return (
    <>
      <button
        type="button"
        aria-label="Close discover"
        className={cn(
          "fixed inset-0 z-[12000] bg-black/40",
          !open && "pointer-events-none invisible"
        )}
        onClick={onClose}
        tabIndex={open ? 0 : -1}
      />
      <div
        role="dialog"
        aria-modal={open}
        aria-hidden={!open}
        aria-label="Discover"
        className={cn(
          "bg-background fixed inset-x-0 top-0 z-[12001] flex max-h-[85dvh] flex-col rounded-b-2xl shadow-xl transition-opacity",
          !open && "pointer-events-none invisible opacity-0",
          className
        )}
        style={{ touchAction: "pan-y", overscrollBehavior: "contain" }}
      >
        <div className="flex shrink-0 items-center justify-center py-2">
          <div
            className="bg-muted-foreground/30 h-1 w-10 rounded-full"
            aria-hidden
          />
        </div>
        <button
          type="button"
          aria-label="Close discover panel"
          className="absolute top-3 right-3 bg-black p-1"
          onClick={onClose}
          tabIndex={open ? 0 : -1}
        >
          <X className="size-5 text-white" />
        </button>

        <div className="flex flex-col items-start justify-between p-2 sm:p-4 lg:flex-row lg:items-center">
          <h2 className="pt-2 text-base font-semibold lg:text-2xl">
            Welcome to Tipmanna! Discover contents.
          </h2>

          {onExpandToDiscover ? (
            <div className="flex shrink-0 items-center justify-end gap-4 self-end px-0 pt-2 pr-12 lg:px-4">
              <Link
                href="/partner"
                className="text-primary text-xs font-medium"
              >
                About Tipmanna
              </Link>

              <button
                type="button"
                data-testid="discover-panel-expand"
                aria-label="Expand Discover"
                className="text-primary flex cursor-pointer items-center gap-1 text-xs font-medium underline-offset-2 hover:underline"
                onClick={onExpandToDiscover}
              >
                Expand Discover <ChevronsUpDownIcon className="size-4" />
              </button>
            </div>
          ) : null}
        </div>

        <div
          ref={scrollContainerRef}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 pt-8"
        >
          <DiscoverPanel
            showHeading={false}
            surface="explorePanel"
            scrollContainerRef={scrollContainerRef}
            {...panelProps}
          />
        </div>
      </div>
    </>
  );
}
