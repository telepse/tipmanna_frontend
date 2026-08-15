"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

// Third-party imports
import { Button } from "@/components/ui/button";
import {
  ArrowBigDown,
  ArrowBigLeft,
  ArrowBigRight,
  CloudUpload,
  Mic,
  Plus,
  Share2,
  Sprout,
  UsersRound,
  Zap,
} from "lucide-react";

// Import Swiper React components
import { SwiperSlide } from "swiper/react";
import { Pagination, Autoplay, A11y } from "swiper/modules";

// Local imports
import { Paragraph } from "@/components/shared/paragraph";
import { Title } from "@/components/shared/title";
import { Badge } from "@/components/shared/badge";
import { FEATURES, WHAT_YOU_CREATE, WHAT_YOU_CREATE_MOBILE } from "@/constants";
import { FeatureCard } from "./feature-card";
import { CreateDialog } from "./create-dialog";

const Swiper = dynamic(() => import("swiper/react").then(m => m.Swiper), {
  ssr: false,
});

export default function Features() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  const [openPopup, setOpenPopup] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="wrapper section items-center py-6 lg:py-12">
      <Badge
        title="Create"
        isWhite={true}
      />

      <div className="space-y-2">
        <h2
          id="features-heading"
          className="w-full"
        >
          <Title
            align="center"
            size="lg"
          >
            Everything starts with <br className="hidden lg:block" /> what you{" "}
            <span className="relative bg-gradient-to-r from-[#F57D11] to-[#B55805] bg-clip-text text-transparent">
              create.{" "}
            </span>{" "}
          </Title>
        </h2>
        <Paragraph
          align="center"
          color="muted"
          className="mt-1 leading-relaxed"
        >
          Your channel is where participation begins.{" "}
          <br className="hidden sm:block" /> Upload videos, or go live, share!{" "}
          <br />
          Build moments people return for.
        </Paragraph>
      </div>

      <div className="hidden flex-wrap items-center justify-center gap-2 sm:flex">
        {WHAT_YOU_CREATE.map((item, index) => (
          <Fragment key={index}>
            <div
              className={`flex items-center gap-2 rounded-full border border-black px-4 py-2 text-xs sm:text-sm ${item.className}`}
            >
              <item.icon className={`size-4 ${item.iconClassName}`} />
              {item.label}
            </div>

            {index < WHAT_YOU_CREATE.length - 1 && (
              <ArrowBigRight className="size-4" />
            )}
          </Fragment>
        ))}
      </div>

      {/* MOBILE LAYOUT */}
      <div className="flex flex-col items-center justify-center gap-2 sm:hidden">
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-2 rounded-full border border-black bg-white px-4 py-2 text-xs text-black sm:text-sm`}
          >
            <Mic className={`text-primary size-4`} />
            Create
          </div>

          <ArrowBigRight className="size-3" />

          <div
            className={`flex items-center gap-2 rounded-full border border-black bg-black px-4 py-2 text-xs text-white sm:text-sm`}
          >
            <CloudUpload className={`size-4`} />
            Upload
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-2 rounded-full border border-black bg-black px-4 py-2 text-xs text-white sm:text-sm`}
          >
            <Share2 className={`size-4`} />
            Share
          </div>

          <ArrowBigRight className="size-3" />

          <div
            className={`flex items-center gap-2 rounded-full border border-black bg-black px-4 py-2 text-xs text-white sm:text-sm`}
          >
            <Zap className={`size-4`} />
            Discovery
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ArrowBigRight className="size-3" />

          <div
            className={`flex items-center gap-2 rounded-full border border-black bg-white px-4 py-2 text-xs text-black sm:text-sm`}
          >
            <Sprout className={`text-primary size-4`} />
            Grow
          </div>
        </div>
      </div>

      <Button
        size="lg"
        className="bg-primary mt-8 w-fit text-white shadow-[4px_4px_0px_black] hover:bg-black/80 hover:text-white"
        onClick={() => setOpenPopup(true)}
      >
        Create your channel{" "}
      </Button>

      <CreateDialog
        openPopup={openPopup}
        setOpenPopup={setOpenPopup}
      />
    </section>
  );
}
