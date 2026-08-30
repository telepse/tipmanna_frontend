"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";

interface Props {
  open: boolean;
  onClose: () => void;
  isHost: boolean;
  eventId: boolean;
}

export const OpenDialog = ({ open, onClose, isHost, eventId }: Props) => {
  const [selected, setSelected] = useState<string>("");
  const router = useRouter();

  const [showPerformerForm, setShowPerformerForm] = useState(false);
  const [showProjectForm, setShowProjectForm] = useState(false);

  const handleProceed = () => {
    if (!selected) return;

    // Routing logic based on selection
    switch (selected) {
      case "performer":
        // router.push("/content-only");
        setShowPerformerForm(true);
        setShowProjectForm(false);
        console.log("show performer form", showPerformerForm);
        break;
      case "project":
        // router.push("/event-only");
        setShowProjectForm(true);
        setShowPerformerForm(false);
        console.log("show project form", showProjectForm);
        break;
        break;
      default:
        break;
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onClose}
    >
      <DialogContent className="rounded-2xl border-2 border-white/70 bg-black/60 p-6 shadow-2xl sm:max-w-md">
        View performers
      </DialogContent>
    </Dialog>
  );
};
