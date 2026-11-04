"use client";

type ActiveOverlay = {
  slotId: string;
  label: string;
  cycleIndex: number;
  secondsIntoSlot: number;
};

type Props = {
  activeOverlay: ActiveOverlay | null;
};

/** LIVE-016 host preview of lower-third rotation on the outbound stream path. */
export function HostStreamBrandingPreview({ activeOverlay }: Props) {
  if (!activeOverlay) {
    return (
      <p className="text-muted-foreground text-xs">
        No branding rotation configured — stream uses programme layout only.
      </p>
    );
  }
  return (
    <div
      className="rounded-md border border-dashed bg-muted/40 px-3 py-2 text-xs"
      aria-live="polite"
      data-testid="stream-branding-preview"
    >
      <span className="text-muted-foreground">On stream now: </span>
      <strong>{activeOverlay.label}</strong>
      <span className="text-muted-foreground">
        {" "}
        · slot {activeOverlay.slotId} · {activeOverlay.secondsIntoSlot}s into
        rotation
      </span>
    </div>
  );
}
