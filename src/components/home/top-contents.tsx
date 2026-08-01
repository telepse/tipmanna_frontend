/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useRef } from "react";

// Local imports
import { Badge } from "@/components/shared/badge";
import { Title } from "@/components/shared/title";
import { extractYoutubeID } from "@/lib/extractYoutubeID";
import { TopContentCard } from "./top-content-card";

interface Props {
  contents: any[];
}

export default function TopContents({ contents }: Props) {
  const topContentsRef = useRef<HTMLDivElement>(null);

  console.log("contents", contents);

  return (
    <section className="wrapper section py-12">
      <div className="flex flex-col">
        <h2 id="top-events-heading">
          <Title size="lg">
            Top{" "}
            <span className="bg-gradient-to-r from-[#F57D11] to-[#B55805] bg-clip-text text-transparent">
              contents
            </span>
          </Title>
        </h2>
      </div>

      {/* Small and medium screens */}
      <div className="no-scrollbar hide__scrollbar relative flex items-center gap-4 overflow-x-auto lg:hidden">
        <div className="flex w-full snap-x snap-mandatory space-x-4">
          {contents.map(content => (
            <div
              key={content.id}
              className="w-[85%] flex-shrink-0 snap-center transition-transform duration-300 sm:w-[50%]"
            >
              <TopContentCard
                key={content.id}
                channelId={content.id}
                roomId={content.event.id}
                eventBanner={(() => {
                  const videoId = extractYoutubeID(content.url);
                  return videoId
                    ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
                    : content.event.eventBanner;
                })()}
                eventName={content.title}
                fullName={content.event.hostName}
                username={content.event.username}
                amountRaised={content.event.amountRaised}
                numOfTips={content.event.numOfTips}
                numOfEncounters={content.metrics?.encounters ?? 0}
                startTime={content.event.startTime}
                endTime={content.event.endTime}
                duration={content.durationSeconds}
              />
            </div>
          ))}
        </div>
      </div>

      {/* LARGE SCREENS */}
      <div className="no-scrollbar hide__scrollbar relative hidden items-center gap-4 overflow-x-auto lg:flex">
        <div
          ref={topContentsRef}
          className="flex w-[550px] snap-x snap-mandatory space-x-4"
        >
          {contents.map(content => (
            <div
              key={content.id}
              className="w-[85%] flex-shrink-0 snap-center transition-transform duration-300 sm:w-[50%]"
            >
              <TopContentCard
                key={content.id}
                channelId={content.id}
                roomId={content.event.id}
                eventBanner={(() => {
                  const videoId = extractYoutubeID(content.url);
                  return videoId
                    ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
                    : content.event.eventBanner;
                })()}
                eventName={content.title}
                fullName={content.event.hostName}
                username={content.event.username}
                amountRaised={content.event.amountRaised}
                numOfTips={content.event.numOfTips}
                numOfEncounters={content.metrics?.encounters ?? 0}
                startTime={content.event.startTime}
                endTime={content.event.endTime}
                duration={content.durationSeconds}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
