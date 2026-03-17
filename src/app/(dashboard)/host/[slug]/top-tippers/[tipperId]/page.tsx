import { getTopTipperDetailsAction } from "@/actions/host";
import { getHostID } from "@/lib/getHostId";
import { ProtectedRoute } from "@/components/protected-route";
import { TipperDetailClient } from "@/components/host/tipper-detail-client";

interface Props {
  params: Promise<{ tipperId: string }>;
}

export default async function TopTipperDetailPage({ params }: Props) {
  const hostId = await getHostID();
  const { tipperId } = await params;

  const { data } = await getTopTipperDetailsAction(hostId!, tipperId);

  const {
    username,
    totalContribution,
    highestSingleTip,
    eventsSupported,
    contributionHistory,
  } = data;

  return (
    <ProtectedRoute>
      <TipperDetailClient
        username={username}
        totalContribution={totalContribution}
        highestSingleTip={highestSingleTip}
        eventsSupported={eventsSupported}
        contributionHistory={contributionHistory}
      />
    </ProtectedRoute>
  );
}
