"use client";

import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmbeddedSupportChat } from "@/components/support/embedded-support-chat";
import { useState } from "react";

type Props = {
  sourceForm: "content_only" | "event_only" | "event_and_content";
};

export function EventFormHelpButton({ sourceForm }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={() => setOpen(true)}
      >
        <HelpCircle className="size-4" />
        Help
      </Button>
      <EmbeddedSupportChat
        open={open}
        onOpenChange={setOpen}
        source={`event_form_${sourceForm}`}
      />
    </>
  );
}
