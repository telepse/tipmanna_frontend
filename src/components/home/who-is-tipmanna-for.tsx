"use client";

import { useEffect, useRef, useState } from "react";

// Import Swiper React components
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, Autoplay, A11y } from "swiper/modules";

// Local imports
import { Badge } from "../shared/badge";
import { Title } from "../shared/title";
import { FEATURES } from "@/constants";
import { FeatureCard } from "./feature-card";

export const WhoIsTipmannaFor = () => {
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
    <section
      className="relative mt-6 flex flex-col items-center justify-center bg-cover bg-fixed bg-center bg-no-repeat lg:mt-12"
      style={{ backgroundImage: `url(/patterns/bg_pattern.webp)` }}
    >
      <div className="wrapper section flex flex-col items-center">
        <Badge title="Who is Tipmanna for?" />

        <h2
          id="features-heading"
          className="w-full"
        >
          <Title
            align="center"
            size="lg"
          >
            Built for people <br />{" "}
            <span className="relative bg-gradient-to-r from-[#F57D11] to-[#B55805] bg-clip-text text-transparent">
              who bring others together
            </span>{" "}
          </Title>
        </h2>

        {/* ✅ Swiper for small/medium, Grid for large */}
        {/* <div
          className="mt-6 min-h-[200px] w-full lg:hidden"
          ref={ref}
        >
          {visible ? (
            <Swiper
              slidesPerView={3}
              spaceBetween={30}
              loop
              centeredSlides
              autoplay={{ delay: 5000 }}
              pagination={{ clickable: true }}
              modules={[Pagination, Autoplay, A11y]}
              a11y={{
                prevSlideMessage: "Previous feature",
                nextSlideMessage: "Next feature",
                firstSlideMessage: "This is the first feature",
                lastSlideMessage: "This is the last feature",
                paginationBulletMessage: "Go to feature {{index}}",
              }}
              breakpoints={{
                0: { slidesPerView: 1 },
                768: { slidesPerView: 1, spaceBetween: 20 },
                1024: { slidesPerView: 3, spaceBetween: 30 },
              }}
              className="lg:hidden"
            >
              {FEATURES.map((item, index) => (
                <SwiperSlide key={index}>
                  <FeatureCard
                    icon={item.icon}
                    title={item.title}
                    content={item.content}
                  />
                </SwiperSlide>
              ))}
            </Swiper>
          ) : null}
        </div> */}

        {/* Static grid for large screens */}
        <div className="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((item, index) => (
            <FeatureCard
              key={index}
              icon={item.icon}
              title={item.title}
              content={item.content}
            />
          ))}
        </div>
      </div>
    </section>
  );
};
