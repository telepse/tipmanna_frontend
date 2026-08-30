import {
  fetchPartnerImpactStats,
  isKeyStatEmpty,
  defaultKeyStat,
} from "@/lib/partner-data";
import KeyStats from "@/components/home/key-stats";

export default async function PartnerKeyStatsSection() {
  const stats = await fetchPartnerImpactStats();
  if (!stats || isKeyStatEmpty(stats)) return null;
  return <KeyStats stats={stats ?? defaultKeyStat()} />;
}
