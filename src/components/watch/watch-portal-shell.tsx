"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { WatchFocusManager } from "./watch-focus-manager";
import "./watch.css";

const TABS = [
  { href: "/watch/tv", label: "TV" },
  { href: "/watch/explore", label: "Explore" },
  { href: "/watch/screen", label: "Screen" },
] as const;

export function WatchPortalShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";

  return (
    <div className="watch-portal-root flex min-h-[100vh] flex-col">
      <header className="flex flex-shrink-0 flex-wrap items-center justify-between gap-4 border-b border-white/15 px-[3vmin] py-[2vmin]">
        <Link
          href="/watch"
          className="text-[2.5vmin] font-bold text-white hover:underline"
        >
          Tipmanna Watch
        </Link>
        <nav
          className="flex flex-wrap gap-2"
          aria-label="Watch modes"
        >
          {TABS.map(tab => {
            const active =
              pathname === tab.href || pathname.startsWith(`${tab.href}/`);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "watch-tab",
                  active ? "bg-white text-black" : "bg-white/10 text-white"
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <WatchFocusManager>
        <main className="relative flex min-h-0 flex-1 flex-col">
          {children}
        </main>
      </WatchFocusManager>
    </div>
  );
}
