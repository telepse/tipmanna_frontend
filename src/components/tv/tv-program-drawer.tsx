"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { ProgramLandingContent } from "@/components/program/program-landing-content";
import {
  fetchCommunityProgramBootstrap,
  fetchGlobalProgramBootstrap,
} from "@/lib/program-api";
import type { ProgramBootstrap } from "@/lib/program-types";
import type { TvProgramDrawerTarget } from "@/lib/tv-program-drawer-target";
import { DRAWER_Z_INDEX } from "@/lib/drawer-z-index";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: TvProgramDrawerTarget | null;
};

export function TvProgramDrawer({ open, onOpenChange, target }: Props) {
  const [program, setProgram] = useState<ProgramBootstrap | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadBootstrap = useCallback(async (t: TvProgramDrawerTarget) => {
    setLoading(true);
    setError(null);
    setProgram(null);
    try {
      const data = t.communityId
        ? await fetchCommunityProgramBootstrap(t.communityId, t.enforcementId)
        : await fetchGlobalProgramBootstrap(t.enforcementId);
      if (!data) {
        setError("This program could not be loaded.");
        return;
      }
      setProgram(data);
    } catch {
      setError("This program could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open || !target) {
      return;
    }
    void loadBootstrap(target);
  }, [open, target, loadBootstrap]);

  useEffect(() => {
    if (open) return;
    setProgram(null);
    setError(null);
    setLoading(false);
  }, [open]);

  const communityId = target?.communityId ?? undefined;
  const enforcementId = target?.enforcementId ?? "";

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
    >
      <DrawerContent
        className={`${DRAWER_Z_INDEX} custom-scrollbar ml-auto h-screen w-full space-y-2 rounded-t-full p-4 sm:h-[95vh] sm:w-[420px]`}
      >
        <DrawerHeader>
          <DrawerTitle className="text-xl">Program</DrawerTitle>
        </DrawerHeader>

        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="absolute top-4 right-4 rounded-full p-2 text-black hover:bg-gray-200"
          aria-label="Close program drawer"
        >
          <X size={24} />
        </button>

        <div className="custom-scrollbar hide__scrollbar h-[calc(100vh-80px)] overflow-y-auto p-2 sm:h-[calc(95vh-80px)]">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm">
              <Loader2 className="size-5 animate-spin" />
              Loading program…
            </div>
          ) : null}

          {!loading && error ? (
            <div className="space-y-3 py-8 text-center text-sm">
              <p>{error}</p>
              {target ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void loadBootstrap(target)}
                >
                  Retry
                </Button>
              ) : null}
            </div>
          ) : null}

          {!loading && !error && program && target ? (
            <ProgramLandingContent
              program={program}
              communityId={communityId}
              enforcementId={enforcementId}
              variant="drawer"
              stackModalsAboveDrawer
            />
          ) : null}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
