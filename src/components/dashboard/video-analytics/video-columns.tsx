import type { ColumnDef } from "@tanstack/react-table";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type VideoRollupRow = {
  videoId: string;
  videoTitle: string;
  videoDurationSeconds: number | null;
  totalNumberOfViews: number;
  totalDuration: number;
  totalNumberOfPayments: number;
  totalUserInteraction: number;
  totalEncounters: number;
  saves: number;
  comments: number;
  shares: number;
  completedViews: number;
  bySurface: Record<string, { views: number; encounters: number }>;
};

export const VIDEO_SURFACE_FILTER_OPTIONS = [
  { value: "all", label: "All surfaces" },
  { value: "event_room", label: "Event room" },
  { value: "tv_looper", label: "TV looper" },
  { value: "channel_client", label: "Channel client" },
  { value: "content_client", label: "Content client" },
  { value: "homepage_preview", label: "Homepage TV preview" },
  { value: "explore_feed", label: "Explore feed" },
] as const;

function surfaceSummary(bySurface: VideoRollupRow["bySurface"]) {
  return Object.entries(bySurface || {})
    .map(([k, v]) => `${k}: ${v.views}v/${v.encounters}e`)
    .join(" · ");
}

function viewsForSurface(row: VideoRollupRow, selectedSurface: string): number {
  if (selectedSurface === "all") return row.totalNumberOfViews;
  return row.bySurface[selectedSurface]?.views ?? 0;
}

function encountersForSurface(
  row: VideoRollupRow,
  selectedSurface: string
): number {
  if (selectedSurface === "all") return row.totalEncounters;
  return row.bySurface[selectedSurface]?.encounters ?? 0;
}

export function createVideoViewsColumns({
  selectedSurface,
  onSelectedSurfaceChange,
}: {
  selectedSurface: string;
  onSelectedSurfaceChange: (value: string) => void;
}): ColumnDef<VideoRollupRow>[] {
  const filterLabel =
    VIDEO_SURFACE_FILTER_OPTIONS.find(o => o.value === selectedSurface)
      ?.label ?? "All surfaces";

  return [
    {
      accessorKey: "videoTitle",
      header: "Video title",
      cell: ({ row }) => <span>{row.original.videoTitle || "—"}</span>,
    },
    {
      accessorKey: "totalNumberOfViews",
      header: () => (
        <div className="flex flex-col gap-0.5">
          <span>Views</span>
          {selectedSurface !== "all" && (
            <span className="text-muted-foreground text-[10px] font-normal">
              {filterLabel}
            </span>
          )}
        </div>
      ),
      cell: ({ row }) => (
        <span>{viewsForSurface(row.original, selectedSurface)}</span>
      ),
    },
    {
      accessorKey: "totalDuration",
      header: "Watch duration (s)",
    },
    {
      accessorKey: "totalNumberOfPayments",
      header: "Payments",
    },
    {
      accessorKey: "totalEncounters",
      header: () => (
        <div className="flex flex-col gap-0.5">
          <span>Encounters</span>
          {selectedSurface !== "all" && (
            <span className="text-muted-foreground text-[10px] font-normal">
              {filterLabel}
            </span>
          )}
        </div>
      ),
      cell: ({ row }) => (
        <span>{encountersForSurface(row.original, selectedSurface)}</span>
      ),
    },
    {
      accessorKey: "saves",
      header: "Saves",
    },
    {
      accessorKey: "comments",
      header: "Comments",
    },
    {
      accessorKey: "shares",
      header: "Shares",
    },
    {
      accessorKey: "completedViews",
      header: "Completed views",
    },
    {
      id: "bySurface",
      header: () => (
        <div className="flex min-w-[180px] flex-col gap-2 py-1">
          <span className="text-sm font-medium">By surface</span>
          <Select
            value={selectedSurface}
            onValueChange={onSelectedSurfaceChange}
          >
            <SelectTrigger
              size="sm"
              className="h-8 w-full text-xs"
            >
              <SelectValue placeholder="All surfaces" />
            </SelectTrigger>
            <SelectContent>
              {VIDEO_SURFACE_FILTER_OPTIONS.map(opt => (
                <SelectItem
                  key={opt.value}
                  value={opt.value}
                  className="text-xs"
                >
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ),
      cell: ({ row }) => {
        if (selectedSurface === "all") {
          return (
            <span className="text-muted-foreground max-w-md text-xs">
              {surfaceSummary(row.original.bySurface) || "—"}
            </span>
          );
        }
        const m = row.original.bySurface[selectedSurface];
        return (
          <span className="text-xs">
            {m ? `${m.views} views · ${m.encounters} encounters` : "—"}
          </span>
        );
      },
    },
  ];
}
