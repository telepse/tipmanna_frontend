import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";

export type PaymentAnalyticsRow = {
  paymentID: string;
  paymentSurface: string;
  paymentMethod: string;
  actorKind: string;
  deviceCategory: string;
  videoId: string;
  videoTitle: string;
  videoDuration: number | null;
  watchDurationSec: number | null;
  user: string;
  createdAt: string;
};

export const paymentAnalyticsColumns: ColumnDef<PaymentAnalyticsRow>[] = [
  {
    accessorKey: "paymentID",
    header: "P ID",
    cell: ({ row }) => {
      const id = row.original.paymentID;
      return (
        <span className="font-mono text-xs">
          {id.length > 8 ? `${id.slice(0, 8)}…` : id}
        </span>
      );
    },
  },
  {
    accessorKey: "paymentSurface",
    header: "P surface",
  },
  {
    accessorKey: "paymentMethod",
    header: "P method",
  },
  {
    accessorKey: "videoTitle",
    header: "Video title",
    cell: ({ row }) => <span>{row.original.videoTitle || "—"}</span>,
  },
  {
    accessorKey: "watchDurationSec",
    header: "Watch (s) before P",
    cell: ({ row }) => (
      <span>
        {row.original.watchDurationSec != null
          ? row.original.watchDurationSec
          : "—"}
      </span>
    ),
  },
  {
    accessorKey: "videoDuration",
    header: "Video duration (s)",
    cell: ({ row }) => (
      <span>
        {row.original.videoDuration != null ? row.original.videoDuration : "—"}
      </span>
    ),
  },
  {
    accessorKey: "user",
    header: "User",
    cell: ({ row }) => <span>{row.original.actorKind || "—"}</span>,
  },
  {
    accessorKey: "createdAt",
    header: "Created at",
    cell: ({ row }) => (
      <span>
        {format(new Date(row.original.createdAt), "yyyy-MM-dd HH:mm")}
      </span>
    ),
  },
];
