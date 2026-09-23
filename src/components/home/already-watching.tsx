"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { ALREADY_WATCHING_FEATURES } from "@/constants";
import { Paragraph } from "@/components/shared/paragraph";
import { Title } from "@/components/shared/title";

import { useCreateDialogHost } from "@/components/home/create-dialog-host";

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
  const { openCreate } = useCreateDialogHost();

  return (
    <section className="relative mt-6 overflow-hidden bg-black lg:mt-12">
      <div
        aria-hidden
        className="pointer-events-none absolute top-0 left-1/2 z-0 h-[400px] w-[800px] -translate-x-1/2 -translate-y-1/2"
        style={{
          background:
            "radial-gradient(circle, rgba(245,125,17,0.35) 0%, rgba(181,88,5,0.15) 40%, transparent 70%)",
        }}
      />

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

      <div className="section relative z-10 flex flex-col items-center px-4 py-12 lg:py-16">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 lg:w-[960px] lg:grid-cols-3 lg:gap-8">
          {ALREADY_WATCHING_FEATURES.map((item, index) => (
            <div
              key={index}
              className={`${item.className} w-full space-y-1 rounded-lg border-2 p-2 sm:space-y-2 lg:p-4`}
            >
              <Paragraph
                size="lg"
                weight="bold"
                align="center"
                className={item.textClassName}
              >
                {item.title}
              </Paragraph>
              <Paragraph
                size="sm"
                align="center"
                className={`-mt-2 lg:mt-0 ${item.textClassName}`}
              >
                {item.content}
              </Paragraph>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <Title
            size="lg"
            align="center"
          >
            <span className="text-white">Your audience is</span>{" "}
            <span className="relative bg-gradient-to-r from-[#F57D11] to-[#B55805] bg-clip-text text-transparent">
              already watching
            </span>
          </Title>

          <Paragraph
            size="sm"
            className="text-white/70"
            align="center"
          >
            The question is simple: What happens next?{" "}
            <br className="inline-block sm:hidden" /> Turn viewers into
            participants <br className="inline-block sm:hidden" /> Turn
            participation into connection.{" "}
            <br className="inline-block sm:hidden" /> Turn connection into
            something lasting.
          </Paragraph>
        </div>

        <div className="mt-4 flex gap-2">
          <Button
            size="lg"
            className="h-10 w-fit flex-1 shrink-0 px-3 text-sm sm:h-11 sm:px-8 sm:text-base"
            aria-label="Create your channel"
            aria-haspopup="dialog"
            onClick={() => openCreate()}
          >
            Create <span className="hidden sm:inline">Your</span> Channel
          </Button>

          <Button
            asChild
            size="lg"
            className="h-10 w-fit flex-1 shrink-0 bg-white px-3 text-sm text-black hover:bg-white/80 sm:h-11 sm:px-8 sm:text-base"
            aria-label="See pricing"
          >
            <Link href="/partner#pricing">See pricing</Link>
          </Button>
        </div>
      </div>
    </section>
  );
};
