"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";
import {
  deleteFormDraftAction,
  getFormDraftAction,
  listFormDraftsAction,
  type FormDraftSummary,
} from "@/actions/form-drafts";
import {
  type FormDraftPolicyJson,
  isModalDraftRecoverable,
  modalDraftStorageKey,
} from "@/lib/form-draft-utils";
import { buildCreateDialogResumeUrl } from "@/hooks/use-create-dialog-resume";

const kindHref: Record<string, string> = {
  content_only: "/content-only",
  event_only: "/event-only",
  event_and_content: "/event-and-content",
};

export function FormDraftsPanel() {
  const [drafts, setDrafts] = useState<FormDraftSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [resumingId, setResumingId] = useState<string | null>(null);
  const params = useParams();
  const router = useRouter();
  const hostSlug = typeof params?.slug === "string" ? params.slug : undefined;

  useEffect(() => {
    void listFormDraftsAction().then(res => {
      setLoading(false);
      if (res.success && Array.isArray(res.data)) {
        setDrafts(res.data as FormDraftSummary[]);
      }
    });
  }, []);

  const resumeModalDraft = async (draft: FormDraftSummary) => {
    if (!hostSlug) return;
    setResumingId(draft.id);
    try {
      const res = await getFormDraftAction(draft.id);
      if (!res.success || !res.data) {
        toast.error("Could not load draft");
        return;
      }
      const policy = (res.data.policyJson ?? {}) as FormDraftPolicyJson;
      if (!isModalDraftRecoverable(policy)) {
        toast.error(
          "This draft can't be reopened automatically. Delete it or start a new video."
        );
        return;
      }

      const origin = policy.modal?.origin;
      const targetId =
        origin?.targetId?.trim() ?? policy.modal?.targetId?.trim();
      if (!targetId) {
        toast.error(
          "This draft can't be reopened automatically. Delete it or start a new video."
        );
        return;
      }

      if (typeof window !== "undefined") {
        sessionStorage.setItem(
          modalDraftStorageKey(draft.kind, targetId),
          draft.id
        );
      }

      if (origin?.surface === "create_dialog" && origin.pathname) {
        router.push(
          buildCreateDialogResumeUrl({
            pathname: origin.pathname,
            modalDraftId: draft.id,
            targetId,
            hostTab: origin.hostTab,
            draftKind: draft.kind,
          })
        );
        return;
      }

      if (
        origin?.surface === "host_community" ||
        (draft.kind === "community_video" && !origin)
      ) {
        router.push(
          `/host/${encodeURIComponent(hostSlug)}/host-community?communityId=${encodeURIComponent(targetId)}&modalDraftId=${encodeURIComponent(draft.id)}`
        );
        return;
      }

      if (
        origin?.surface === "event_channel_modal" ||
        origin?.surface === "content_room_settings" ||
        (draft.kind === "room_add_video" && !origin)
      ) {
        router.push(
          `/room/${encodeURIComponent(targetId)}?openAddVideo=1&modalDraftId=${encodeURIComponent(draft.id)}`
        );
      }
    } finally {
      setResumingId(null);
    }
  };

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
              ) : draft.kind === "community_video" ||
                draft.kind === "room_add_video" ? (
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={resumingId === draft.id || !hostSlug}
                  onClick={() => void resumeModalDraft(draft)}
                >
                  {resumingId === draft.id ? "Opening…" : "Resume"}
                </Button>
              ) : null}
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  void deleteFormDraftAction(draft.id).then(res => {
                    if (!res.success) {
                      toast.error(res.message ?? "Could not delete draft");
                      return;
                    }
                    setDrafts(prev => prev.filter(d => d.id !== draft.id));
                    toast.success("Draft deleted");
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
