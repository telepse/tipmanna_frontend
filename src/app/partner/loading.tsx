import { PartnerSectionSkeleton } from "@/components/partner/partner-section-skeleton";

export default function PartnerLoading() {
  return (
    <div aria-busy="true">
      <PartnerSectionSkeleton rows={3} />
    </div>
  );
}
