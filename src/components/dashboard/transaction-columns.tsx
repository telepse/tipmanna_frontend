import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";

// Local imports
import { truncateText } from "@/lib/utils";
import type { Transaction } from "@/types";

// This type is used to define the shape of our data.
// You can use a Zod schema here if you want.

export const transactionColumns: ColumnDef<Transaction>[] = [
  {
    accessorKey: "purchaseTime",
    header: "Date & Time",
    cell: ({ row }) => {
      const transaction = row.original;

      return (
        <span className="font-medium">
          {format(new Date(transaction.purchaseTime), "yyyy-MM-dd, hh:mm:ss a")}
        </span>
      );
    },
  },
  {
    accessorKey: "tipperName",
    header: "Tipper",
    cell: ({ row }) => {
      const transaction = row.original;

      return (
        <span className="text-muted-foreground">{transaction.tipperName}</span>
      );
    },
  },
  {
    accessorKey: "amount",
    header: "Amount",
    cell: ({ row }) => {
      const transaction = row.original;

      return (
        <span className="text-muted-foreground">
          &pound;{transaction.amount}
        </span>
      );
    },
  },
  {
    accessorKey: "stripeFee",
    header: "Stripe Fees",
    cell: ({ row }) => {
      const transaction = row.original;

      return (
        <span className="text-muted-foreground">
          &pound;{transaction.stripeFee}
        </span>
      );
    },
  },
  {
    accessorKey: "characterNames",
    header: "Character",
    cell: ({ row }) => {
      const transaction = row.original;

      return (
        <div
          className="text-muted-foreground flex w-40 flex-wrap gap-2"
          style={{ whiteSpace: "normal", wordBreak: "break-word" }}
        >
          {transaction.characterNames.join(", ")}
        </div>
      );
    },
  },
  {
    accessorKey: "eventName",
    header: "Event Name",
    cell: ({ row }) => {
      const transaction = row.original;

      return (
        <span className="text-muted-foreground">
          {truncateText(transaction.eventName)}
        </span>
      );
    },
  },
];
