/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import TVPageClientWrapper from "./tv-page-client-wrapper";

type Props = {
  channels: any[];
  characters: any[];
  characterSets: any[];
};

export default function TVPageShell({
  channels,
  characters,
  characterSets,
}: Props) {
  return (
    <TVPageClientWrapper
      channels={channels}
      characters={characters}
      characterSets={characterSets}
    />
  );
}
