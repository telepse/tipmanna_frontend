"use client";

import { useState } from "react";
import Image from "next/image";

import { CONTINUOUS_ENGAGEMENT_SLIDES } from "@/constants";
import { Slide } from "react-slideshow-image";
import "react-slideshow-image/dist/styles.css";
import { Title } from "../shared/title";
import { Paragraph } from "../shared/paragraph";

const slideProperties = {
  duration: 5000,
  transitionDuration: 600,
  infinite: true,
  indicators: true,
  arrows: true,
  autoplay: true,
  pauseOnHover: true,
};

export const ContinousEngagement = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeSlide = CONTINUOUS_ENGAGEMENT_SLIDES[activeIndex];

  return (
    <section className="relative mt-6 flex flex-col items-center justify-center bg-cover bg-fixed bg-center bg-no-repeat lg:mt-12">
      <div className="wrapper section flex w-full flex-col items-center">
        <Title
          align="center"
          size="lg"
        >
          One system <br />{" "}
          <span className="relative bg-gradient-to-r from-[#F57D11] to-[#B55805] bg-clip-text text-transparent">
            continous engagement
          </span>{" "}
        </Title>

        <Paragraph color="muted">
          A connected system built around participation - not isolated tools.{" "}
          <br /> People don&apos;t return for content. They return for moments.
        </Paragraph>

        <div
          className="continuous-engagement-slideshow mt-8 w-full"
          role="region"
          aria-label="Continuous engagement showcase"
        >
          <Slide
            {...slideProperties}
            onStartChange={(_, to) => setActiveIndex(to)}
          >
            {CONTINUOUS_ENGAGEMENT_SLIDES.map(slide => (
              <div
                key={slide.image}
                className="w-full"
              >
                <div className="border-primary w-full relative mx-auto h-[200px] overflow-hidden rounded-2xl border-2 sm:h-[360px] lg:h-[530px] lg:w-[960px]">
                  <Image
                    src={slide.image}
                    alt={slide.alt}
                    fill
                    className="lg:h-[400px] h-[200px] w-full object-contain"
                    sizes="90vw"
                    quality={90}
                  />
                </div>
              </div>
            ))}
          </Slide>
        </div>

        <Paragraph
          key={activeIndex}
          size="sm"
          aria-live="polite"
          className="border-primary mt-4 w-fit max-w-full self-start border-l-2 py-0 pl-4 transition-opacity duration-300"
        >
          {activeSlide.title} - {activeSlide.alt}
        </Paragraph>
      </div>
    </section>
  );
};
