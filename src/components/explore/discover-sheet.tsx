"use client";

import { X } from "lucide-react";

import { DiscoverPanel, type DiscoverPanelProps } from "@/components/tv/discover-panel";
import { cn } from "@/lib/utils";

type Props = DiscoverPanelProps & {
  open: boolean;
  onClose: () => void;
};

export function DiscoverSheet({ open, onClose, className, ...panelProps }: Props) {
  if (!open) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Close discover"
        className="fixed inset-0 z-[12000] bg-black/40"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Discover"
        className={cn(
          "bg-background fixed inset-x-0 top-0 z-[12001] flex max-h-[85dvh] flex-col rounded-b-2xl shadow-xl",
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
          className="absolute top-3 right-3 rounded-full p-1 hover:bg-black/5"
          onClick={onClose}
        >
          <X className="size-5" />
        </button>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 pt-8">
          <DiscoverPanel
            showHeading={false}
            surface="exploreTab"
            {...panelProps}
          />
        </div>
      </div>
    </>
  );
}
