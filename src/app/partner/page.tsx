export const dynamic = "force-dynamic";

import type { ReactNode } from "react";
import { Metadata } from "next";
import Image from "next/image";

// Local imports
import { NavbarShell } from "@/components/shared/navbar-shell";
import { HeroServer } from "@/components/home/hero-server";
import { LazySlider } from "@/components/home/lazy-slider";
import Footer from "@/components/shared/footer";
import Features from "@/components/home/features";
import TippingBanner from "@/components/home/tipping-banner";
import TrustBadges from "@/components/home/trust-badges";
import TopEventsSection from "@/components/home/top-events-section";
import TopContentsSection from "@/components/home/top-contents-section";
// import CharitiesSection from "@/components/home/charities-section";
// import TestimonialsLazy from "@/components/home/testimonials-lazy";
import TopCommunitiesSection from "@/components/home/top-communities-section";
import KeyStatsLazy from "@/components/home/key-stats-lazy";
import FAQs from "@/components/home/faqs";
import TvHomePreviewSectionLazy from "@/components/home/tv-home-preview-section-lazy";
import PricingGrid from "@/components/home/pricing-grid";

// Lib imports
import { getPrimaryOrigin, getPublicAbsoluteUrl } from "@/lib/site-config";
import {
  getPartnerMetadataForVariant,
  resolvePartnerMetadataVariant,
} from "@/lib/partner-page-metadata";
import { WhoIsTipmannaFor } from "@/components/home/who-is-tipmanna-for";
import { TheCoreShift } from "@/components/home/the-core-shift";
import { ContentToGrowth } from "@/components/home/content-to-growth";
import { DiscoverSection } from "@/components/home/discover-section";
import { SupportHappensInTheMoment } from "@/components/home/support-happens-in-the-moment";
import ScheduledTvProgramsSection from "@/components/home/scheduled-tv-programs-section";
import { AlreadyWatching } from "@/components/home/already-watching";
import { ContinousEngagement } from "@/components/home/continuous-engagement";
import { NewHeroServer } from "@/components/home/new-hero-server";
import NewTrustBadges from "@/components/home/new-trust-badges";
import NewTippingBanner from "@/components/home/new-tipping-banner";
import NewPricingGrid from "@/components/home/pricing-grid";
import { PartnerPageMetadataSync } from "@/components/partner/partner-page-metadata-sync";

function DataSection({ children }: { children: ReactNode }) {
  return <section className="contents">{children}</section>;
}

const BACKGROUND_IMAGES = {
  pattern: "/patterns/bg_pattern.webp",
} as const;

type Props = {
  searchParams: Promise<{ section?: string }>;
};

export async function generateMetadata({
  searchParams,
}: Props): Promise<Metadata> {
  const { section } = await searchParams;
  const variant = resolvePartnerMetadataVariant({ section });
  const meta = getPartnerMetadataForVariant(variant);
  const pageUrl = getPublicAbsoluteUrl(meta.canonicalPath);

  return {
    metadataBase: new URL(getPrimaryOrigin()),
    title: meta.title,
    description: meta.description,
    alternates: {
      canonical: pageUrl,
    },
    openGraph: {
      title: meta.title,
      description: meta.description,
      url: pageUrl,
      type: "website",
    },
    twitter: {
      card: "summary",
      title: meta.title,
      description: meta.description,
    },
  };
}

export default function Home() {
  return (
    <main id="main-content">
      <PartnerPageMetadataSync />
      <NavbarShell />
      <NewHeroServer />
      <LazySlider />
      <NewTrustBadges />
      <TheCoreShift />
      <ContentToGrowth />

      <DataSection>
        <section
          className="relative min-h-[50vh]"
          aria-label="Featured content"
        >
          <Image
            src="/patterns/bg_pattern.webp"
            alt=""
            fill
            priority
            sizes="100vw"
            fetchPriority="high"
            className="-z-50 object-cover object-center"
            aria-hidden
          />

          <div className="bg-secondary/30">
            <Features />

            <TopContentsSection />
            <TopEventsSection />
          </div>

          <div className="bg-white">
            <DiscoverSection />
          </div>

          <div
            className="bg-cover bg-fixed bg-center bg-no-repeat"
            style={{ backgroundImage: `url(/patterns/bg_pattern.webp)` }}
          >
            <TvHomePreviewSectionLazy />
            <ScheduledTvProgramsSection />
          </div>
        </section>
      </DataSection>

      <div className="bg-white">
        <ContinousEngagement />
      </div>
      <SupportHappensInTheMoment />

      <NewTippingBanner />

      <WhoIsTipmannaFor />

      <section
        id="pricing"
        className="scroll-mt-24"
        aria-label="Pricing"
      >
        <NewPricingGrid />
      </section>

      <DataSection>
        <TopCommunitiesSection />
      </DataSection>

      {/* <DataSection>
        <TestimonialsLazy />
      </DataSection> */}

      {/* <DataSection>
        <section
          className="relative min-h-[50vh]"
          aria-label="Charities"
        >
          <Image
            src={BACKGROUND_IMAGES.pattern}
            alt=""
            fill
            priority={false}
            sizes="100vw"
            className="-z-10 object-cover object-center"
            aria-hidden
          />
          <div className="relative z-0">
            <CharitiesSection />
          </div>
        </section>
      </DataSection> */}

      <DataSection>
        <KeyStatsLazy />
      </DataSection>

      <AlreadyWatching />

      <FAQs />

      <Footer />
    </main>
  );
}
