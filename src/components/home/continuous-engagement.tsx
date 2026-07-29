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
          className="continuous-engagement-slideshow mt-8 w-full max-w-full overflow-x-clip"
          role="region"
          aria-label="Continuous engagement showcase"
        >
          <Slide {...slideProperties}>
            {CONTINUOUS_ENGAGEMENT_SLIDES.map(slide => (
              <div
                key={slide.image}
                className="each-slide px-2"
              >
                <div className="border-primary relative h-[280px] overflow-hidden rounded-2xl border-2 sm:h-[360px] lg:h-[480px]">
                  <Image
                    src={slide.image}
                    alt={slide.alt}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, (max-width: 960px) 90vw, 960px"
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
