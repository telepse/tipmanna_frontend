"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

// Third-party imports
import { Button } from "@/components/ui/button";
import { ArrowBigRight, Plus } from "lucide-react";

// Import Swiper React components
import { SwiperSlide } from "swiper/react";
import { Pagination, Autoplay, A11y } from "swiper/modules";

// Local imports
import { Paragraph } from "@/components/shared/paragraph";
import { Title } from "@/components/shared/title";
import { Badge } from "@/components/shared/badge";
import { FEATURES, WHAT_YOU_CREATE } from "@/constants";
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
          Everything starts with <br className="hidden lg:block" /> what you{" "}
          <span className="relative bg-gradient-to-r from-[#F57D11] to-[#B55805] bg-clip-text text-transparent">
            create.{" "}
          </span>{" "}
        </Title>
      </h2>
      <Paragraph
        align="center"
        color="muted"
        className="-mt-2"
      >
        Your channel is where participation begins.{" "}
        <br className="hidden sm:block" /> Upload videos, or go live, share!{" "}
        <br />
        Build moments people return for.
      </Paragraph>

      <div className="flex flex-wrap items-center justify-center gap-2">
        {WHAT_YOU_CREATE.map((item, index) => (
          <Fragment key={index}>
            <div
              className={`flex items-center gap-2 rounded-full border border-black px-4 py-2 text-xs sm:text-sm ${item.className}`}
            >
              <item.icon className={`size-4 ${item.iconClassName}`} />
              {item.label}
            </div>

            {index < WHAT_YOU_CREATE.length - 1 && (
              <ArrowBigRight className="size-4" />
            )}
          </Fragment>
        ))}
      </div>

      <Button
        size="lg"
        className="shadow-primary mt-8 w-fit border bg-white text-black shadow hover:bg-black/80 hover:text-white"
        onClick={() => setOpenPopup(true)}
      >
        Create your channel{" "}
      </Button>

      <CreateDialog
        openPopup={openPopup}
        setOpenPopup={setOpenPopup}
      />
    </section>
  );
}
