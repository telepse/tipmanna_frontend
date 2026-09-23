"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { useCallback, useMemo, useState } from "react";
import { useCreateDialogHost } from "@/components/home/create-dialog-host";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Sparkles, Tv } from "lucide-react";
import { Title } from "@/components/shared/title";
import { Paragraph } from "@/components/shared/paragraph";

const LocationPrompt = dynamic(
  () =>
    import("@/components/shared/location-prompt").then(m => m.LocationPrompt),
  { ssr: false }
);

const PATHS = {
  leftPattern: "/patterns/hero_left_pattern.webp",
  rightPattern: "/patterns/hero_right_pattern.webp",
  trophy: "/icons/trophy.png",
  fun: "/icons/fun.png",
  diamond: "/icons/diamond.png",
  flash: "/icons/flash.png",
} as const;

export default function NewHeroClient() {
  const [showPrompt, setShowPrompt] = useState(false);
  const { openCreate } = useCreateDialogHost();
  const router = useRouter();

  const handleLocationAllow = useCallback(() => {
    setShowPrompt(false);
  }, []);

  const handleLocationDeny = useCallback(() => {
    setShowPrompt(false);
    router.push("/join");
  }, [router]);

  const handleClosePrompt = useCallback(() => {
    setShowPrompt(false);
  }, []);

  const decorativeIcons = useMemo(
    () => (
      <>
        <Image
          src={PATHS.trophy}
          alt=""
          width={50}
          height={50}
          className="absolute top-0 left-4 size-12 object-contain opacity-50 sm:top-24 sm:left-16 sm:size-16 lg:left-32"
          loading="lazy"
          aria-hidden
        />
        <Image
          src={PATHS.fun}
          alt=""
          width={50}
          height={50}
          className="absolute -top-8 -left-10 size-10 translate-x-28 object-contain sm:-top-10 sm:size-12 sm:translate-x-40"
          loading="lazy"
          aria-hidden
        />
        <Image
          src={PATHS.diamond}
          alt=""
          width={50}
          height={50}
          className="absolute bottom-2 -left-10 size-8 -rotate-[15deg] object-contain opacity-50 sm:-left-24 sm:size-12"
          loading="lazy"
          aria-hidden
        />
        <Image
          src={PATHS.flash}
          alt=""
          width={50}
          height={50}
          className="absolute top-2 -right-12 size-10 rotate-[30deg] object-contain opacity-50 sm:-right-22 sm:size-16"
          loading="lazy"
          aria-hidden
        />
      </>
    ),
    []
  );

  return (
    <section
      className="relative overflow-hidden"
      aria-labelledby="hero-headline"
    >
      <div className="pointer-events-none absolute top-0 left-0 h-full w-2/3 sm:w-1/2 lg:top-10 lg:w-1/3">
        <Image
          src={PATHS.leftPattern}
          alt=""
          fill
          priority
          className="-translate-x-1/4 object-cover object-left sm:-translate-x-1/3 lg:translate-x-0"
          quality={85}
          sizes="50vw"
          aria-hidden
        />
      </div>

      <div className="pointer-events-none absolute top-0 right-0 h-full w-2/3 sm:w-1/2 lg:top-10 lg:w-1/3">
        <Image
          src={PATHS.rightPattern}
          alt=""
          fill
          priority
          className="translate-x-1/4 object-cover object-right sm:translate-x-1/3 lg:translate-x-0"
          quality={85}
          sizes="50vw"
          aria-hidden
        />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-4 px-4 py-20 text-center sm:gap-6">
        <div
          className="border-primary open_sans inline-flex items-center gap-2 rounded-full border px-4 py-3 text-xs font-medium sm:text-sm"
          style={{ backgroundImage: `linear-gradient(to left, #FFF, #FFF8F1)` }}
          role="status"
          aria-label="Realtime participation platform"
        >
          <Sparkles
            className="fill-primary size-5"
            aria-hidden
          />{" "}
          Realtime participation platform
        </div>

        <Title
          as="h1"
          id="hero-headline"
          align="center"
          className="mt-6 flex flex-col items-center text-4xl sm:text-6xl lg:text-[67px]"
        >
          <span className="inline-flex items-center">
            Turn&nbsp;
            <span className="relative inline-block">
              viewers
              <Image
                src="/icons/fun.png"
                alt=""
                width={50}
                height={50}
                sizes="48px"
                className="absolute -top-6 -left-10 size-10 translate-x-14 object-contain sm:-top-8 sm:size-12 sm:translate-x-20"
                aria-hidden
              />
            </span>
          </span>
          <span className="-mt-2 inline-flex items-center gap-2 sm:-mt-4">
            into
            <span className="relative bg-gradient-to-r from-[#F57D11] to-[#B55805] bg-clip-text text-transparent">
              <Image
                src="/icons/diamond.png"
                alt=""
                width={50}
                height={50}
                sizes="48px"
                className="absolute bottom-8 -left-20 size-8 -rotate-[15deg] object-contain opacity-50 sm:bottom-10 sm:-left-36 sm:size-12"
                aria-hidden
              />{" "}
              participants
            </span>
          </span>
        </Title>

        <Paragraph
          size="lg"
          color="muted"
          className="relative -mt-4"
        >
          upload videos or go live{" "}
          <Image
            src="/icons/flash.png"
            alt=""
            width={50}
            height={50}
            sizes="64px"
            className="absolute top-2 -right-12 size-10 rotate-[30deg] object-contain opacity-50 sm:-right-22 sm:size-16"
            aria-hidden
          />
        </Paragraph>

        <Paragraph
          size="sm"
          color="black"
          align="center"
          className="relative -mt-2 sm:-mt-4"
        >
          <span className="relative leading-relaxed">
            Grow an audience that doesn&apos;t just watch{" "}
            <br className="inline-block sm:hidden" /> - they take part.{" "}
            <br className="hidden lg:block" />{" "}
            <span className="hidden sm:inline-block">
              Tipmanna turns content into realtime participation through
            </span>{" "}
            <br className="hidden lg:block" />{" "}
            <span className="hidden sm:inline-block">
              live engagements, shared moments, and visible supporter activity.
            </span>
          </span>
        </Paragraph>

        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
        >
          {decorativeIcons}
        </div>

        <div className="mt-4 flex w-full max-w-sm gap-2">
          <Button
            size="lg"
            className="h-10 flex-1 shrink-0 px-3 text-sm sm:h-11 sm:px-8 sm:text-base"
            aria-label="Create channel"
            aria-haspopup="dialog"
            onClick={() => openCreate()}
          >
            Create Channel
          </Button>

          <Button
            asChild
            size="lg"
            className="h-10 flex-1 shrink-0 bg-black px-3 text-sm sm:h-11 sm:px-8 sm:text-base"
            aria-label="Watch Tipmanna TV"
          >
            <Link href="/tv">
              Watch Tipmanna TV <Tv aria-hidden />
            </Link>
          </Button>
        </div>

        {showPrompt ? (
          <LocationPrompt
            open={showPrompt}
            onAllow={handleLocationAllow}
            onDeny={handleLocationDeny}
            onClose={handleClosePrompt}
          />
        ) : null}
      </div>
    </section>
  );
}
