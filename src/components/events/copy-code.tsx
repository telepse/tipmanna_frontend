"use client";

import { useState } from "react";
import { Button } from "../ui/button";
import { Copy } from "lucide-react";
import { toast } from "sonner";

export const CopyCodeButton = ({ code }: { code: string }) => {
  const [, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success("Code copied");
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <Button onClick={handleCopy}>
      <Copy /> {code}
    </Button>
  );
};
