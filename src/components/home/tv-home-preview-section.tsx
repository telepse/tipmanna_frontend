"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useMediaQuery } from "react-responsive";

import { TvLivePreviewPlayer } from "@/components/home/tv-live-preview-player";
import { Button } from "@/components/ui/button";
import { Badge } from "../shared/badge";
import { Title } from "../shared/title";
import { Paragraph } from "../shared/paragraph";

/**
 * Partner / marketing embed: live renderer of system Tipmanna TV (not full TVProvider).
 * Playback is click-gated ("Watch live") so intersecting the lazy sentinel loads this
 * section chunk without mounting YouTube (S7 partner chunk observation).
 */
export default function TvHomePreviewSection() {
  const [watchLive, setWatchLive] = useState(false);
  const isNarrow = useMediaQuery({ maxWidth: "768px" });

  return (
    <section
      className="wrapper section mt-6 flex flex-col items-center lg:mt-12"
      aria-labelledby="tv-home-heading"
    >
      <Badge title="Audience" />

      <div className="flex flex-col items-center space-y-3">
        <Title
          size="lg"
          align="center"
        >
          Your audience doesn&apos;t just watch <br />{" "}
          <span className="relative bg-gradient-to-r from-[#F57D11] to-[#B55805] bg-clip-text text-transparent">
            they take part
          </span>
        </Title>

        <Paragraph
          align="center"
          className="leading-relaxed"
        >
          Tipmanna turns viewing into live participation. Supporters react{" "}
          <br className="hidden sm:block" /> comment, and engage as content
          happens - not after.
        </Paragraph>
      </div>

      <div className="bg-secondary relative mx-auto w-full overflow-hidden rounded-2xl p-2 md:p-6 lg:w-[1000px]">
        <div className="rounded-2xl bg-white p-4 md:p-6">
          <Link
            href="/tv"
            target="_blank"
            className="text-primary absolute top-1 right-1 inline-block text-xs font-medium underline-offset-4 hover:underline sm:hidden sm:text-sm"
          >
            Open full TV experience
          </Link>

          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between lg:flex-row lg:items-center">
            <div>
              <h2
                id="tv-home-heading"
                className="text-lg font-semibold md:text-2xl"
              >
                Tipmanna TV
              </h2>
              <p className="text-muted-foreground text-xs sm:text-sm">
                Live scheduled broadcast from videos across the platform.
              </p>
            </div>

            <Link
              href="/tv"
              className="text-primary mt-3 hidden text-xs font-medium underline-offset-4 hover:underline sm:inline-block sm:text-sm"
            >
              Open full TV experience
            </Link>
          </div>

          <div className="mt-4 pb-4">
            {!watchLive ? (
              <div className="relative overflow-hidden rounded-xl border bg-black/90">
                <Image
                  src="/patterns/bg_pattern.webp"
                  alt=""
                  width={1200}
                  height={675}
                  className="h-[200px] w-full object-cover opacity-70 md:h-[280px]"
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/40 p-4">
                  <p className="text-center text-sm text-white/90">
                    Watch Tipmanna&apos;s live scheduled broadcast
                  </p>
                  <Button
                    type="button"
                    className="bg-white text-black hover:bg-white/90"
                    onClick={() => setWatchLive(true)}
                  >
                    Watch live
                  </Button>
                </div>
              </div>
            ) : (
              <TvLivePreviewPlayer isNarrow={isNarrow} />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
