"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  deleteFormDraftAction,
  listFormDraftsAction,
  type FormDraftSummary,
} from "@/actions/form-drafts";

const kindHref: Record<string, string> = {
  content_only: "/content-only",
  event_only: "/event-only",
  event_and_content: "/event-and-content",
};

export function FormDraftsPanel() {
  const [drafts, setDrafts] = useState<FormDraftSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void listFormDraftsAction().then(res => {
      setLoading(false);
      if (res.success && Array.isArray(res.data)) {
        setDrafts(res.data as FormDraftSummary[]);
      }
    });
  }, []);

  if (loading || drafts.length === 0) return null;

  return (
    <div className="bg-card rounded-md border p-4">
      <h5 className="text-lg font-medium">Saved drafts</h5>
      <p className="text-muted-foreground mb-3 text-sm">
        Resume a create flow you started recently.
      </p>
      <ul className="space-y-2">
        {drafts.map(draft => (
          <li
            key={draft.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
          >
            <div>
              <p className="font-medium">
                {draft.title ?? draft.kind.replace(/_/g, " ")}
              </p>
              <p className="text-muted-foreground text-xs">
                Step {draft.step} · Updated{" "}
                {new Date(draft.updatedAt).toLocaleDateString()}
              </p>
              {(draft.kind === "community_video" ||
                draft.kind === "room_add_video") && (
                <p className="text-muted-foreground text-xs">
                  Resume from the add-video dialog in your dashboard or event
                  room.
                </p>
              )}
            </div>
            <div className="flex gap-2">
              {kindHref[draft.kind] ? (
                <Button
                  asChild
                  size="sm"
                  variant="secondary"
                >
                  <Link
                    href={`${kindHref[draft.kind]}?draftId=${encodeURIComponent(draft.id)}`}
                  >
                    Resume
                  </Link>
                </Button>
              ) : null}
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  void deleteFormDraftAction(draft.id).then(() => {
                    setDrafts(prev => prev.filter(d => d.id !== draft.id));
                  });
                }}
              >
                Delete
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
