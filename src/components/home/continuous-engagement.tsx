"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";

import { CONTINUOUS_ENGAGEMENT_SLIDES } from "@/constants";
import { Title } from "../shared/title";
import { Paragraph } from "../shared/paragraph";

import "react-slideshow-image/dist/styles.css";

const Slide = dynamic(
  () => import("react-slideshow-image").then(m => m.Slide),
  { ssr: false }
);

const slideProperties = {
  duration: 5000,
  transitionDuration: 600,
  infinite: true,
  indicators: true,
  arrows: true,
  autoplay: true,
  pauseOnHover: true,
};

export const ContinuousEngagement = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative mt-6 flex flex-col items-center justify-center bg-cover bg-center bg-no-repeat pb-12 lg:mt-12"
    >
      <div className="wrapper section flex w-full flex-col items-center">
        <div className="space-y-3">
          <Title
            align="center"
            size="lg"
          >
            One system, <br />
            <span className="relative bg-gradient-to-r from-[#F57D11] to-[#B55805] bg-clip-text text-transparent">
              continuous engagement
            </span>
          </Title>

          <Paragraph
            color="muted"
            align="center"
          >
            A connected system built around participation - not isolated tools.{" "}
            <br /> People don&apos;t return for content.{" "}
            <br className="inline-block lg:hidden" /> They return for moments.
          </Paragraph>
        </div>

        <div
          className="-mt-16 w-full sm:-mt-8"
          role="region"
          aria-label="Continuous engagement showcase"
        >
          {visible ? (
            <Slide
              {...slideProperties}
              onStartChange={(_, to) => setActiveIndex(to)}
            >
              {CONTINUOUS_ENGAGEMENT_SLIDES.map(slide => (
                <div
                  key={slide.image}
                  className="w-full"
                >
                  <div className="border-primary relative mx-auto h-[200px] w-full overflow-hidden rounded-2xl border-2 sm:h-[360px] lg:h-[530px] lg:w-[960px]">
                    <Image
                      src={slide.image}
                      alt={slide.alt}
                      fill
                      className="h-[200px] w-full object-contain lg:h-[400px]"
                      sizes="(max-width: 1024px) 90vw, 960px"
                      quality={85}
                    />
                  </div>
                </div>
              ))}
            </Slide>
          ) : (
            <div
              className="border-primary bg-muted mx-auto h-[200px] w-full animate-pulse rounded-2xl border-2 sm:h-[360px] lg:h-[530px] lg:w-[960px]"
              aria-hidden
            />
          )}
        </div>

        <div
          className="mx-auto -mt-28 w-full overflow-hidden lg:-mt-24 lg:w-[960px]"
          aria-live="polite"
        >
          <div
            className="flex transition-transform ease-in-out"
            style={{
              width: `${CONTINUOUS_ENGAGEMENT_SLIDES.length * 100}%`,
              transform: `translateX(-${
                activeIndex * (100 / CONTINUOUS_ENGAGEMENT_SLIDES.length)
              }%)`,
              transitionDuration: `${slideProperties.transitionDuration ?? 500}ms`,
            }}
          >
            {CONTINUOUS_ENGAGEMENT_SLIDES.map(slide => (
              <Paragraph
                key={slide.image}
                size="sm"
                className="border-primary w-fit max-w-full shrink-0 self-start border-l-2 py-0 pl-4 leading-relaxed"
                style={{
                  width: `${100 / CONTINUOUS_ENGAGEMENT_SLIDES.length}%`,
                }}
              >
                <span className="font-semibold">{slide.title}</span> -{" "}
                {slide.alt}
              </Paragraph>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

/** @deprecated Use ContinuousEngagement */
export const ContinousEngagement = ContinuousEngagement;
