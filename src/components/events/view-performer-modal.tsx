/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Pin, PinOff, Loader2 } from "lucide-react";
import { toast } from "react-toastify";
import { togglePerformerPinAction } from "@/actions/events";

interface Performer {
  id?: string;
  name: string;
  description?: string;
  isPinned?: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  performers: Performer[];
  setPerformers?: React.Dispatch<React.SetStateAction<Performer[]>>;
}

export const ViewPerformersModal = ({
  open,
  onClose,
  performers,
  setPerformers,
}: Props) => {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [localPerformers, setLocalPerformers] =
    useState<Performer[]>(performers);

  useEffect(() => {
    setLocalPerformers(performers);
  }, [performers, open]);

  const handleTogglePin = async (performerId: string) => {
    setLoadingId(performerId);
    try {
      const res = await togglePerformerPinAction(performerId);
      if (!res.success || !res.data) {
        throw new Error(res.message ?? res.error ?? "Failed to toggle pin");
      }
      const data = res.data as { isPinned?: boolean };
      const updatedList = localPerformers.map(p =>
        p.id === performerId ? { ...p, isPinned: Boolean(data.isPinned) } : p
      );
      setLocalPerformers(updatedList);
      if (typeof setPerformers === "function") {
        setPerformers(updatedList);
      }
      toast.success(
        data.isPinned ? "Performer pinned!" : "Performer unpinned."
      );
    } catch (error: any) {
      toast.error(error.message || "Something went wrong");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onClose}
    >
      <DialogContent className="max-h-[70vh] w-full space-y-4 overflow-y-scroll sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-left">Current Performers</DialogTitle>
        </DialogHeader>

        {localPerformers.length === 0 ? (
          <div className="text-muted-foreground py-4 text-center text-sm">
            No performers added yet.
          </div>
        ) : (
          <div className="space-y-3">
            {localPerformers.map((performer, index) => (
              <div
                key={performer.id || index}
                className="bg-muted/20 flex items-center justify-between rounded-md border p-3"
              >
                <div>
                  <div className="text-sm font-medium">{performer.name}</div>
                  {performer.description && (
                    <div className="text-muted-foreground mt-1 text-xs">
                      {performer.description}
                    </div>
                  )}
                </div>

                {performer.id && (
                  <button
                    type="button"
                    disabled={loadingId === performer.id}
                    onClick={() => handleTogglePin(performer.id!)}
                    className={`ml-2 transition-colors disabled:opacity-50 ${
                      performer.isPinned
                        ? "text-primary hover:text-primary/80"
                        : "text-muted-foreground hover:text-black"
                    }`}
                    title={
                      performer.isPinned ? "Unpin performer" : "Pin performer"
                    }
                  >
                    {loadingId === performer.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : performer.isPinned ? (
                      <PinOff className="h-4 w-4" />
                    ) : (
                      <Pin className="h-4 w-4 fill-current" />
                    )}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <Button
          type="button"
          className="w-full"
          onClick={onClose}
        >
          Close
        </Button>
      </DialogContent>
    </Dialog>
  );
};
