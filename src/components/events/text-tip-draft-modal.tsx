"use client";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  TEXT_TIP_DRAFT_MODAL_OVERLAY_Z_INDEX,
  TEXT_TIP_DRAFT_MODAL_Z_INDEX,
} from "@/lib/drawer-z-index";
import { cn } from "@/lib/utils";

export interface TextTipDraftModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string;
  onChange: (next: string) => void;
  /** Persist draft and close modal (parent decides storage / Redux). */
  onSave: () => void;
  /**
   * Stack above drawers using very high z-index (e.g. comment drawer).
   * Tip drawer uses default stacking.
   */
  /** Optional: remove text tip from cart and clear draft. */
  onRemove?: () => void;
  stackOnTop?: boolean;
}

/**
 * Shared “Add your message” dialog used when drafting a text tip / paid comment line.
 */
export function TextTipDraftModal({
  open,
  onOpenChange,
  value,
  onChange,
  onSave,
  onRemove,
  stackOnTop = false,
}: TextTipDraftModalProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent
        overlayClassName={cn(
          "bg-black/60",
          stackOnTop && TEXT_TIP_DRAFT_MODAL_OVERLAY_Z_INDEX
        )}
        className={cn(
          "max-w-[min(100%,380px)] rounded-md bg-white p-6 sm:max-w-md",
          stackOnTop && TEXT_TIP_DRAFT_MODAL_Z_INDEX
        )}
      >
        <DialogHeader>
          <DialogTitle className="text-center text-lg font-semibold">
            Add your message
          </DialogTitle>
          <p className="text-muted-foreground text-center text-sm">
            Draft is saved locally until you complete payment.
          </p>
        </DialogHeader>

        <Textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="Type your shout or comment…"
          className="min-h-[120px] resize-y"
          maxLength={500}
          autoFocus
        />
        <p className="text-muted-foreground text-right text-xs">
          {value.length}/500
        </p>

        <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          {onRemove ? (
            <Button
              type="button"
              variant="outline"
              className="w-full sm:mr-auto sm:w-auto"
              onClick={() => {
                onRemove();
              }}
            >
              Remove
            </Button>
          ) : null}
          <Button
            type="button"
            className="w-full bg-black text-white sm:w-auto"
            onClick={onSave}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
