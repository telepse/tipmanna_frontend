import type { ColumnDef } from "@tanstack/react-table";

// Local imports
import { truncateText } from "@/lib/utils";

// This type is used to define the shape of our data.
// You can use a Zod schema here if you want.

interface Event {
  eventName: string;
  numOfTips: number;
  tipsReceived: number;
  earnings: string;
  commission: string;
  stripeFees: number;
  eventServices: number;
  payoutPaid: boolean;
  payoutDate: string;
}

export const eventColumns: ColumnDef<Event>[] = [
  {
    accessorKey: "eventName",
    header: "Event Name",
    cell: ({ row }) => {
      const event = row.original;

      return (
        <div className="flex flex-col font-medium">
          <span>{truncateText(event.eventName)}</span>
          <span>{event.numOfTips} tips</span>
        </div>
      );
    },
  },
  {
    accessorKey: "tipsReceived",
    header: "Tips Received",
    cell: ({ row }) => {
      const event = row.original;
      return (
        <span className="text-muted-foreground">
          &pound;{event.tipsReceived}
        </span>
      );
    },
  },
  {
    accessorKey: "earnings",
    header: "Earnings (70%)",
    cell: ({ row }) => {
      const event = row.original;
      return (
        <span className="text-muted-foreground">&pound;{event.earnings}</span>
      );
    },
  },
  {
    accessorKey: "commission",
    header: "Commission (30%)",
    cell: ({ row }) => {
      const event = row.original;
      return (
        <span className="text-muted-foreground">&pound;{event.commission}</span>
      );
    },
  },
  {
    accessorKey: "stripeFees",
    header: "Stripe Fees",
    cell: ({ row }) => {
      const event = row.original;
      return (
        <span className="text-muted-foreground">&pound;{event.stripeFees}</span>
      );
    },
  },
  {
    accessorKey: "eventServices",
    header: "Event Services",
    cell: ({ row }) => {
      const event = row.original;
      return (
        <span className="text-muted-foreground">
          &pound;{event.eventServices}
        </span>
      );
    },
  },
  {
    accessorKey: "payoutStatus",
    header: "Payout Status",
    cell: ({ row }) => {
      const event = row.original;
      const status = event.payoutPaid === true ? "Paid" : "Pending";

      // Optional: Add different styles based on status
      const getStatusColor = (status: string) => {
        switch (status) {
          case "Paid":
            return "text-success font-medium bg-success/20 px-2 py-1 rounded-full text-sm";
          case "Pending":
            return "text-pending font-medium bg-secondary/20 px-2 py-1 rounded-full text-sm";
          default:
            return "text-pending font-medium bg-pending/20 px-2 py-1 rounded-full text-sm";
        }
      };

      return <span className={getStatusColor(status)}>{status}</span>;
    },
  },
  {
    accessorKey: "payoutDate",
    header: "Payout Date",
    cell: ({ row }) => {
      const event = row.original;

      return <span>{event.payoutDate}</span>;
    },
  },
];
