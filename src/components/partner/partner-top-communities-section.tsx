import { fetchPartnerTopCommunities } from "@/lib/partner-data";
import TopCommunities from "@/components/home/top-communities";

export default async function PartnerTopCommunitiesSection() {
  const communities = await fetchPartnerTopCommunities();
  return (
    <TopCommunities
      communities={communities}
      showWhenEmpty
    />
  );
}
