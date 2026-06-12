"use client";

import { useState } from "react";
import { ChevronDown, CircleEllipsis } from "lucide-react";
import { toast } from "react-toastify";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { copyTvShareUrl } from "@/lib/tv-share-url";
import { cn } from "@/lib/utils";

export function TvSourceDropdown({
  communityId,
  options,
  onChange,
}: {
  communityId: string | null;
  options: { id: string; name: string }[];
  onChange: (id: string | null) => void;
}) {
  const [copying, setCopying] = useState(false);

  const label =
    communityId != null
      ? (options.find(c => c.id === communityId)?.name ?? "Community TV")
      : "Tipmanna TV";

  const handleCopyShare = async (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (copying) return;
    setCopying(true);
    try {
      await copyTvShareUrl(communityId);
      toast.success("TV link copied");
    } catch {
      toast.error("Could not copy TV link");
    } finally {
      setCopying(false);
    }
  };

  return (
    <div className="inline-flex items-center rounded-md border border-zinc-200 bg-white shadow-sm">
      <button
        type="button"
        className={cn(
          "inline-flex h-8 items-center justify-center rounded-l-md px-2 text-zinc-700 hover:bg-zinc-50",
          copying && "opacity-60"
        )}
        aria-label="Copy TV link"
        title="Copy TV link"
        disabled={copying}
        onClick={handleCopyShare}
      >
        <CircleEllipsis className="size-4 shrink-0" />
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="inline-flex h-8 max-w-[160px] items-center gap-1 rounded-r-md border-l border-zinc-200 bg-white px-2 text-xs font-medium text-zinc-800 hover:bg-zinc-50 sm:max-w-[180px]"
            aria-label="TV source"
          >
            <span className="truncate">
              {label.length > 14 ? `${label.slice(0, 14)}…` : label}
            </span>
            <ChevronDown className="size-3 shrink-0 opacity-70" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="z-[99999]"
        >
          <DropdownMenuItem onClick={() => onChange(null)}>
            Tipmanna TV (global)
          </DropdownMenuItem>
          {options.map(c => (
            <DropdownMenuItem
              key={c.id}
              onClick={() => onChange(c.id)}
            >
              {c.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
