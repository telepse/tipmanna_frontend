"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

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
      await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/event-sessions/${eventId}/sessions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: newSessionName,
            amountToRaise: Number(newAmount),
          }),
        }
      );

      setNewSessionName("");
      setNewAmount("");
      refetchSessions();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSetActiveSession = async (sessionId: string) => {
    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/event-sessions/${eventId}/sessions/${sessionId}/activate`,
        {
          method: "PATCH",
        }
      );
      refetchSessions();
    } catch (err) {
      console.error(err);
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
                  <span className="text-sm">
                    {session.isActive ? "Active" : "Set Active"}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Add New Session */}
          <div className="flex gap-2">
            <Input
              placeholder="Session name"
              value={newSessionName}
              onChange={e => setNewSessionName(e.target.value)}
            />
            <Input
              type="number"
              placeholder="Amount"
              value={newAmount}
              onChange={e => setNewAmount(e.target.value)}
            />
            <Button onClick={handleCreateSession}>Add</Button>
          </div>

          <Button
            variant="outline"
            onClick={onClose}
            className="mt-2 w-full"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
