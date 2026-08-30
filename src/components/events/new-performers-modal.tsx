"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "react-toastify";
import { X, Plus } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  isHost: boolean;
  eventId: string;
  performers: { id?: string; name: string; description?: string }[];
  setPerformers: React.Dispatch<
    React.SetStateAction<{ id?: string; name: string; description?: string }[]>
  >;
}

export const NewPerformersModal = ({
  open,
  onClose,
  isHost,
  eventId,
  performers,
  setPerformers,
}: Props) => {
  const [localPerformers, setLocalPerformers] = useState(performers);

  useEffect(() => {
    if (open) {
      // If parent has performers, use them. Otherwise, give a single blank input.
      setLocalPerformers(
        performers.length > 0 ? performers : [{ name: "", description: "" }]
      );
    }
  }, [open, performers]);

  const addPerformer = () => {
    setLocalPerformers(prev => [...prev, { name: "", description: "" }]);
  };

  const removePerformer = (index: number) => {
    setLocalPerformers(prev => prev.filter((_, i) => i !== index));
  };

  const updatePerformer = (
    index: number,
    field: "name" | "description",
    value: string
  ) => {
    setLocalPerformers(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: value,
      };
      return updated;
    });
  };

  const onSubmit = async () => {
    const cleaned = localPerformers.filter(p => p.name.trim() !== "");

    if (cleaned.length === 0) {
      toast.error("Add at least one performer");
      return;
    }

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/events/${eventId}/performers`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ performers: cleaned }),
        }
      );

      if (!res.ok) throw new Error("Failed to add performers");

      const data = await res.json();
      console.log(data);
      toast.success("Performers added successfully!");
      setPerformers(data); // update parent state
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Error adding performers");
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onClose}
    >
      <DialogContent className="max-h-[70vh] w-full space-y-4 overflow-y-scroll sm:max-w-sm">
        <DialogHeader className="flex items-center justify-between">
          <DialogTitle className="text-left">Add performers</DialogTitle>
        </DialogHeader>

        <button
          type="button"
          onClick={addPerformer}
          className="flex w-fit items-center rounded-md bg-black p-2 text-sm text-white"
        >
          <Plus /> Add performer
        </button>

        <div className="space-y-4">
          {localPerformers.map((project, index) => (
            <div
              key={index}
              className="flex items-center gap-2 space-y-2 rounded-md"
            >
              <Input
                placeholder="Name"
                value={project.name}
                onChange={e => updatePerformer(index, "name", e.target.value)}
              />

              <Input
                placeholder="Description"
                value={project.description}
                onChange={e =>
                  updatePerformer(index, "description", e.target.value)
                }
              />

              {localPerformers.length > 1 && (
                <button
                  type="button"
                  onClick={() => removePerformer(index)}
                  className="text-destructive"
                >
                  <X />
                </button>
              )}
            </div>
          ))}
        </div>

        <Button
          type="button"
          onClick={onSubmit}
        >
          Submit
        </Button>
      </DialogContent>
    </Dialog>
  );
};
