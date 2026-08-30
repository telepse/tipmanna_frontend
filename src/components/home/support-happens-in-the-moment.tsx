"use client";

import { useEffect, useRef } from "react";

import { LIVE_ACTIVITY_FEATURES } from "@/constants";
import { Paragraph } from "../shared/paragraph";
import { Title } from "../shared/title";

export const SupportHappensInTheMoment = () => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    const section = video?.closest("section");
    if (!video || !section) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          void video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: 0.35 }
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="bg-secondary/30 flex flex-col items-center py-6 lg:py-12">
      <div className="wrapper section w-full">
        <div className="border-primary space-y-2 rounded-2xl border-2 bg-white p-4 text-center sm:rounded-3xl sm:p-6 lg:rounded-full lg:p-8 lg:text-left">
          <Title
            size="lg"
            className="text-3xl sm:text-4xl lg:text-6xl"
          >
            Support happens in the{" "}
            <span className="relative bg-gradient-to-r from-[#F57D11] to-[#B55805] bg-clip-text text-transparent">
              moment
            </span>
          </Title>
          <Paragraph
            color="muted"
            size="lg"
          >
            <span className="font-black">Not before. Not after. During.</span>
          </Paragraph>
        </div>

        <div className="grid grid-cols-1 items-center gap-4 lg:grid-cols-12 lg:gap-8">
          <div className="flex items-center justify-center rounded-2xl p-4 lg:col-span-8 lg:min-h-[420px] lg:p-6">
            <div className="bg-secondary mx-auto flex w-full max-w-[240px] items-center justify-center overflow-hidden rounded-2xl p-3 sm:max-w-[280px] lg:max-w-[480px]">
              <div className="w-full max-w-[220px] overflow-hidden rounded-2xl bg-white p-3 sm:max-w-[260px] lg:max-w-[300px]">
                <video
                  ref={videoRef}
                  src="https://res.cloudinary.com/tipmanna/video/upload/v1785683068/IMG_3107_betymi.mp4"
                  muted
                  loop
                  playsInline
                  preload="none"
                  poster="/patterns/tip_what_you_can.webp"
                  aria-label="Demonstration of live supporter activity during a Tipmanna event"
                  className="aspect-[9/16] w-full rounded-xl object-contain"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2 lg:col-span-4">
            <Paragraph size="sm">
              <span className="font-semibold uppercase">Live activity</span>{" "}
              &middot; what happens in real time
            </Paragraph>

            <div className="space-y-2">
              {LIVE_ACTIVITY_FEATURES.map(feature => (
                <div
                  key={feature.label}
                  className="flex items-center gap-2 rounded-2xl bg-white p-3 sm:p-2"
                >
                  <feature.icon
                    className={`size-5 shrink-0 ${feature.className} ${feature.fill ? "fill-current" : ""}`}
                  />
                  <Paragraph size="xs">{feature.label}</Paragraph>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
