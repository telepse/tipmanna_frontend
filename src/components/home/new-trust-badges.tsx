import { useMemo } from "react";

// Local imports
import { TRUST_BADGES } from "@/constants";
import { Paragraph } from "@/components/shared/paragraph";
import { NewTrustBadge } from "./new-trust-badge";

// Constants for better maintainability
const SECTION_STYLES = {
  background: "#F5F5F5",
  spacing: {
    mobile: "gap-2",
    desktop: "lg:gap-4",
  },
} as const;

export default function NewTrustBadges() {
  // Memoized trust badges to prevent unnecessary re-renders
  const trustBadges = useMemo(
    () =>
      TRUST_BADGES.map((item, index) => (
        <NewTrustBadge
          key={`${item}-${index}`}
          label={item}
        />
      )),
    []
  );

  return (
    <section
      className="section -mt-16 sm:-mt-8"
      aria-labelledby="trust-badges-heading"
      role="region"
    >
      <div className="space-y-2 sm:space-y-4">
        <h2 id="trust-badges-title">
          <Paragraph
            align="center"
            size="sm"
          >
            Trusted by people who bring others together
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
      </div>
    </section>
  );
}
