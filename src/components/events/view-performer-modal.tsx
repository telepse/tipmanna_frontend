/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
// UI Components
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Pin, PinOff, Loader2 } from "lucide-react"; // Icons for pins and loading
import { toast } from "react-toastify";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";

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
  setPerformers?: React.Dispatch<React.SetStateAction<Performer[]>>; // Made optional to prevent crashes
}

export const ViewPerformersModal = ({
  open,
  onClose,
  performers,
  setPerformers,
}: Props) => {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  // 1. Create a local state mapped from props to handle instant icon toggling
  const [localPerformers, setLocalPerformers] =
    useState<Performer[]>(performers);

  const { token } = useSelector((state: RootState) => state.auth);

  // Sync local state when performers prop changes or modal opens
  useEffect(() => {
    setLocalPerformers(performers);
  }, [performers, open]);

  const handleTogglePin = async (performerId: string) => {
    setLoadingId(performerId);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/events/performers/${performerId}/toggle-pin`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to toggle pin state");
      }

      // 2. Update the local state so the icon changes instantly
      const updatedList = localPerformers.map(p =>
        p.id === performerId ? { ...p, isPinned: data.isPinned } : p
      );
      setLocalPerformers(updatedList);

      // 3. Safely update the parent state if it was actually provided
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
