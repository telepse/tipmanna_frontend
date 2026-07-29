"use client";

import { useEffect, useRef, useState } from "react";

import { Badge } from "@/components/shared/badge";
import { Title } from "@/components/shared/title";
import type { DiscoveryProgram } from "@/types/program.types";
import { ScheduledTvProgramCard } from "./scheduled-tv-program-card";

export default function ScheduledTvPrograms() {
  const carouselRef = useRef<HTMLDivElement>(null);
  const [programs, setPrograms] = useState<DiscoveryProgram[]>([]);

  useEffect(() => {
    const loadPrograms = async () => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/contents/programs/discovery`
      );
      const data = await res.json();
      setPrograms(data as DiscoveryProgram[]);
    };

    loadPrograms();
  }, []);

  if (programs.length === 0) {
    return null;
  }

  return (
    <section
      className="wrapper section py-12"
      aria-labelledby="scheduled-tv-programs-heading"
    >
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <Badge title="TV Schedule" />
          <h2 id="scheduled-tv-programs-heading">
            <Title size="lg">
              Scheduled <span className="text-primary">TV programs</span>
            </Title>
          </h2>
        </div>
      </div>

      <div className="no-scrollbar hide__scrollbar relative flex items-center gap-4 overflow-x-auto lg:hidden">
        <div className="flex w-full snap-x snap-mandatory space-x-4">
          {programs.map(program => (
            <div
              key={program.id}
              className="w-[85%] flex-shrink-0 snap-center transition-transform duration-300 sm:w-[50%]"
            >
              <ScheduledTvProgramCard {...program} />
            </div>
          ))}
        </div>
      </div>

      <div className="no-scrollbar hide__scrollbar relative hidden items-center gap-4 overflow-x-auto lg:flex">
        <div
          ref={carouselRef}
          className="flex w-[550px] snap-x snap-mandatory space-x-4"
        >
          {programs.map(program => (
            <div
              key={program.id}
              className="w-[85%] flex-shrink-0 snap-center transition-transform duration-300 sm:w-[50%]"
            >
              <ScheduledTvProgramCard {...program} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
