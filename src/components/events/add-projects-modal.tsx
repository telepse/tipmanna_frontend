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
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
}

export const AddProjectsModal = ({
  open,
  onClose,
  isHost,
  eventId,
  projects,
  setProjects,
}: Props) => {
  const [localProjects, setLocalProjects] = useState(projects);

  useEffect(() => {
    if (open) {
      // If parent has performers, use them. Otherwise, give a single blank input.
      setLocalProjects(
        projects.length > 0 ? projects : [{ name: "", amountReceived: "" }]
      );
    }
  }, [open, projects]);

  const addProject = () => {
    setLocalProjects(prev => [...prev, { name: "", amountReceived: "" }]);
  };

  const removeProject = (index: number) => {
    setLocalProjects(prev => prev.filter((_, i) => i !== index));
  };

  const updateProject = (
    index: number,
    field: "name" | "description",
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
        `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/events/${eventId}/projects`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projects: cleaned }),
        }
      );

      if (!res.ok) throw new Error("Failed to add projects");

      const data = await res.json();
      toast.success("Projects added successfully!");
      setProjects(data); // update parent state
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Error adding performers");
    }
  };

  useEffect(() => {
    setLocalProjects(projects);
  }, [projects]);

  return (
    <Dialog
      open={open}
      onOpenChange={onClose}
    >
      <DialogContent className="max-h-[70vh] w-full overflow-y-scroll rounded-md sm:max-w-sm">
        <DialogHeader>
          w<DialogTitle>Add projects</DialogTitle>
        </DialogHeader>

        <button
          type="button"
          onClick={addProject}
          className="flex w-fit items-center gap-2 rounded-md bg-black p-2 text-sm text-white"
        >
          <Plus /> Add project
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
                updateProject(index, "description", e.target.value)
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
