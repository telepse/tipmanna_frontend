"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Pin, PinOff } from "lucide-react";
import { toast } from "react-toastify";

import {
  addEventProjectsAction,
  getEventPinRosterAction,
  toggleProjectPinAction,
} from "@/actions/events";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useHostCapabilityWithAuth } from "@/hooks/use-host-capability-with-auth";
import {
  MAX_PINNED_ROSTER_ITEMS,
  pinnedRosterItems,
  type EventPinRoster,
  type PinRosterItem,
} from "@/lib/event-pin-roster";

interface Project {
  id?: string;
  name: string;
  isPinned?: boolean;
  amountReceived?: number | string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  isHost: boolean;
  eventId: string;
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
}

export const AddProjectsModal = ({
  open,
  onClose,
  eventId,
  projects,
  setProjects,
}: Props) => {
  const { handleAuthRequiredError, HostAuthModal } = useHostCapabilityWithAuth({
    cohostEventId: eventId,
  });
  const [roster, setRoster] = useState<PinRosterItem[]>([]);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [loadingPinId, setLoadingPinId] = useState<string | null>(null);

  const applyRoster = useCallback(
    (items: PinRosterItem[]) => {
      setRoster(items);
      setProjects(items);
    },
    [setProjects]
  );

  const loadRoster = useCallback(async () => {
    setLoadingRoster(true);
    try {
      const res = await getEventPinRosterAction(eventId);
      if (!res.success || !res.data) {
        toast.error(res.error ?? "Could not load projects");
        return;
      }
      applyRoster(res.data.items);
    } finally {
      setLoadingRoster(false);
    }
  }, [applyRoster, eventId]);

  useEffect(() => {
    if (!open) return;
    setNewName("");
    void loadRoster();
  }, [open, loadRoster]);

  useEffect(() => {
    if (!open && projects.length > 0) {
      setRoster(projects as PinRosterItem[]);
    }
  }, [open, projects]);

  const handleAdd = async () => {
    const trimmed = newName.trim();
    if (!trimmed) {
      toast.error("Enter a project name");
      return;
    }

    setAdding(true);
    try {
      const res = await addEventProjectsAction(eventId, trimmed);
      if (!res.success || !res.data) {
        if (
          handleAuthRequiredError(res, () => {
            void handleAdd();
          })
        ) {
          return;
        }
        toast.error(res.error ?? "Failed to add project");
        return;
      }
      applyRoster((res.data as EventPinRoster).items);
      setNewName("");
      toast.success("Project added");
    } catch (err) {
      console.error(err);
      toast.error("Error adding project");
    } finally {
      setAdding(false);
    }
  };

  const handleTogglePin = async (projectId: string) => {
    setLoadingPinId(projectId);
    try {
      const res = await toggleProjectPinAction(projectId);
      if (!res.success || !res.data) {
        throw new Error(res.message ?? res.error ?? "Failed to toggle pin");
      }
      const data = res.data as { isPinned?: boolean };
      setRoster(prev => {
        const next = prev.map(item =>
          item.id === projectId
            ? { ...item, isPinned: Boolean(data.isPinned) }
            : item
        );
        setProjects(next);
        return next;
      });
      toast.success(data.isPinned ? "Project pinned" : "Project unpinned");
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Something went wrong";
      toast.error(message);
    } finally {
      setLoadingPinId(null);
    }
  };

  const pinnedCount = roster.filter(item => item.isPinned).length;

  return (
    <>
      {HostAuthModal}
      <Dialog
        open={open}
        onOpenChange={onClose}
      >
        <DialogContent className="max-h-[70vh] w-full overflow-y-scroll rounded-md sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add or pin projects for screen display</DialogTitle>
          </DialogHeader>

          {loadingRoster ? (
            <div className="text-muted-foreground flex items-center justify-center gap-2 py-6 text-sm">
              <Loader2 className="size-4 animate-spin" />
              Loading roster…
            </div>
          ) : roster.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No projects yet. Add a name below (up to {MAX_PINNED_ROSTER_ITEMS}{" "}
              can be pinned).
            </p>
          ) : (
            <div className="space-y-2">
              {roster.map(item => (
                <div
                  key={item.id}
                  className="bg-muted/20 flex items-center justify-between rounded-md border p-3"
                >
                  <div>
                    <div className="text-sm font-medium">{item.name}</div>
                    <div className="text-muted-foreground text-xs">
                      £{item.amountReceived ?? 0} received
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={loadingPinId === item.id}
                    onClick={() => void handleTogglePin(item.id)}
                    className={`ml-2 transition-colors disabled:opacity-50 ${
                      item.isPinned
                        ? "text-primary hover:text-primary/80"
                        : "text-muted-foreground hover:text-black"
                    }`}
                    title={item.isPinned ? "Unpin project" : "Pin project"}
                  >
                    {loadingPinId === item.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : item.isPinned ? (
                      <PinOff className="size-4" />
                    ) : (
                      <Pin className="size-4 fill-current" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}

          <p className="text-muted-foreground text-xs">
            {pinnedCount}/{MAX_PINNED_ROSTER_ITEMS} pinned. Unpin one to swap.
          </p>

          <div className="flex gap-2">
            <Input
              placeholder="Project name"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") void handleAdd();
              }}
            />
            <Button
              type="button"
              disabled={adding}
              onClick={() => void handleAdd()}
            >
              {adding ? <Loader2 className="size-4 animate-spin" /> : "Add"}
            </Button>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={onClose}
          >
            Done
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
};
