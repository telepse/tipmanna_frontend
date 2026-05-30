"use client";

import { PRICING } from "@/constants";
import { Badge } from "../shared/badge";
import { Paragraph } from "../shared/paragraph";
import { Title } from "../shared/title";
import { PricingCard } from "./pricing-card";

// Import Swiper React components
import { SwiperSlide } from "swiper/react";
import { Pagination, Autoplay, A11y } from "swiper/modules";

// Import Swiper styles
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/a11y";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

const Swiper = dynamic(() => import("swiper/react").then(m => m.Swiper), {
  ssr: false,
});

export default function PricingGrid() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

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
    <section className="wrapper section items-center">
      <Badge title="Pricing" />

      <h2
        id="features-heading"
        className="w-full"
      >
        <Title
          align="center"
          size="lg"
        >
          Affordable pricing for everyone
          <br className="hidden sm:block" /> on{" "}
          <span className="relative bg-gradient-to-r from-[#F57D11] to-[#B55805] bg-clip-text text-transparent">
            tipmanna
          </span>
        </Title>
      </h2>
      <Paragraph
        align="center"
        color="muted"
        className="-mt-2"
      >
        Designed to scale to millions of users. Get started for free and upgrade
        as you grow.
      </Paragraph>

      {/* Static grid for large screens */}
      {/* <div className="mt-6 grid grid-cols-1 items-center gap-6 lg:grid-cols-3">
        {PRICING.map((item, index) => (
          <PricingCard
            key={index}
            name={item.name}
            price={item.price}
            discountPrice={item.discountPrice}
            features={item.features}
            btnText={item.btnText}
          />
        ))}
      </div> */}

      {/* ✅ Swiper for small/medium, Grid for large */}
      <div
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
            {PRICING.map((item, index) => (
              <SwiperSlide key={index}>
                <PricingCard
                  name={item.name}
                  price={item.price}
                  discountPrice={item.discountPrice}
                  features={item.features}
                  btnText={item.btnText}
                />
              </SwiperSlide>
            ))}
          </Swiper>
        ) : null}
      </div>

      {/* Static grid for large screens */}
      <div className="mt-6 hidden grid-cols-3 items-center gap-6 lg:grid">
        {PRICING.map((item, index) => (
          <PricingCard
            key={index}
            name={item.name}
            price={item.price}
            discountPrice={item.discountPrice}
            hasAnnualPrice={item.hasAnnualPrice}
            features={item.features}
            btnText={item.btnText}
          />
        ))}
      </div>
    </section>
  );
}
