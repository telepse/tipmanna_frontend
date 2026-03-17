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
import KeyStatsLazy from "@/components/home/key-stats-lazy";
import FAQs from "@/components/home/faqs";

// Error boundary component for graceful error handling
function DataSection({ children }: { children: React.ReactNode }) {
  return <section className="contents">{children}</section>;
}

// Constants for better maintainability
const BACKGROUND_IMAGES = {
  pattern: "/patterns/bg_pattern.webp",
} as const;

export const dynamic = "force-static";

// export default async function Home() {
//   try {
//     // Fetch all data in parallel with error handling for each request
//     const [impactRes, eventsRes, causesRes, testimonialsRes] =
//       await Promise.allSettled([
//         getImpactInNumbersAction(),
//         getAllFeaturedEventsAction(),
//         getAllCausesAction(),
//         getAllTestimonialsAction(),
//       ]);

//     // Extract data with fallbacks for failed requests
//     const stats =
//       impactRes.status === "fulfilled" ? impactRes.value.data : null;
//     const events = eventsRes.status === "fulfilled" ? eventsRes.value.data : [];
//     const causes = causesRes.status === "fulfilled" ? causesRes.value.data : [];
//     const testimonials =
//       testimonialsRes.status === "fulfilled" ? testimonialsRes.value.data : [];

//     // Safe stats for KeyStats component
//     const safeStats: KeyStat = stats
//       ? {
//           totalTipsReceived: stats.totalTipsReceived || 0,
//           successfulTransactions: stats.successfulTransactions || 0,
//           uniqueTippers: stats.uniqueTippers || 0,
//           totalEvents: stats.totalEvents || 0,
//         }
//       : DEFAULT_STATS;

//     return (
//       <>
//         {/* Navbar */}
//         <NavbarShell />

//         {/* Above-the-fold content */}
//         <HeroServer />
//         {/* <ImageSlider /> */}
//         <LazySlider />

//         {/* Features Section with Background Pattern */}
//         <DataSection>
//           <section
//             className="relative min-h-[50vh]"
//             role="img"
//             aria-label="Decorative background pattern"
//           >
//             <Image
//               src="/patterns/bg_pattern.webp"
//               fill
//               alt="Decorative background pattern"
//               priority={false}
//               aria-hidden
//               sizes="100vw"
//               className="-z-50 object-cover"
//             />
//             <Features />
//             <TrustBadges />
//             <TopEvents events={events} />
//           </section>
//         </DataSection>

//         <TippingBanner />

//         {/* Charities Section with Background Pattern */}
//         <DataSection>
//           <section
//             className="min-h-[50vh] bg-cover bg-center bg-no-repeat"
//             style={{
//               backgroundImage: `url(${BACKGROUND_IMAGES.pattern})`,
//             }}
//             role="img"
//             aria-label="Decorative tipping pattern background"
//           >
//             <Charities causes={causes} />
//           </section>
//         </DataSection>

//         {/* Testimonials and Statistics */}
//         <DataSection>
//           <Testimonials testimonials={testimonials} />
//         </DataSection>

//         <DataSection>
//           <KeyStats stats={safeStats} />
//         </DataSection>

//         <FAQs />

//         {/* Footer */}
//         <Footer />
//       </>
//     );
//   } catch {
//     // Fallback UI with default stats
//     return (
//       <>
//         <NavbarShell />
//         <HeroServer />
//         <LazySlider />
//         <Features />
//         <TrustBadges />
//         <TippingBanner />
//         <KeyStats stats={DEFAULT_STATS} />
//         <FAQs />
//         <Footer />
//       </>
//     );
//   }
// }

export default function Home() {
  console.log(process.env.NEXT_PUBLIC_BACKEND_API_URL);

  return (
    <>
      <NavbarShell />
      <HeroServer />
      <LazySlider />

      <DataSection>
        <section
          className="relative min-h-[50vh]"
          role="img"
          aria-label="Decorative background pattern"
        >
          <div className="absolute inset-0 -z-50 bg-[url('/patterns/bg_pattern.webp')] bg-cover bg-center"></div>

          <Features />
          <TrustBadges />

          <TopContentsSection />
          <TopEventsSection />
        </section>
      </DataSection>

      <TippingBanner />

      <DataSection>
        <section
          className="min-h-[50vh] bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${BACKGROUND_IMAGES.pattern})` }}
          role="img"
          aria-label="Decorative tipping pattern background"
        >
          <CharitiesSection />
        </section>
      </DataSection>

      <DataSection>
        <TestimonialsLazy />
      </DataSection>

      <DataSection>
        <KeyStatsLazy />
      </DataSection>

      <FAQs />

      <Footer />
    </>
  );
}
