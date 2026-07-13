"use client";

import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { useSelector } from "react-redux";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { buildTawkChatUrl, loadTawkScript } from "@/lib/tawk";
import { OVERLAY_Z_INDEX } from "@/lib/drawer-z-index";
import { RootState } from "@/redux/store";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source?: string;
}

export function EmbeddedSupportChat({ open, onOpenChange }: Props) {
  const user = useSelector((state: RootState) => state.auth.user);
  const [chatUrl, setChatUrl] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    const propertyId = process.env.NEXT_PUBLIC_TAWK_PROPERTY_ID;
    const widgetId = process.env.NEXT_PUBLIC_TAWK_WIDGET_ID;
    if (!propertyId || !widgetId) {
      setLoadError("Support chat is not configured.");
      return;
    }

    const name = user?.fullName || user?.username || "Guest";
    const email = user?.email || "guest@tipmanna.tv";

    void loadTawkScript({
      propertyId,
      widgetId,
      visitor: { name, email },
    })
      .then(() => {
        setChatUrl(buildTawkChatUrl({ name, email, propertyId, widgetId }));
        setLoadError(null);
      })
      .catch(() => {
        setLoadError("Could not load support chat.");
      });
  }, [open, user?.email, user?.fullName, user?.username]);

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
    >
      <SheetContent
        side="bottom"
        className={`flex h-[85vh] flex-col rounded-t-2xl p-0 ${OVERLAY_Z_INDEX}`}
      >
        <SheetHeader className="border-b px-4 py-3">
          <SheetTitle className="flex items-center gap-2 text-base">
            <MessageCircle className="size-5" />
            Support
          </SheetTitle>
        </SheetHeader>

        {loadError ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="text-muted-foreground text-sm">{loadError}</p>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </div>
        ) : chatUrl ? (
          <iframe
            title="Tipmanna support chat"
            src={chatUrl}
            className="min-h-0 flex-1 border-0"
            allow="microphone; camera"
          />
        ) : (
          <div className="text-muted-foreground flex flex-1 items-center justify-center text-sm">
            Loading chat…
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
