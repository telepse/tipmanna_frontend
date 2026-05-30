import { getImpactInNumbersAction } from "@/actions/home";
import KeyStats from "./key-stats";
import { KeyStat } from "@/types/keystat.types";

export default async function KeyStatsLazy() {
  const { data: stats } = await getImpactInNumbersAction();

  return <KeyStats stats={stats as unknown as KeyStat} />;
}
