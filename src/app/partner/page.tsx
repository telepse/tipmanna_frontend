import type { ReactNode } from "react";
import { Suspense } from "react";
import { Metadata } from "next";
import Image from "next/image";

import { NavbarShell } from "@/components/shared/navbar-shell";
import { LazySlider } from "@/components/home/lazy-slider";
import Footer from "@/components/shared/footer";
import Features from "@/components/home/features";
import TvHomePreviewSectionLazy from "@/components/home/tv-home-preview-section-lazy";
import FAQs from "@/components/home/faqs";
import { WhoIsTipmannaFor } from "@/components/home/who-is-tipmanna-for";
import { TheCoreShift } from "@/components/home/the-core-shift";
import { ContentToGrowth } from "@/components/home/content-to-growth";
import { DiscoverSection } from "@/components/home/discover-section";
import { SupportHappensInTheMoment } from "@/components/home/support-happens-in-the-moment";
import ScheduledTvProgramsSection from "@/components/home/scheduled-tv-programs-section";
import { AlreadyWatching } from "@/components/home/already-watching";
import { ContinuousEngagement } from "@/components/home/continuous-engagement";
import NewHeroServer from "@/components/home/new-hero-server";
import NewTrustBadges from "@/components/home/new-trust-badges";
import NewTippingBanner from "@/components/home/new-tipping-banner";
import NewPricingGrid from "@/components/home/pricing-grid";
import PartnerTopContentsSection from "@/components/partner/partner-top-contents-section";
import PartnerTopEventsSection from "@/components/partner/partner-top-events-section";
import PartnerTopCommunitiesSection from "@/components/partner/partner-top-communities-section";
import PartnerKeyStatsSection from "@/components/partner/partner-key-stats-section";
import { PartnerSectionSkeleton } from "@/components/partner/partner-section-skeleton";

import { getPrimaryOrigin, getPublicAbsoluteUrl } from "@/lib/site-config";
import { PARTNER_PAGE_METADATA } from "@/lib/partner-page-metadata";
import {
  buildFaqPageJsonLd,
  buildOrganizationJsonLd,
  buildPartnerOffersJsonLd,
} from "@/lib/structured-data";
import { safeJsonLdStringify } from "@/lib/json-ld-safe";
import { PARTNER_FAQS } from "@/constants";
import { getPlanPricingAction } from "@/actions/plan-pricing";
import { buildMarketingPricingCards } from "@/lib/public-plan-pricing";
import { PartnerPricingSubscribeSection } from "@/components/partner/partner-pricing-subscribe-section";
import { PageLinkedV2ChunkAnchor } from "@/lib/analytics-sdk/page-linked-v2-chunk-anchor";

export const revalidate = 300;

function DataSection({ children }: { children: ReactNode }) {
  return <section className="contents">{children}</section>;
}

const OG_IMAGE = {
  url: "/og/partner.svg",
  width: 1200,
  height: 630,
  alt: "Tipmanna — turn viewers into participants",
} as const;

export async function generateMetadata(): Promise<Metadata> {
  const meta = PARTNER_PAGE_METADATA;
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
      siteName: "Tipmanna",
      images: [OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title: meta.title,
      description: meta.description,
      images: [OG_IMAGE.url],
    },
  };
}

export default async function PartnerPage() {
  const pageUrl = getPublicAbsoluteUrl(PARTNER_PAGE_METADATA.canonicalPath);
  const pricingRes = await getPlanPricingAction();
  const marketingPricing = buildMarketingPricingCards(
    pricingRes.success && pricingRes.data
      ? (pricingRes.data as import("@/actions/plan-pricing").PublicPlanPricing)
      : null
  );
  const orgJsonLd = buildOrganizationJsonLd({
    name: "Tipmanna",
    description: PARTNER_PAGE_METADATA.description,
    url: pageUrl,
    logo: getPublicAbsoluteUrl("/favicon.ico"),
  });
  const faqJsonLd = buildFaqPageJsonLd(PARTNER_FAQS);
  const offersJsonLd = buildPartnerOffersJsonLd(
    marketingPricing.map(plan => ({
      name: plan.name,
      price: plan.price,
      description: plan.desc,
      features: plan.features,
    })),
    pageUrl
  );

  return (
    <main id="main-content">
      <PageLinkedV2ChunkAnchor />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(orgJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJsonLdStringify(offersJsonLd),
        }}
      />

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
            sizes="100vw"
            className="-z-50 object-cover object-center"
            aria-hidden
          />

          <div
            className="bg-secondary/30 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(/patterns/bg_pattern.webp)` }}
          >
            <Features />

            <Suspense fallback={<PartnerSectionSkeleton rows={2} />}>
              <PartnerTopContentsSection />
            </Suspense>

            <Suspense fallback={<PartnerSectionSkeleton rows={2} />}>
              <PartnerTopEventsSection />
            </Suspense>
          </div>

          <div className="bg-white">
            <DiscoverSection />
          </div>

          <div
            className="bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(/patterns/bg_pattern.webp)` }}
          >
            <TvHomePreviewSectionLazy />
            <ScheduledTvProgramsSection />
          </div>
        </section>
      </DataSection>

      <div className="bg-white">
        <ContinuousEngagement />
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
        <PartnerPricingSubscribeSection />
      </section>

      <DataSection>
        <Suspense fallback={<PartnerSectionSkeleton rows={3} />}>
          <PartnerTopCommunitiesSection />
        </Suspense>
      </DataSection>

      <DataSection>
        <Suspense fallback={<PartnerSectionSkeleton rows={4} />}>
          <PartnerKeyStatsSection />
        </Suspense>
      </DataSection>

      <AlreadyWatching />

      <FAQs />

      <Footer />
    </main>
  );
}
