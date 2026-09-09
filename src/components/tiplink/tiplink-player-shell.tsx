import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type Props = {
  children: ReactNode;
  className?: string;
  variant?: "inline" | "immersive" | "docked";
};

/** CSS/glass frame around TipLink VideoPlayer — no WebGL or canvas. */
export function TipLinkPlayerShell({
  children,
  className,
  variant = "inline",
}: Props) {
  return (
    <div
      className={cn(
        "relative overflow-hidden",
        variant === "inline" &&
          "rounded-2xl border border-white/15 bg-gradient-to-br from-white/[0.09] via-white/[0.03] to-transparent shadow-[0_0_48px_-16px_rgba(168,85,247,0.45)] backdrop-blur-sm",
        variant === "docked" &&
          "rounded-md bg-black shadow-lg ring-1 ring-white/15",
        variant === "immersive" && "h-full w-full bg-black",
        className
      )}
    >
      {variant === "inline" ? (
        <>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.14),transparent_55%)]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-px rounded-2xl ring-1 ring-white/10 ring-inset"
          />
        </>
      ) : null}
      <div className="relative h-full w-full">{children}</div>
    </div>
  );
}
