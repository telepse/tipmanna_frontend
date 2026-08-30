import type { ScheduleItem } from "@/lib/tv/broadcastResolver";

export type SegmentVisualKind = "regular" | "notice" | "enforcement";

export function resolveSegmentVisualKind(
  item: Pick<ScheduleItem, "segmentKind"> | null | undefined
): SegmentVisualKind {
  if (item?.segmentKind === "notice") return "notice";
  if (item?.segmentKind === "enforcement") return "enforcement";
  return "regular";
}

export function segmentRowClass(
  kind: SegmentVisualKind,
  isPlaying: boolean
): string {
  const base =
    "relative flex cursor-pointer items-center justify-between gap-4 rounded-md px-2 py-0.5 transition-all duration-300";
  const playing = isPlaying
    ? "ring-primary z-10 -mt-2 scale-100 shadow-lg ring-4"
    : "-mt-2 scale-100 rounded-none border-b-4";

  if (kind === "notice") {
    return `${base} ${playing} bg-black text-white`;
  }
  if (kind === "enforcement") {
    return `${base} ${playing} border-l-4 border-l-amber-500 bg-amber-50 text-black`;
  }
  return `${base} ${playing} bg-white text-black`;
}

export function segmentMetricClass(kind: SegmentVisualKind): string {
  if (kind === "notice")
    return "flex items-center gap-1 text-[10px] text-white/90";
  if (kind === "enforcement") {
    return "flex items-center gap-1 text-[10px] text-amber-900/90";
  }
  return "flex items-center gap-1 text-[10px] text-muted-foreground";
}

export function segmentAirTimeClass(kind: SegmentVisualKind): string {
  if (kind === "notice") {
    return "rounded bg-white/15 px-1 py-0.5 text-[10px] font-medium text-white";
  }
  if (kind === "enforcement") {
    return "rounded bg-amber-200/80 px-1 py-0.5 text-[10px] font-medium text-amber-950";
  }
  return "rounded bg-gray-100 px-1 py-0.5 text-[10px] font-medium text-gray-700";
}
