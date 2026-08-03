"use client";

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
  return (
    <section
      className="relative mt-6 flex flex-col items-center justify-center bg-cover bg-fixed bg-center bg-no-repeat lg:mt-12"
      style={{ backgroundImage: `url(/patterns/bg_pattern.webp)` }}
    >
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
          People don&apos;t return for content. They return for moments.
        </Paragraph>

        <div
          className="continuous-engagement-slideshow mt-8 w-full"
          role="region"
          aria-label="Continuous engagement showcase"
        >
          <Slide {...slideProperties}>
            {CONTINUOUS_ENGAGEMENT_SLIDES.map(slide => (
              <div
                key={slide.image}
                className="w-full"
              >
                <div className="border-primary relative h-[280px] w-full overflow-hidden rounded-2xl border-2 sm:h-[360px] lg:h-[530px]">
                  <Image
                    src={slide.image}
                    alt={slide.alt}
                    fill
                    className="object-cover"
                    sizes="100vw"
                    quality={90}
                  />

                  <div className="bg-primary/70 border-primary absolute bottom-4 left-4 rounded-2xl border-2 p-4 text-sm">
                    <Paragraph
                      size="lg"
                      weight="bold"
                      color="white"
                    >
                      {slide.title}
                    </Paragraph>
                    <Paragraph
                      size="xs"
                      color="white"
                      className="-mt-2"
                    >
                      {slide.alt}
                    </Paragraph>
                  </div>
                </div>
              </div>
            ))}
          </Slide>
        </div>

        <div className="border-primary self-start border-l-2 p-4">
          <Paragraph size="sm">
            A connected system built around participation - not isolated tools.
          </Paragraph>
        </div>
      </div>
    </section>
  );
};
