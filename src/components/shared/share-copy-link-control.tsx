"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { copyShareUrl } from "@/lib/copy-share-url";
import { cn } from "@/lib/utils";

type ShareCopyLinkControlProps = {
  url: string;
  className?: string;
  iconClassName?: string;
};

/** Compact copy-link control for inline share popovers (next to social icons). */
export function ShareCopyLinkControl({
  url,
  className,
  iconClassName = "size-8",
}: ShareCopyLinkControlProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!url.trim()) return;
    await copyShareUrl(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      disabled={!url.trim()}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full disabled:cursor-not-allowed disabled:opacity-40",
        className
      )}
      aria-label={copied ? "Link copied" : "Copy link"}
      title={copied ? "Copied!" : "Copy link"}
    >
      {copied ? (
        <Check className={cn("text-moonstone-blue", iconClassName)} />
      ) : (
        <Copy className={cn("text-black", iconClassName)} />
      )}
    </button>
  );
}
