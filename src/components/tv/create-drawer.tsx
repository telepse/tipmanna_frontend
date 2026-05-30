"use client";

import { useEffect, useState } from "react";
import { useAppRouter } from "@/components/navigation/navigation-progress-provider";

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
import { DRAWER_Z_INDEX } from "@/lib/drawer-z-index";

interface Props {
  isCreateDrawerOpen: boolean;
  setIsCreateDrawerOpen: (value: boolean) => void;
}

export const CreateDrawer = ({
  isCreateDrawerOpen,
  setIsCreateDrawerOpen,
}: Props) => {
  const [selected, setSelected] = useState<string>("");
  const [isProceeding, setIsProceeding] = useState(false);
  const { push } = useAppRouter();

  useEffect(() => {
    if (!isCreateDrawerOpen) setIsProceeding(false);
  }, [isCreateDrawerOpen]);

  const handleProceed = () => {
    if (!selected || isProceeding) return;

    setIsProceeding(true);
    setIsCreateDrawerOpen(false);

    let href = "/";
    switch (selected) {
      case "content":
        href = "/content-only";
        break;
      case "event":
        href = "/event-only";
        break;
      case "event_content":
        href = "/event-and-content";
        break;
      default:
        href = "/";
    }
    push(href);
  };

  return (
    <Drawer
      open={isCreateDrawerOpen}
      onOpenChange={setIsCreateDrawerOpen}
    >
      <DrawerContent
        className={`${DRAWER_Z_INDEX} h-[70vh] space-y-4 overflow-y-auto rounded-t-full p-4`}
      >
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
            type="button"
            className="bg-primary rounded-md px-2 py-1 text-sm text-white disabled:opacity-50"
            disabled={!selected || isProceeding}
            onClick={handleProceed}
          >
            {isProceeding ? "Opening…" : "Proceed"}
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  );
};
