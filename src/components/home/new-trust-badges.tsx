import { useMemo } from "react";

// Local imports
import { NEW_TRUST_BADGES } from "@/constants";
import { Paragraph } from "@/components/shared/paragraph";
import { NewTrustBadge } from "./new-trust-badge";

// Constants for better maintainability
const SECTION_STYLES = {
  background: "#F5F5F5",
  spacing: {
    mobile: "gap-6",
    desktop: "lg:gap-12",
  },
} as const;

export default function NewTrustBadges() {
  // Memoized trust badges to prevent unnecessary re-renders
  const trustBadges = useMemo(
    () =>
      NEW_TRUST_BADGES.map((item, index) => (
        <NewTrustBadge
          key={`${item}-${index}`}
          label={item}
        />
      )),
    []
  );

  return (
    <section
      className="section"
      aria-labelledby="trust-badges-heading"
      role="region"
    >
      <h2 id="trust-badges-title">
        <Paragraph
          align="center"
          size="sm"
          weight="bold"
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
    </section>
  );
}
