"use client";

import { Button } from "@/components/ui/button";
import type { FormDraftSummary } from "@/actions/form-drafts";

type Props = {
  draft: FormDraftSummary | null;
  onResume: () => void | Promise<void>;
  onDiscard: () => void | Promise<void>;
  className?: string;
};

export function DraftResumeBanner({
  draft,
  onResume,
  onDiscard,
  className,
}: Props) {
  if (!draft) return null;

  return (
    <div
      className={`bg-card flex flex-wrap items-center justify-between gap-3 rounded-md border px-4 py-3 text-sm ${className ?? ""}`}
    >
      <div>
        <p className="font-medium">Resume your draft?</p>
        <p className="text-muted-foreground text-xs">
          {draft.title ?? draft.kind.replace(/_/g, " ")} · step {draft.step} ·
          updated {new Date(draft.updatedAt).toLocaleDateString()}
        </p>
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => void onResume()}
        >
          Resume
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => void onDiscard()}
        >
          Discard
        </Button>
      </div>
    </div>
  );
}
