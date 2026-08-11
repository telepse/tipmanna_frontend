"use client";

import Image from "next/image";

import { CONTINUOUS_ENGAGEMENT_SLIDES } from "@/constants";
import { Slide } from "react-slideshow-image";
import "react-slideshow-image/dist/styles.css";
import { Title } from "../shared/title";
import { Paragraph } from "../shared/paragraph";
import { useMediaQuery } from "react-responsive";

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
  const isMobile = useMediaQuery({ maxWidth: "500px" });

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
          <Slide {...slideProperties}>
            {CONTINUOUS_ENGAGEMENT_SLIDES.map(slide => (
              <div
                key={slide.image}
                className="w-full"
              >
                <div className="border-primary w-ful relative mx-auto h-[280px] overflow-hidden rounded-2xl border-2 sm:h-[360px] lg:h-[530px] lg:w-[960px]">
                  <Image
                    src={slide.image}
                    alt={slide.alt}
                    fill
                    className="h-[400px] w-full object-contain"
                    sizes="90vw"
                    quality={90}
                  />
                </div>
              </div>
            ))}
          </Slide>
        </div>

        {/* {!isMobile && ( */}
        {/* <Slide {...slideProperties}> */}
        {/* {CONTINUOUS_ENGAGEMENT_SLIDES.map(slide => (
              <div
                key={slide.image}
                className="w-full"
              >
                <Paragraph
                  size="lg"
                  color="black"
                  className="-mt-2"
                >
                  {slide.title} - {slide.alt}
                </Paragraph>
              </div>
            ))} */}
        {/* </Slide> */}
        {/* )} */}

        {CONTINUOUS_ENGAGEMENT_SLIDES.map(slide => (
          <div
            key={slide.image}
            className="w-full"
          >
            <Paragraph
              size="sm"
              className="border-primary w-fit max-w-full self-start border-l-2 py-0 pl-4"
            >
              {CONTINUOUS_ENGAGEMENT_SLIDES[0].title} -{" "}
              {CONTINUOUS_ENGAGEMENT_SLIDES[0].alt}
            </Paragraph>
          </div>
        ))}

        <Paragraph
          size="sm"
          className="border-primary w-fit max-w-full self-start border-l-2 py-0 pl-4"
        >
          {CONTINUOUS_ENGAGEMENT_SLIDES[0].title} -{" "}
          {CONTINUOUS_ENGAGEMENT_SLIDES[0].alt}
        </Paragraph>
      </div>
    </section>
  );
};
