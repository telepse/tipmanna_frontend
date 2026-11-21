"use client";

import { useState } from "react";
import {
  activateEventSessionAction,
  createEventSessionAction,
} from "@/actions/event-sessions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "react-toastify";

export interface Session {
  id: string;
  title: string;
  amountToRaise: number;
  isActive: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  sessions: Session[];
  eventId: string;
  refetchSessions: () => void;
}

export const SessionsModal = ({
  open,
  onClose,
  sessions,
  eventId,
  refetchSessions,
}: Props) => {
  const [newSessionName, setNewSessionName] = useState("");
  const [newAmount, setNewAmount] = useState("");

  const handleCreateSession = async () => {
    if (!newSessionName || !newAmount) return;

    try {
      const res = await createEventSessionAction(
        eventId,
        newSessionName,
        Number(newAmount)
      );
      if (!res.success) {
        toast.error(
          res.message ??
            res.error ??
            "Could not create session — sign in as host"
        );
        return;
      }

      setNewSessionName("");
      setNewAmount("");
      refetchSessions();
    } catch (err) {
      console.error(err);
      toast.error("Could not create session");
    }
  };

  const handleSetActiveSession = async (sessionId: string) => {
    try {
      const res = await activateEventSessionAction(eventId, sessionId);
      if (!res.success) {
        toast.error(
          res.message ??
            res.error ??
            "Could not activate session — sign in as host"
        );
        return;
      }
      refetchSessions();
    } catch (err) {
      console.error(err);
      toast.error("Could not update session");
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onClose}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Sessions</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Existing Sessions */}
          <div className="space-y-2">
            {sessions.map(session => (
              <div
                key={session.id}
                className="flex items-center justify-between rounded-md border p-2"
              >
                <div>
                  <p className="text-sm font-medium">{session.title}</p>
                  <p className="text-muted-foreground text-xs">
                    Target: £{session.amountToRaise}
                  </p>
                </div>

                {/* Checkbox for Active Session */}
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={session.isActive}
                    onCheckedChange={checked => {
                      if (checked) handleSetActiveSession(session.id);
                    }}
                  />
                  <span className="text-xs">Active</span>
                </div>
              </div>
            ))}
          </div>

          {/* Create New Session */}
          <div className="space-y-2 border-t pt-4">
            <Input
              placeholder="Session name"
              value={newSessionName}
              onChange={e => setNewSessionName(e.target.value)}
            />
            <Input
              placeholder="Target amount (£)"
              type="number"
              value={newAmount}
              onChange={e => setNewAmount(e.target.value)}
            />
            <Button
              onClick={handleCreateSession}
              className="w-full"
            >
              Create Session
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
