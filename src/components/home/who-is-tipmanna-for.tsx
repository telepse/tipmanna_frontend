import Image from "next/image";

import { Badge } from "../shared/badge";
import { Title } from "../shared/title";
import { FEATURES } from "@/constants";
import { FeatureCard } from "./feature-card";

export const WhoIsTipmannaFor = () => {
  return (
    <section
      className="relative mt-6 flex w-full min-w-0 flex-col items-center justify-center overflow-x-clip bg-cover bg-center bg-no-repeat lg:mt-12"
      style={{ backgroundImage: `url(/patterns/bg_pattern.webp)` }}
    >
      <Image
        src="/icons/trophy.png"
        alt=""
        width={64}
        height={64}
        className="pointer-events-none absolute top-4 left-4 size-12 object-contain opacity-60 sm:top-8 sm:left-8 sm:size-14 lg:top-10 lg:left-16 lg:size-16"
        aria-hidden
      />

      <Image
        src="/icons/flash.png"
        alt=""
        width={64}
        height={64}
        className="pointer-events-none absolute top-4 right-4 size-10 object-contain opacity-60 sm:top-8 sm:right-8 sm:size-12 lg:top-10 lg:right-16 lg:size-14"
        aria-hidden
      />

      <Image
        src="/icons/diamond.png"
        alt=""
        width={64}
        height={64}
        className="pointer-events-none absolute right-4 bottom-4 size-10 -rotate-[45deg] object-contain opacity-60 sm:right-8 sm:bottom-8 sm:size-12 lg:right-16 lg:bottom-10 lg:size-14"
        aria-hidden
      />

      <div className="wrapper section flex w-full min-w-0 flex-col items-center">
        <Badge title="Who is Tipmanna for?" />

        <Title
          id="who-is-tipmanna-heading"
          align="center"
          size="lg"
          className="w-full"
        >
          Built for people <br />
          <span className="relative bg-gradient-to-r from-[#F57D11] to-[#B55805] bg-clip-text text-transparent">
            who bring others together
          </span>
        </Title>

        <div className="no-scrollbar hide__scrollbar relative mt-6 flex w-full max-w-full min-w-0 items-stretch gap-4 overflow-x-auto overscroll-x-contain lg:grid lg:grid-cols-3 lg:overflow-visible">
          {FEATURES.map(item => (
            <div
              key={item.title}
              className="w-[60%] min-w-[60%] flex-shrink-0 snap-center sm:w-[45%] sm:min-w-[45%] lg:w-auto lg:min-w-0"
            >
              <FeatureCard
                icon={item.icon}
                title={item.title}
                content={item.content}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
