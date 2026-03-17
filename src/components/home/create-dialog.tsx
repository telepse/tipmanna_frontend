"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  openPopup: boolean;
  setOpenPopup: (value: boolean) => void;
}

export const CreateDialog = ({ openPopup, setOpenPopup }: Props) => {
  const [selected, setSelected] = useState<string>("");
  const router = useRouter();

  const handleProceed = () => {
    if (!selected) return;

    setOpenPopup(false);

    // Routing logic based on selection
    switch (selected) {
      case "content":
        router.push("/content-only");
        break;
      case "event":
        router.push("/event-only");
        break;
      case "event_content":
        router.push("/event-and-content");
        break;
      default:
        router.push("/"); // fallback
        break;
    }
  };

  return (
    <Dialog
      open={openPopup}
      onOpenChange={setOpenPopup}
    >
      <DialogContent className="rounded-2xl border-2 border-white/70 bg-black/60 p-6 shadow-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white/70">
            What are you creating?
          </DialogTitle>
        </DialogHeader>

        {/* <NewStepIndicator */}

        <div className="mt-4 grid w-full grid-cols-1 gap-4 md:grid-cols-3">
          <RadioGroup
            value={selected}
            onValueChange={setSelected}
            className="grid w-full grid-cols-1"
          >
            {[
              {
                value: "content",
                title: "Content",
                description: "Applies only to exclusive content",
              },
              {
                value: "event",
                title: "Event",
                description: "Applies only to the event experience",
              },
              {
                value: "event_content",
                title: "Event and Content",
                description: "Applies to both event and content",
              },
            ].map(option => (
              <Label
                key={option.value}
                htmlFor={option.value}
                className="w-full sm:w-[400px]"
              >
                <div
                  className={`w-full sm:w-[400px] ${selected === option.value ? "border-primary bg-primary/50" : "border-white/30 bg-[#251212]"} duration transition-300 flex w-full items-center justify-between gap-2 rounded-2xl border-2 p-4 text-white shadow-2xl`}
                >
                  {option.title}{" "}
                  <RadioGroupItem
                    className={`${selected === option.value ? "bg-primary" : "bg-[#3b3b3b]"}`}
                    value={option.value}
                    id={option.value}
                  />
                </div>
              </Label>
            ))}
          </RadioGroup>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <button
            className="rounded-md border border-white/70 bg-[#3b3b3b] px-2 py-1 text-sm text-white shadow-2xl"
            onClick={() => setOpenPopup(false)}
          >
            Cancel
          </button>

          <button
            className="bg-primary shadow- rounded-md px-2 py-1 text-sm text-white"
            onClick={handleProceed}
          >
            Proceed
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
