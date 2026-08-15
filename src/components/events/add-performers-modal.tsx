"use client";

import { useState, useEffect } from "react";

// Third-party imports
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

interface Project {
  name: string;
  amountReceived?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  isHost: boolean;
  eventId: string;
  performers: Project[];
  setPerformers: React.Dispatch<React.SetStateAction<Project[]>>;
}

export const AddPerformersModal = ({
  open,
  onClose,
  isHost,
  eventId,
  performers,
  setPerformers,
}: Props) => {
  const [localProjects, setLocalProjects] = useState(performers);

  useEffect(() => {
    if (open) {
      // If parent has performers, use them. Otherwise, give a single blank input.
      setLocalProjects(
        performers.length > 0 ? performers : [{ name: "", amountReceived: "" }]
      );
    }
  }, [open, performers]);

  const addProject = () => {
    setLocalProjects(prev => [...prev, { name: "", description: "" }]);
  };

  const removeProject = (index: number) => {
    setLocalProjects(prev => prev.filter((_, i) => i !== index));
  };

  const updateProject = (
    index: number,
    field: "name" | "amountReceived",
    value: string
  ) => {
    setLocalProjects(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: value,
      };
      return updated;
    });
  };

  const onSubmit = async () => {
    const cleaned = localProjects.filter(p => p.name.trim() !== "");

    if (cleaned.length === 0) {
      toast.error("Add at least one project");
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
      toast.success("Performers added successfully!");
      setPerformers(data); // update parent state
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Error adding performers");
    }
  };

  useEffect(() => {
    setLocalProjects(performers);
  }, [performers]);

  return (
    <Dialog
      open={open}
      onOpenChange={onClose}
    >
      <DialogContent className="max-h-[70vh] w-full overflow-y-scroll rounded-md sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add performers to pin to screen display</DialogTitle>
        </DialogHeader>

        <button
          type="button"
          onClick={addProject}
          className="flex w-fit items-center gap-2 rounded-md bg-black p-2 text-sm text-white"
        >
          <Plus /> Add performer
        </button>

        {localProjects.map((project, index) => (
          <div
            key={index}
            className="flex items-center gap-1 rounded-md"
          >
            <Input
              placeholder="Title"
              value={project.name}
              onChange={e => updateProject(index, "name", e.target.value)}
            />

            <Input
              placeholder="0"
              value={project.amountReceived}
              onChange={e =>
                updateProject(index, "amountReceived", e.target.value)
              }
              disabled={true}
            />

            {localProjects.length > 1 && (
              <button
                type="button"
                onClick={() => removeProject(index)}
                className="text-destructive"
              >
                <X />
              </button>
            )}
          </div>
        ))}

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
