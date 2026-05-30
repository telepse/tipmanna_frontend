"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

// Third-party imports
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

// Import Swiper React components
import { SwiperSlide } from "swiper/react";
import { Pagination, Autoplay, A11y } from "swiper/modules";

// Import Swiper styles
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/a11y";

// Local imports
import { Paragraph } from "@/components/shared/paragraph";
import { Title } from "@/components/shared/title";
import { Badge } from "@/components/shared/badge";
import { FEATURES } from "@/constants";
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
    <section className="wrapper section items-center">
      <Badge title="Create" />

      <h2
        id="features-heading"
        className="w-full"
      >
        <Title
          align="center"
          size="lg"
        >
          Upload videos and livestream
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
        Earn 11x more support. <br /> Fundraise, receive tips or donations with
        your contents or events.
      </Paragraph>

      <Button
        size="lg"
        className="w-fit bg-black hover:bg-black/80"
        onClick={() => setOpenPopup(true)}
      >
        Create content or event{" "}
        <Plus className="bg-primary size-5 rounded p-1 text-black" />
      </Button>

      <CreateDialog
        openPopup={openPopup}
        setOpenPopup={setOpenPopup}
      />

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
      </div>

      {/* Static grid for large screens */}
      <div className="mt-6 hidden grid-cols-3 gap-6 lg:grid">
        {FEATURES.map((item, index) => (
          <FeatureCard
            key={index}
            icon={item.icon}
            title={item.title}
            content={item.content}
          />
        ))}
      </div>
    </section>
  );
}
