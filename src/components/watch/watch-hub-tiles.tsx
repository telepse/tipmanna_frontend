"use client";

import Link from "next/link";

const TILES = [
  {
    href: "/watch/tv",
    title: "Live TV",
    description: "Tipmanna system schedule",
  },
  {
    href: "/watch/explore",
    title: "Explore",
    description: "Featured community clips",
  },
  {
    href: "/watch/screen",
    title: "Screen Display",
    description: "Fundraise HUD for your event",
  },
] as const;

export function WatchHubTiles() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-[4vmin] p-[4vmin]">
      <h1 className="text-[4vmin] font-bold">Choose a watch mode</h1>
      <div className="flex flex-wrap justify-center gap-[3vmin]">
        {TILES.map(tile => (
          <Link
            key={tile.href}
            href={tile.href}
            className="watch-tile flex flex-col items-center justify-center rounded-xl bg-white/10 px-[4vmin] py-[3vmin] text-center hover:bg-white/20"
          >
            <span className="font-semibold">{tile.title}</span>
            <span className="mt-2 text-[2vmin] text-white/70">
              {tile.description}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
