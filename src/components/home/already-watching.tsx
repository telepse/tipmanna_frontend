"use client";

import Link from "next/link";
import { useState } from "react";

// Third-party imports
import { Button } from "@/components/ui/button";
import { Tv } from "lucide-react";

// Local imports
import { CreateDialog } from "./create-dialog";
import { ALREADY_WATCHING_FEATURES } from "@/constants";
import { Paragraph } from "@/components/shared/paragraph";
import { Title } from "@/components/shared/title";
import { useMediaQuery } from "react-responsive";

const PARTICLES = [
  { top: "10%", left: "8%" },
  { top: "8%", left: "42%" },
  { top: "14%", right: "12%" },
  { top: "38%", left: "5%" },
  { top: "46%", right: "6%" },
  { top: "62%", left: "18%" },
  { top: "58%", right: "24%" },
  { top: "78%", left: "8%" },
  { top: "82%", left: "52%" },
  { top: "74%", right: "10%" },
] as const;

export const AlreadyWatching = () => {
  const [openPopup, setOpenPopup] = useState(false);

  const isMobile = useMediaQuery({ query: "(max-width: 768px)" });

  return (
    <section className="relative mt-6 overflow-hidden bg-black lg:mt-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0"
      >
        {PARTICLES.map((particle, index) => (
          <span
            key={index}
            className="bg-primary absolute size-2 rounded-full opacity-70"
            style={particle}
          />
        ))}
      </div>

      <div className="wrapper section relative z-10 flex flex-col items-center px-4 py-12 lg:py-16">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-8">
          {ALREADY_WATCHING_FEATURES.map((item, index) => (
            <div
              key={index}
              className={`${item.className} space-y-2 rounded-lg border-2 p-4`}
            >
              <Paragraph
                size="lg"
                weight="bold"
                align="center"
                className={`text-${item.txtColor}`}
              >
                {item.title}
              </Paragraph>
              <Paragraph
                size="sm"
                align="center"
                className={`text-${item.txtColor}`}
              >
                {item.content}
              </Paragraph>
            </div>
          ))}
        </div>

        <Title size="lg">
          <span className="text-white">Your audience is</span>{" "}
          <span className="relative bg-gradient-to-r from-[#F57D11] to-[#B55805] bg-clip-text text-transparent">
            already watching
          </span>
        </Title>

        <Paragraph
          size="sm"
          className="text-white/70"
        >
          The question is simple: What happens next? Turn viewers into
          participants <br className="hidden lg:block" /> Turn participation
          into connection. Turn connection into something lasting.
        </Paragraph>

        {/* CTA */}
        <div className="mt-4 flex gap-2">
          <Button
            size={isMobile ? "sm" : "lg"}
            aria-label="Explore Contents"
            aria-haspopup="dialog"
            onClick={() => setOpenPopup(true)}
            className="flex-1 shrink-0"
          >
            Create Your Channel
          </Button>

          <Link href="/tv">
            <Button
              size={isMobile ? "sm" : "lg"}
              aria-label="Watch TV"
              aria-haspopup="dialog"
              className="flex-1 shrink-0 bg-gray-500"
            >
              Watch TIpmanna TV <Tv aria-hidden="true" />
            </Button>
          </Link>
        </div>

        <CreateDialog
          openPopup={openPopup}
          setOpenPopup={setOpenPopup}
        />
      </div>
    </section>
  );
};
