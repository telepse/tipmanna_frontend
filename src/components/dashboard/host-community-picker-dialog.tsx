"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export type HostCommunityPickerOption = {
  id: string;
  name: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  communities: HostCommunityPickerOption[];
  loading?: boolean;
  error?: string | null;
  onSelect: (community: HostCommunityPickerOption) => void;
};

export function HostCommunityPickerDialog({
  open,
  onOpenChange,
  title,
  communities,
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
        ) : communities.length === 0 ? (
          <div className="space-y-3 py-4 text-sm">
            <p className="text-muted-foreground text-center">
              No communities yet.
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
            {communities.map(c => (
              <li key={c.id}>
                <button
                  type="button"
                  className="hover:bg-muted/50 flex w-full rounded-lg border px-3 py-3 text-left text-sm font-medium transition-colors"
                  onClick={() => onSelect(c)}
                >
                  {c.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
