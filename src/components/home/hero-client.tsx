"use client";

import Image from "next/image";
import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

// Third-party imports
import { Button } from "@/components/ui/button";
import { Asterisk, Search, Sparkles, Tv } from "lucide-react";

// Local imports
import { Title } from "@/components/shared/title";
import { Paragraph } from "@/components/shared/paragraph";
import { LocationPrompt } from "@/components/shared/location-prompt";
import Link from "next/link";
import { useMediaQuery } from "react-responsive";

// Constants for better maintainability
const PATHS = {
  leftPattern: "/patterns/hero_left_pattern.webp",
  rightPattern: "/patterns/hero_right_pattern.webp",
  trophy: "/icons/trophy.png",
  fun: "/icons/fun.png",
  diamond: "/icons/diamond.png",
  flash: "/icons/flash.png",
} as const;

export default function HeroClient() {
  const [showPrompt, setShowPrompt] = useState(false);
  const router = useRouter();

  const handleLocationAllow = useCallback((country: string) => {
    console.log("Allowed in", country);
    setShowPrompt(false);
  }, []);

  const handleLocationDeny = useCallback(() => {
    setShowPrompt(false);
    router.push("/join");
  }, [router]);

  const handleClosePrompt = useCallback(() => {
    setShowPrompt(false);
  }, []);

  // Memoized decorative icons to prevent unnecessary re-renders
  const decorativeIcons = useMemo(
    () => (
      <>
        {/* Trophy Icon */}
        <Image
          src={PATHS.trophy}
          alt="Trophy icon"
          width={50}
          height={50}
          className="absolute top-0 left-4 size-12 object-contain opacity-50 sm:top-24 sm:left-16 sm:size-16 lg:left-32"
          loading="lazy"
          priority={false}
          aria-hidden="true"
        />

        {/* Fun Icon */}
        <Image
          src={PATHS.fun}
          alt="Fun icon"
          width={50}
          height={50}
          className="absolute -top-8 -left-10 size-10 translate-x-28 object-contain sm:-top-10 sm:size-12 sm:translate-x-40"
          loading="lazy"
          priority={false}
          aria-hidden="true"
        />

        {/* Diamond Icon */}
        <Image
          src={PATHS.diamond}
          alt="Diamond icon"
          width={50}
          height={50}
          className="absolute bottom-2 -left-10 size-8 -rotate-[15deg] object-contain opacity-50 sm:-left-24 sm:size-12"
          loading="lazy"
          priority={false}
          aria-hidden="true"
        />

        {/* Flash Icon */}
        <Image
          src={PATHS.flash}
          alt="Flash icon"
          width={50}
          height={50}
          className="absolute top-2 -right-12 size-10 rotate-[30deg] object-contain opacity-50 sm:-right-22 sm:size-16"
          loading="lazy"
          priority={false}
          aria-hidden="true"
        />
      </>
    ),
    []
  );

  const isMobile = useMediaQuery({
    maxWidth: "500px",
  });

  return (
    <section
      className="relative overflow-hidden"
      aria-labelledby="hero-headline"
    >
      {/* Left Vector */}
      <div className="pointer-events-none absolute -top-10 left-0 h-full w-1/3">
        <Image
          src={PATHS.leftPattern}
          alt="Decorative left background pattern"
          fill
          priority
          className="object-contain object-left"
          quality={85} // Reduced quality for background images
          sizes="33vw" // Proper sizing for responsive images
        />
      </div>

      {/* Right Vector */}
      <div className="pointer-events-none absolute -top-10 right-0 h-full w-1/3">
        <Image
          src={PATHS.rightPattern}
          alt="Decorative right background pattern"
          fill
          priority
          className="object-contain object-right"
          quality={85}
          sizes="33vw"
        />
      </div>

      {/* Floating Icons */}
      <Image
        src="/icons/trophy.png"
        alt="Trophy"
        width={50}
        height={50}
        sizes="64px"
        className="absolute top-0 left-4 size-12 object-contain opacity-50 sm:top-24 sm:left-16 sm:size-16 lg:left-32"
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-4 px-4 py-20 text-center sm:gap-6">
        {/* Badge */}
        <div
          className="border-primary open_sans inline-flex items-center gap-2 rounded-full border px-4 py-3 text-xs font-medium sm:text-sm"
          style={{ backgroundImage: `linear-gradient(to left, #FFF, #FFF8F1)` }}
          role="status"
          aria-label="Content and event tipping platform"
        >
          <Sparkles
            className="fill-primary size-5"
            aria-hidden="true"
          />{" "}
          Content and event tipping platform
        </div>

        {/* Headline */}
        <h1
          id="hero-headline"
          className="flex flex-col items-center"
        >
          <Title
            size="lg"
            className="mt-6 inline-flex items-center"
          >
            <span>tip easy</span> <Asterisk className="text-primary size-8" />{" "}
            <span className="relative inline-block">
              tip fun
              {/* Decorative Icon Above 'fun' */}
              <Image
                src="/icons/fun.png"
                alt="Fun"
                width={50}
                height={50}
                sizes="48px"
                className="absolute -top-8 -left-10 size-10 translate-x-28 object-contain sm:-top-10 sm:size-12 sm:translate-x-40"
              />
            </span>
          </Title>
        </h1>

        {/* Subheadline */}
        <Title
          size="lg"
          color="primary"
          className="relative bg-gradient-to-r from-[#F57D11] to-[#B55805] bg-clip-text text-transparent"
        >
          <Image
            src="/icons/diamond.png"
            alt="Diamond"
            width={50}
            height={50}
            sizes="48px"
            className="absolute bottom-2 -left-10 size-8 -rotate-[15deg] object-contain opacity-50 sm:-left-24 sm:size-12"
          />{" "}
          tipmanna
        </Title>

        <Paragraph
          size="lg"
          color="muted"
          className="relative -mt-4"
        >
          safe and handy{" "}
          <Image
            src="/icons/flash.png"
            alt="Flash"
            width={50}
            height={50}
            sizes="64px"
            className="absolute top-2 -right-12 size-10 rotate-[30deg] object-contain opacity-50 sm:-right-22 sm:size-16"
          />
        </Paragraph>

        {/* Render decorative icons */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
        >
          {decorativeIcons}
        </div>

        {/* CTA */}
        <div className="mt-4 flex flex-wrap gap-2">
          {/* <Button
            size={isMobile ? "sm" : "lg"}
            onClick={handleJoinClick}
            aria-label="Join an event to start tipping"
            aria-haspopup="dialog"
            className=""
          >
            Find an event{" "}
            <ArrowRight
              className="-rotate-45"
              aria-hidden="true"
            />
          </Button> */}

          <Link href="/tv">
            <Button
              size={isMobile ? "sm" : "lg"}
              aria-label="Watch TV"
              aria-haspopup="dialog"
              className=""
            >
              Watch TV <Tv aria-hidden="true" />
            </Button>
          </Link>

          <Link href="/">
            <Button
              size={isMobile ? "sm" : "lg"}
              className="bg-black"
              aria-label="Explore Contents"
              aria-haspopup="dialog"
            >
              Explore Contents <Search aria-hidden="true" />
            </Button>
          </Link>
        </div>

        <LocationPrompt
          open={showPrompt}
          onAllow={handleLocationAllow}
          onDeny={handleLocationDeny}
          onClose={handleClosePrompt}
        />
      </div>
    </section>
  );
}
