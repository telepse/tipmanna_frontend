"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Third-party imports
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";

interface Props {
  isCreateDrawerOpen: boolean;
  setIsCreateDrawerOpen: (value: boolean) => void;
}

export const CreateDrawer = ({
  isCreateDrawerOpen,
  setIsCreateDrawerOpen,
}: Props) => {
  const [selected, setSelected] = useState<string>("");

  const router = useRouter();

  const handleProceed = () => {
    if (!selected) return;

    // setOpenPopup(false);

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
    <Drawer
      open={isCreateDrawerOpen}
      onOpenChange={setIsCreateDrawerOpen}
    >
      <DrawerContent className="z-[999999999] h-[70vh] space-y-4 overflow-y-auto rounded-t-full p-4">
        <button
          type="button"
          onClick={() => setIsCreateDrawerOpen(false)}
          className="absolute top-4 right-4 rounded-full p-2 text-black hover:bg-gray-200"
        >
          <X size={24} />
        </button>

        <DrawerHeader>
          <DrawerTitle className="text-2xl">What are you creating?</DrawerTitle>
        </DrawerHeader>

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
                  className={`w-full sm:w-[400px] ${selected === option.value ? "border-primary bg-primary/50" : "border-black/30 bg-white/50"} duration transition-300 flex w-full items-center justify-between gap-2 rounded-2xl border-2 p-4 text-black shadow-2xl`}
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

        <div className="mt-4 flex justify-end">
          <button
            className="bg-primary rounded-md px-2 py-1 text-sm text-white"
            onClick={handleProceed}
          >
            Proceed
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  );
};
