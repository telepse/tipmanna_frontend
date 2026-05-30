"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useMediaQuery } from "react-responsive";

import type { CommunityExploreCatalogRow } from "@/actions/communities";
import { ExploreTopCommunitiesGrid } from "@/components/explore/explore-top-communities-grid";
import { Badge } from "@/components/shared/badge";
import { Paragraph } from "@/components/shared/paragraph";
import { Title } from "@/components/shared/title";
import { Button } from "@/components/ui/button";
import { EXPLORE_COMMUNITIES_HREF } from "@/lib/community-links";

interface Props {
  communities: CommunityExploreCatalogRow[];
}

export default function TopCommunities({ communities }: Props) {
  const isMobile = useMediaQuery({ maxWidth: "500px" });

  if (communities.length === 0) {
    return null;
  }

  return (
    <section
      className="wrapper section items-center py-12"
      aria-labelledby="top-communities-heading"
    >
      <Badge title="Tipmanna Community" />

      <h2
        id="top-communities-heading"
        className="w-full"
      >
        <Title
          align="center"
          size="lg"
        >
          Host{" "}
          <span className="relative bg-gradient-to-r from-[#F57D11] to-[#B55805] bg-clip-text text-transparent">
            community
          </span>
        </Title>
      </h2>
      <Paragraph
        align="center"
        color="muted"
        className="-mt-2"
      >
        Ranked by total tips across approved bank videos.
      </Paragraph>

      <div className="mt-6 w-full">
        <ExploreTopCommunitiesGrid communities={communities} />
      </div>
    </section>
  );
}
