/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useRef } from "react";

import { Title } from "@/components/shared/title";
import { extractYoutubeID } from "@/lib/extractYoutubeID";
import { TopContentCard } from "./top-content-card";

interface Props {
  contents: any[];
}

function renderContentCard(content: any) {
  if (!content?.event?.id) return null;

  const videoId = extractYoutubeID(content.url);
  const eventBanner = videoId
    ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
    : content.event.eventBanner;

  return (
    <TopContentCard
      channelId={content.id}
      roomId={content.event.id}
      eventBanner={eventBanner}
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
  );
}

export default function TopContents({ contents }: Props) {
  const topContentsRef = useRef<HTMLDivElement>(null);
  const validContents = contents.filter(content => content?.event?.id);

  if (validContents.length === 0) return null;

  return (
    <section className="wrapper section py-12">
      <Title
        id="top-contents-heading"
        size="lg"
      >
        Top{" "}
        <span className="bg-gradient-to-r from-[#F57D11] to-[#B55805] bg-clip-text text-transparent">
          contents
        </span>
      </Title>

      <div className="no-scrollbar hide__scrollbar relative flex items-center gap-4 overflow-x-auto lg:hidden">
        <div className="flex w-full snap-x snap-mandatory space-x-4">
          {validContents.map(content => (
            <div
              key={content.id}
              className="w-[85%] flex-shrink-0 snap-center transition-transform duration-300 sm:w-[50%]"
            >
              {renderContentCard(content)}
            </div>
          ))}
        </div>
      </div>

      <div className="no-scrollbar hide__scrollbar relative hidden items-center gap-4 overflow-x-auto lg:flex">
        <div
          ref={topContentsRef}
          className="flex w-[550px] snap-x snap-mandatory space-x-4"
        >
          {validContents.map(content => (
            <div
              key={content.id}
              className="w-[85%] flex-shrink-0 snap-center transition-transform duration-300 sm:w-[50%]"
            >
              {renderContentCard(content)}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
