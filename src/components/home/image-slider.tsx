"use client";

import Image from "next/image";
import { useEffect, useState, useCallback, useMemo } from "react";

// Local imports
import { HERO_IMAGES } from "@/constants";

// Constants for better maintainability
const SLIDER_CONFIG = {
  interval: 5000,
  containerHeight: 400,
  imageHeight: 250,
  imageWidth: 400,
  perspective: 1000,
  offsets: {
    center: {
      transform: "translateX(0) scale(0.8) rotateY(0)",
      opacity: 1,
      zIndex: 20,
    },
    right: {
      transform: "translateX(30vw) scale(1) rotateY(-30deg)",
      opacity: 0.5,
      zIndex: 10,
    },
    left: {
      transform: "translateX(-30vw) scale(1) rotateY(30deg)",
      opacity: 0.5,
      zIndex: 10,
    },
    hidden: {
      transform: "translateZ(-600px) scale(0.6)",
      opacity: 0.5,
      zIndex: 10,
    },
  },
} as const;

export default function ImageSlider() {
  const [active, setActive] = useState(0);

  // Memoized next slide handler
  const nextSlide = useCallback(() => {
    setActive(prev => (prev + 1) % HERO_IMAGES.length);
  }, []);

  // Optimized interval with proper cleanup
  useEffect(() => {
    const interval = setInterval(nextSlide, SLIDER_CONFIG.interval);
    return () => clearInterval(interval);
  }, [nextSlide]);

  // Memoized image positions calculation
  const getImagePosition = useCallback((index: number, activeIndex: number) => {
    const totalImages = HERO_IMAGES.length;
    const offset = (index - activeIndex + totalImages) % totalImages;

    switch (offset) {
      case 0:
        return SLIDER_CONFIG.offsets.center;
      case 1:
      case -(totalImages - 1):
        return SLIDER_CONFIG.offsets.right;
      case -1:
      case totalImages - 1:
        return SLIDER_CONFIG.offsets.left;
      default:
        return SLIDER_CONFIG.offsets.hidden;
    }
  }, []);

  // Memoized images rendering
  const sliderImages = useMemo(
    () =>
      HERO_IMAGES.map((src, index) => {
        const position = getImagePosition(index, active);

        return (
          <Image
            key={`${src}-${index}`}
            src={src}
            priority={false}
            alt={`Event showcase ${index + 1}`}
            width={SLIDER_CONFIG.imageWidth}
            height={SLIDER_CONFIG.imageHeight}
            sizes="(max-width: 768px) 100vw, 700px"
            className="absolute h-[200px] w-[440px] object-contain transition-all duration-300 ease-in-out lg:h-[250px] lg:object-cover"
            style={{
              transform: position.transform,
              opacity: position.opacity,
              zIndex: position.zIndex,
            }}
            loading="lazy"
            quality={85}
            aria-hidden="true"
          />
        );
      }),
    [active, getImagePosition]
  );

  return (
    <div
      className="relative -mt-32 flex h-[400px] w-full items-center justify-center overflow-hidden sm:-mt-24"
      role="region"
      aria-label="Event showcase slider"
      aria-live="polite"
      aria-atomic="true"
    >
      <div
        className="relative flex h-[400px] w-full items-center justify-center"
        style={{ perspective: SLIDER_CONFIG.perspective }}
      >
        {sliderImages}

        {/* Accessibility: Hidden current slide indicator */}
        <div
          className="sr-only"
          aria-live="polite"
        >
          Showing slide {active + 1} of {HERO_IMAGES.length}
        </div>
      </div>

      {/* Optional: Add navigation indicators */}
      <div className="absolute bottom-4 left-1/2 z-30 flex -translate-x-1/2 gap-2">
        {HERO_IMAGES.map((_, index) => (
          <button
            key={index}
            onClick={() => setActive(index)}
            className={`h-2 w-2 rounded-full transition-all duration-300 ${
              index === active ? "scale-125 bg-white" : "bg-white/50"
            }`}
            aria-label={`Go to slide ${index + 1}`}
            type="button"
          />
        ))}
      </div>
    </div>
  );
}
