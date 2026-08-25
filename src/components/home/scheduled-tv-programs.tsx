"use client";

import { useEffect, useRef, useState } from "react";

import { Title } from "@/components/shared/title";
import type { DiscoveryProgram } from "@/types/program.types";
import { ScheduledTvProgramCard } from "./scheduled-tv-program-card";

export default function ScheduledTvPrograms() {
  const carouselRef = useRef<HTMLDivElement>(null);
  const [programs, setPrograms] = useState<DiscoveryProgram[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadPrograms = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/contents/programs/discovery`
        );
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && Array.isArray(data)) {
          setPrograms(data as DiscoveryProgram[]);
        }
      } catch {
        // Section hides gracefully when programs cannot be loaded.
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadPrograms();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <section
        className="wrapper section py-12"
        aria-busy="true"
        aria-label="Loading scheduled TV programs"
      >
        <div className="h-10 w-64 animate-pulse rounded-lg bg-neutral-200" />
        <div className="mt-6 flex gap-4 overflow-hidden">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="h-48 w-[85%] flex-shrink-0 animate-pulse rounded-2xl bg-neutral-200 sm:w-[50%]"
            />
          ))}
        </div>
      </section>
    );
  }

  if (programs.length === 0) {
    return null;
  }

  return (
    <section
      className="wrapper section py-12"
      aria-labelledby="scheduled-tv-programs-heading"
    >
      <Title
        id="scheduled-tv-programs-heading"
        size="lg"
      >
        Scheduled <br className="inline-block sm:hidden" />
        <span className="relative bg-gradient-to-r from-[#F57D11] to-[#B55805] bg-clip-text text-transparent">
          TV programs
        </span>
      </Title>

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
