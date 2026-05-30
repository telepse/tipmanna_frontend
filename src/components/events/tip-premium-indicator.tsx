"use client";

export function TipPremiumIndicator({ className }: { className?: string }) {
  return (
    <span
      className={
        "pointer-events-none absolute bottom-0 left-0 rounded-tr bg-amber-500 px-1 py-0.5 text-[9px] leading-none font-bold text-white " +
        (className ?? "")
      }
      title="Premium animation"
    >
      P
    </span>
  );
}
