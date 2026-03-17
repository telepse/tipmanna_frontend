import { useMemo } from "react";

// Local imports
import { TRUST_BADGES } from "@/constants";
import { Paragraph } from "@/components/shared/paragraph";
import { TrustBadge } from "./trust-badge";

// Constants for better maintainability
const SECTION_STYLES = {
  background: "#F5F5F5",
  spacing: {
    mobile: "gap-6",
    desktop: "lg:gap-12",
  },
} as const;

export default function TrustBadges() {
  // Memoized trust badges to prevent unnecessary re-renders
  const trustBadges = useMemo(
    () =>
      TRUST_BADGES.map((item, index) => (
        <TrustBadge
          key={`${item.label}-${index}`}
          icon={item.icon}
          label={item.label}
        />
      )),
    []
  );

  return (
    <section
      className="section bg-[#F5F5F5]"
      aria-labelledby="trust-badges-heading"
      role="region"
    >
      <h2 id="trust-badges-title">
        <Paragraph
          align="center"
          size="lg"
          weight="bold"
        >
          Trusted and compliant
        </Paragraph>
      </h2>

      <div
        className={`flex flex-wrap items-center justify-center ${SECTION_STYLES.spacing.mobile} ${SECTION_STYLES.spacing.desktop}`}
        role="list"
        aria-label="Trust and compliance badges"
      >
        {trustBadges}
      </div>

      {/* Hidden accessibility description */}
      <div className="sr-only">
        These badges represent our commitment to security, compliance, and
        trustworthiness.
      </div>
    </section>
  );
}
