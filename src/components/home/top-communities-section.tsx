import {
  getCommunityExploreCatalogAction,
  type CommunityExploreCatalogRow,
} from "@/actions/communities";
import TopCommunities from "./top-communities";

export default async function TopCommunitiesSection() {
  const res = await getCommunityExploreCatalogAction();
  const communities: CommunityExploreCatalogRow[] =
    res.success && res.data?.topByTips ? res.data.topByTips : [];

  return (
    <TopCommunities
      communities={communities}
      showWhenEmpty
    />
  );
}
