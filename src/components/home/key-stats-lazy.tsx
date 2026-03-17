import { getImpactInNumbersAction } from "@/actions/home";
import KeyStats from "./key-stats";

export default async function KeyStatsLazy() {
  const { data: stats } = await getImpactInNumbersAction();

  return <KeyStats stats={stats} />;
}
