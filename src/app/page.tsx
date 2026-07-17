import type { ReactNode } from "react";
import Image from "next/image";
import { NavbarShell } from "@/components/shared/navbar-shell";
import { HeroServer } from "@/components/home/hero-server";
import Footer from "@/components/shared/footer";
import Features from "@/components/home/features";
import TippingBanner from "@/components/home/tipping-banner";
import TrustBadges from "@/components/home/trust-badges";
import { LazySlider } from "@/components/home/lazy-slider";
import TopEventsSection from "@/components/home/top-events-section";
import TopContentsSection from "@/components/home/top-contents-section";
import CharitiesSection from "@/components/home/charities-section";
import TestimonialsLazy from "@/components/home/testimonials-lazy";
import TopCommunitiesSection from "@/components/home/top-communities-section";
import KeyStatsLazy from "@/components/home/key-stats-lazy";
import FAQs from "@/components/home/faqs";
import TvHomePreviewSectionLazy from "@/components/home/tv-home-preview-section-lazy";
import PricingGrid from "@/components/home/pricing-grid";

function DataSection({ children }: { children: ReactNode }) {
  return <section className="contents">{children}</section>;
}

const BACKGROUND_IMAGES = {
  pattern: "/patterns/bg_pattern.webp",
} as const;

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <main id="main-content">
      <NavbarShell />
      <HeroServer />
      <LazySlider />

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

          <Features />

          <PricingGrid />

          <TrustBadges />

          <TippingBanner />

          <TvHomePreviewSectionLazy />

          <TopContentsSection />
          <TopEventsSection />
        </section>
      </DataSection>

      <DataSection>
        <TopCommunitiesSection />
      </DataSection>

      <DataSection>
        <TestimonialsLazy />
      </DataSection>

      <DataSection>
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
      </DataSection>

      <DataSection>
        <KeyStatsLazy />
      </DataSection>

      <FAQs />

      <Footer />
    </main>
  );
}
