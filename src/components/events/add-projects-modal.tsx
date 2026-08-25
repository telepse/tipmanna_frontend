"use client";

import { useState, useEffect } from "react";

import { addEventProjectsAction } from "@/actions/events";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useHostCapabilityWithAuth } from "@/hooks/use-host-capability-with-auth";
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
  eventId,
  projects,
  setProjects,
}: Props) => {
  const { handleAuthRequiredError, HostAuthModal } = useHostCapabilityWithAuth({
    cohostEventId: eventId,
  });
  const [localProjects, setLocalProjects] = useState(projects);

  useEffect(() => {
    if (open) {
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

  const submitProjects = async (cleaned: Project[]) => {
    const res = await addEventProjectsAction(eventId, cleaned);
    if (!res.success) {
      if (handleAuthRequiredError(res, () => void submitProjects(cleaned))) {
        return;
      }
      toast.error(res.error ?? "Failed to add projects");
      return;
    }
    toast.success("Projects added successfully!");
    if (res.data) setProjects(res.data as Project[]);
    onClose();
  };

  const onSubmit = async () => {
    const cleaned = localProjects.filter(p => p.name.trim() !== "");
    if (cleaned.length === 0) {
      toast.error("Add at least one project");
      return;
    }
    try {
      await submitProjects(cleaned);
    } catch (err) {
      console.error(err);
      toast.error("Error adding projects");
    }
  };

  useEffect(() => {
    setLocalProjects(projects);
  }, [projects]);

  return (
    <>
      {HostAuthModal}
      <Dialog
        open={open}
        onOpenChange={onClose}
      >
        <DialogContent className="max-h-[70vh] w-full overflow-y-scroll rounded-md sm:max-w-sm">
          <DialogHeader className="flex items-center justify-between">
            <DialogTitle>Add projects to pin to screen display</DialogTitle>
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
            onClick={() => void onSubmit()}
          >
            Submit
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
};
