import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";

import { truncateText } from "@/lib/utils";

export type VideoAnalyticRow = {
  videoId?: string | null;
  videoTitle?: string | null;
  videoDuration?: number | null;
  watchDuration?: number | null;
  hostName?: string | null;
  mode?: string | null;
  deviceCategory?: string | null;
  actorKind?: string | null;
  tipperId?: string | null;
  visitorId?: string | null;
  type?: string | null;
  createdAt?: string | null;
};

export const videoEventColumns: ColumnDef<VideoAnalyticRow>[] = [
  {
    accessorKey: "videoId",
    header: "ID",
    cell: ({ row }) => {
      const id = row.original.videoId ?? "";
      return <span>{id ? truncateText(id, 8) : "—"}</span>;
    },
  },
  {
    accessorKey: "videoTitle",
    header: "Video title",
    cell: ({ row }) => (
      <span>
        {row.original.videoTitle ? truncateText(row.original.videoTitle) : "—"}
      </span>
    ),
  },
  {
    accessorKey: "videoDuration",
    header: "Video duration (s)",
    cell: ({ row }) => <span>{row.original.videoDuration ?? "—"}</span>,
  },
  {
    accessorKey: "watchDuration",
    header: "Watch duration (s)",
    cell: ({ row }) => <span>{row.original.watchDuration ?? "—"}</span>,
  },
  {
    accessorKey: "mode",
    header: "Mode",
    cell: ({ row }) => <span>{row.original.mode ?? "—"}</span>,
  },
  {
    accessorKey: "deviceCategory",
    header: "Device",
    cell: ({ row }) => <span>{row.original.deviceCategory ?? "—"}</span>,
  },
  {
    accessorKey: "user",
    header: "User",
    cell: ({ row }) => {
      const a = row.original;
      const bits = [a.actorKind, a.tipperId, a.visitorId].filter(Boolean);
      return (
        <span className="text-xs">{bits.length ? bits.join(" · ") : "—"}</span>
      );
    },
  },
  {
    accessorKey: "type",
    header: "Interaction",
    cell: ({ row }) => <span>{row.original.type ?? "—"}</span>,
  },
  {
    accessorKey: "createdAt",
    header: "Created at",
    cell: ({ row }) => {
      const date = row.original.createdAt;
      if (!date) return <span>—</span>;
      return <span>{format(new Date(date), "yyyy-MM-dd HH:mm")}</span>;
    },
  },
];
