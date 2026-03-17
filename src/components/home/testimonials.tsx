"use client";

import Image from "next/image";

// Import Swiper React components
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, Autoplay } from "swiper/modules";

// Import Swiper styles
import "swiper/css";
import "swiper/css/pagination";

import { Quote } from "lucide-react";

// Local imports
import { Badge } from "@/components/shared/badge";
import { Paragraph } from "@/components/shared/paragraph";
import { Title } from "@/components/shared/title";
import { Testimonial } from "@/types/testimonial.types";

interface Props {
  testimonials: Testimonial[];
}

export default function Testimonials({ testimonials }: Props) {
  return (
    <section
      className="section wrapper"
      id="community"
    >
      <div className="flex flex-col items-center gap-6">
        <Badge title="Testimonials" />

        <Title
          align="center"
          size="lg"
        >
          Hear from our <span className="text-primary">community</span>
        </Title>
        <Paragraph
          align="center"
          color="muted"
          className="-mt-4"
        >
          Testimonials from charities, event performers, and event organisers.
        </Paragraph>
      </div>

      <Swiper
        slidesPerView={2}
        spaceBetween={30}
        loop
        centeredSlides
        autoplay={{ delay: 5000 }}
        pagination={{ clickable: true }}
        modules={[Pagination, Autoplay]}
        breakpoints={{
          0: { slidesPerView: 1 },
          768: { slidesPerView: 2, spaceBetween: 20 },
          1024: { slidesPerView: 2, spaceBetween: 30 },
        }}
        className="mt-6 w-full"
      >
        {testimonials.map((testimonial: Testimonial, index) => (
          <SwiperSlide key={index}>
            <div className="testimonial-slide section relative flex-row items-start p-0">
              <div className="relative size-14 shrink-0">
                <Image
                  src={testimonial.imageUrl}
                  alt={testimonial.name}
                  fill
                  className="-scale-x-100 rounded-full object-cover"
                />
              </div>

              <Quote className="text-primary absolute right-0 bottom-14" />

              <div className="bg-moonstone-blue/15 space-y-2 p-2">
                <Paragraph size="xs">{testimonial.testimonial}</Paragraph>

                <div>
                  <Paragraph
                    size="sm"
                    weight="medium"
                  >
                    {testimonial.name}
                  </Paragraph>
                  <Paragraph
                    size="xs"
                    className="-mt-2"
                  >
                    {testimonial.occupation}
                  </Paragraph>
                  <Paragraph
                    size="xs"
                    className="text-muted-foreground -mt-2 flex items-center gap-1 text-xs"
                  >
                    <div className="bg-moonstone-blue size-3 rounded-full"></div>{" "}
                    {testimonial.role}
                  </Paragraph>
                </div>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </section>
  );
}
