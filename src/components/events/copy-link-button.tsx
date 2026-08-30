"use client";

import { useState } from "react";
import { Button } from "../ui/button";
import { Copy } from "lucide-react";
import { toast } from "sonner";

export const CopyLinkButton = ({ link }: { link: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success("Link copied");
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <Button onClick={handleCopy}>
      <Copy /> Copy link
    </Button>
  );
};
