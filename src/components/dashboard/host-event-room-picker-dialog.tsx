"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export type HostEventRoomOption = {
  id: string;
  eventName: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  events: HostEventRoomOption[];
  loading?: boolean;
  error?: string | null;
  onSelect: (event: HostEventRoomOption) => void;
};

export function HostEventRoomPickerDialog({
  open,
  onOpenChange,
  title,
  events,
  loading = false,
  error = null,
  onSelect,
}: Props) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="max-h-[85vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center">{title}</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="text-muted-foreground size-8 animate-spin" />
          </div>
        ) : error ? (
          <div className="space-y-3 py-4 text-sm">
            <p className="text-destructive text-center">{error}</p>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </div>
        ) : events.length === 0 ? (
          <div className="space-y-3 py-4 text-sm">
            <p className="text-muted-foreground text-center">
              No approved event rooms yet.
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </div>
        ) : (
          <ul className="space-y-2">
            {events.map(ev => (
              <li key={ev.id}>
                <button
                  type="button"
                  className="hover:bg-muted/50 flex w-full rounded-lg border px-3 py-3 text-left text-sm font-medium transition-colors"
                  onClick={() => onSelect(ev)}
                >
                  {ev.eventName}
                </button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
