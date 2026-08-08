"use client";

import { usePathname } from "next/navigation";

// Local imports
import type { CommunityExploreCatalogRow } from "@/actions/communities";
import { ExploreTopCommunitiesGrid } from "@/components/explore/explore-top-communities-grid";
import { Paragraph } from "@/components/shared/paragraph";
import { Title } from "@/components/shared/title";
import { isTipmannaSystemCommunity } from "@/lib/tv-community-picker";

interface Props {
  communities: CommunityExploreCatalogRow[];
  showWhenEmpty?: boolean;
}

export default function TopCommunities({
  communities,
  showWhenEmpty = false,
}: Props) {
  const pathname = usePathname();
  const isPartnerPage = pathname.includes("/partner");
  const featuredCommunities = communities.filter(
    c => !isTipmannaSystemCommunity(c.id, c.name, c.isSystem)
  );

  if (featuredCommunities.length === 0 && !showWhenEmpty) {
    return null;
  }

  return (
    <section
      className="wrapper section items-center py-12"
      aria-labelledby="top-communities-heading"
    >
      {/* <Badge title="Tipmanna Community" /> */}

      <h2
        id="top-communities-heading"
        className="w-full"
      >
        <Title
          // align="center"
          size="lg"
        >
          Featured{" "}
          <span className="relative bg-gradient-to-r from-[#F57D11] to-[#B55805] bg-clip-text text-transparent">
            communities
          </span>
        </Title>
      </h2>
      {/* <Paragraph
        align="center"
        color="muted"
        className="-mt-2"
      >
        Ranked by total tips across approved bank videos.
      </Paragraph> */}

      <div className="mt-6 w-full">
        {featuredCommunities.length === 0 ? (
          <Paragraph
            align="center"
            color="muted"
          >
            No communities to highlight yet. New communities will appear here as
            creators grow their banks.
          </Paragraph>
        ) : (
          <ExploreTopCommunitiesGrid communities={featuredCommunities} />
        )}
      </div>

      {isPartnerPage && (
        <div className="border-primary flex h-[50px] items-center self-start border-l-2 p-4">
          <div>
            <Paragraph
              weight="bold"
              className="leading-relaxed"
            >
              Start with content. Grow participation. Build a community.
            </Paragraph>
            <Paragraph
              size="sm"
              className="-mt-1 leading-relaxed"
            >
              Tipmanna grows with you - from your first video to your own
              community-powered media network.
            </Paragraph>
          </div>
        </div>
      )}
    </section>
  );
}
