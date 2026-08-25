import { TRUST_BADGES } from "@/constants";
import { Paragraph } from "@/components/shared/paragraph";
import { NewTrustBadge } from "./new-trust-badge";

const SECTION_STYLES = {
  spacing: {
    mobile: "gap-2",
    desktop: "lg:gap-4",
  },
} as const;

export default function NewTrustBadges() {
  return (
    <section
      className="section -mt-16 sm:-mt-8"
      aria-labelledby="trust-badges-heading"
      role="region"
    >
      <div className="space-y-2 sm:space-y-4">
        <Paragraph
          as="h2"
          id="trust-badges-heading"
          align="center"
          size="sm"
        >
          Trusted by people who bring others together
        </Paragraph>

        <div
          className={`flex flex-wrap items-center justify-center ${SECTION_STYLES.spacing.mobile} ${SECTION_STYLES.spacing.desktop}`}
          role="list"
          aria-label="Trust and compliance badges"
        >
          {TRUST_BADGES.map((item, index) => (
            <NewTrustBadge
              key={`${item}-${index}`}
              label={item}
            />
          ))}
        </div>

        <div className="sr-only">
          These badges represent our commitment to security, compliance, and
          trustworthiness.
        </div>
      </div>
    </section>
  );
}
